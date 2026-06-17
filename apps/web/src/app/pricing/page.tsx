"use client";

import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Zap, Shield, Globe, Cpu } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { motion } from "framer-motion";
import { popIn, staggerList, listItem } from "@/lib/motion";

export default function PricingPage() {
  return (
    <main className="relative min-h-screen bg-black text-white py-20 px-6 md:px-12 overflow-y-auto">
      {/* WebGL animated background shader */}
      <WebGLShader />

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col gap-12">
        {/* Navigation back and logo */}
        <div className="flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white transition-colors w-fit bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-full backdrop-blur-md">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CORTEX Logo" className="w-[24px] h-[24px] object-contain rounded-md" />
            <span className="text-sm font-bold tracking-tight text-white">CORTEX</span>
          </div>
        </div>

        {/* Pricing Title & Header */}
        <div className="text-center flex flex-col gap-4 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-[#6C63FF] tracking-[0.2em] uppercase">Pricing & Plans</span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Flexible Plans for <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">Every Journey</span>
          </h1>
          <p className="text-white/40 text-sm md:text-base">
            Whether you are running open-source models completely locally or syncing across workspaces with your team, we have you covered.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <motion.div 
          variants={staggerList}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full mt-4"
        >
          {/* Free Tier */}
          <motion.div 
            variants={listItem}
            className="rounded-[32px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] p-8 md:p-10 flex flex-col justify-between gap-8 transition-all relative overflow-hidden group"
          >
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Free Tier</h3>
                  <p className="text-xs text-white/45">Perfect for individual developer setups and privacy-first local indexes.</p>
                </div>
                <span className="text-xs font-semibold text-white/40 bg-white/[0.05] border border-white/[0.08] px-3 py-1 rounded-full">Self Hosted</span>
              </div>

              <div className="flex items-baseline gap-1 border-b border-white/[0.06] pb-6">
                <span className="text-5xl font-extrabold text-white">$0</span>
                <span className="text-xs text-white/40">/ month</span>
              </div>

              <ul className="flex flex-col gap-3 text-xs text-white/70">
                {[
                  'Sync conversation logs from ChatGPT, Claude, Gemini, Perplexity, and Grok',
                  'Local vector indexing and hybrid semantic search via SQLite/pgvector',
                  'Private data indexing using local Ollama endpoints (Llama 3, Mistral, etc.)',
                  'Compare outputs side-by-side across various models',
                  'Basic dashboard widgets (token counting, usage history trackers)',
                  'PII Redaction and strict offline security compliance'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="text-[#00D97E] flex-shrink-0 mt-0.5" size={14} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/register">
              <LiquidButton className="w-full text-white border border-white/20 rounded-full" size="md">
                Get Started Free
              </LiquidButton>
            </Link>
          </motion.div>

          {/* Pro Tier */}
          <motion.div 
            variants={listItem}
            className="rounded-[32px] backdrop-blur-xl bg-[#6C63FF]/[0.02] border border-[#6C63FF]/20 hover:border-[#6C63FF]/45 p-8 md:p-10 flex flex-col justify-between gap-8 transition-all relative overflow-hidden group shadow-[0_0_40px_rgba(108,99,255,0.06)]"
          >
            {/* Glowing Accent Aura */}
            <div className="absolute -top-[60px] -right-[60px] w-[150px] h-[150px] rounded-full bg-[#6C63FF]/10 blur-[50px] pointer-events-none group-hover:bg-[#6C63FF]/25 transition-all duration-500" />
            
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Pro Tier</h3>
                  <p className="text-xs text-white/45 font-medium">For teams, shared collaboration workspace sync, and advanced AI utilities.</p>
                </div>
                <span className="text-xs font-semibold text-[#6C63FF] bg-[#6C63FF]/15 border border-[#6C63FF]/30 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(108,99,255,0.2)]">Recommended</span>
              </div>

              <div className="flex items-baseline gap-1 border-b border-white/[0.06] pb-6">
                <span className="text-5xl font-extrabold text-white">$20</span>
                <span className="text-xs text-white/40">/ month</span>
              </div>

              <ul className="flex flex-col gap-3 text-xs text-white/70">
                {[
                  'Everything included in the Free tier',
                  '+Workspace Access: Share context, prompt libraries, and indexes with team members',
                  'Access new premium AI models first (Priority cloud LLM routing)',
                  'Access new beta functions, pipelines, and background agent integrations first',
                  'Unlimited secure cloud backups & automatic cross-device synchronization',
                  'Priority synthesis rendering with dedicated computational workers'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="text-[#6C63FF] flex-shrink-0 mt-0.5" size={14} />
                    <span className={i > 0 && i < 5 ? 'text-white font-medium' : ''}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/register">
              <LiquidButton className="w-full text-white bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] hover:shadow-[0_0_20px_rgba(108,99,255,0.4)] rounded-full border border-[#6C63FF]/45" size="md">
                Upgrade to Pro
              </LiquidButton>
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature Comparison Table */}
        <div className="mt-16 flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-white text-center">Feature Breakdown</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="p-4 font-semibold text-white">Features & Modules</th>
                  <th className="p-4 font-semibold text-white">Free Plan</th>
                  <th className="p-4 font-semibold text-white">Pro Plan ($20/mo)</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                {[
                  { name: "Conversation Syncing (All Platforms)", free: "Yes", pro: "Yes" },
                  { name: "Self-Hosted Ollama & SQLite Local Stack", free: "Yes", pro: "Yes" },
                  { name: "Model Compare Mode", free: "Yes", pro: "Yes" },
                  { name: "Shared Team Workspaces & RBAC", free: "No", pro: "Yes" },
                  { name: "Beta Model Router Access", free: "No", pro: "Yes (Early Access)" },
                  { name: "Beta Agentic Pipeline Widgets", free: "No", pro: "Yes (Early Access)" },
                  { name: "Encryption Keys & Telemetry Controls", free: "Yes (Fully Local)", pro: "Yes (Cloud Encrypted)" },
                  { name: "Cloud Backups & Sync", free: "No", pro: "Unlimited" }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                    <td className="p-4 font-medium text-white/95">{row.name}</td>
                    <td className="p-4">{row.free}</td>
                    <td className="p-4 text-white font-medium">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
