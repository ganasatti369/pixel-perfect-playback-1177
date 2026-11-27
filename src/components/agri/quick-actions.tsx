import { ArrowUpRight, ArrowRight, MessageCircle, ScanLine, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStartChat } from "./chat-actions";
const actions = [
  {
    mode: "text",
    icon: MessageCircle,
    className: "",
    title: "Ask your farming questions",
    text: "From seed to harvest, get practical advice for your crops in your own language.",
    cta: "Chat with AgriCare AI",
  },
  {
    mode: "photo",
    icon: ScanLine,
    className: "photo",
    title: "A healthier crop starts here",
    text: "Share a crop photo to understand visible symptoms and find your next steps.",
    cta: "Check your crop",
  },
  {
    mode: "voice",
    icon: Mic,
    className: "voice",
    title: "Just speak. We’re listening.",
    text: "Talk naturally in your language. Get farming advice without typing a word.",
    cta: "Try voice assistant",
  },
] as const;
export function QuickActions() {
  const start = useStartChat();
  return (
    <div className="quick-grid">
      {actions.map((a) => (
        <article className="quick-card" key={a.mode}>
          <div className="quick-card-top">
            <div className={`icon-tile ${a.className}`}>
              <a.icon size={23} />
            </div>
            <ArrowUpRight size={17} className="text-muted-foreground" />
          </div>
          <h3>{a.title}</h3>
          <p>{a.text}</p>
          <Button variant="link" className="p-0 h-auto" onClick={() => void start(a.mode)}>
            {a.cta}
            <ArrowRight size={15} />
          </Button>
        </article>
      ))}
    </div>
  );
}
