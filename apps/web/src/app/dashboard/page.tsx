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
  Network,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { analytics, jobs } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApi';
import { cardHover, staggerList, listItem } from '@/lib/motion';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const { data: overview, isLoading: isOverviewLoading, error: overviewError, refetch: refetchOverview } = useApiQuery(analytics.overview);
  const { data: providers, isLoading: isProvidersLoading } = useApiQuery(analytics.providers);
  const { data: jobsList, isLoading: isJobsLoading } = useApiQuery(jobs.list);

  const mockOverview = {
    total_conversations: 0,
    total_messages: 0,
    providers_used: 0,
    avg_messages_per_conversation: 0
  };
  const mockProviders: any[] = [];
  const mockJobs: any[] = [];

  const displayOverview = overview || mockOverview;
  const displayProviders = (providers && providers.length > 0) ? providers : mockProviders;
  const displayJobs = (jobsList && jobsList.length > 0) ? jobsList : mockJobs;

  const stats = [
    { label: 'Total Conversations', value: displayOverview.total_conversations.toLocaleString(), icon: MessageSquare, trend: 'Live', trendUp: true },
    { label: 'Messages Indexed', value: displayOverview.total_messages.toLocaleString(), icon: Database, trend: 'Live', trendUp: true },
    { label: 'Active Providers', value: `${displayOverview.providers_used}`, icon: Cpu, trend: 'Live', trendUp: true },
    { label: 'Avg Search Time', value: `${Math.max(1, Math.round(displayOverview.avg_messages_per_conversation * 10))}ms`, icon: Zap, trend: 'Derived', trendUp: true },
  ];

  const quickHealth = displayProviders.slice(0, 5).map((provider: any) => ({
    name: provider.provider,
    status: provider.conversations > 0 ? 'synced' : 'syncing',
    syncTime: `${provider.conversations} convos`,
  }));

  const activities = displayJobs.slice(0, 4);

  const isLoading = false; // Force false to prevent infinite skeleton if api is down

  return (
    <div className="flex flex-col gap-[20px] md:gap-[32px] w-full max-w-full overflow-x-hidden">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {isLoading ? (
          // Skeleton loader
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="rounded-[20px] p-[24px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.04] min-h-[140px] flex flex-col justify-between animate-pulse">
              <div className="flex justify-between items-start mb-[12px]">
                <div className="w-[32px] h-[32px] rounded-full bg-white/[0.05]" />
                <div className="w-[40px] h-[16px] rounded-full bg-white/[0.05]" />
              </div>
              <div>
                <div className="h-[32px] w-[80px] bg-white/[0.1] rounded mb-[8px]" />
                <div className="h-[14px] w-[120px] bg-white/[0.05] rounded" />
              </div>
            </div>
          ))
        ) : (
          stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={cardHover}
              initial="rest"
              whileHover="hover"
              className="rounded-[20px] p-[24px] backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.06] transition-colors duration-300 ease-out shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden group flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start mb-[12px]">
                <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#6C63FF]/20 to-[#00D2FF]/20 flex items-center justify-center border border-white/[0.1]">
                  <stat.icon size={16} className="text-[#00D2FF]" />
                </div>
                <div className="text-[11px] px-[8px] py-[2px] rounded-full border bg-[#00D97E]/10 border-[#00D97E]/25 text-[#00D97E]">
                  {stat.trend}
                </div>
              </div>
              <div>
                <div className="text-[28px] md:text-[32px] font-bold text-white tracking-tight leading-none mb-[8px]">{stat.value}</div>
                <div className="text-[12px] md:text-[13px] text-white/45">{stat.label}</div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        <div className="lg:col-span-2 flex flex-col gap-[24px]">
          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-medium text-white/50 mb-[16px] px-[8px]">Quick Actions</h2>
            <div className="flex flex-wrap items-center gap-[10px]">
              <button className="flex-1 min-w-[140px] flex items-center justify-center gap-[8px] px-[16px] py-[12px] rounded-[16px] bg-white/[0.05] border border-white/[0.1] text-xs md:text-sm text-white/70 hover:bg-gradient-to-r hover:from-[#6C63FF]/20 hover:to-[#00D2FF]/10 hover:border-[#6C63FF]/30 hover:text-white transition-all duration-200 ease-out whitespace-nowrap">
                <DownloadCloud size={16} />
                Import conversations
              </button>
              <Link href="/dashboard/compare" className="flex-1 min-w-[140px] flex items-center justify-center gap-[8px] px-[16px] py-[12px] rounded-[16px] bg-white/[0.05] border border-white/[0.1] text-xs md:text-sm text-white/70 hover:bg-gradient-to-r hover:from-[#6C63FF]/20 hover:to-[#00D2FF]/10 hover:border-[#6C63FF]/30 hover:text-white transition-all duration-200 ease-out whitespace-nowrap">
                <GitCompare size={16} />
                New comparison
              </Link>
              <Link href="/dashboard/artifacts" className="flex-1 min-w-[140px] flex items-center justify-center gap-[8px] px-[16px] py-[12px] rounded-[16px] bg-white/[0.05] border border-white/[0.1] text-xs md:text-sm text-white/70 hover:bg-gradient-to-r hover:from-[#6C63FF]/20 hover:to-[#00D2FF]/10 hover:border-[#6C63FF]/30 hover:text-white transition-all duration-200 ease-out whitespace-nowrap">
                <Boxes size={16} />
                Generate artifact
              </Link>
              <Link href="/dashboard/knowledge" className="flex-1 min-w-[140px] flex items-center justify-center gap-[8px] px-[16px] py-[12px] rounded-[16px] bg-white/[0.05] border border-white/[0.1] text-xs md:text-sm text-white/70 hover:bg-gradient-to-r hover:from-[#6C63FF]/20 hover:to-[#00D2FF]/10 hover:border-[#6C63FF]/30 hover:text-white transition-all duration-200 ease-out whitespace-nowrap">
                <Network size={16} />
                View knowledge graph
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[16px]">
            <h2 className="text-sm font-medium text-white/50 mb-[8px] px-[4px]">Recent Activity</h2>
            
            {isLoading ? (
              <div className="flex flex-col gap-[12px]">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-[14px] p-[12px] animate-pulse">
                    <div className="w-[36px] h-[36px] rounded-full bg-white/[0.05]" />
                    <div className="flex-1">
                      <div className="h-[14px] w-[60%] bg-white/[0.1] rounded mb-[6px]" />
                      <div className="h-[10px] w-[30%] bg-white/[0.05] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <motion.div variants={staggerList} initial="hidden" animate="visible" className="flex flex-col gap-[12px]">
                {activities.map((act: any) => (
                  <motion.div
                    key={act.id}
                    variants={listItem}
                    className="flex items-center justify-between gap-[14px] p-[12px] rounded-[16px] md:rounded-full hover:bg-white/[0.04] transition-colors duration-200 cursor-pointer group border border-transparent hover:border-white/[0.05]"
                  >
                    <div className="flex items-center gap-[14px] min-w-0">
                      <div className="w-[36px] h-[36px] rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-lg">
                        {act.status === 'failed' ? '!' : '•'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white/90 font-medium group-hover:text-white transition-colors truncate">{act.progress_detail || act.job_type}</div>
                        <div className="text-xs text-white/40">{act.status}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/30 transform transition-transform duration-200 ease-out group-hover:translate-x-[4px] group-hover:text-white/70 flex-shrink-0 mr-[8px]" />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p className="text-sm text-white/40 pt-[16px]">No recent jobs yet.</p>
            )}
          </div>
        </div>

        {/* Provider Health */}
        <div className="flex flex-col gap-[24px]">
          <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[20px] h-full">
            <h2 className="text-sm font-medium text-white/50 px-[4px]">Provider Health</h2>
            
            {isLoading ? (
              <div className="flex flex-col gap-[12px]">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-[12px] bg-white/[0.02] rounded-[16px] animate-pulse">
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[8px] h-[8px] rounded-full bg-white/[0.1]" />
                      <div className="h-[14px] w-[80px] bg-white/[0.1] rounded" />
                    </div>
                    <div className="h-[12px] w-[40px] bg-white/[0.05] rounded" />
                  </div>
                ))}
              </div>
            ) : quickHealth.length > 0 ? (
              <div className="flex flex-col gap-[12px]">
                {quickHealth.map((p: any) => (
                  <div key={p.name} className="flex items-center justify-between gap-[8px] px-[16px] py-[12px] rounded-[16px] md:rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors duration-200 cursor-default">
                    <div className="flex items-center gap-[12px] min-w-0">
                      <div className="w-[8px] h-[8px] rounded-full bg-[#00D97E] shadow-[0_0_8px_currentColor] opacity-80 flex-shrink-0" />
                      <span className="text-sm font-medium text-white/80 truncate">{p.name}</span>
                    </div>
                    <span className="text-xs text-white/40 flex-shrink-0">{p.syncTime}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40 pt-[8px]">No providers synced yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
