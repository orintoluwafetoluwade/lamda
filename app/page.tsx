"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Check, ChevronDown, CircleHelp, Clock3, Code2, Command, ExternalLink, FileCode2, Github, Layers3, LayoutDashboard, LoaderCircle, Mail, Menu, MessageSquare, PanelLeftClose, Plus, Rocket, Settings2, ShieldCheck, Sparkles, Terminal, WandSparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Health = { configured: boolean; model: string; status: string };
type IntegrationStatus = { github: { configured: boolean }; resend: { configured: boolean }; database: { configured: boolean }; previewRuntime: { configured: boolean } };
const starters = [
  { icon: "layout", title: "Build a SaaS dashboard", prompt: "Plan a modern SaaS analytics dashboard with key metrics, an activity feed, responsive navigation, and polished UI." },
  { icon: "layers", title: "Create a landing page", prompt: "Design a high-converting landing page for a productivity app with hero, benefits, features, pricing, and CTA." },
  { icon: "code", title: "Plan a full-stack app", prompt: "Help me plan a production-minded full-stack application. Propose the architecture, data model, API routes, authentication, and implementation steps." }
];

function StarterIcon({ name }: { name: string }) {
  if (name === "layout") return <LayoutDashboard size={17} />;
  if (name === "layers") return <Layers3 size={17} />;
  return <Code2 size={17} />;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState("workspace");
  const [projectName, setProjectName] = useState("Untitled project");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/agent").then((response) => response.json()).then(setHealth)
      .catch(() => setHealth({ configured: false, model: "unknown", status: "offline" }));
  }, []);
  useEffect(() => { fetch("/api/integrations").then((response) => response.json()).then(setIntegrationStatus).catch(() => setIntegrationStatus(null)); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  async function send(value = prompt) {
    const text = value.trim();
    if (!text || busy) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setPrompt("");
    setBusy(true);
    setError("");
    setTab("workspace");
    if (projectName === "Untitled project") setProjectName(text.slice(0, 32));
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, history: messages.slice(-12) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The request failed.");
      setMessages([...next, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className={"sidebar " + (sidebarOpen ? "" : "sidebar-collapsed")}>
        <div className="brand-row">
          <div className="brand-mark"><Command size={19} /></div>
          {sidebarOpen && <>
            <span className="brand-name">forgepilot<span>_</span></span>
            <button className="icon-button sidebar-toggle" title="Collapse sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={17} /></button>
          </>}
        </div>
        {!sidebarOpen && <button className="icon-button expand-toggle" title="Expand sidebar" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>}
        <button className="new-project" onClick={() => { setMessages([]); setProjectName("Untitled project"); setTab("workspace"); }}>
          <Plus size={17} />{sidebarOpen && <span>New project</span>}{sidebarOpen && <kbd>⌘ K</kbd>}
        </button>
        {sidebarOpen && <>
          <div className="side-label">WORKSPACE</div>
          <button className={"nav-item " + (tab === "workspace" ? "active" : "")} onClick={() => setTab("workspace")}><MessageSquare size={16} /><span>AI workspace</span></button>
          <button className={"nav-item " + (tab === "projects" ? "active" : "")} onClick={() => setTab("projects")}><Layers3 size={16} /><span>My projects</span><span className="nav-count">{messages.length ? "1" : "0"}</span></button>
          <div className="side-label integrations-label">DEVELOPMENT</div>
          <button className={"nav-item " + (tab === "github" ? "active" : "")} onClick={() => setTab("github")}><Github size={16} /><span>GitHub</span><span className="mini-status" /></button>
          <button className={"nav-item " + (tab === "integrations" ? "active" : "")} onClick={() => setTab("integrations")}><Settings2 size={16} /><span>Integrations</span></button>
          <div className="sidebar-bottom">
            <div className="plan-card"><div className="plan-icon"><Sparkles size={16} /></div><div><b>Build with AI</b><p>Connect your AI engine</p></div><button onClick={() => setTab("integrations")} aria-label="Configure AI"><ArrowUp size={15} /></button></div>
            <div className="profile-row"><div className="avatar">F</div><div className="profile-text"><b>ForgePilot workspace</b><span>Development preview</span></div><ChevronDown size={15} /></div>
          </div>
        </>}
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="crumbs"><span className="crumb-muted">Projects</span><span className="slash">/</span><span className="crumb-current">{tab === "integrations" ? "Integrations" : tab === "github" ? "GitHub connection" : tab === "projects" ? "My projects" : projectName}</span><ChevronDown size={14} /></div>
          <div className="top-actions">
            <span className={"connection-pill " + (health?.configured ? "is-ready" : "")}><span className="status-dot" />{health?.configured ? "AI connected" : "AI not configured"}</span>
            <button className="icon-button" title="Help"><CircleHelp size={17} /></button><div className="avatar small-avatar">F</div>
          </div>
        </header>

        {tab === "workspace" && (
          <div className="workspace">
            <div className="conversation-area">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-orb"><div className="orb-core"><WandSparkles size={25} /></div><span className="orb-spark spark-one">✳</span><span className="orb-spark spark-two">✦</span><span className="orb-spark spark-three">·</span></div>
                  <div className="eyebrow"><span className="eyebrow-line" />YOUR AI DEVELOPMENT PARTNER</div>
                  <h1>Big ideas start<br />with <span>one prompt.</span></h1>
                  <p className="welcome-copy">Describe what you want to build. ForgePilot helps you shape the idea, plan the architecture, and write the code to bring it to life.</p>
                  <div className="starter-grid">
                    {starters.map((starter) => (
                      <button className="starter-card" key={starter.title} onClick={() => void send(starter.prompt)}>
                        <span className="starter-icon"><StarterIcon name={starter.icon} /></span><span className="starter-title">{starter.title}</span><span className="starter-arrow">↗</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((message, index) => (
                    <div className={"message " + message.role} key={index}>
                      <div className={"message-avatar " + (message.role === "assistant" ? "assistant-avatar" : "")}>{message.role === "assistant" ? <Bot size={17} /> : "Y"}</div>
                      <div className="message-body">
                        <div className="message-label">{message.role === "assistant" ? "FORGEPILOT" : "YOU"}</div>
                        <div className="message-content"><p>{message.content}</p></div>
                      </div>
                    </div>
                  ))}
                  {busy && <div className="message assistant"><div className="message-avatar assistant-avatar"><Bot size={17} /></div><div className="message-body"><div className="message-label">FORGEPILOT</div><div className="thinking"><span /><span /><span /> Thinking through your idea…</div></div></div>}
                  {error && <div className="error-banner"><ShieldCheck size={16} /><span>{error}</span><button onClick={() => void send(messages[messages.length - 1]?.content || "")}>Retry</button></div>}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
            <div className="composer-wrap">
              <div className="composer">
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Describe the app you want to build..." rows={2} maxLength={12000} />
                <div className="composer-footer"><div className="composer-tools"><span className="model-select"><Sparkles size={14} />{health?.model || "OpenAI model"}<ChevronDown size={13} /></span><span className="composer-hint">AI can make mistakes. Review generated code.</span></div><button className="send-button" onClick={() => void send()} disabled={!prompt.trim() || busy} aria-label="Send prompt">{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowUp size={18} />}</button></div>
              </div>
              <div className="composer-caption"><span><ShieldCheck size={12} /> Your API key stays server-side</span><span><kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for new line</span></div>
            </div>
          </div>
        )}

        {tab === "integrations" && (
          <div className="settings-page">
            <div className="page-heading"><div className="eyebrow">CONFIGURE YOUR STACK</div><h1>Integrations</h1><p>Connect the services that power your development workflow.</p></div>
            <div className="integration-list">
              <Integration icon={<Sparkles size={20} />} name="OpenAI" desc="Power the coding agent with OpenAI models." status={health?.configured ? "Connected" : "Needs setup"} ready={Boolean(health?.configured)} detail={health?.configured ? "Model: " + health.model : "Add OPENAI_API_KEY to your server environment."} />
              <Integration icon={<Github size={20} />} name="GitHub" desc="Connect repositories, create branches and open pull requests." status={integrationStatus?.github.configured ? "Credentials configured" : "Needs setup"} ready={Boolean(integrationStatus?.github.configured)} detail={integrationStatus?.github.configured ? "Credentials are present; repository actions still need end-to-end implementation." : "Configure a GitHub App and server-side installation credentials."} />
              <Integration icon={<Mail size={20} />} name="Resend" desc="Send project notifications and transactional email." status={integrationStatus?.resend.configured ? "Credentials configured" : "Needs setup"} ready={Boolean(integrationStatus?.resend.configured)} detail={integrationStatus?.resend.configured ? "Credentials are present; delivery still requires a valid sender and verified domain." : "Set RESEND_API_KEY and a verified RESEND_FROM_EMAIL."} />
              <Integration icon={<Layers3 size={20} />} name="Database & authentication" desc="Persist users, projects, messages and build history." status={integrationStatus?.database.configured ? "Credentials configured" : "Not connected"} ready={Boolean(integrationStatus?.database.configured)} detail={integrationStatus?.database.configured ? "Apply the SQL migration and verify auth/RLS before production use." : "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."} />
              <Integration icon={<Terminal size={20} />} name="Isolated preview runtime" desc="Run generated projects away from the application server." status={integrationStatus?.previewRuntime.configured ? "Credentials configured" : "Not connected"} ready={Boolean(integrationStatus?.previewRuntime.configured)} detail={integrationStatus?.previewRuntime.configured ? "Provider credentials are present; runtime adapter still needs implementation." : "A dedicated sandbox provider is required; generated code is not executed here."} />
              <Integration icon={<Rocket size={20} />} name="Deployment" desc="Ship tested projects to a production hosting provider." status="Not connected" detail="Connect a deployment provider after preview and build isolation are implemented." />
            </div>
            <div className="security-note"><ShieldCheck size={18} /><div><b>Security by default</b><p>Keep API keys in server environment variables. Never add secret values to client-side code or commit them to Git.</p></div></div>
          </div>
        )}

        {tab === "github" && (
          <div className="settings-page">
            <div className="page-heading"><div className="eyebrow">SOURCE CONTROL</div><h1>GitHub connection</h1><p>Keep your generated work versioned, reviewable, and under your control.</p></div>
            <div className="github-hero"><div className="github-large"><Github size={29} /></div><div><h2>Connect your repositories</h2><p>ForgePilot is designed to work with your existing GitHub projects. Secure repository access needs a configured GitHub App or OAuth flow.</p><button className="primary-button" onClick={() => setTab("integrations")}>Configure integration <ExternalLink size={15} /></button></div></div>
            <div className="feature-row"><span><Check size={15} /> Feature branches, not direct pushes to main</span><span><Check size={15} /> Review changes before merging</span><span><Check size={15} /> Least-privilege credentials</span></div>
            <div className="notice"><Clock3 size={17} /><p>Repository listing and writes are not active in this deployment yet. Configure the GitHub App credentials and OAuth callback before enabling them.</p></div>
          </div>
        )}

        {tab === "projects" && (
          <div className="settings-page"><div className="page-heading"><div className="eyebrow">YOUR WORKSPACE</div><h1>My projects</h1><p>Your projects will appear here as persistent storage is connected.</p></div><div className="empty-projects"><div className="empty-icon"><FileCode2 size={24} /></div><h2>No saved projects yet</h2><p>This scaffold currently keeps the conversation in this browser session. Connect a database to save projects across devices and sessions.</p><button className="primary-button" onClick={() => { setMessages([]); setProjectName("Untitled project"); setTab("workspace"); }}>Start a project <Plus size={16} /></button></div></div>
        )}

        <footer className="footer"><span>© 2026 ForgePilot AI</span><span><span className="footer-dot" /> Development preview · Not production-ready</span><span className="footer-right"><ShieldCheck size={13} /> Built with care</span></footer>
      </section>
    </main>
  );
}

function Integration({ icon, name, desc, status, ready, detail }: { icon: React.ReactNode; name: string; desc: string; status: string; ready?: boolean; detail: string }) {
  return <div className="integration-card"><div className="integration-icon">{icon}</div><div className="integration-copy"><div className="integration-title">{name}<span className={"integration-status " + (ready ? "ready" : "")}><i />{status}</span></div><p>{desc}</p><small>{detail}</small></div><button className="outline-button" onClick={() => window.alert("See README.md for environment setup instructions.")}>Setup <ArrowUp size={13} /></button></div>;
}
