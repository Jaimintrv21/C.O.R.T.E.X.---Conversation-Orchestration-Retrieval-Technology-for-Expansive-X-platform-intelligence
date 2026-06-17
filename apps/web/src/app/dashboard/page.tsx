'use client';

import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Database, 
  Cpu, 
  Zap, 
  ChevronRight, 
  DownloadCloud, 
  GitCompare, 
  Boxes, 
  Network
} from 'lucide-react';
import { cardHover, staggerList, listItem } from '@/lib/motion';

const stats = [
  { label: 'Total Conversations', value: '4,208', icon: MessageSquare, trend: '+12%', trendUp: true },
  { label: 'Messages Indexed', value: '184.2k', icon: Database, trend: '+8%', trendUp: true },
  { label: 'Active Providers', value: '5/7', icon: Cpu, trend: 'Stable', trendUp: true },
  { label: 'Avg Search Time', value: '142ms', icon: Zap, trend: '-21%', trendUp: true },
];

const activities = [
  { title: 'Synced 42 new messages from ChatGPT', time: '10 mins ago', icon: '🤖' },
  { title: 'New knowledge graph node: "React Server Components"', time: '2 hrs ago', icon: '🧠' },
  { title: 'Exported "Project Apollo" notes to PDF', time: '5 hrs ago', icon: '📄' },
  { title: 'Connected new provider: Perplexity API', time: '1 day ago', icon: '🔌' },
];

const providers = [
  { name: 'ChatGPT', status: 'synced', syncTime: 'Just now' },
  { name: 'Claude', status: 'synced', syncTime: '2m ago' },
  { name: 'Gemini', status: 'syncing', syncTime: 'Syncing...' },
  { name: 'Perplexity', status: 'synced', syncTime: '1h ago' },
  { name: 'Grok', status: 'needs_auth', syncTime: 'Auth required' },
];

export default function DashboardOverviewPage() {
  return (
    <div className="flex flex-col gap-[32px]">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="rounded-[20px] p-[24px] backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.06] transition-colors duration-300 ease-out shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden group flex flex-col justify-between min-h-[140px]"
          >
            <div className="flex justify-between items-start mb-[12px]">
              <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#6C63FF]/20 to-[#00D2FF]/20 flex items-center justify-center border border-white/[0.1]">
                <stat.icon size={16} className="text-[#00D2FF]" />
              </div>
              <div className={`text-[11px] px-[8px] py-[2px] rounded-full border ${stat.trendUp ? 'bg-[#00D97E]/10 border-[#00D97E]/25 text-[#00D97E]' : 'bg-[#FF6584]/10 border-[#FF6584]/25 text-[#FF6584]'}`}>
                {stat.trend}
              </div>
            </div>
            <div>
              <div className="text-[32px] font-bold text-white tracking-tight leading-none mb-[8px]">{stat.value}</div>
              <div className="text-[13px] text-white/45">{stat.label}</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        
        {/* Left Column: Activity & Quick Actions */}
        <div className="lg:col-span-2 flex flex-col gap-[24px]">
          
          {/* Quick Actions Row */}
          <div>
            <h2 className="text-sm font-medium text-white/50 mb-[16px] px-[8px]">Quick Actions</h2>
            <div className="flex items-center gap-[10px] overflow-x-auto pb-[8px] custom-scrollbar">
              <button className="flex items-center gap-[8px] px-[18px] py-[10px] rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-white/70 hover:bg-gradient-to-r hover:from-[#6C63FF]/20 hover:to-[#00D2FF]/10 hover:border-[#6C63FF]/30 hover:text-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ease-out whitespace-nowrap">
                <DownloadCloud size={16} />
                Import conversations
              </button>
              <button className="flex items-center gap-[8px] px-[18px] py-[10px] rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-white/70 hover:bg-gradient-to-r hover:from-[#6C63FF]/20 hover:to-[#00D2FF]/10 hover:border-[#6C63FF]/30 hover:text-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ease-out whitespace-nowrap">
                <GitCompare size={16} />
                New comparison
              </button>
              <button className="flex items-center gap-[8px] px-[18px] py-[10px] rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-white/70 hover:bg-gradient-to-r hover:from-[#6C63FF]/20 hover:to-[#00D2FF]/10 hover:border-[#6C63FF]/30 hover:text-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ease-out whitespace-nowrap">
                <Boxes size={16} />
                Generate artifact
              </button>
              <button className="flex items-center gap-[8px] px-[18px] py-[10px] rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-white/70 hover:bg-gradient-to-r hover:from-[#6C63FF]/20 hover:to-[#00D2FF]/10 hover:border-[#6C63FF]/30 hover:text-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ease-out whitespace-nowrap">
                <Network size={16} />
                View knowledge graph
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[16px]">
            <h2 className="text-sm font-medium text-white/50 mb-[8px] px-[8px]">Recent Activity</h2>
            <motion.div 
              variants={staggerList}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-[12px]"
            >
              {activities.map((act, i) => (
                <motion.div 
                  key={i}
                  variants={listItem}
                  className="flex items-center justify-between gap-[14px] p-[12px] rounded-full hover:bg-white/[0.04] transition-colors duration-200 cursor-pointer group border border-transparent hover:border-white/[0.05]"
                >
                  <div className="flex items-center gap-[14px]">
                    <div className="w-[36px] h-[36px] rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-lg">
                      {act.icon}
                    </div>
                    <div>
                      <div className="text-sm text-white/90 font-medium group-hover:text-white transition-colors">{act.title}</div>
                      <div className="text-xs text-white/40">{act.time}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/30 transform transition-transform duration-200 ease-out group-hover:translate-x-[4px] group-hover:text-white/70 mr-[8px]" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Right Column: Provider Health */}
        <div className="flex flex-col gap-[24px]">
          <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[20px] h-full">
            <h2 className="text-sm font-medium text-white/50 px-[8px]">Provider Health</h2>
            <div className="flex flex-col gap-[12px]">
              {providers.map((p, i) => {
                let dotClass = "bg-[#00D97E]";
                if (p.status === 'syncing') dotClass = "bg-[#00D2FF] animate-pulse";
                if (p.status === 'needs_auth') dotClass = "bg-[#FFBC00]";
                
                return (
                  <div key={i} className="flex items-center justify-between gap-[8px] px-[16px] py-[12px] rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors duration-200 cursor-default">
                    <div className="flex items-center gap-[12px]">
                      <div className={`w-[8px] h-[8px] rounded-full ${dotClass} shadow-[0_0_8px_currentColor] opacity-80`} />
                      <span className="text-sm font-medium text-white/80">{p.name}</span>
                    </div>
                    <span className="text-xs text-white/40">{p.syncTime}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
