"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Scale, FileText, AlertTriangle, ShieldCheck } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { motion } from "framer-motion";
import { popIn } from "@/lib/motion";

export default function TermsPage() {
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
            Terms of Service
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
          {/* Quick Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Scale, title: "Apache 2.0 Licensed", desc: "Open-source software. You are free to modify and host it." },
              { icon: AlertTriangle, title: "As-Is Disclaimer", desc: "CORTEX is provided without warranties of any kind." },
              { icon: ShieldCheck, title: "User Ownership", desc: "Your conversation history remains strictly owned by you." }
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex gap-3 items-start">
                <item.icon className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">{item.title}</span>
                  <span className="text-[11px] text-white/40 leading-snug mt-1">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="h-[1px] bg-white/[0.06] w-full" />

          {/* Detailed Terms Sections */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">1. Agreement to Terms</h2>
            <p>
              By accessing or using the C.O.R.T.E.X. software platform, self-hosted system scripts, or cloud-synchronized services, you agree to comply with and be bound by these Terms of Service. If you do not accept these terms, you must refrain from installing, deploying, or interacting with C.O.R.T.E.X.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">2. Open Source & License</h2>
            <p>
              The core C.O.R.T.E.X. repository codebase is open-source and licensed under the <strong>Apache License, Version 2.0</strong>. You are permitted to modify, build upon, distribute, and execute the application commercially or privately, subject to the conditions outlined in the Apache 2.0 license file (including preservation of copyrights and disclaimers).
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">3. Acceptable Use Guidelines</h2>
            <p className="mb-2">When using C.O.R.T.E.X., you agree NOT to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2 text-white/60">
              <li>Upload or sync material that infringes intellectual property or privacy rights.</li>
              <li>Inject malicious payloads, exploits, or scrapers designed to disrupt our cloud synchronization endpoints.</li>
              <li>Utilize local or cloud AI models to generate illegal content or orchestrate automated phishing attacks.</li>
              <li>Violate the terms of service of the cloud AI providers (OpenAI, Anthropic, Gemini, Grok, etc.) from which you import data.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">4. Disclaimers & No Warranties</h2>
            <p>
              THE SOFTWARE IS PROVIDED &quot;AS IS,&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">5. Account Registration & Pro Subscriptions</h2>
            <p>
              To access cloud-syncing, workspaces, and early AI models, you must register a secure account. You are responsible for safeguarding your credentials. Pro Tier subscriptions are billed at $20/month. Standard billing cycles auto-renew unless canceled. We reserve the right to suspend accounts that violate acceptable use principles or experience billing defaults.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">6. Termination & Governing Law</h2>
            <p>
              We reserve the right to suspend or terminate your access to C.O.R.T.E.X. cloud features at our sole discretion, without notice, for conduct violating these Terms. These Terms are governed by the laws of your local jurisdiction, without regard to conflicts of law provisions.
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
