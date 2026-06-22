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
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

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
        className={`relative min-h-screen flex text-white overflow-hidden font-sans bg-black ${
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
                      className="absolute inset-0 bg-accent-gradient border border-accent-theme-glow shadow-accent-theme-glow rounded-full -z-10"
                    />
                  )}
                  <div 
                    data-active={isActive}
                    className={`flex items-center gap-[12px] h-[40px] rounded-full text-sm transition-all duration-200 ease-out
                      ${isSidebarOpen ? 'px-[14px] justify-start' : 'justify-center'}
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
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden h-screen relative z-10 p-[16px] ${
        sidebarPosition === 'right' ? 'pl-[16px] pr-[8px]' : sidebarPosition === 'none' ? 'px-[16px]' : 'pl-[8px] pr-[16px]'
      }`}>
        
        {/* Floating Pill Topbar */}
        <header className="relative z-30 h-[56px] rounded-full backdrop-blur-3xl bg-white/[0.04] border border-white/[0.15] px-[12px] sm:px-[20px] flex items-center justify-between gap-[10px] sm:gap-[16px] shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.15),inset_-1px_-1px_1px_rgba(0,0,0,0.2)] flex-shrink-0 mb-[16px]">
          {/* Glass Reflection Shine */}
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none z-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-white/[0.02] to-white/[0.06]" />
          </div>
          
          {/* Left: CORTEX Logo & Search */}
          <div className="flex-1 flex items-center gap-[8px] sm:gap-[12px] min-w-0 relative z-10">
            {/* Hamburger Mobile Menu Toggle - always shown on mobile, also shown on desktop when no sidebar */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className={`flex md:hidden ${sidebarPosition === 'none' ? 'md:flex' : ''} p-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white items-center justify-center hover:bg-white/[0.1] flex-shrink-0`}
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
              className="flex items-center gap-[10px] h-[36px] px-[14px] rounded-full bg-white/[0.05] border border-white/[0.1] transition-all duration-300 ease-out focus-within:bg-white/[0.1] focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.15)] w-full max-w-[120px] xs:max-w-[150px] sm:max-w-[220px] sm:focus-within:max-w-[380px] flex-shrink"
            >
              <Search size={16} className="flex-shrink-0 text-white/40" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none w-full text-xs sm:text-sm text-white placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Right: Actions & User Profile */}
          <div className="flex items-center gap-[8px] sm:gap-[16px] flex-shrink-0 z-10">
            {/* Notification Bell Dropdown */}
            <div className="static sm:relative group/notif flex-shrink-0">
              <button className="w-[36px] h-[36px] rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors relative flex-shrink-0">
                <Bell size={16} />
                <div className="absolute top-[2px] right-[2px] w-[8px] h-[8px] rounded-full bg-primary shadow-[0_0_8px_var(--accent-color)]" />
              </button>
              
              {/* Dropdown Panel */}
              <div className="absolute top-full left-[16px] right-[16px] sm:left-auto sm:right-0 mt-[8px] w-auto sm:w-[320px] rounded-[20px] backdrop-blur-3xl bg-[#0A0A0F]/90 border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.08),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.08),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.2),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.2)] opacity-0 translate-y-2 pointer-events-none group-hover/notif:opacity-100 group-hover/notif:translate-y-0 group-hover/notif:pointer-events-auto transition-all duration-300 z-50 overflow-hidden flex flex-col">
                <div className="px-[16px] py-[12px] border-b border-white/[0.08] flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-white">Notifications</h3>
                  <span className="text-[10px] uppercase tracking-wider text-white/40 bg-white/[0.05] px-[8px] py-[3px] rounded-full">3 New</span>
                </div>
                <div className="flex flex-col">
                  {[
                    { title: 'Model Sync Complete', desc: 'Llama 3 downloaded to Ollama.', time: '2m ago', color: '#00D97E' },
                    { title: 'New Artifact Generated', desc: 'Dashboard scaffolding ready.', time: '1h ago', color: 'var(--accent-color)' },
                    { title: 'Usage Alert', desc: '80% of OpenAI monthly budget.', time: '4h ago', color: '#FFBC00' }
                  ].map((n, i) => (
                    <div key={i} className="px-[16px] py-[12px] border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors flex items-start gap-[10px] cursor-pointer">
                      <div className="w-[8px] h-[8px] rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: n.color, boxShadow: n.color.startsWith('var') ? '0 0 8px var(--accent-color)' : `0 0 8px ${n.color}80` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white/90 truncate">{n.title}</p>
                        <p className="text-xs text-white/50 truncate mt-[1px]">{n.desc}</p>
                      </div>
                      <span className="text-[10px] text-white/30 flex-shrink-0">{n.time}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/notifications" className="block px-[16px] py-[10px] text-center text-xs font-medium text-[#00D2FF] hover:bg-white/[0.04] transition-colors">
                  View All Notifications
                </Link>
              </div>
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
          className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm ${sidebarPosition === 'none' ? '' : 'md:hidden'}`}
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
            sidebarPosition === 'none' ? '' : 'md:hidden'
          }`}
        >
          {/* Glass Reflection Shine */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] z-0" />
          
          <div className="flex flex-col gap-6 relative z-10 flex-1 pr-1">
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
                        background: `linear-gradient(135deg, ${accentColor}26, ${secondaryColor}1a)`,
                        borderColor: `${accentColor}99`,
                        boxShadow: `0 0 15px ${accentColor}33, inset 0 1px 0 rgba(255,255,255,0.15)`
                      } : {}}
                      className={`flex items-center gap-3 h-[42px] px-4 rounded-full text-xs font-semibold transition-all duration-200 relative z-10
                        ${isActive 
                          ? 'border text-white shadow-lg' 
                          : 'text-white/50 hover:bg-white/[0.05] hover:text-white/95 border border-transparent'}`}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  </>
  );
}

