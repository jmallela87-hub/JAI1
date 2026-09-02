"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/ui/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (!profile?.approved) {
      setError(
        "Your account hasn't been approved for access yet. We'll notify you when it is."
      );
      await supabase.auth.signOut();
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to JAI.">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
