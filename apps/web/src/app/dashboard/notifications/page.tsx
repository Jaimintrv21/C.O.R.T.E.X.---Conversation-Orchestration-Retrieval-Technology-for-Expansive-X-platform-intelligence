'use client';

import { motion } from 'framer-motion';
import { Bell, Check, Trash2, Cpu, Sparkles, AlertTriangle } from 'lucide-react';
import { staggerList, listItem } from '@/lib/motion';
import { useAppearance } from '@/hooks/useAppearance';

export default function NotificationsPage() {
  const { accentColor } = useAppearance();
  const notifications = [
    { id: 1, title: 'Model Sync Complete', desc: 'Llama 3 downloaded to Ollama successfully.', time: '2 mins ago', icon: Cpu, color: '#00D97E', read: false },
    { id: 2, title: 'New Artifact Generated', desc: 'Dashboard scaffolding React components are ready to view.', time: '1 hour ago', icon: Sparkles, color: accentColor, read: false },
    { id: 3, title: 'Usage Alert', desc: 'You have reached 80% of your OpenAI monthly budget.', time: '4 hours ago', icon: AlertTriangle, color: '#FFBC00', read: false },
    { id: 4, title: 'Workspace Invite', desc: 'Sarah joined your "Personal Workspace" as an Editor.', time: '1 day ago', icon: Bell, color: '#00D2FF', read: true },
    { id: 5, title: 'Weekly Digest', desc: 'You processed 1,204 messages and extracted 45 new entities this week.', time: '2 days ago', icon: Bell, color: accentColor, read: true },
  ];

  return (
    <div className="flex flex-col gap-[32px] max-w-[1000px] mx-auto w-full pb-[40px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[20px] px-[8px]">
        <div>
          <h1 className="text-2xl font-bold text-white mb-[4px]">Notifications</h1>
          <p className="text-sm text-white/50">Manage your alerts, system updates, and workspace activity.</p>
        </div>
        <div className="flex gap-[12px] w-full sm:w-auto">
          <button className="flex-1 sm:flex-initial justify-center px-[16px] py-[8px] rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-[6px]">
            <Check size={14} />
            <span className="hidden xs:inline">Mark all as read</span>
            <span className="xs:hidden">Read All</span>
          </button>
          <button className="flex-1 sm:flex-initial justify-center px-[16px] py-[8px] rounded-full bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/20 hover:text-white transition-all flex items-center gap-[6px]">
            <Trash2 size={14} />
            <span className="hidden xs:inline">Clear all</span>
            <span className="xs:hidden">Clear All</span>
          </button>
        </div>
      </div>

      <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
        <motion.div variants={staggerList} initial="hidden" animate="visible" className="flex flex-col">
          {notifications.map((notif, i) => (
            <motion.div 
              key={notif.id}
              variants={listItem}
              className={`p-[24px] flex items-start gap-[20px] transition-colors border-b border-white/[0.04] last:border-0 ${notif.read ? 'bg-transparent opacity-70' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
            >
              <div className="relative mt-[2px] flex-shrink-0">
                <div className="w-[40px] h-[40px] rounded-full border flex items-center justify-center" style={{ backgroundColor: `${notif.color}15`, borderColor: `${notif.color}30` }}>
                  <notif.icon size={18} color={notif.color} />
                </div>
                {!notif.read && (
                  <div className="absolute top-0 right-0 w-[10px] h-[10px] rounded-full border-2 border-[#0A0A0F]" style={{ backgroundColor: notif.color }} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-[16px] mb-[4px]">
                  <h3 className={`text-base font-medium truncate ${notif.read ? 'text-white/70' : 'text-white'}`}>{notif.title}</h3>
                  <span className="text-xs text-white/40 flex-shrink-0">{notif.time}</span>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">{notif.desc}</p>
                
                {!notif.read && (
                  <div className="mt-[12px] flex gap-[12px]">
                    <button className="text-xs font-medium text-[#00D2FF] hover:text-white transition-colors">View details</button>
                    <button className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors">Dismiss</button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
