import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Mic,
  MicOff,
  Volume2,
  Copy,
  Leaf,
  X,
  ArrowUp,
  Square,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { AgriMark } from "./brand";
import { useAgri } from "./app-context";
import { supabase } from "@/integrations/supabase/client";
import {
  messageText,
  threadTitle,
  speechLocales,
  type FarmMessage,
  type FarmThread,
} from "@/lib/agri-shared";
import type { ChatStatus } from "ai";
import { toast } from "sonner";
type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionInstance;
  webkitSpeechRecognition?: new () => RecognitionInstance;
};
async function cropPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Please choose a JPEG, PNG or WebP photo.");
  if (file.size > 10000000) throw new Error("Please choose a photo smaller than 10 MB.");
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This photo could not be opened.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    image.close();
  }
}
export function ChatWindow({
  thread,
  mode = "text",
  question = "",
}: {
  thread: FarmThread;
  mode?: "text" | "photo" | "voice";
  question?: string;
}) {
  const { language, user, updateThread, refresh } = useAgri();
  const [messages, setMessages] = useState<FarmMessage[]>(thread.messages);
  const [text, setText] = useState(question);
  const [photo, setPhoto] = useState<{ url: string; filename: string } | null>(null);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const recognition = useRef<RecognitionInstance | null>(null);
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    textarea.current?.focus();
    return () => {
      abort.current?.abort();
      recognition.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);
  function focus() {
    requestAnimationFrame(() => textarea.current?.focus());
  }
  function voice() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const w = window as SpeechWindow;
    const Constructor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Constructor) {
      setError(
        "Voice input is not supported in this browser. Try Chrome on Android, or type your question.",
      );
      return;
    }
    const instance = new Constructor();
    instance.lang = speechLocales[language];
    instance.continuous = false;
    instance.interimResults = false;
    instance.onresult = (e) => {
      const phrase = e.results[0]?.[0]?.transcript;
      if (phrase) setText((old) => `${old}${old ? " " : ""}${phrase}`);
    };
    instance.onerror = (e) => {
      setListening(false);
      setError(
        e.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access in your browser and try again."
          : "Could not hear your question. Please try again or type it.",
      );
    };
    instance.onend = () => {
      setListening(false);
      focus();
    };
    recognition.current = instance;
    setError("");
    try {
      instance.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone. Please try again.");
    }
  }
  function read(message: FarmMessage) {
    if (!window.speechSynthesis) {
      setError("Read aloud is not available in this browser.");
      return;
    }
    if (speaking === message.id) {
      window.speechSynthesis.cancel();
      setSpeaking(null);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    const locale = speechLocales[language];
    const voice =
      voices.find((v) => v.lang === locale) ||
      voices.find((v) => v.lang.startsWith(locale.split("-")[0] ?? locale));
    if (!voice) {
      setError(
        `A ${language} voice is not installed in this browser. Add one in your device's speech settings to read this answer aloud.`,
      );
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(messageText(message).replace(/[#*`]/g, ""));
    utterance.lang = locale;
    utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => {
      setSpeaking(null);
      setError("The answer could not be read aloud.");
    };
    setSpeaking(message.id);
    window.speechSynthesis.speak(utterance);
  }
  async function selectPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setPhoto({ url: await cropPhoto(file), filename: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "This photo could not be opened.");
    } finally {
      setUploading(false);
      focus();
    }
  }
  async function send() {
    if (busy || uploading || (!text.trim() && !photo)) return;
    setError("");
    recognition.current?.stop();
    setListening(false);
    const questionText =
      text.trim() || (photo ? "Please assess the visible crop symptoms in this photo." : "");
    const parts: FarmMessage["parts"] = [{ type: "text", text: questionText }];
    if (photo)
      parts.push({
        type: "file",
        mediaType: "image/jpeg",
        url: photo.url,
        filename: photo.filename,
      });
    const farmer: FarmMessage = { id: crypto.randomUUID(), role: "user", parts };
    const assistant: FarmMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [{ type: "text", text: "" }],
    };
    const history = [...messages, farmer];
    let result = [...history, assistant];
    setMessages(history);
    setText("");
    setPhoto(null);
    setStatus("submitted");
    updateThread({
      ...thread,
      messages: history,
      title: threadTitle(history[0] ?? farmer),
      updated_at: new Date().toISOString(),
    });
    focus();
    const controller = new AbortController();
    abort.current = controller;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ threadId: thread.id, language, messages: history }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const responseError = (await response.json()) as { error?: string };
        throw new Error(responseError.error ?? "The assistant is unavailable. Please try again.");
      }
      if (!response.body) throw new Error("No answer was received.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let output = "";
      let complete = false;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          if (!frame.startsWith("data: ")) continue;
          const event = JSON.parse(frame.slice(6)) as {
            type: string;
            text?: string;
            message?: string;
            id?: string;
          };
          if (event.type === "error")
            throw new Error(event.message ?? "The answer could not be completed.");
          if (event.type === "text" && event.text) {
            output += event.text;
            assistant.parts = [{ type: "text", text: output }];
            result = [...history, { ...assistant }];
            setMessages(result);
            setStatus("streaming");
          }
          if (event.type === "done") {
            complete = true;
            if (event.id) assistant.id = event.id;
            result = [...history, { ...assistant }];
            setMessages(result);
          }
        }
      }
      if (!complete)
        throw new Error("The answer was interrupted. You can ask again when you are ready.");
      updateThread({
        ...thread,
        messages: result,
        title: threadTitle(history[0] ?? farmer),
        updated_at: new Date().toISOString(),
      });
      if (user) refresh();
      setStatus("ready");
    } catch (e) {
      if (controller.signal.aborted) {
        setError("Answer stopped. Any partial response has not been saved.");
        setStatus("ready");
      } else {
        setError(e instanceof Error ? e.message : "The assistant is unavailable.");
        setStatus("error");
      }
      const kept = result.filter((m) => m.role !== "assistant" || messageText(m).length > 0);
      setMessages(kept);
      updateThread({
        ...thread,
        messages: kept,
        title: threadTitle(history[0] ?? farmer),
        updated_at: new Date().toISOString(),
      });
    } finally {
      abort.current = null;
      focus();
    }
  }
  return (
    <div className="chat-panel">
      <div className="chat-toolbar">
        <div>
          <h1 className="flex items-center gap-2">
            <Leaf size={20} className="text-primary" />
            AgriCare Assistant
          </h1>
          <p>Farming advice in {language}</p>
        </div>
        <span className="text-xs text-primary flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-primary" />
          Ready to help
        </span>
      </div>
      <Conversation>
        <ConversationContent className="transcript">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="flex justify-center text-primary">
                <AgriMark className="size-14" />
              </div>
              <h2>
                {mode === "photo"
                  ? "Let’s take a closer look at your crop"
                  : mode === "voice"
                    ? "Your voice. Your language. Your farming companion."
                    : "What’s growing on your mind?"}
              </h2>
              <p>
                {mode === "photo"
                  ? "Share a clear photo of the affected plant, along with its crop name and symptoms."
                  : mode === "voice"
                    ? "Speak to AgriCare AI in your own language."
                    : "A healthier crop, better soil, or the next step for your farm — let’s figure it out together."}
              </p>
              {mode === "photo" && (
                <Button className="h-11 mt-2" onClick={() => upload.current?.click()}>
                  <ImagePlus />
                  Upload crop photo
                </Button>
              )}
              {mode === "voice" && (
                <Button className="h-11 mt-2" onClick={voice}>
                  {listening ? <MicOff /> : <Mic />}
                  {listening ? "Stop listening" : "Start speaking"}
                </Button>
              )}
              <div className="prompt-suggestions">
                {[
                  "Why are my tomato leaves turning yellow?",
                  "When should I water my rice crop?",
                  "How can I improve my soil health?",
                  "How do I check my crop for pests?",
                ].map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    onClick={() => {
                      setText(q);
                      focus();
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role} className="chat-message">
                {message.role === "assistant" && (
                  <div className="assistant-avatar">
                    <AgriMark className="size-5" />
                    AgriCare AI
                  </div>
                )}
                <MessageContent>
                  {message.parts.map((part, i) =>
                    part.type === "text" ? (
                      message.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap leading-7">
                          {part.text}
                        </p>
                      )
                    ) : (
                      <img
                        className="photo-preview"
                        key={i}
                        src={part.url}
                        alt="Uploaded crop for assessment"
                      />
                    ),
                  )}
                </MessageContent>
                {message.role === "assistant" && messageText(message) && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Read answer aloud"
                      title="Read aloud"
                      onClick={() => read(message)}
                    >
                      {speaking === message.id ? <Square size={14} /> : <Volume2 size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copy answer"
                      title="Copy answer"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(messageText(message))
                          .then(() => {
                            setCopied(message.id);
                            toast.success("Answer copied.");
                          })
                          .catch(() => toast.error("Copy is unavailable in this browser."));
                      }}
                    >
                      {copied === message.id ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                  </div>
                )}
              </Message>
            ))
          )}
          {status === "submitted" && (
            <div className="chat-message assistant-avatar">
              <AgriMark className="size-5" />
              <Shimmer>Looking into your farming question…</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="composer-area">
        {error && (
          <div className="error-notice" role="alert">
            {error}
          </div>
        )}
        {photo && (
          <div className="flex gap-3 items-center mb-3">
            <img
              src={photo.url}
              alt="Crop photo ready to send"
              className="h-16 w-20 object-cover rounded-md"
            />
            <span className="text-xs text-muted-foreground truncate">{photo.filename}</span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Remove photo"
              onClick={() => setPhoto(null)}
            >
              <X />
            </Button>
          </div>
        )}
        <PromptInput onSubmit={() => send()}>
          <PromptInputTextarea
            ref={textarea}
            aria-label="Farming question"
            placeholder={
              listening
                ? "Listening…"
                : language === "Telugu"
                  ? "మీ పంట గురించి అడగండి…"
                  : language === "Hindi"
                    ? "अपनी फसल के बारे में पूछें…"
                    : "Ask anything about your crops…"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          <PromptInputFooter>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Upload crop photo"
                aria-label="Upload crop photo"
                disabled={busy || uploading}
                onClick={() => upload.current?.click()}
              >
                <ImagePlus />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Take crop photo"
                aria-label="Take crop photo"
                disabled={busy || uploading}
                onClick={() => camera.current?.click()}
              >
                <Camera />
              </Button>
              <Button
                type="button"
                variant={listening ? "default" : "ghost"}
                size="icon"
                title={listening ? "Stop listening" : "Voice input"}
                aria-label={listening ? "Stop listening" : "Voice input"}
                disabled={busy}
                onClick={voice}
              >
                {listening ? <MicOff /> : <Mic />}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {uploading ? "Opening photo…" : listening ? "Listening…" : language}
              </span>
            </div>
            <PromptInputSubmit
              status={status}
              disabled={!busy && ((!text.trim() && !photo) || uploading)}
              onStop={() => abort.current?.abort()}
            >
              {busy ? <Square /> : <ArrowUp />}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
        <input
          ref={upload}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Choose crop photo"
          onChange={(e) => {
            void selectPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-label="Capture crop photo"
          onChange={(e) => {
            void selectPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="composer-note">
          AI advice can be imperfect. Confirm crop diagnoses and chemical treatments with a local
          agricultural expert.
        </p>
      </div>
    </div>
  );
}
