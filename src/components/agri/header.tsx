import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Globe2, Menu, X, UserRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { languages, type Language } from "@/lib/agri-shared";
import { supabase } from "@/integrations/supabase/client";
import { useAgri } from "./app-context";
import { Brand } from "./brand";
import { toast } from "sonner";
export function LanguageSelect() {
  const { language, setLanguage } = useAgri();
  return (
    <label className="language-select">
      <Globe2 size={16} />
      <select
        aria-label="Language"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        {languages.map((v) => (
          <option key={v} value={v}>
            {v === "Telugu" ? "తెలుగు" : v === "Hindi" ? "हिन्दी" : v}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Header() {
  const { user, setAuthOpen } = useAgri();
  const [menu, setMenu] = useState(false);
  const path = useLocation({ select: (l) => l.pathname });
  const links = [
    { to: "/", label: "Home" },
    { to: "/assistant", label: "AI Assistant" },
    { to: "/dashboard", label: "My Dashboard" },
    { to: "/tips", label: "Farming Tips" },
  ] as const;
  const nav = links.map((link) => (
    <Link
      key={link.to}
      to={link.to}
      onClick={() => setMenu(false)}
      className={`nav-link ${path === link.to || (link.to === "/assistant" && path.startsWith("/chat/")) ? "active" : ""}`}
    >
      {link.label}
    </Link>
  ));
  return (
    <header className="site-header">
      <div className="site-inner header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav}
        </nav>
        <div className="header-actions">
          <LanguageSelect />
          {user ? (
            <Button
              title="Sign out"
              aria-label="Sign out"
              variant="ghost"
              size="icon"
              onClick={() => {
                void supabase.auth.signOut().then(({ error }) => {
                  if (error) toast.error("Could not sign out. Please try again.");
                });
              }}
            >
              <LogOut />
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setAuthOpen(true)}>
              <UserRound />
              <span className="signin-label">Sign in</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="menu-toggle"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {menu && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {nav}
        </nav>
      )}
    </header>
  );
}
