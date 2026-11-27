import { createFileRoute } from "@tanstack/react-router";
import {
  chatSchema,
  adviceInstructions,
  messageSchema,
  threadTitle,
  type FarmMessage,
} from "@/lib/agri-shared";
import type { Database } from "@/integrations/supabase/types";
import type { RequestFor } from "@lovable.dev/ai-gateway";
import { z } from "zod";
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin)
          return Response.json({ error: "This request is not allowed." }, { status: 403 });
        let body: z.infer<typeof chatSchema>;
        try {
          const raw = await request.text();
          if (raw.length > 10000000)
            return Response.json({ error: "Please use a smaller photo." }, { status: 413 });
          body = chatSchema.parse(JSON.parse(raw));
        } catch {
          return Response.json(
            { error: "Please enter a valid farming question and a JPEG, PNG or WebP photo." },
            { status: 400 },
          );
        }
        const { streamChatCompletion, GatewayError } = await import("@lovable.dev/ai-gateway");
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const authorization = request.headers.get("authorization");
        if (authorization && !authorization.startsWith("Bearer "))
          return Response.json({ error: "Please sign in again." }, { status: 401 });
        const token = authorization?.slice(7);
        const db =
          url && key && token
            ? createClient<Database>(url, key, {
                auth: { persistSession: false, autoRefreshToken: false },
                global: {
                  headers: { Authorization: `Bearer ${token}` },
                  fetch: (input, init) => {
                    const headers = new Headers(init?.headers);
                    headers.set("apikey", key);
                    return fetch(input, { ...init, headers });
                  },
                },
              })
            : null;
        let userId: string | null = null;
        let history: FarmMessage[] = body.messages;
        if (token) {
          if (!db)
            return Response.json(
              { error: "Saved chats are temporarily unavailable." },
              { status: 503 },
            );
          const { data, error } = await db.auth.getUser(token);
          if (error || !data.user)
            return Response.json(
              { error: "Please sign in again to continue this saved conversation." },
              { status: 401 },
            );
          userId = data.user.id;
          const { data: thread, error: readError } = await db
            .from("conversations")
            .select("messages")
            .eq("id", body.threadId)
            .eq("user_id", userId)
            .maybeSingle();
          if (readError || !thread)
            return Response.json(
              { error: "This conversation could not be found." },
              { status: 404 },
            );
          const stored = z.array(messageSchema).safeParse(thread.messages);
          if (!stored.success)
            return Response.json(
              { error: "This conversation could not be loaded." },
              { status: 500 },
            );
          const latest = body.messages.at(-1);
          if (!latest) return Response.json({ error: "Please enter a question." }, { status: 400 });
          history = stored.data.at(-1)?.id === latest.id ? stored.data : [...stored.data, latest];
          if (history.length > 200)
            return Response.json(
              { error: "Please start a new conversation to continue." },
              { status: 400 },
            );
          const { error: saveError } = await db
            .from("conversations")
            .update({
              messages: history,
              title: threadTitle(history[0] ?? latest),
              updated_at: new Date().toISOString(),
            })
            .eq("id", body.threadId)
            .eq("user_id", userId);
          if (saveError)
            return Response.json(
              { error: "Your question could not be saved. Please try again." },
              { status: 500 },
            );
        }
        const modelMessages: RequestFor<"chat-completions", "google/gemini-4-argon">["messages"] = [
          { role: "system", content: adviceInstructions(body.language) },
          ...history.map((message) =>
            message.role === "assistant"
              ? {
                  role: "assistant" as const,
                  content: message.parts
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("\n"),
                }
              : {
                  role: "user" as const,
                  content: message.parts.map((part) =>
                    part.type === "text"
                      ? { type: "text" as const, text: part.text }
                      : { type: "image_url" as const, image_url: { url: part.url } },
                  ),
                },
          ),
        ];
        const encoder = new TextEncoder();
        let completed = "";
        const assistantId = crypto.randomUUID();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (value: object) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
            try {
              const output = await streamChatCompletion(
                { model: "google/gemini-4-argon", messages: modelMessages },
                { signal: request.signal },
              );
              for await (const event of output) {
                const text = event.choices[0]?.delta.content;
                if (typeof text === "string" && text) {
                  completed += text;
                  send({ type: "text", text });
                }
              }
              if (!completed) throw new Error("The assistant returned no advice.");
              if (db && userId) {
                const response: FarmMessage = {
                  id: assistantId,
                  role: "assistant",
                  parts: [{ type: "text", text: completed }],
                };
                const { error } = await db
                  .from("conversations")
                  .update({
                    messages: [...history, response],
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", body.threadId)
                  .eq("user_id", userId);
                if (error) {
                  send({
                    type: "error",
                    message: "The answer is shown, but could not be saved. Copy it before leaving.",
                  });
                  return;
                }
              }
              send({ type: "done", id: assistantId });
            } catch (error) {
              if (request.signal.aborted) return;
              console.error(
                "AgriCare generation failure",
                error instanceof GatewayError ? { code: error.code, ids: error.ids } : error,
              );
              send({
                type: "error",
                message:
                  error instanceof GatewayError && error.httpStatus === 402
                    ? "AI credits are unavailable. The app owner needs to add credits before asking again."
                    : error instanceof GatewayError &&
                        (error.httpStatus === 401 || error.httpStatus === 403)
                      ? "The AI connection is unavailable. The app owner needs to restore model access."
                      : "The assistant could not finish this answer. Your question is still here; please try again.",
              });
            } finally {
              try {
                controller.close();
              } catch {
                /* The stream was already closed. */
              }
            }
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
