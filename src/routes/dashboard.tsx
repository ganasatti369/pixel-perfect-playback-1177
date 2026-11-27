import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Sprout, Globe2, Clock3 } from "lucide-react";
import { pageHead, farmingTips } from "@/lib/agri-shared";
import { useAgri } from "@/components/agri/app-context";
import { QuickActions } from "@/components/agri/quick-actions";
import { Footer } from "@/components/agri/footer";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/dashboard")({
  head: () =>
    pageHead(
      "My Farmer Dashboard",
      "Your farming conversations, preferred language and quick access to AgriCare AI crop assistance.",
    ),
  component: Dashboard,
});
function Dashboard() {
  const { user, threads, loading, historyError, language, setAuthOpen } = useAgri();
  return (
    <>
      <main className="site-inner">
        <div className="page-heading flex items-start justify-between gap-4">
          <div>
            <p className="text-primary text-sm mb-3 flex items-center gap-2">
              <Sprout size={17} />A fresh start for your farm
            </p>
            <h1>Welcome to your farming space.</h1>
            <p>One place for your questions, your crops, and your next steps.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 pb-8 text-sm text-muted-foreground">
          <span className="flex gap-2 items-center">
            <MessageCircle size={16} />
            {threads.length} conversation{threads.length === 1 ? "" : "s"}
          </span>
          <span className="flex gap-2 items-center">
            <Globe2 size={16} />
            {language}
          </span>
          <span className="flex gap-2 items-center">
            <Clock3 size={16} />
            {user ? "Your conversations are saved" : "Guest visit"}
          </span>
        </div>
        <QuickActions />
        <section className="section">
          <div className="section-title">
            <div>
              <h2>Recent conversations</h2>
              <p>Pick up where you left off.</p>
            </div>
            <Button variant="link" asChild>
              <Link to="/assistant">
                View all
                <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading conversations…</p>
          ) : historyError ? (
            <p className="error-notice">{historyError}</p>
          ) : threads.length ? (
            <div className="recent-grid">
              {threads.slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  className="recent-item"
                  to="/chat/$threadId"
                  params={{ threadId: t.id }}
                  search={{ mode: "text", question: "" }}
                >
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{t.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t.messages.filter((m) => m.role === "user").length} question
                      {t.messages.filter((m) => m.role === "user").length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 border-b border-border text-muted-foreground">
              <MessageCircle className="mb-3" />
              <p>No questions yet. Your next farming conversation starts here.</p>
            </div>
          )}
          {!user && (
            <p className="mt-5 text-sm text-muted-foreground">
              <Button variant="link" className="p-0 h-auto" onClick={() => setAuthOpen(true)}>
                Sign in
              </Button>{" "}
              before starting a conversation to keep your questions for later.
            </p>
          )}
        </section>
        <section className="section border-t border-border">
          <div className="section-title">
            <h2>Care for your field, every day.</h2>
            <Button variant="link" asChild>
              <Link to="/tips">
                Farming tips
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="tip-grid">
            {farmingTips.slice(0, 3).map((t) => (
              <article key={t.title}>
                <h3 className="font-semibold text-base mb-2">{t.title}</h3>
                <p className="text-muted-foreground text-sm leading-7">{t.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
