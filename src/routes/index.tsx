import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  MessageCircle,
  ScanLine,
  Mic,
  Sprout,
  ShieldCheck,
  Leaf,
  Droplets,
  Wheat,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import fields from "@/assets/agricare-fields.png.asset.json";
import { useStartChat } from "@/components/agri/chat-actions";
import { QuickActions } from "@/components/agri/quick-actions";
import { Footer } from "@/components/agri/footer";
import { farmingTips, pageHead } from "@/lib/agri-shared";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Your Smart Farming Companion",
      "AgriCare AI helps Indian farmers get simple farming advice, crop photo assessments and voice assistance in their own language.",
    ),
  component: Home,
});
function Home() {
  const start = useStartChat();
  return (
    <>
      <section className="hero">
        <img
          className="hero-photo"
          src={fields.url}
          alt="Lush green rice fields and an Indian farmer walking along a field path"
        />
        <div className="site-inner hero-inner">
          <div className="hero-eyebrow">
            <Sprout size={14} />
            Rooted in farming. Powered by AI.
          </div>
          <h1>
            Your Smart
            <br />
            Farming <span>Companion</span>
          </h1>
          <p className="hero-subtitle">Ask in your language. Get smart farming solutions.</p>
          <p className="hero-support">A little guidance today. A healthier harvest tomorrow.</p>
          <div className="hero-actions">
            <Button size="lg" className="hero-button h-11 px-5" onClick={() => void start()}>
              <MessageCircle size={18} />
              Start Chat
              <ArrowRight size={16} />
            </Button>
            <Button
              size="lg"
              className="hero-outline h-11 px-5"
              onClick={() => void start("photo")}
            >
              <ScanLine size={18} />
              Upload Crop Image
            </Button>
            <Button
              size="lg"
              className="hero-outline h-11 px-5"
              onClick={() => void start("voice")}
            >
              <Mic size={18} />
              Voice Assistant
            </Button>
          </div>
          <div className="hero-footnote">
            <ShieldCheck size={14} />
            No sign-in needed<span className="mx-1">·</span>తెలుగు, हिन्दी, English & more
          </div>
        </div>
        <div className="hero-note">
          <div className="rounded-full border border-hero-foreground/40 p-2">
            <Sprout size={22} />
          </div>
          <span>
            <strong>Better care. Better harvests.</strong>For the hands that feed our nation.
          </span>
        </div>
      </section>
      <section className="section site-inner">
        <div className="section-title">
          <div>
            <h2>Good farming starts with a good question.</h2>
            <p>A helping hand for every step of your farming journey.</p>
          </div>
          <span className="section-kicker">
            <Check size={14} />
            Simple advice. In your language.
          </span>
        </div>
        <QuickActions />
      </section>
      <section className="tips-band">
        <div className="section site-inner">
          <div className="section-title">
            <div>
              <h2 className="flex items-center gap-2">
                <Sprout size={22} className="text-primary" />
                Small tips. Healthier fields.
              </h2>
              <p>A little care goes a long way.</p>
            </div>
            <Button variant="link" asChild>
              <Link to="/tips">
                All farming tips
                <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
          <div className="tip-grid">
            {farmingTips.slice(0, 3).map((tip, i) => {
              const Icon = i === 0 ? Droplets : i === 1 ? Leaf : Wheat;
              return (
                <article className="tip-item" key={tip.title}>
                  <div className={`icon-tile ${i === 2 ? "voice" : ""}`}>
                    <Icon size={21} />
                  </div>
                  <div>
                    <h3>{tip.title}</h3>
                    <p>{tip.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
