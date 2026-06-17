'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  GitCompare, 
  BarChart2, 
  Network, 
  Boxes, 
  Settings,
  Bell,
  SunMoon,
  ChevronRight,
  User,
  Menu
} from 'lucide-react';
import { WebGLShader } from '@/components/ui/web-gl-shader';

const navItems = [
  { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
  { name: 'Compare', href: '/dashboard/compare', icon: GitCompare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { name: 'Knowledge Graph', href: '/dashboard/knowledge', icon: Network },
  { name: 'Artifacts', href: '/dashboard/artifacts', icon: Boxes },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex text-white overflow-hidden font-sans bg-black">
      {/* Background - Restored WebGL Shader */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <WebGLShader />
      </div>

      {/* Floating Pill Sidebar - Slim, Pops out on hover, strong liquid glass */}
      <motion.aside 
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        animate={{ 
          width: isSidebarOpen ? 240 : 64,
          scale: isSidebarOpen ? 1.02 : 1,
          boxShadow: isSidebarOpen 
            ? "0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)" 
            : "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex flex-col m-[24px] mr-[12px] my-auto h-fit rounded-[32px] backdrop-blur-3xl bg-white/[0.05] border border-white/[0.12] flex-shrink-0 relative z-20 overflow-hidden"
      >
        <div className="py-[16px] flex flex-col gap-[12px]">

          <nav className="flex flex-col gap-[8px] px-[12px]">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className="relative group outline-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="absolute inset-0 bg-gradient-to-r from-[#6C63FF]/30 to-[#00D2FF]/20 border border-[#6C63FF]/40 shadow-[0_0_20px_rgba(108,99,255,0.2)] rounded-full -z-10"
                    />
                  )}
                  <div 
                    data-active={isActive}
                    className={`flex items-center gap-[12px] h-[40px] rounded-full text-sm transition-all duration-200 ease-out
                      ${isSidebarOpen ? 'px-[16px] justify-start' : 'justify-center'}
                      ${isActive ? 'text-white' : 'text-white/50 hover:bg-white/[0.08] hover:text-white/90'}`}
                  >
                    <item.icon size={20} className="flex-shrink-0" />
                    {isSidebarOpen && <span className="whitespace-nowrap font-medium">{item.name}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen relative z-10 pt-[24px] pr-[24px]">
        
        {/* Floating Pill Topbar */}
        <header className="h-[64px] rounded-full backdrop-blur-3xl bg-white/[0.05] border border-white/[0.12] px-[24px] flex items-center justify-between gap-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] flex-shrink-0 mb-[24px]">
          
          {/* Left: CORTEX Logo & Search Pill */}
          <div className="flex-1 flex items-center gap-[24px]">
            {/* CORTEX Logo Moved to Header */}
            <div className="font-bold tracking-widest text-lg bg-clip-text text-transparent bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] flex-shrink-0 cursor-pointer" onClick={() => router.push('/dashboard')}>
              CORTEX
            </div>
            
            <div className="flex items-center gap-[10px] h-[40px] px-[16px] rounded-full bg-white/[0.05] border border-white/[0.1] text-white/40 transition-all duration-300 ease-out focus-within:w-[420px] focus-within:bg-white/[0.1] focus-within:border-[#6C63FF]/50 focus-within:shadow-[0_0_0_3px_rgba(108,99,255,0.2)] w-[260px]">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search conversations, models, and artifacts..." 
                className="bg-transparent border-none outline-none w-full text-sm text-white placeholder:text-white/30"
              />
              <div className="text-xs border border-white/[0.15] px-[6px] py-[2px] rounded-full opacity-80">⌘K</div>
            </div>
          </div>

          {/* Right: Actions & User Profile */}
          <div className="flex items-center gap-[12px]">
            {/* Notification Bell Dropdown */}
            <div className="relative group/notif">
              <button className="relative w-[40px] h-[40px] rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.2] hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-200">
                <Bell size={18} />
                <span className="absolute top-[10px] right-[10px] w-[6px] h-[6px] rounded-full bg-[#FF6584] shadow-[0_0_8px_rgba(255,101,132,0.8)]"></span>
              </button>
              
              {/* Dropdown Panel */}
              <div className="absolute top-full right-0 mt-[8px] w-[320px] rounded-[24px] backdrop-blur-3xl bg-[#0A0A0F]/90 border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] opacity-0 translate-y-2 pointer-events-none group-hover/notif:opacity-100 group-hover/notif:translate-y-0 group-hover/notif:pointer-events-auto transition-all duration-300 z-50 overflow-hidden flex flex-col">
                <div className="p-[16px] border-b border-white/[0.08] flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-white">Notifications</h3>
                  <span className="text-[10px] uppercase tracking-wider text-white/40 bg-white/[0.05] px-2 py-1 rounded-full">3 New</span>
                </div>
                <div className="flex flex-col">
                  {[
                    { title: 'Model Sync Complete', desc: 'Llama 3 successfully downloaded to Ollama.', time: '2m ago', color: '#00D97E' },
                    { title: 'New Artifact Generated', desc: 'Dashboard scaffolding is ready for download.', time: '1h ago', color: '#6C63FF' },
                    { title: 'Usage Alert', desc: 'Approaching 80% of OpenAI monthly budget.', time: '4h ago', color: '#FFBC00' }
                  ].map((n, i) => (
                    <div key={i} className="p-[16px] border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors flex items-start gap-[12px] cursor-pointer">
                      <div className="w-[8px] h-[8px] rounded-full mt-[6px] flex-shrink-0" style={{ backgroundColor: n.color, boxShadow: `0 0 8px ${n.color}80` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{n.title}</p>
                        <p className="text-xs text-white/50 truncate mt-[2px]">{n.desc}</p>
                      </div>
                      <span className="text-[10px] text-white/30">{n.time}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/notifications" className="p-[12px] text-center text-xs font-medium text-[#00D2FF] hover:bg-white/[0.04] transition-colors">
                  View All Notifications
                </Link>
              </div>
            </div>

            <div className="w-[1px] h-[24px] bg-white/[0.15] mx-[4px]" />
            
            {/* Personal Workspace Link to Settings */}
            <Link 
              href="/dashboard/settings"
              className="flex items-center gap-[12px] pl-[6px] pr-[16px] py-[6px] rounded-full hover:bg-white/[0.08] transition-colors duration-200 border border-transparent hover:border-white/[0.1] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer"
            >
              <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D2FF] flex items-center justify-center shadow-[0_0_12px_rgba(108,99,255,0.4)]">
                <User size={16} className="text-white" />
              </div>
              <div className="text-sm font-medium text-white/90">Personal Workspace</div>
              <ChevronRight size={14} className="text-white/40" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-[32px] custom-scrollbar">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-[32px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
