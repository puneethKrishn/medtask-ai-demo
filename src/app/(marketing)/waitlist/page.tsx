"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Shield,
  Sparkles,
  Link2,
  Stethoscope,
  Building2,
  Hospital,
  CheckCircle2,
  ArrowRight,
  Mail,
  Clock,
  Users,
  ClipboardCheck,
} from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/medcorp";

const segments = [
  {
    icon: Stethoscope,
    title: "Solo Practitioners",
    message: "Your AI medical assistant that never forgets a follow-up",
    benefit: "Recover 30 minutes every day",
    proof: "Set up in 2 minutes, works from your phone",
  },
  {
    icon: Building2,
    title: "Clinics (5-50 staff)",
    message: "Coordinate your whole team without another meeting",
    benefit: "40% fewer dropped tasks",
    proof: "Connects to your EHR — tasks flow automatically",
  },
  {
    icon: Hospital,
    title: "Small Hospitals",
    message: "Task accountability that satisfies your next audit",
    benefit: "Complete audit trail, zero sticky notes",
    proof: "HIPAA audit log with patient-linked task history",
  },
];

const pillars = [
  {
    icon: Shield,
    title: "HIPAA-First",
    description:
      "Not retrofitted. Built with audit logging, encryption, BAA, and role-based access from day one.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description:
      "AI creates tasks from clinical context, suggests priorities, and routes to the right team member.",
  },
  {
    icon: Link2,
    title: "EHR-Connected",
    description:
      "FHIR R4 integration works alongside any EHR without replacing it. No vendor lock-in.",
  },
];

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${basePath}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      setEmail("");

      if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "waitlist_signup", {
          event_category: "engagement",
          event_label: email,
        });
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/waitlist" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">MedTask</span>
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-md flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          </Link>
          <a
            href="#waitlist-form"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get Early Access
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium mb-6">
            <Shield className="w-3.5 h-3.5" />
            HIPAA-compliant from day one
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
            Task management that
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              gets healthcare.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The first task manager built for healthcare — AI-powered, connected to your EHR,
            and compliant without compromise. Turn clinical chaos into coordinated care.
          </p>

          {/* Email capture — Hero */}
          <div id="waitlist-form" className="mt-10 max-w-md mx-auto">
            {status === "success" ? (
              <div className="flex items-center gap-3 justify-center p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-800 font-medium">
                  You&apos;re on the list! We&apos;ll be in touch soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {status === "loading" ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Get Early Access
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
            {status === "error" && (
              <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            )}
            <p className="mt-3 text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3" />
              No credit card required &middot; HIPAA-compliant
            </p>
          </div>

          {/* Social proof numbers */}
          <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">2 min</div>
              <div className="text-xs text-slate-500 mt-1">Setup time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">30 min</div>
              <div className="text-xs text-slate-500 mt-1">Saved daily</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">100%</div>
              <div className="text-xs text-slate-500 mt-1">HIPAA audit trail</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">
            Built different. Built for healthcare.
          </h2>
          <p className="mt-3 text-slate-600 text-center max-w-xl mx-auto">
            Three pillars that set MedTask AI apart from generic task managers and clunky EHR modules.
          </p>

          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5">
                  <pillar.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{pillar.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segments */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">
            For every healthcare practice
          </h2>
          <p className="mt-3 text-slate-600 text-center max-w-xl mx-auto">
            Whether you&apos;re a solo doc with sticky notes or a hospital needing audit-ready accountability.
          </p>

          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {segments.map((seg) => (
              <div
                key={seg.title}
                className="relative bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:border-blue-200 transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-5 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                  <seg.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{seg.title}</h3>
                <p className="mt-2 text-sm text-slate-700 font-medium italic">
                  &ldquo;{seg.message}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {seg.benefit}
                </div>
                <p className="mt-3 text-xs text-slate-500">{seg.proof}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            From signup to coordinated care in minutes
          </h2>
          <div className="mt-12 grid sm:grid-cols-3 gap-8">
            {[
              { icon: Mail, step: "1", title: "Join the waitlist", desc: "Enter your email and get early access when we launch." },
              { icon: Clock, step: "2", title: "2-minute setup", desc: "Connect your EHR, invite your team, start tracking tasks." },
              { icon: ClipboardCheck, step: "3", title: "Nothing falls through", desc: "AI catches follow-ups, routes tasks, and keeps your audit trail clean." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-blue-200">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Ready to ditch the sticky notes?
          </h2>
          <p className="mt-3 text-slate-600">
            Join the waitlist for early access. Be the first to experience task management that actually gets healthcare.
          </p>

          <div className="mt-8 max-w-md mx-auto">
            {status === "success" ? (
              <div className="flex items-center gap-3 justify-center p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-800 font-medium">
                  You&apos;re on the list! We&apos;ll be in touch soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {status === "loading" ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Get Early Access
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
            {status === "error" && (
              <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            )}
            <p className="mt-3 text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3" />
              No credit card required &middot; HIPAA-compliant
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Stethoscope className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">MedTask AI</span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} MedTask AI. HIPAA-compliant. AI-powered. Finally simple.
          </p>
        </div>
      </footer>
    </div>
  );
}
