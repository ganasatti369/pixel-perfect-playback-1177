import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { useAgri } from "./app-context";
export function AuthDialog() {
  const { authOpen, setAuthOpen } = useAgri();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setNotice("Check your email to confirm your account, then sign in.");
        else setAuthOpen(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthOpen(false);
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Sign-in could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: "google" | "lovable") {
    setBusy(true);
    setNotice("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) setNotice("Sign-in could not be completed. Please try again.");
    } catch {
      setNotice("Sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "signup"
              ? "Join AgriCare AI"
              : mode === "reset"
                ? "Reset your password"
                : "Welcome to AgriCare AI"}
          </DialogTitle>
          <DialogDescription>
            Save your farming conversations and language preference. Guest chats remain available
            without an account.
          </DialogDescription>
        </DialogHeader>
        {mode !== "reset" && (
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => void social("google")}
              disabled={busy}
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              Continue with Google
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => void social("lovable")}
              disabled={busy}
            >
              <LovableMark />
              Continue with Lovable
            </Button>
            <div className="text-center text-xs text-muted-foreground">or continue with email</div>
          </div>
        )}
        <form onSubmit={submit} className="grid gap-3">
          <label className="text-sm">
            Email
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11"
            />
          </label>
          {mode !== "reset" && (
            <label className="text-sm">
              Password
              <Input
                type="password"
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-11"
              />
            </label>
          )}
          {notice && (
            <p className="text-sm text-muted-foreground" role="status">
              {notice}
            </p>
          )}
          <Button disabled={busy} className="h-11">
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
        </form>
        <div className="flex justify-between">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setNotice("");
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin" ? "Create an account" : "Back to sign in"}
          </Button>
          {mode === "signin" && (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setNotice("");
                setMode("reset");
              }}
            >
              Forgot password?
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
