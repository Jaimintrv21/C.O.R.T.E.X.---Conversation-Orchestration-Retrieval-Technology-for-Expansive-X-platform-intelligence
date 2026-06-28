"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, ChevronRight } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { motion } from "framer-motion";

export default function SecurityPage() {
  return (
    <main className="relative min-h-screen bg-black text-white py-16 px-6 md:px-12 overflow-y-auto">
      <WebGLShader />
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col gap-12">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/support" className="group flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white transition-colors w-fit bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-full backdrop-blur-md">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Support
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">CORTEX</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 border-b border-white/[0.08] pb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#00D2FF]/10 border border-[#00D2FF]/20 flex items-center justify-center text-[#00D2FF] shrink-0">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">Security & Privacy</h1>
            <p className="text-white/40 mt-2 text-lg">Learn about data policies, encryption, and PII redaction.</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="flex flex-col gap-4 border-r border-white/[0.08] pr-8 hidden md:flex">
                <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Topics</h3>
                <ul className="flex flex-col gap-3 text-sm text-white/50 font-medium">
                    <li className="hover:text-white cursor-pointer text-[#00D2FF]">Data Ownership</li>
                    <li className="hover:text-white cursor-pointer">End-to-End Encryption</li>
                    <li className="hover:text-white cursor-pointer">PII Redaction System</li>
                    <li className="hover:text-white cursor-pointer">SSO Integration</li>
                </ul>
            </div>
            
            {/* Main content */}
            <div className="md:col-span-3 flex flex-col gap-6">
                {[
                  {
                    title: "Our Local-First Guarantee",
                    desc: "Unless explicitly enabled, CORTEX operates 100% locally. Learn how our architecture ensures that no conversational data is ever transmitted to a cloud server without your consent."
                  },
                  {
                    title: "AES-256 Encryption at Rest",
                    desc: "Details on how we secure your PostgreSQL and Vector embeddings using military-grade AES-256 encryption, ensuring that physical access to your drive does not compromise your data."
                  },
                  {
                    title: "Configuring the PII Redaction Pipeline",
                    desc: "A comprehensive guide on how the Presidio-based PII redaction engine identifies and sanitizes emails, names, and credit cards before they hit the index."
                  },
                  {
                    title: "Configuring SSO & SAML (Pro/Enterprise)",
                    desc: "Step-by-step instructions for IT admins on integrating Okta, Auth0, or Azure AD with CORTEX to enforce company-wide access control and RBAC."
                  }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 md:p-8 rounded-[28px] bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.15] backdrop-blur-md transition-all group cursor-pointer"
                  >
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00D2FF] transition-colors">{item.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed mb-5">{item.desc}</p>
                      <button className="text-[#00D2FF] text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read Policy <ChevronRight size={14} />
                      </button>
                  </motion.div>
                ))}
            </div>
        </div>
      </div>
    </main>
  );
}
