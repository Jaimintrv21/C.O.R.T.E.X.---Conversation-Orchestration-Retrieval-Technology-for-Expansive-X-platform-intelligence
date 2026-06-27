"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X, ChevronDown, Sparkles } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { motion, AnimatePresence } from "framer-motion";
import { staggerList, listItem } from "@/lib/motion";
import { useAppearance } from "@/hooks/useAppearance";

const plans = [
  {
    name: "Free",
    subtitle: "Self-Hosted",
    price: "$0",
    period: "/ month",
    desc: "Perfect for individual developer setups and privacy-first local indexes.",
    badge: "Self Hosted",
    badgeClass: "text-white/40 bg-white/[0.05] border-white/[0.08]",
    borderClass: "border-white/[0.06] hover:border-white/[0.12]",
    bgClass: "bg-white/[0.02] hover:bg-white/[0.03]",
    checkColor: "text-[#00D97E]",
    features: [
      "Unlimited conversations",
      "Local AI via Ollama",
      "Hybrid search (full-text + semantic)",
      "JSON & Markdown export",
      "Single user workspace",
      "PII redaction & offline security",
    ],
    cta: "Get Started Free",
    ctaClass: "text-white border border-white/20 hover:bg-white/[0.05]",
    href: "/register",
  },
  {
    name: "Pro",
    subtitle: "Self-hosted Pro",
    price: "$20",
    period: "/ month",
    desc: "For teams, shared collaboration workspace sync, and advanced AI utilities.",
    badge: "Most Popular",
    badgeClass: "text-[var(--accent-color)] bg-[rgba(var(--accent-rgb),0.1)] border-[rgba(var(--accent-rgb),0.3)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.2)]",
    borderClass: "border-[rgba(var(--accent-rgb),0.25)] hover:border-[rgba(var(--accent-rgb),0.5)]",
    bgClass: "bg-[rgba(var(--accent-rgb),0.03)] hover:bg-[rgba(var(--accent-rgb),0.05)]",
    checkColor: "text-[var(--accent-color)]",
    highlight: true,
    features: [
      "Everything in Free +",
      "Semantic search with embeddings",
      "Artifact generation engine",
      "Full analytics & heatmaps",
      "Multi-user workspace (up to 5)",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    ctaClass: "text-white bg-gradient-to-r from-[var(--accent-color)] to-[var(--accent-secondary)] border-[rgba(var(--accent-rgb),0.4)] hover:opacity-90",
    href: "/register",
  },
  {
    name: "Enterprise",
    subtitle: "Custom",
    price: "Custom",
    period: "",
    desc: "Fortune 500 IT/Security. SSO, PII redaction, tamper-evident audit, multi-tenant.",
    badge: "Contact Us",
    badgeClass: "text-[#00D2FF] bg-[#00D2FF]/10 border-[#00D2FF]/20",
    borderClass: "border-white/[0.06] hover:border-[#00D2FF]/30",
    bgClass: "bg-white/[0.02] hover:bg-white/[0.03]",
    checkColor: "text-[#00D2FF]",
    features: [
      "Everything in Pro +",
      "SSO / SAML integration",
      "PII redaction pipeline",
      "Tamper-evident audit logs",
      "Unlimited users & workspaces",
      "SLA & dedicated support",
    ],
    cta: "Contact Sales",
    ctaClass: "text-white border border-[#00D2FF]/30 hover:bg-white/[0.05]",
    href: "mailto:sales@cortex.ai",
  },
];

const comparisonRows = [
  { name: "Conversation Import (All Providers)", free: true, pro: true, enterprise: true },
  { name: "Local Ollama Integration", free: true, pro: true, enterprise: true },
  { name: "Hybrid Search (BM25 + Semantic)", free: true, pro: true, enterprise: true },
  { name: "Model Compare Mode", free: true, pro: true, enterprise: true },
  { name: "Artifact Generation", free: false, pro: true, enterprise: true },
  { name: "Full Analytics & Heatmaps", free: false, pro: true, enterprise: true },
  { name: "Knowledge Graph", free: false, pro: true, enterprise: true },
  { name: "Team Workspaces & RBAC", free: false, pro: "Up to 5", enterprise: "Unlimited" },
  { name: "SSO / SAML", free: false, pro: false, enterprise: true },
  { name: "PII Redaction", free: "Basic", pro: "Advanced", enterprise: "Enterprise" },
  { name: "Audit Logs", free: false, pro: false, enterprise: true },
  { name: "Cloud Sync & Backups", free: false, pro: "Unlimited", enterprise: "Unlimited" },
  { name: "SLA", free: false, pro: false, enterprise: "99.9%" },
];

const faqs = [
  {
    q: "Is CORTEX truly self-hostable?",
    a: "Yes. The entire platform runs via Docker Compose on your own infrastructure. No external calls are made by default — everything from AI processing (Ollama) to search (Meilisearch) runs locally.",
  },
  {
    q: "What data leaves my machine?",
    a: "By default, zero. CORTEX is local-first. Cloud sync is an opt-in Pro feature that uses AES-256 encrypted channels. You control the toggle in Settings → Privacy.",
  },
  {
    q: "Can I upgrade from Free to Pro later?",
    a: "Absolutely. Your existing data, conversations, and knowledge graph transfer seamlessly when you upgrade. No re-import needed.",
  },
  {
    q: "What AI models does CORTEX support?",
    a: "CORTEX supports any Ollama-compatible model locally (Llama 3, Mistral, Phi-3, Qwen) and can optionally route to cloud LLMs via LiteLLM (GPT-4o, Claude 3.5, Gemini).",
  },
  {
    q: "How does Enterprise pricing work?",
    a: "Enterprise pricing is customized based on seat count, compliance requirements, and SLA tier. Contact our sales team for a tailored quote.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="relative min-h-screen bg-black text-white py-20 px-6 md:px-12 overflow-y-auto">
      <WebGLShader />

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col gap-12">
        {/* Navigation */}
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

        {/* Title */}
        <div className="text-center flex flex-col gap-4 max-w-2xl mx-auto">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--accent-color)]">Pricing & Plans</span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Simple, <span className="bg-gradient-to-r from-[var(--accent-color)] via-purple-400 to-[var(--accent-secondary)] bg-clip-text text-transparent animate-pulse duration-3000">Transparent</span> Pricing
          </h1>
          <p className="text-white/40 text-sm md:text-base">
            Self-host for free or unlock team features. No hidden costs, no data lock-in.
          </p>
        </div>

        {/* Plan Cards — 3 col */}
        <motion.div
          variants={staggerList}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        >
          {plans.map((plan, i) => {
            const isPro = plan.name === "Pro";
            
            return (
              <motion.div
                key={plan.name}
                variants={listItem}
                className={`rounded-[32px] backdrop-blur-xl ${plan.bgClass} border ${plan.borderClass} p-8 flex flex-col justify-between gap-8 transition-all relative overflow-hidden group ${isPro ? 'shadow-[0_0_24px_rgba(var(--accent-rgb),0.06)] hover:shadow-[0_0_36px_rgba(var(--accent-rgb),0.12)]' : 'hover:shadow-[0_0_24px_rgba(255,255,255,0.02)]'}`}
              >
                {plan.highlight && (
                  <div 
                    className="absolute -top-[60px] -right-[60px] w-[150px] h-[150px] rounded-full bg-[rgba(var(--accent-rgb),0.15)] blur-[50px] pointer-events-none group-hover:opacity-100 transition-all duration-500" 
                  />
                )}

                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                      <p className="text-xs text-white/45">{plan.desc}</p>
                    </div>
                    <span 
                      className={`text-xs font-semibold border px-3 py-1 rounded-full flex-shrink-0 ${plan.badgeClass}`}
                    >
                      {plan.badge}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 border-b border-white/[0.06] pb-6">
                    <span className="text-5xl font-extrabold text-white">{plan.price}</span>
                    {plan.period && <span className="text-xs text-white/40">{plan.period}</span>}
                  </div>

                  <ul className="flex flex-col gap-3 text-xs text-white/70">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <Check 
                          className={`${plan.checkColor} flex-shrink-0 mt-0.5`} 
                          size={14} 
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link href={plan.href}>
                  <LiquidButton 
                    className={`w-full rounded-full ${plan.ctaClass}`} 
                    size="default"
                  >
                    {plan.cta}
                  </LiquidButton>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Feature Comparison Table */}
        <div className="mt-8 flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-white text-center">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="p-4 font-semibold text-white">Feature</th>
                  <th className="p-4 font-semibold text-white text-center">Free</th>
                  <th className="p-4 font-semibold text-center text-[var(--accent-color)] bg-[rgba(var(--accent-rgb),0.03)] border-x border-white/[0.03]">Pro</th>
                  <th className="p-4 font-semibold text-white text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                {comparisonRows.map((row, i) => (
                  <tr key={i} className={`border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors ${i % 2 === 0 ? 'bg-white/[0.005]' : ''}`}>
                    <td className="p-4 font-medium text-white/95">{row.name}</td>
                    {[row.free, row.pro, row.enterprise].map((val, j) => {
                      const isProCol = j === 1;
                      return (
                        <td 
                          key={j} 
                          className={`p-4 text-center ${isProCol ? 'bg-[rgba(var(--accent-rgb),0.02)] border-x border-white/[0.03]' : ''}`}
                        >
                          {val === true ? (
                            <Check size={16} className={`${isProCol ? 'text-[var(--accent-color)]' : 'text-[#00D97E]'} mx-auto`} />
                          ) : val === false ? (
                            <X size={16} className="text-white/20 mx-auto" />
                          ) : (
                            <span className={`${isProCol ? 'text-[var(--accent-color)] font-semibold' : 'text-white'} font-medium`}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="mt-8 flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-white text-center">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3 max-w-3xl mx-auto w-full">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-[20px] border border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.03] backdrop-blur-md overflow-hidden transition-all hover:border-white/[0.16] hover:shadow-[0_0_20px_rgba(255,255,255,0.02)]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="text-sm font-medium text-white/90">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} className="text-white/40 flex-shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 text-sm text-white/50 leading-relaxed border-t border-white/[0.06] pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/20 mt-4">
          © 2026 CORTEX Core Team. Distributed under Apache License 2.0.
        </div>
      </div>
    </main>
  );
}
