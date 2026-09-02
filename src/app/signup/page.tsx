"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/ui/AuthShell";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // New accounts start unapproved (see profiles.approved in schema.sql).
    // If email confirmation is on, there's also no session yet at this point.
    if (!data.session) {
      setAwaitingApproval(true);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  if (awaitingApproval) {
    return (
      <AuthShell
        title="Check your access"
        subtitle="Confirm your email, then an admin needs to approve your account before you can sign in. We'll be quick."
      >
        <Link
          href="/login"
          className="text-sm font-medium text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="JAI is invite-only while it's in early access."
    >
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <Input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          minLength={8}
          required
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
