"use client";

import { useState } from "react";
import Link from "next/link";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { User, Lock, ArrowRight, Github, Zap } from "lucide-react";

/* ── Provider SVG icons ──────────────────────── */
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"/><path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"/></svg>
);
const OpenAIIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
);
const ClaudeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4.709 15.955l4.72-2.756.08-.046 2.698-1.575c.282-.165.563-.33.845-.493l.108-.063a.093.093 0 0 0 .046-.08.09.09 0 0 0-.046-.079l-.07-.04-2.5-1.46-4.985-2.912a.06.06 0 0 0-.032-.009.062.062 0 0 0-.053.03L4.648 8.134 3.12 10.77l-.833 1.44-.56.97a.083.083 0 0 0 0 .083l1.16 2.01.768 1.331a.046.046 0 0 0 .04.023.047.047 0 0 0 .014-.003zm7.858-.627l-2.098 1.224-4.463 2.604a.066.066 0 0 0-.025.09l1.2 2.078.768 1.331a.046.046 0 0 0 .04.023.05.05 0 0 0 .024-.007l7.6-4.437a.086.086 0 0 0 .043-.075.087.087 0 0 0-.043-.074l-2.966-1.732z"/></svg>
);
const GrokIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13.982 10.622L20.54 3h-1.554l-5.693 6.618L8.745 3H3.5l6.876 10.007L3.5 21h1.554l6.012-6.989L15.868 21H21.1l-7.118-10.378zm-2.128 2.474l-.697-.997-5.543-7.93H8l4.474 6.4.697.996 5.815 8.318h-2.387l-4.745-6.787z"/></svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* Existing WebGL shader background */}
      <WebGLShader />

      {/* Glass login card, centered */}
      <div className="relative z-10 flex items-center justify-center w-full min-h-screen p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#lg)" />
              <path d="M10 22V10l6 4.5L22 10v12l-6-4.5L10 22z" fill="white" fillOpacity="0.9" />
              <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#06b6d4"/></linearGradient></defs>
            </svg>
            <span className="text-xl font-bold text-white tracking-tight">NEXUS</span>
          </div>

          {/* Glass card */}
          <div className="p-8 space-y-6 bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/[0.12] shadow-2xl shadow-black/40">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
              <p className="mt-2 text-sm text-white/40">Sign in to your NEXUS account</p>
            </div>

            <form onSubmit={e => e.preventDefault()} className="space-y-7">
              {/* Email — animated floating label */}
              <div className="relative z-0">
                <input
                  type="email" id="float_email" value={email} onChange={e => setEmail(e.target.value)}
                  className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-white/20 appearance-none focus:outline-none focus:ring-0 focus:border-violet-500 peer"
                  placeholder=" " required
                />
                <label htmlFor="float_email"
                  className="absolute text-sm text-white/40 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-violet-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                  <User className="inline-block mr-2 -mt-1" size={14} />
                  Email Address
                </label>
              </div>

              {/* Password — animated floating label */}
              <div className="relative z-0">
                <input
                  type="password" id="float_pw" value={password} onChange={e => setPassword(e.target.value)}
                  className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-white/20 appearance-none focus:outline-none focus:ring-0 focus:border-violet-500 peer"
                  placeholder=" " required
                />
                <label htmlFor="float_pw"
                  className="absolute text-sm text-white/40 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-violet-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                  <Lock className="inline-block mr-2 -mt-1" size={14} />
                  Password
                </label>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-white/30 cursor-pointer">
                  <input type="checkbox" className="rounded border-white/20 accent-violet-500 w-3.5 h-3.5" />
                  Remember me
                </label>
                <Link href="/forgot-password" className="text-xs text-white/30 hover:text-white/60 transition">Forgot Password?</Link>
              </div>

              <button type="submit"
                className="group w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 shadow-lg shadow-violet-500/20">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-white/[0.08]" />
              <span className="flex-shrink mx-4 text-white/25 text-[10px] uppercase tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-white/[0.08]" />
            </div>

            {/* OAuth — Google & GitHub row */}
            <div className="grid grid-cols-2 gap-2.5">
              <button className="flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-sm text-white/80 font-medium transition-all duration-200">
                <GoogleIcon /> Google
              </button>
              <button className="flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-sm text-white/80 font-medium transition-all duration-200">
                <Github className="w-4 h-4" /> GitHub
              </button>
            </div>
            {/* OAuth — AI Providers row */}
            <div className="grid grid-cols-3 gap-2.5">
              <button className="flex items-center justify-center gap-2 py-2 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-xs text-white/70 font-medium transition-all duration-200">
                <OpenAIIcon /> OpenAI
              </button>
              <button className="flex items-center justify-center gap-2 py-2 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-xs text-white/70 font-medium transition-all duration-200">
                <ClaudeIcon /> Claude
              </button>
              <button className="flex items-center justify-center gap-2 py-2 px-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-xs text-white/70 font-medium transition-all duration-200">
                <GrokIcon /> Grok
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-white/25 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-violet-400 hover:text-violet-300 transition">Sign Up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
