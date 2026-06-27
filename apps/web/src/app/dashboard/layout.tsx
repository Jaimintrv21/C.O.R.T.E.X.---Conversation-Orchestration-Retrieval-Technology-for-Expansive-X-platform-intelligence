'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  GitCompare, 
  BarChart2, 
  Network, 
  Boxes, 
  Settings,
  Bell,
  ChevronRight,
  User,
  Bot,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import { WebGLShader } from '@/components/ui/web-gl-shader';
import { useAppearance } from '@/hooks/useAppearance';
import { ParticleCanvas } from '@/components/ui/particle-canvas';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Chat', href: '/dashboard/ai-chat', icon: Bot },
  { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
  { name: 'Compare', href: '/dashboard/compare', icon: GitCompare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { name: 'Knowledge', href: '/dashboard/knowledge', icon: Network },
  { name: 'Artifacts', href: '/dashboard/artifacts', icon: Boxes },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const {
    sidebarPosition,
    springSidebar,
    reduceMotion,
    particles,
    accentColor,
    secondaryColor
  } = useAppearance();

  // Sidebar expand animation transition
  const sidebarTransition = reduceMotion
    ? { duration: 0 }
    : springSidebar
      ? { type: "spring", stiffness: 400, damping: 25 }
      : { type: "tween", ease: "easeInOut", duration: 0.25 };

  // Nav active pill animation transition
  const pillTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 500, damping: 35 };

  return (
    <>
      <div 
        className={`relative min-h-screen flex text-white font-sans bg-black ${
          sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
      {/* Background - WebGL Shader */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <WebGLShader />
      </div>

      {/* Background - Particles Canvas */}
      <ParticleCanvas active={particles} />

      {/* Floating Pill Sidebar */}
      <motion.aside 
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        initial={{ width: 64, scale: 1 }}
        animate={{ 
          width: isSidebarOpen ? 240 : 64,
          scale: isSidebarOpen && !reduceMotion ? 1.02 : 1,
          boxShadow: isSidebarOpen 
            ? "0 30px 60px rgba(0,0,0,0.65), inset 1px 1px 2px rgba(255,255,255,0.2), inset -1px -1px 2px rgba(0,0,0,0.3)" 
            : "0 8px 32px rgba(0,0,0,0.4), inset 1px 1px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(0,0,0,0.2)"
        }}
        transition={sidebarTransition}
        className={`hidden ${sidebarPosition === 'none' ? '' : 'md:flex'} flex-col h-fit rounded-[32px] backdrop-blur-3xl bg-white/[0.04] border border-white/[0.15] flex-shrink-0 relative z-20 overflow-hidden my-auto ${
          sidebarPosition === 'right' ? 'mr-[16px] ml-[8px]' : 'ml-[16px] mr-[8px]'
        }`}
      >
        {/* Glass Reflection Shine */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] z-0" />
        
        <div className="py-[16px] flex flex-col gap-[8px] relative z-10">
          <nav className="flex flex-col gap-[6px] px-[10px]">
            {navItems.map((item) => {
              const isActive = item.href === '/dashboard' 
                ? pathname === '/dashboard' 
                : (pathname === item.href || pathname?.startsWith(item.href + '/'));
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className="relative group outline-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      transition={pillTransition}
                      className="absolute inset-0 bg-accent-gradient border border-accent-theme-glow shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] rounded-xl -z-10"
                    />
                  )}
                  <div 
                    data-active={isActive}
                    className={`flex items-center gap-[14px] h-[44px] rounded-xl text-[14px] font-medium transition-all duration-200 ease-out group
                      ${isSidebarOpen ? 'px-[16px] justify-start' : 'justify-center'}
                      ${isActive ? 'text-white' : 'text-white/60 hover:bg-white/[0.06] hover:text-white'}`}
                  >
                    <item.icon size={18} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-[var(--accent-color)] transition-colors'}`} />
                    {isSidebarOpen && <span className="whitespace-nowrap tracking-wide">{item.name}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 overflow-hidden h-[100dvh] relative z-10 p-[16px] md:p-[16px] ${
          sidebarPosition === 'right' ? 'md:pl-[16px] md:pr-[8px]' : sidebarPosition === 'none' ? 'md:px-[16px]' : 'md:pl-[8px] md:pr-[16px]'
        }`}
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))' }}
        onClick={() => {
          if (isNotifOpen) setNotifOpen(false);
        }}
      >
        
        {/* Floating Pill Topbar */}
        <header className="relative z-30 h-[56px] rounded-full backdrop-blur-3xl bg-white/[0.04] border border-white/[0.15] px-[12px] sm:px-[20px] flex items-center justify-between gap-[10px] sm:gap-[16px] shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.15),inset_-1px_-1px_1px_rgba(0,0,0,0.2)] flex-shrink-0 mb-[16px]">
          {/* Glass Reflection Shine */}
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none z-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-white/[0.02] to-white/[0.06]" />
          </div>
          
          {/* Left: CORTEX Logo & Search */}
          <div className="flex-1 flex items-center gap-[8px] sm:gap-[12px] min-w-0 relative z-10">
            {/* Hamburger Mobile Menu Toggle - only shown on desktop when sidebar position is none */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className={`hidden ${sidebarPosition === 'none' ? 'md:flex' : 'hidden'} p-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white items-center justify-center hover:bg-white/[0.1] flex-shrink-0`}
            >
              <Menu size={16} />
            </button>

            <div className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0" onClick={() => router.push('/dashboard')}>
              <img src="/logo.png" alt="CORTEX Logo" className="w-[24px] h-[24px] object-contain rounded-md" />
              <span className="font-bold tracking-widest text-base text-accent-gradient hidden sm:block">CORTEX</span>
            </div>
            
            <div 
              style={{
                // Set dynamic focus outline colors via style injection
                color: 'rgba(255,255,255,0.4)',
              }}
              className="flex items-center gap-[10px] h-[36px] px-[14px] rounded-full bg-white/[0.05] border border-white/[0.1] transition-all duration-300 ease-out focus-within:bg-white/[0.1] focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.15)] w-full max-w-[100px] xs:max-w-[150px] sm:max-w-[220px] sm:focus-within:max-w-[380px] flex-shrink min-w-0"
            >
              <Search size={16} className="flex-shrink-0 text-white/40" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none w-full text-xs sm:text-sm text-white placeholder:text-white/30 min-w-0"
              />
            </div>
          </div>

          {/* Right: Actions & User Profile */}
          <div className="flex items-center gap-[8px] sm:gap-[16px] flex-shrink-0 z-10">
            {/* Notification Bell Dropdown */}
            <div className="relative flex-shrink-0">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifOpen(!isNotifOpen);
                }}
                className={`w-[36px] h-[36px] rounded-full border flex items-center justify-center transition-all duration-300 relative flex-shrink-0 ${
                  isNotifOpen 
                    ? 'bg-white/[0.12] border-white/[0.2] text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                    : 'bg-white/[0.05] border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Bell size={16} className={isNotifOpen ? "fill-white/20" : ""} />
                <div className="absolute top-[2px] right-[2px] w-[8px] h-[8px] rounded-full bg-primary shadow-[0_0_8px_var(--accent-color)] animate-pulse" />
              </button>
              
              {/* Dropdown Panel - State Driven */}
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-[calc(100%+12px)] -right-12 sm:right-0 w-[calc(100vw-32px)] max-w-[320px] sm:w-[320px] rounded-[20px] backdrop-blur-3xl bg-[#0A0A0F]/95 border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.08),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.08),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.2),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.2)] z-50 overflow-hidden flex flex-col origin-top-right"
                  >
                    <div className="px-[16px] py-[12px] border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                      <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                        <Bell size={14} className="text-white/50" /> Notifications
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-[8px] py-[3px] rounded-full">3 New</span>
                    </div>
                    <div className="flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                      {[
                        { title: 'Model Sync Complete', desc: 'Llama 3 downloaded to Ollama.', time: '2m ago', color: '#00D97E' },
                        { title: 'New Artifact Generated', desc: 'Dashboard scaffolding ready.', time: '1h ago', color: 'var(--accent-color)' },
                        { title: 'Usage Alert', desc: '80% of OpenAI monthly budget.', time: '4h ago', color: '#FFBC00' }
                      ].map((n, i) => (
                        <div key={i} className="px-[16px] py-[14px] border-b border-white/[0.04] hover:bg-white/[0.06] transition-colors flex items-start gap-[12px] cursor-pointer group">
                          <div className="w-[8px] h-[8px] rounded-full mt-[5px] flex-shrink-0 transition-transform group-hover:scale-125" style={{ backgroundColor: n.color, boxShadow: n.color.startsWith('var') ? '0 0 8px var(--accent-color)' : `0 0 8px ${n.color}80` }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-white/95 truncate">{n.title}</p>
                            <p className="text-xs text-white/60 truncate mt-[2px]">{n.desc}</p>
                          </div>
                          <span className="text-[10px] text-white/40 flex-shrink-0 font-medium">{n.time}</span>
                        </div>
                      ))}
                    </div>
                    <Link href="/dashboard/notifications" onClick={() => setNotifOpen(false)} className="block px-[16px] py-[12px] text-center text-xs font-semibold text-[#00D2FF] hover:bg-white/[0.06] hover:text-[#00D2FF] transition-colors border-t border-white/[0.08]">
                      View All Notifications
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-[1px] h-[20px] bg-white/[0.12] mx-[2px] flex-shrink-0" />
            
            {/* Personal Workspace */}
            <Link 
              href="/dashboard/settings"
              className="flex items-center gap-[10px] pl-[4px] pr-[12px] py-[4px] rounded-full hover:bg-white/[0.08] transition-colors duration-200 border border-transparent hover:border-white/[0.1] cursor-pointer flex-shrink-0"
            >
              <div 
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})`,
                  boxShadow: `0 0 10px ${accentColor}66`
                }}
                className="w-[28px] h-[28px] rounded-full flex items-center justify-center flex-shrink-0"
              >
                <User size={14} className="text-white" />
              </div>
              <div className="text-[13px] font-medium text-white/90 hidden lg:block">Personal Workspace</div>
              <ChevronRight size={12} className="text-white/40 hidden lg:block" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-[24px] px-[8px] custom-scrollbar">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-[24px]">
            {children}
          </div>
        </main>
      </div>

      {/* Drawer Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              key="dashboard-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm ${sidebarPosition === 'none' ? 'hidden md:block' : 'hidden'}`}
            />
          )}
          {isMobileMenuOpen && (
            <motion.aside
              key="dashboard-mobile-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 bottom-0 left-0 w-[290px] h-[100dvh] z-[70] bg-[#0A0A0F]/95 border-r border-white/[0.08] backdrop-blur-2xl shadow-2xl p-6 flex flex-col overflow-y-auto custom-scrollbar ${
                sidebarPosition === 'none' ? 'hidden md:flex' : 'hidden'
              }`}
            >
              {/* Glass Reflection Shine */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] z-0" />
              
              <div className="flex flex-col gap-6 relative z-10 flex-1 pr-1" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                {/* Header inside drawer */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="CORTEX Logo" className="w-[24px] h-[24px] object-contain rounded-md" />
                    <span className="font-bold tracking-widest text-base text-accent-gradient">CORTEX</span>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-full hover:bg-white/[0.08] text-white/60 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
                {/* Nav Links */}
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => {
                    const isActive = item.href === '/dashboard' 
                      ? pathname === '/dashboard' 
                      : (pathname === item.href || pathname?.startsWith(item.href + '/'));
                    return (
                      <Link 
                        key={item.name} 
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="relative group outline-none"
                      >
                        <div 
                          style={isActive ? {
                            background: `linear-gradient(135deg, ${accentColor}40, ${secondaryColor}22)`,
                            borderColor: `${accentColor}80`,
                            boxShadow: `0 0 20px ${accentColor}40, inset 0 1px 0 rgba(255,255,255,0.15)`
                          } : {}}
                          className={`flex items-center gap-[14px] h-[46px] px-[16px] rounded-xl text-[14px] font-medium transition-all duration-200 relative z-10 group
                            ${isActive 
                              ? 'border text-white shadow-lg' 
                              : 'text-white/60 hover:bg-white/[0.06] hover:text-white border border-transparent'}`}
                        >
                          <item.icon size={18} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-[var(--accent-color)] transition-colors'}`} />
                          <span className="tracking-wide">{item.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile More Overlay */}
        <AnimatePresence>
          {isMobileMoreOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMoreOpen(false)}
              className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px] md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Mobile Floating Bottom Navigation (Aesthetic Glassmorphism) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px] md:hidden">
          {/* Background panel */}
          <div className="relative h-[72px] rounded-full backdrop-blur-2xl bg-[#0A0A0F]/70 border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-around px-2 pointer-events-auto">
            {/* Glass reflection shine */}
            <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] overflow-hidden" />
            
            {/* Dashboard */}
            {(() => {
              const href = '/dashboard';
              const isActive = pathname === href;
              return (
                <Link
                  href={href}
                  onClick={() => setMobileMoreOpen(false)}
                  className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileBottomTab"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                    />
                  )}
                  <LayoutDashboard size={18} className={`transition-colors ${isActive ? 'text-[var(--accent-color)]' : 'text-white/60 group-hover:text-white'}`} />
                  <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>Home</span>
                </Link>
              );
            })()}

            {/* AI Chat */}
            {(() => {
              const href = '/dashboard/ai-chat';
              const isActive = pathname === href || pathname?.startsWith(href + '/');
              return (
                <Link
                  href={href}
                  onClick={() => setMobileMoreOpen(false)}
                  className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileBottomTab"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                    />
                  )}
                  <Bot size={18} className={`transition-colors ${isActive ? 'text-[var(--accent-color)]' : 'text-white/60 group-hover:text-white'}`} />
                  <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>Chat</span>
                </Link>
              );
            })()}

            {/* Conversations */}
            {(() => {
              const href = '/dashboard/conversations';
              const isActive = pathname === href || pathname?.startsWith(href + '/');
              return (
                <Link
                  href={href}
                  onClick={() => setMobileMoreOpen(false)}
                  className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileBottomTab"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                    />
                  )}
                  <MessageSquare size={18} className={`transition-colors ${isActive ? 'text-[var(--accent-color)]' : 'text-white/60 group-hover:text-white'}`} />
                  <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>Convs</span>
                </Link>
              );
            })()}

            {/* Knowledge */}
            {(() => {
              const href = '/dashboard/knowledge';
              const isActive = pathname === href || pathname?.startsWith(href + '/');
              return (
                <Link
                  href={href}
                  onClick={() => setMobileMoreOpen(false)}
                  className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileBottomTab"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                    />
                  )}
                  <Network size={18} className={`transition-colors ${isActive ? 'text-[var(--accent-color)]' : 'text-white/60 group-hover:text-white'}`} />
                  <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>Graph</span>
                </Link>
              );
            })()}

            {/* More */}
            <button
              onClick={() => setMobileMoreOpen(!isMobileMoreOpen)}
              className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
            >
              {isMobileMoreOpen && (
                <motion.div
                  layoutId="activeMobileBottomTab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                />
              )}
              <Menu size={18} className={`transition-all duration-300 ${isMobileMoreOpen ? 'text-[var(--accent-color)] rotate-90 scale-110' : 'text-white/60 group-hover:text-white'}`} />
              <span className={`text-[10px] font-semibold transition-colors ${isMobileMoreOpen ? 'text-[var(--accent-color)]' : 'text-white/50 group-hover:text-white'}`}>More</span>
            </button>
          </div>

          {/* More popup */}
          <AnimatePresence>
            {isMobileMoreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute bottom-[84px] left-0 right-0 rounded-[28px] border border-white/[0.12] bg-[#0A0A0F]/95 backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-3 z-50"
              >
                {/* Glass Reflection Shine */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] rounded-[28px] overflow-hidden" />
                
                {/* Header with Back button */}
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/[0.08] relative z-10 px-1">
                  <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">More Options</span>
                  <button 
                    onClick={() => setMobileMoreOpen(false)}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 relative z-10">
                  {/* Compare */}
                  {(() => {
                    const href = '/dashboard/compare';
                    const isActive = pathname === href || pathname?.startsWith(href + '/');
                    return (
                      <Link
                        href={href}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border transition-all text-left ${
                          isActive ? 'border-[var(--accent-color)] bg-white/[0.06]' : 'border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                          <GitCompare size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-white font-sans">Compare</span>
                          <span className="text-[8px] text-white/40 font-medium font-sans">Models/Convs</span>
                        </div>
                      </Link>
                    );
                  })()}

                  {/* Analytics */}
                  {(() => {
                    const href = '/dashboard/analytics';
                    const isActive = pathname === href || pathname?.startsWith(href + '/');
                    return (
                      <Link
                        href={href}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border transition-all text-left ${
                          isActive ? 'border-[var(--accent-color)] bg-white/[0.06]' : 'border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <BarChart2 size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-white font-sans">Analytics</span>
                          <span className="text-[8px] text-white/40 font-medium font-sans">Tokens/Spend</span>
                        </div>
                      </Link>
                    );
                  })()}

                  {/* Artifacts */}
                  {(() => {
                    const href = '/dashboard/artifacts';
                    const isActive = pathname === href || pathname?.startsWith(href + '/');
                    return (
                      <Link
                        href={href}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border transition-all text-left ${
                          isActive ? 'border-[var(--accent-color)] bg-white/[0.06]' : 'border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <Boxes size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-white font-sans">Artifacts</span>
                          <span className="text-[8px] text-white/40 font-medium font-sans">Exports/Files</span>
                        </div>
                      </Link>
                    );
                  })()}

                  {/* Settings */}
                  {(() => {
                    const href = '/dashboard/settings';
                    const isActive = pathname === href || pathname?.startsWith(href + '/');
                    return (
                      <Link
                        href={href}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border transition-all text-left ${
                          isActive ? 'border-[var(--accent-color)] bg-white/[0.06]' : 'border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                          <Settings size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-white font-sans">Settings</span>
                          <span className="text-[8px] text-white/40 font-medium font-sans">Preferences</span>
                        </div>
                      </Link>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

