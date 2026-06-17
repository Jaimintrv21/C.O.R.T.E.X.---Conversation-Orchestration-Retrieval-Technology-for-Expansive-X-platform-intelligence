"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Server, RefreshCw } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { motion } from "framer-motion";
import { popIn } from "@/lib/motion";

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen bg-black text-white py-20 px-6 md:px-12 overflow-y-auto">
      {/* WebGL animated background shader */}
      <WebGLShader />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col gap-8">
        {/* Back Button */}
        <Link href="/" className="group flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white transition-colors w-fit bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-full backdrop-blur-md">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>

        {/* Brand Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CORTEX Logo" className="w-[32px] h-[32px] object-contain rounded-md" />
            <span className="text-xl font-bold tracking-tight text-white">CORTEX</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-2 bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-xs text-white/40 font-mono">Last Updated: June 17, 2026</p>
        </div>

        {/* Content Card */}
        <motion.div 
          variants={popIn}
          initial="hidden"
          animate="visible"
          className="rounded-[32px] border border-white/[0.08] bg-black/45 backdrop-blur-3xl p-8 md:p-12 flex flex-col gap-8 leading-relaxed text-sm text-white/70"
        >
          {/* Quick Summary Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Server, title: "Local-First", desc: "Your chats are indexed locally on your device by default." },
              { icon: Lock, title: "AES-256 Encryption", desc: "Secure cloud sync uses end-to-end encrypted tunnels." },
              { icon: Eye, title: "Zero Telemetry Sell", desc: "We never monetize or sell any of your sync data." }
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex gap-3 items-start">
                <item.icon className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">{item.title}</span>
                  <span className="text-[11px] text-white/40 leading-snug mt-1">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="h-[1px] bg-white/[0.06] w-full" />

          {/* Detailed Policy Sections */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">1. Introduction</h2>
            <p>
              C.O.R.T.E.X. ("we," "our," "us") is dedicated to protecting your privacy. This Privacy Policy details how we handle the information imported, synced, and managed through the C.O.R.T.E.X. platform. C.O.R.T.E.X. is built with a local-first architecture, meaning your conversation data stays on your machine unless you explicitly opt to use our cloud backup and multi-device sync features.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">2. Data We Process</h2>
            <p className="mb-2">We process the following types of information when you utilize C.O.R.T.E.X.:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2 text-white/60">
              <li><strong>Imported Conversation Histories:</strong> Data you upload or sync from platforms like OpenAI (ChatGPT), Anthropic (Claude), Google (Gemini), Perplexity, and Grok.</li>
              <li><strong>Local Index & Vector Embeddings:</strong> When using semantic search, vector embeddings are generated via local Ollama models or optionally cloud embedding APIs.</li>
              <li><strong>Account Credentials & Settings:</strong> Name, email address, password hashes, API key tokens for cloud providers, and configuration preferences.</li>
              <li><strong>System Integration States:</strong> Credentials or connection tokens for your local Ollama instance or self-hosted PostgreSQL/Redis cache layers.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">3. How Your Data is Used</h2>
            <p className="mb-2">Your data is processed strictly to provide the platform&apos;s features:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2 text-white/60">
              <li>Building your personal semantic index and knowledge graph.</li>
              <li>Compiling token usage, topic modeling statistics, and model output analysis.</li>
              <li>Generating reports and Scaffolding code artifacts using the stepper engine.</li>
              <li>Syncing workspace environments across multiple authorized team members (Pro Tier only).</li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">4. Encryption & Security</h2>
            <p>
              Data transmission for cloud sync utilizes Transport Layer Security (TLS 1.3). Saved database tables, credentials, and API tokens are encrypted at rest using AES-256 standards. For self-hosted instances, security governance is entirely in your control, and no data is shared with any third-party analytics company.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">5. Your Controls & Data Deletion</h2>
            <p>
              C.O.R.T.E.X. provides simple, one-click options to wipe all imported conversations, local vector indices, and configuration variables. You can download a complete backup of your canonical schema database or purge your entire profile from the settings dashboard instantly.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">6. Policy Updates & Contact</h2>
            <p>
              We may update this policy occasionally to reflect security advancements or feature integrations. If you have any inquiries regarding data protection, please create a ticket in our official community workspace or contact our support team.
            </p>
          </section>
        </motion.div>

        {/* Footer Copyright */}
        <div className="text-center text-xs text-white/20 mt-4">
          © 2026 CORTEX Core Team. Distributed under Apache License 2.0.
        </div>
      </div>
    </main>
  );
}
