"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Send } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { motion } from "framer-motion";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  return (
    <main className="relative min-h-screen bg-black text-white py-20 px-6 md:px-12 overflow-y-auto">
      <WebGLShader />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col gap-12">
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
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[#6C63FF]">Help & Support</span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            We are here to <span className="bg-gradient-to-r from-[#6C63FF] via-purple-400 to-[#00D2FF] bg-clip-text text-transparent">Help</span>
          </h1>
          <p className="text-white/40 text-sm md:text-base">
            Reach out to our support team for any queries, bug reports, or feature requests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-8">
          {/* Contact Info */}
          <div className="flex flex-col gap-8">
            <div className="rounded-[32px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.06] p-8 flex flex-col gap-6">
              <div className="w-12 h-12 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20 flex items-center justify-center text-[#6C63FF]">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Email Support</h3>
                <p className="text-sm text-white/40 mb-4">
                  For general inquiries, technical support, or billing questions, email us directly.
                </p>
                <a href="mailto:support@cortex.ai" className="text-lg font-semibold text-[#00D2FF] hover:text-white transition-colors">
                  support@cortex.ai
                </a>
              </div>
            </div>

            <div className="rounded-[32px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.06] p-8 flex flex-col gap-6">
              <div className="w-12 h-12 rounded-2xl bg-[#00D97E]/10 border border-[#00D97E]/20 flex items-center justify-center text-[#00D97E]">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Community & Discord</h3>
                <p className="text-sm text-white/40 mb-4">
                  Join our community to ask questions, share knowledge, and get help from other users and the core team.
                </p>
                <Link href="#" className="text-sm font-semibold text-white/80 hover:text-white underline transition-colors">
                  Join Discord Server
                </Link>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-8 relative overflow-hidden"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Send us a Message</h3>
            
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[#00D97E]/20 border border-[#00D97E]/40 flex items-center justify-center text-[#00D97E]">
                  <Send size={28} />
                </div>
                <h4 className="text-xl font-bold text-white">Message Sent!</h4>
                <p className="text-sm text-white/50 max-w-[250px]">
                  Thank you for reaching out. Our support team will get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/60 pl-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/[0.02] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.05] transition-all"
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/60 pl-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white/[0.02] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.05] transition-all"
                    placeholder="john@example.com"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/60 pl-2">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="bg-white/[0.02] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.05] transition-all"
                    placeholder="How can we help?"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/60 pl-2">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="bg-white/[0.02] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.05] transition-all resize-y custom-scrollbar"
                    placeholder="Describe your issue or question in detail..."
                  />
                </div>

                <LiquidButton
                  disabled={isSubmitting}
                  className="w-full text-white bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] mt-2 rounded-2xl hover:opacity-90 disabled:opacity-50"
                  size="default"
                >
                  {isSubmitting ? "Sending..." : "Submit Request"}
                </LiquidButton>
              </form>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/20 mt-12">
          © 2026 CORTEX Core Team. Distributed under Apache License 2.0.
        </div>
      </div>
    </main>
  );
}
