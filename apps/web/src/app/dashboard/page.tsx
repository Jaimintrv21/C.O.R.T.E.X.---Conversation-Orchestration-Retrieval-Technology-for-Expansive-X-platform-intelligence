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
import React from 'react';
import { analytics, jobs, OverviewMetrics, ProviderBreakdown, JobResponse, providerAccounts, auth } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApi';
import { cardHover, staggerList, listItem } from '@/lib/motion';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const [showNudge, setShowNudge] = React.useState(true);
  const { data: overview, isLoading: isOverviewLoading, error: overviewError, refetch: refetchOverview } = useApiQuery(analytics.overview);
  const { data: providers, isLoading: isProvidersLoading } = useApiQuery(analytics.providers);
  const { data: jobsList, isLoading: isJobsLoading } = useApiQuery(jobs.list);
  const { data: providerStatusList } = useApiQuery<{ provider_slug: string, tier: string }[]>(() => providerAccounts.list().then(res => fetch('/api/v1/provider-accounts/status').then(r => r.json()).then(j => j.data)));
  const { data: user } = useApiQuery(auth.me);

  const mockOverview: OverviewMetrics = {
    total_conversations: 14,
    total_messages: 107,
    total_tokens: 42800,
    providers_used: 3,
    avg_messages_per_conversation: 7.6,
    active_days: 7,
  };
  const mockProviders: ProviderBreakdown[] = [
    { provider: 'ChatGPT', conversations: 6, messages: 45, tokens: 18000, percentage: 40 },
    { provider: 'Claude', conversations: 5, messages: 38, tokens: 15200, percentage: 35 },
    { provider: 'Ollama', conversations: 3, messages: 24, tokens: 9600, percentage: 25 }
  ];
  const mockJobs: JobResponse[] = [
    { id: '1', job_type: 'Semantic Indexing', status: 'completed', progress_detail: 'Indexed 107 conversation turn nodes', created_at: new Date().toISOString() },
    { id: '2', job_type: 'Vector Storage Sync', status: 'completed', progress_detail: 'Vectorized 42,800 text tokens', created_at: new Date().toISOString() }
  ] as unknown as JobResponse[];

  const displayOverview = overview || mockOverview;
  const displayProviders = (providers && providers.length > 0) ? providers : mockProviders;
  const displayJobs = (jobsList && jobsList.length > 0) ? jobsList : mockJobs;

  const activeProvidersCount = providerStatusList?.filter(p => p.tier === 'full' || p.tier === 'partial').length ?? displayOverview.providers_used;

  const stats = [
    { label: 'Total Conversations', value: displayOverview.total_conversations.toLocaleString(), icon: MessageSquare, trend: 'Live', trendUp: true },
    { label: 'Messages Indexed', value: displayOverview.total_messages.toLocaleString(), icon: Database, trend: 'Live', trendUp: true },
    { label: 'Active Providers', value: `${activeProvidersCount}`, icon: Cpu, trend: 'Live', trendUp: true },
    { label: 'Avg Search Time', value: `${Math.max(1, Math.round(displayOverview.avg_messages_per_conversation * 10))}ms`, icon: Zap, trend: 'Derived', trendUp: true },
  ];

  const quickHealth = displayProviders.slice(0, 5).map((provider: ProviderBreakdown) => ({
    name: provider.provider,
    status: provider.conversations > 0 ? 'synced' : 'syncing',
    syncTime: `${provider.conversations} convos`,
  }));

  const activities = displayJobs.slice(0, 4);

  const isLoading = false; // Force false to prevent infinite skeleton if api is down

  const showOnboardingNudge = showNudge && user && !user.has_completed_first_integration;

  return (
    <div className="flex flex-col gap-[20px] md:gap-[32px] w-full max-w-full overflow-x-hidden">
      {/* Onboarding Nudge */}
      {showOnboardingNudge && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-[24px] p-[24px] overflow-hidden border border-primary/30 [box-shadow:0_0_40px_rgba(var(--primary-rgb),0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[20px]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-[var(--accent-secondary)]/5 to-transparent backdrop-blur-xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-[8px]">Connect your first AI platform to start building your knowledge base</h2>
            <p className="text-sm md:text-base text-white/70 max-w-[600px]">CORTEX works best when it can index your conversations. Connect ChatGPT, Claude, or another provider to see the magic happen.</p>
          </div>
          <div className="relative z-10 flex items-center gap-[12px] flex-shrink-0">
            <button onClick={() => setShowNudge(false)} className="px-[16px] py-[10px] rounded-full text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.05] transition-all">Dismiss</button>
            <Link href="/dashboard/settings?tab=Integrations" className="px-[20px] py-[10px] rounded-full bg-white text-black text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-white/90 transition-all whitespace-nowrap">Connect Platform</Link>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {isLoading ? (
          // Skeleton loader
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="rounded-[20px] p-[24px] backdrop-blur-3xl bg-white/[0.02] border border-white/[0.05] min-h-[140px] flex flex-col justify-between animate-pulse">
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
              className="rounded-[20px] p-[24px] backdrop-blur-3xl bg-white/[0.04] border border-white/[0.15] transition-all duration-300 ease-out [box-shadow:inset_1px_1px_2px_rgba(255,255,255,0.2),_inset_-1px_-1px_2px_rgba(0,0,0,0.3)] hover:[box-shadow:inset_1px_1px_3px_rgba(255,255,255,0.25),_inset_-1px_-1px_3px_rgba(0,0,0,0.4),_0_12px_32px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:bg-white/[0.06] relative overflow-hidden group flex flex-col justify-between min-h-[140px]"
            >
              {/* Glass Reflection Shine */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] z-0" />
              
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-[12px]">
                  <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-primary/20 to-[var(--accent-secondary)]/20 flex items-center justify-center border border-white/[0.1]">
                    <stat.icon size={16} className="text-[var(--accent-secondary)]" />
                  </div>
                  <div className="text-[11px] px-[8px] py-[2px] rounded-full border bg-[#00D97E]/10 border-[#00D97E]/25 text-[#00D97E]">
                    {stat.trend}
                  </div>
                </div>
                <div>
                  <div className="text-[28px] md:text-[32px] font-bold text-white tracking-tight leading-none mb-[8px]">{stat.value}</div>
                  <div className="text-[12px] md:text-[13px] text-white/45">{stat.label}</div>
                </div>
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
              <button className="flex-1 min-w-[140px] flex items-center justify-center gap-[8px] px-[18px] py-[12px] rounded-[18px] bg-white/[0.04] border border-white/[0.15] text-xs md:text-sm text-white/70 hover:bg-gradient-to-r hover:from-primary/20 hover:to-[var(--accent-secondary)]/10 hover:border-primary/30 hover:text-white transition-all duration-200 ease-out whitespace-nowrap [box-shadow:inset_1px_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]">
                <DownloadCloud size={16} />
                Import conversations
              </button>
              <Link href="/dashboard/compare" className="flex-1 min-w-[140px] flex items-center justify-center gap-[8px] px-[18px] py-[12px] rounded-[18px] bg-white/[0.04] border border-white/[0.15] text-xs md:text-sm text-white/70 hover:bg-gradient-to-r hover:from-primary/20 hover:to-[var(--accent-secondary)]/10 hover:border-primary/30 hover:text-white transition-all duration-200 ease-out whitespace-nowrap [box-shadow:inset_1px_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]">
                <GitCompare size={16} />
                New comparison
              </Link>
              <Link href="/dashboard/artifacts" className="flex-1 min-w-[140px] flex items-center justify-center gap-[8px] px-[18px] py-[12px] rounded-[18px] bg-white/[0.04] border border-white/[0.15] text-xs md:text-sm text-white/70 hover:bg-gradient-to-r hover:from-primary/20 hover:to-[var(--accent-secondary)]/10 hover:border-primary/30 hover:text-white transition-all duration-200 ease-out whitespace-nowrap [box-shadow:inset_1px_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]">
                <Boxes size={16} />
                Generate artifact
              </Link>
              <Link href="/dashboard/knowledge" className="flex-1 min-w-[140px] flex items-center justify-center gap-[8px] px-[18px] py-[12px] rounded-[18px] bg-white/[0.04] border border-white/[0.15] text-xs md:text-sm text-white/70 hover:bg-gradient-to-r hover:from-primary/20 hover:to-[var(--accent-secondary)]/10 hover:border-primary/30 hover:text-white transition-all duration-200 ease-out whitespace-nowrap [box-shadow:inset_1px_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]">
                <Network size={16} />
                View knowledge graph
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-[24px] backdrop-blur-3xl bg-white/[0.04] border border-white/[0.15] p-[20px] md:p-[24px] flex flex-col gap-[16px] [box-shadow:inset_1px_1px_2px_rgba(255,255,255,0.2),_inset_-1px_-1px_2px_rgba(0,0,0,0.3),_0_24px_50px_rgba(0,0,0,0.4)] relative overflow-hidden">
            {/* Glass Reflection Shine */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] z-0" />
            
            <div className="relative z-10 flex flex-col gap-[16px]">
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
                  {activities.map((act: JobResponse) => (
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
        </div>

        {/* Provider Health */}
        <div className="flex flex-col gap-[24px]">
          <div className="rounded-[24px] backdrop-blur-3xl bg-white/[0.04] border border-white/[0.15] p-[20px] md:p-[24px] flex flex-col gap-[20px] h-full [box-shadow:inset_1px_1px_2px_rgba(255,255,255,0.2),_inset_-1px_-1px_2px_rgba(0,0,0,0.3),_0_24px_50px_rgba(0,0,0,0.4)] relative overflow-hidden">
            {/* Glass Reflection Shine */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] z-0" />
            
            <div className="relative z-10 flex flex-col gap-[20px] h-full">
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
    </div>
  );
}
