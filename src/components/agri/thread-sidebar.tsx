import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgri } from "./app-context";
import { useStartChat } from "./chat-actions";
import { toast } from "sonner";
export function ThreadSidebar({ activeId }: { activeId?: string }) {
  const { threads, user, loading, historyError, deleteThread, setAuthOpen } = useAgri();
  const start = useStartChat();
  const navigate = useNavigate();
  async function remove(id: string) {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await deleteThread(id);
      if (activeId === id) await navigate({ to: "/assistant" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this conversation.");
    }
  }
  return (
    <aside className="thread-sidebar">
      <Button className="w-full h-11" onClick={() => void start()}>
        <Plus size={17} />
        New conversation
      </Button>
      <div className="mt-6 mb-3 px-2 text-[11px] uppercase font-semibold text-muted-foreground">
        Your conversations
      </div>
      {loading && <p className="text-sm px-2 text-muted-foreground">Loading conversations…</p>}
      {historyError && <p className="error-notice">{historyError}</p>}
      <div className="thread-list">
        {threads.map((thread) => (
          <div key={thread.id} className={`thread-row ${activeId === thread.id ? "active" : ""}`}>
            <Link
              className="thread-link"
              to="/chat/$threadId"
              params={{ threadId: thread.id }}
              search={{ mode: "text", question: "" }}
            >
              <MessageCircle size={16} />
              <span>{thread.title}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${thread.title}`}
              title="Delete conversation"
              onClick={() => void remove(thread.id)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
      </div>
      {!loading && threads.length === 0 && (
        <p className="text-xs text-muted-foreground px-2">No conversations yet.</p>
      )}
      {!user && (
        <div className="guest-notice">
          Guest conversations last for this visit.{" "}
          <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setAuthOpen(true)}>
            Sign in
          </Button>{" "}
          before starting a new chat to save it.
        </div>
      )}
    </aside>
  );
}
