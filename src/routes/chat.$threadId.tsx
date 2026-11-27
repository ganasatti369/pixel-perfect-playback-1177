import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { pageHead } from "@/lib/agri-shared";
import { useAgri } from "@/components/agri/app-context";
import { ThreadSidebar } from "@/components/agri/thread-sidebar";
import { ChatWindow } from "@/components/agri/chat-window";
import { Button } from "@/components/ui/button";
const searchSchema = z.object({
  mode: z.enum(["text", "photo", "voice"]).catch("text"),
  question: z.string().max(2000).catch(""),
});
export const Route = createFileRoute("/chat/$threadId")({
  validateSearch: searchSchema,
  head: () =>
    pageHead(
      "Farming Conversation",
      "Your private AgriCare AI conversation for practical crop and farming advice.",
    ),
  component: ChatPage,
});
function ChatPage() {
  const { threadId } = Route.useParams();
  const { mode, question } = Route.useSearch();
  const { threads, loading, historyError, refresh, user, setAuthOpen } = useAgri();
  const thread = threads.find((t) => t.id === threadId);
  return (
    <div className="workspace">
      <ThreadSidebar activeId={threadId} />
      {loading ? (
        <main className="p-10 text-muted-foreground">Loading your conversation…</main>
      ) : thread ? (
        <ChatWindow
          key={`${user?.id ?? "guest"}:${threadId}`}
          thread={thread}
          mode={mode}
          question={question}
        />
      ) : (
        <main className="p-10">
          <h1 className="text-2xl mb-3">
            {historyError ? "Your chats could not be loaded" : "Conversation not found"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {historyError ??
              (user
                ? "This conversation may have been deleted or belongs to another account."
                : "Guest chats are only kept for this visit. Sign in to restore saved conversations.")}
          </p>
          <div className="flex gap-3">
            {historyError && <Button onClick={refresh}>Try again</Button>}
            {!user && <Button onClick={() => setAuthOpen(true)}>Sign in</Button>}
            <Button variant="outline" asChild>
              <Link to="/assistant">Back to assistant</Link>
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}
