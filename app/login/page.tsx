"use client";

import { FormEvent, useState } from "react";
import { Command, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const configured = Boolean(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT && process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!configured) {
      setError("Authentication is not configured. Add the Appwrite endpoint and project ID to the deployment environment.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Authentication failed. Please try again.");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next && next.startsWith("/") ? next : "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-shell">
    <div className="login-brand"><div className="brand-mark"><Command size={19} /></div><span className="brand-name">forgepilot<span>_</span></span></div>
    <section className="login-card">
      <div className="login-icon"><Sparkles size={22} /></div>
      <div className="eyebrow">YOUR IDEAS, ENGINEERED</div>
      <h1>{mode === "signin" ? "Welcome back." : "Start building."}</h1>
      <p className="login-subtitle">Sign in to your ForgePilot workspace to continue.</p>
      {!configured && <div className="login-setup"><ShieldCheck size={17} /><span>Appwrite setup required: add the endpoint and project ID environment variables in Vercel.</span></div>}
      <form onSubmit={submit} className="login-form">
        {mode === "signup" && <label>Your name<input type="text" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>}
        <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
        <button className="login-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : null}{mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      {error && <p className="login-error" role="alert">{error}</p>}
      <p className="login-switch">{mode === "signin" ? "New to ForgePilot?" : "Already have an account?"} <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>{mode === "signin" ? "Create an account" : "Sign in instead"}</button></p>
    </section>
    <p className="login-footer"><ShieldCheck size={13} /> Your credentials are handled by Appwrite Auth.</p>
  </main>;
}
