"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsLoading(false);
      toast.error(error.message || "Could not sign in.");
      return;
    }

    toast.success("Welcome back. Entering Syncro.");
    router.push("/workspace");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-6 px-4 py-10 md:grid-cols-2 md:px-8">
      <section className="rounded-3xl border border-indigo-300/20 bg-slate-900/55 p-7 shadow-glass backdrop-blur-xl">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-200/80">
          <Sparkles size={14} />
          Syncro Authentication
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Sign in to the execution layer</h1>
        <p className="mt-3 max-w-md text-sm text-slate-300">
          Access your team command center, project streams, and task orchestration board from one secure pane.
        </p>

        <form onSubmit={handleSignIn} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-slate-400">
              <Mail size={13} />
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-white/20 bg-slate-950/75 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-300/40"
            />
          </label>

          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-slate-400">
              <Lock size={13} />
              Password
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-white/20 bg-slate-950/75 px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-indigo-300/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl border border-indigo-300/35 bg-indigo-500/20 px-4 py-2.5 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Login to Syncro"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-7 shadow-glass backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Demo Credentials</h2>
        <p className="mt-2 text-sm text-slate-300">
          For recruiter walkthroughs, create these users in Supabase Auth and map roles in `public.profiles`.
        </p>

        <div className="mt-5 space-y-3">
          <article className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/70">Admin Demo</p>
            <p className="mt-2 text-sm text-slate-200">Email: admin@syncro.demo</p>
            <p className="text-sm text-slate-200">Password: SyncroAdmin@123</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/70">Member Demo</p>
            <p className="mt-2 text-sm text-slate-200">Email: member@syncro.demo</p>
            <p className="text-sm text-slate-200">Password: SyncroMember@123</p>
          </article>
        </div>

        <p className="mt-5 text-xs text-slate-400">
          Tip: Ensure `profiles.role` is `ADMIN` for admin demo users and `MEMBER` for workspace demos.
        </p>
      </section>
    </main>
  );
}
