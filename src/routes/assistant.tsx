import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThreadSidebar } from "@/components/agri/thread-sidebar";
import { QuickActions } from "@/components/agri/quick-actions";
import { useStartChat } from "@/components/agri/chat-actions";
import { AgriMark } from "@/components/agri/brand";
import { pageHead } from "@/lib/agri-shared";
import { MessageCircle, ArrowRight } from "lucide-react";
export const Route = createFileRoute("/assistant")({
  head: () =>
    pageHead(
      "AI Farming Assistant",
      "Ask AgriCare AI about crop health, soil, irrigation and safe crop care in your preferred language.",
    ),
  component: Assistant,
});
function Assistant() {
  const start = useStartChat();
  return (
    <div className="workspace">
      <ThreadSidebar />
      <main className="p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-primary mt-6">
            <AgriMark className="size-12" />
          </div>
          <div className="page-heading">
            <h1>
              Your farm. Your questions.
              <br />
              Your AgriCare companion.
            </h1>
            <p>Let’s find the next right step for your crop.</p>
          </div>
          <Button size="lg" className="h-12 mb-9" onClick={() => void start()}>
            <MessageCircle />
            Start a conversation
            <ArrowRight />
          </Button>
          <QuickActions />
        </div>
      </main>
    </div>
  );
}
