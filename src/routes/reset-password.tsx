import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageHead } from "@/lib/agri-shared";
export const Route = createFileRoute("/reset-password")({
  head: () =>
    pageHead("Reset Password", "Securely reset the password for your AgriCare AI account."),
  component: ResetPassword,
});
function ResetPassword() {
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") === "recovery") setAllowed(true);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setAllowed(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setNotice("The two passwords must match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setNotice(error.message);
    else {
      setDone(true);
      setNotice("Your password has been updated.");
    }
  }
  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl mb-5">Reset your password</h1>
      {done ? (
        <>
          <p role="status">{notice}</p>
          <Button className="mt-6" asChild>
            <Link to="/">Back to AgriCare AI</Link>
          </Button>
        </>
      ) : allowed ? (
        <form onSubmit={submit} className="grid gap-4">
          <label>
            New password
            <Input
              className="mt-2 h-11"
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Confirm password
            <Input
              className="mt-2 h-11"
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {notice && (
            <p role="alert" className="text-sm text-destructive">
              {notice}
            </p>
          )}
          <Button disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
        </form>
      ) : (
        <p className="text-muted-foreground">
          Open the password reset link from your email to set a new password. If it has expired,
          request a fresh link from Sign in.
        </p>
      )}
    </main>
  );
}
