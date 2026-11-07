"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Keep a short-lived local reference for the secure Auth call, then clear
    // React state so the password is not retained in the rendered form.
    const passwordForAuth = password;
    setPassword("");

    try {
      const supabase = createClient();

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password: passwordForAuth,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: passwordForAuth,
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel: branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 p-12 flex-col justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
            VL
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            VendorLens
          </span>
        </Link>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Stop the vendor chaos.
            <br />
            Start seeing clearly.
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            AI-powered visibility into every vendor, contract, and renewal across your
            organization.
          </p>
        </div>

        <p className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} VendorLens AI
        </p>
      </div>

      {/* Right panel: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
              VL
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              VendorLens
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-slate-500 mb-8">
            {isSignUp
              ? "Get started with VendorLens AI"
              : "Sign in to your VendorLens account"}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-slate-900 font-medium hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
          {!isSignUp && (
            <p className="text-center text-sm text-slate-500 mt-3">
              <Link href="/forgot-password" className="text-slate-900 font-medium hover:underline">
                Forgot your password?
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
