import { createFileRoute } from "@tanstack/react-router";
import { Leaf, Droplets, Wheat, ArrowRight } from "lucide-react";
import { farmingTips, pageHead } from "@/lib/agri-shared";
import { useStartChat } from "@/components/agri/chat-actions";
import { Footer } from "@/components/agri/footer";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/tips")({
  head: () =>
    pageHead(
      "Practical Farming Tips",
      "Simple, low-risk field care tips for Indian farmers covering soil, crop inspection, irrigation and pest management.",
    ),
  component: Tips,
});
function Tips() {
  const start = useStartChat();
  return (
    <>
      <main className="site-inner">
        <div className="page-heading">
          <p className="text-primary text-sm mb-3 flex gap-2 items-center">
            <Leaf size={17} />A little care goes a long way
          </p>
          <h1>Small tips. Healthier fields.</h1>
          <p>Practical habits for the hands that grow our food.</p>
        </div>
        <div className="tip-list">
          {farmingTips.map((t) => {
            const Icon = t.icon === "water" ? Droplets : t.icon === "soil" ? Wheat : Leaf;
            return (
              <article className="tip-detail" key={t.title}>
                <div className="flex justify-between items-center">
                  <div className={`icon-tile ${t.icon === "soil" ? "voice" : ""}`}>
                    <Icon size={22} />
                  </div>
                  <span className="text-xs text-muted-foreground">{t.category}</span>
                </div>
                <h2>{t.title}</h2>
                <p>{t.text}</p>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => void start("text", t.question)}
                >
                  Ask about this
                  <ArrowRight size={14} />
                </Button>
              </article>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground pb-8">
          General guidance only. Local crop, soil, and weather conditions matter — consult your
          agricultural extension office for advice specific to your field.
        </p>
      </main>
      <Footer />
    </>
  );
}
