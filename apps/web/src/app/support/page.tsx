"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Mail, MessageSquare, Send, Search, 
  BookOpen, ShieldCheck, CreditCard, Building2, 
  Terminal, Zap, Headphones, ChevronRight 
} from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { motion, AnimatePresence } from "framer-motion";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setIsSuccess(false), 5000);
    }, 1500);
  };

  const QUICK_LINKS = [
    { href: "/support/documentation", icon: BookOpen, title: "Documentation", desc: "Guides, tutorials, and API reference.", color: "text-[#6C63FF]", bg: "bg-[#6C63FF]/10", border: "border-[#6C63FF]/20" },
    { href: "/support/troubleshooting", icon: Terminal, title: "Troubleshooting", desc: "Common issues and error codes.", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { href: "/support/billing", icon: CreditCard, title: "Billing & Plans", desc: "Manage subscriptions and payments.", color: "text-[#00D97E]", bg: "bg-[#00D97E]/10", border: "border-[#00D97E]/20" },
    { href: "/support/security", icon: ShieldCheck, title: "Security & Privacy", desc: "Learn about our data policies.", color: "text-[#00D2FF]", bg: "bg-[#00D2FF]/10", border: "border-[#00D2FF]/20" },
  ];

  return (
    <main className="relative min-h-screen bg-black text-white py-16 px-6 md:px-12 overflow-y-auto">
      <WebGLShader />

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col gap-16">
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

        {/* Hero & Search */}
        <div className="text-center flex flex-col gap-6 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] backdrop-blur-xl text-xs font-semibold text-[#6C63FF] uppercase tracking-[0.1em] mx-auto">
            <Headphones size={14} />
            Support Center
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            How can we <span className="bg-gradient-to-r from-[#6C63FF] via-purple-400 to-[#00D2FF] bg-clip-text text-transparent">help you?</span>
          </h1>
          
          <div className="relative w-full max-w-lg mx-auto mt-4">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-white/40" size={18} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for articles, guides, or troubleshooting..."
              className="w-full bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2] focus:border-[#6C63FF]/60 rounded-full pl-12 pr-6 py-4 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md"
            />
          </div>
        </div>

        {/* Quick Links / Knowledge Base */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_LINKS.map((link, i) => (
            <motion.a
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              href={link.href}
              className="group p-5 rounded-[24px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.15] backdrop-blur-md transition-all cursor-pointer flex flex-col gap-4"
            >
              <div className={`w-10 h-10 rounded-xl ${link.bg} border ${link.border} flex items-center justify-center ${link.color} group-hover:scale-110 transition-transform`}>
                <link.icon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1">
                  {link.title} <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-white/50" />
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">{link.desc}</p>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Contact Channels */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-white pl-2">Direct Support Channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* General Email */}
            <div className="p-6 rounded-[28px] bg-white/[0.02] border border-white/[0.06] backdrop-blur-md flex flex-col gap-4 hover:border-white/[0.15] transition-all">
              <div className="w-12 h-12 rounded-full bg-[#6C63FF]/10 border border-[#6C63FF]/20 flex items-center justify-center text-[#6C63FF]">
                <Mail size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">General Support</h3>
                <p className="text-xs text-white/40 mb-4">Billing, account issues, and standard technical inquiries.</p>
                <a href="mailto:support@cortex.ai" className="text-sm font-semibold text-[#6C63FF] hover:text-white transition-colors">
                  support@cortex.ai
                </a>
              </div>
            </div>

            {/* Enterprise Mail */}
            <div className="p-6 rounded-[28px] bg-gradient-to-br from-[#00D2FF]/5 to-transparent border border-[#00D2FF]/10 backdrop-blur-md flex flex-col gap-4 hover:border-[#00D2FF]/30 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4">
                <div className="px-2.5 py-1 rounded-full bg-[#00D2FF]/10 border border-[#00D2FF]/20 text-[9px] font-bold text-[#00D2FF] uppercase tracking-wider">Priority 24/7</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00D2FF]/10 border border-[#00D2FF]/20 flex items-center justify-center text-[#00D2FF]">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Enterprise & Sales</h3>
                <p className="text-xs text-white/40 mb-4 max-w-[90%]">Dedicated account managers, SLA compliance, and deployment architecture.</p>
                <a href="mailto:enterprise@cortex.ai" className="text-sm font-semibold text-[#00D2FF] hover:text-white transition-colors">
                  enterprise@cortex.ai
                </a>
              </div>
            </div>

            {/* Discord */}
            <div className="p-6 rounded-[28px] bg-white/[0.02] border border-white/[0.06] backdrop-blur-md flex flex-col gap-4 hover:border-white/[0.15] transition-all">
              <div className="w-12 h-12 rounded-full bg-[#00D97E]/10 border border-[#00D97E]/20 flex items-center justify-center text-[#00D97E]">
                <MessageSquare size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Community Discord</h3>
                <p className="text-xs text-white/40 mb-4">Chat with other developers, share setups, and get peer support.</p>
                <Link href="#" className="text-sm font-semibold text-white/80 hover:text-white underline transition-colors">
                  Join the Server
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Section */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mt-4 items-center">
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white">
              <Zap size={24} className="text-amber-400" />
            </div>
            <h3 className="text-3xl font-bold text-white leading-tight">
              Still need <br/> assistance?
            </h3>
            <p className="text-sm text-white/40 leading-relaxed">
              Fill out the form with your inquiry. Our support team responds to General tickets within 24 hours, and Enterprise tickets within 1 hour.
            </p>
            <ul className="flex flex-col gap-3 mt-2 text-sm text-white/60">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00D97E]" /> Include screenshots if possible</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00D97E]" /> Specify your CORTEX version</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00D97E]" /> Use your registered email</li>
            </ul>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="md:col-span-3 rounded-[32px] backdrop-blur-2xl bg-[#0A0A0F]/80 border border-white/[0.08] p-8 md:p-10 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-white/[0.02] to-white/[0.05] pointer-events-none" />
            
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-center gap-5 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-full bg-[#00D97E]/20 border border-[#00D97E]/40 flex items-center justify-center text-[#00D97E]">
                  <Send size={32} />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white mb-2">Message Sent Successfully!</h4>
                  <p className="text-sm text-white/50 max-w-[300px] mx-auto leading-relaxed">
                    A support ticket has been created. Keep an eye on your email inbox for updates.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-white/50 pl-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.06] transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-white/50 pl-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.06] transition-all"
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/50 pl-1">Subject / Inquiry Type</label>
                  <select 
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white/80 focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.06] transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-zinc-900 text-white/50">Select a topic...</option>
                    <option value="technical" className="bg-zinc-900">Technical Support</option>
                    <option value="billing" className="bg-zinc-900">Billing & Subscription</option>
                    <option value="enterprise" className="bg-zinc-900">Enterprise Sales Inquiry</option>
                    <option value="bug" className="bg-zinc-900">Bug Report</option>
                    <option value="other" className="bg-zinc-900">Other</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/50 pl-1">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.06] transition-all resize-y custom-scrollbar"
                    placeholder="Please describe your issue, context, or requirements in detail..."
                  />
                </div>

                <LiquidButton
                  disabled={isSubmitting}
                  className="w-full text-white bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] mt-2 rounded-xl hover:opacity-90 disabled:opacity-50"
                  size="default"
                >
                  {isSubmitting ? "Sending Request..." : "Submit Support Request"}
                </LiquidButton>
              </form>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.08] pt-8 pb-4 text-center text-xs text-white/20 mt-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <span>© 2026 CORTEX Core Team. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
