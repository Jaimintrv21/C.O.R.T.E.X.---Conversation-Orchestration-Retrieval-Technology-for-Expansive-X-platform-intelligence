'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, LayoutDashboard, FileText, Presentation, 
  BookOpen, Network, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Check, LoaderCircleIcon, Sparkles,
  Search, ArrowUpDown, Eye, Trash2, Calendar, HardDrive, Cpu, X, DownloadCloud, AlertCircle, RefreshCcw
} from 'lucide-react';
import { popIn, staggerList, listItem } from '@/lib/motion';
import { artifacts as artifactsApi } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApi';
import { useAppearance } from '@/hooks/useAppearance';

import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';

const steps = [
  { id: 1, title: 'Select', description: 'Choose type' },
  { id: 2, title: 'Configure', description: 'Set parameters' },
  { id: 3, title: 'Generate', description: 'Synthesize data' }
];

const artifactTypes = [
  { id: 'website', name: 'Website', icon: Globe, desc: 'Public facing landing pages with SEO optimization' },
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, desc: 'Admin interfaces and data visualization panels' },
  { id: 'report', name: 'Report', icon: FileText, desc: 'Detailed PDF analytics and export-ready docs' },
  { id: 'presentation', name: 'Presentation', icon: Presentation, desc: 'Slide decks from conversation insights' },
  { id: 'wiki', name: 'Wiki', icon: BookOpen, desc: 'Knowledge base articles and documentation' },
  { id: 'mindmap', name: 'Mind Map', icon: Network, desc: 'Visual concept graphs and idea networks' },
];

type ArtifactCard = {
  id: string;
  name: string;
  type: string;
  model: string;
  size: string;
  time: string;
  timestamp: number;
  desc: string;
  previewText: string;
  sourceIds: string[];
};

const mapArtifact = (artifact: any): ArtifactCard => {
  const createdAt = artifact.created_at ? new Date(artifact.created_at).getTime() : Date.now();
  const previewText = artifact.content?.markdown || artifact.content?.payload?.summary || artifact.prompt || '';
  return {
    id: artifact.id,
    name: artifact.title || 'Untitled Artifact',
    type: artifact.artifact_type || 'report',
    model: artifact.model_used || 'local',
    size: artifact.file_size ? `${Math.max(1, Math.round(artifact.file_size / 1024))} KB` : '0 KB',
    time: 'Just now', // Could parse from created_at for real relative time
    timestamp: createdAt,
    desc: artifact.prompt || 'Generated from synced conversations.',
    previewText,
    sourceIds: artifact.source_ids || [],
  };
};

export default function ArtifactsPage() {
  const { accentColor } = useAppearance();
  const [activeTab, setActiveTab] = useState<'generate' | 'manage'>('generate');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedSources, setSelectedSources] = useState<string[]>(['ChatGPT History', 'Claude Projects']);

  // Manage Tab States
  const { data: rawArtifacts, isLoading, error, refetch } = useApiQuery(artifactsApi.list);
  const [artifacts, setArtifacts] = useState<ArtifactCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPreviewArtifact, setSelectedPreviewArtifact] = useState<ArtifactCard | null>(null);

  useEffect(() => {
    if (rawArtifacts) {
      setArtifacts((rawArtifacts as any[]).map(mapArtifact));
    }
  }, [rawArtifacts]);

  useEffect(() => {
    if (currentStep === 3) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            return 100;
          }
          return p + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  // Filter & Sort for Manage Tab
  const filteredAndSortedArtifacts = useMemo(() => {
    let result = artifacts.filter(art => 
      art.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.timestamp - b.timestamp;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        const parseSize = (str: string) => {
          const val = parseFloat(str);
          return str.includes('MB') ? val * 1024 : val;
        };
        comparison = parseSize(a.size) - parseSize(b.size);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [artifacts, searchQuery, sortBy, sortOrder]);

  const toggleSort = (type: 'date' | 'name' | 'size') => {
    if (sortBy === type) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  const getIcon = (type: string) => {
    const found = artifactTypes.find(t => t.id === type);
    return found ? found.icon : FileText;
  };

  return (
    <div className="flex flex-col gap-[24px] max-w-[1000px] mx-auto w-full relative pb-[80px]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-[16px] px-[8px]">
        <div className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-full bg-gradient-to-br from-primary/20 to-[var(--accent-secondary)]/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Sparkles className="text-[#00D2FF]" size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate">Artifacts Hub</h1>
            <p className="text-xs md:text-sm text-white/50 truncate">Synthesize structured assets and manage templates.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-[3px] rounded-full bg-white/[0.04] border border-white/[0.08] self-start md:self-auto overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('generate')}
            className={`px-[16px] py-[6px] rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'generate' ? 'bg-primary/30 border border-primary/40 text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Generate New
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`px-[16px] py-[6px] rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'manage' ? 'bg-primary/30 border border-primary/40 text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Manage Artifacts ({artifacts.length})
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'generate' ? (
          <motion.div 
            key="generate-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[36px] min-h-[420px]"
          >
            <Stepper
              className="flex flex-col gap-8 w-full"
              value={currentStep}
              onValueChange={setCurrentStep}
              orientation="horizontal"
              indicators={{
                completed: <Check className="size-4" />,
                loading: <LoaderCircleIcon className="size-4 animate-spin" />,
              }}
            >
              {/* Stepper Navigation */}
              <StepperNav>
                {steps.map((step, index) => (
                  <StepperItem
                    key={step.id}
                    step={step.id}
                    loading={step.id === 3 && progress < 100}
                    className="relative flex-col items-center justify-center flex-1"
                  >
                    <StepperTrigger className="flex flex-col items-center gap-2">
                      <StepperIndicator className="data-[state=completed]:bg-[#00D97E] data-[state=completed]:text-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-[0_0_16px_rgba(var(--accent-rgb),0.4)] data-[state=inactive]:bg-white/10 data-[state=inactive]:text-white/50 border-0 w-8 h-8 md:w-9 md:h-9 font-bold transition-all duration-300">
                        {step.id}
                      </StepperIndicator>
                      <div className="text-center mt-1">
                        <StepperTitle className="text-white font-medium text-xs md:text-sm">{step.title}</StepperTitle>
                        <StepperDescription className="text-white/40 text-[10px] md:text-xs hidden md:block mt-[2px]">{step.description}</StepperDescription>
                      </div>
                    </StepperTrigger>
                    {index < steps.length - 1 && (
                      <StepperSeparator className="absolute top-[16px] md:top-[18px] left-[50%] w-[calc(100%-32px)] md:w-[calc(100%-36px)] -translate-y-1/2 ml-[16px] md:ml-[18px] bg-white/10 group-data-[state=completed]/step:bg-[#00D97E] h-[2px] transition-colors duration-500" />
                    )}
                  </StepperItem>
                ))}
              </StepperNav>

              {/* Stepper Panels */}
              <StepperPanel className="w-full mt-[8px]">
                {/* Step 1: Select Type */}
                <StepperContent value={1}>
                  <motion.div key="step1" variants={popIn} initial="hidden" animate="visible" exit="hidden" className="flex flex-col gap-[24px]">
                    <p className="text-sm text-white/50 px-[4px]">Choose what kind of artifact you want to generate from your knowledge base.</p>
                    <motion.div variants={staggerList} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                      {artifactTypes.map(type => {
                        const isSelected = selectedType === type.id;
                        return (
                          <motion.button
                            key={type.id}
                            variants={listItem}
                            onClick={() => setSelectedType(type.id)}
                            className={`flex items-start gap-[14px] p-[16px] md:p-[18px] rounded-[20px] border text-left transition-all duration-200 ${
                              isSelected 
                                ? 'bg-gradient-to-br from-primary/10 to-[var(--accent-secondary)]/5 border-[var(--accent-secondary)]/40 shadow-[0_0_20px_rgba(var(--accent-secondary-rgb),0.1)] -translate-y-[2px]' 
                                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                            }`}
                          >
                            <div className={`w-[40px] h-[40px] md:w-[44px] md:h-[44px] rounded-full flex items-center justify-center border flex-shrink-0 transition-all duration-200 ${
                              isSelected ? 'bg-[var(--accent-secondary)]/20 border-[var(--accent-secondary)]/50 text-[var(--accent-secondary)] shadow-[0_0_12px_rgba(var(--accent-secondary-rgb),0.2)]' : 'bg-white/[0.04] border-white/[0.08] text-white/50'
                        }`}>
                              <type.icon size={20} />
                            </div>
                            <div className="min-w-0">
                              <h3 className={`text-[14px] md:text-[15px] font-semibold mb-[3px] transition-colors ${isSelected ? 'text-white' : 'text-white/80'}`}>{type.name}</h3>
                              <p className="text-[12px] md:text-[13px] text-white/40 leading-relaxed">{type.desc}</p>
                            </div>
                          </motion.button>
                        )
                      })}
                    </motion.div>
                    <div className="flex justify-end pt-[16px] border-t border-white/[0.06]">
                      <button 
                        disabled={!selectedType}
                        onClick={() => setCurrentStep(2)}
                        className="flex items-center justify-center gap-[8px] w-full sm:w-auto px-[24px] py-[12px] md:py-[11px] rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                      >
                        Continue <ArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                </StepperContent>

                {/* Step 2: Configure */}
                <StepperContent value={2}>
                  <motion.div key="step2" variants={popIn} initial="hidden" animate="visible" exit="hidden" className="flex flex-col gap-[28px]">
                    <p className="text-sm text-white/50 px-[4px]">Configure parameters for your <span className="text-[#00D2FF] font-medium">{selectedType}</span> artifact.</p>
                    
                    <div className="flex flex-col gap-[24px]">
                      <div className="flex flex-col gap-[10px]">
                        <div className="flex justify-between items-center px-[4px]">
                          <label className="text-sm font-medium text-white/70">Data Sources</label>
                          <span className={`text-xs ${selectedSources.length >= 5 ? 'text-red-400 font-bold' : 'text-white/40'}`}>
                            {selectedSources.length}/5 max
                          </span>
                        </div>
                        <div className="flex items-center gap-[8px] flex-wrap">
                          {selectedSources.map((src, i) => (
                            <button 
                              key={i} 
                              onClick={() => setSelectedSources(prev => prev.filter(s => s !== src))}
                              className="px-[14px] py-[7px] rounded-full bg-primary/15 border border-primary/30 text-[13px] text-white/90 hover:bg-red-500/20 hover:border-red-500/30 transition-colors whitespace-nowrap group flex items-center gap-[4px]"
                            >
                              <span className="group-hover:hidden">✓</span>
                              <X size={12} className="hidden group-hover:block" />
                              {src}
                            </button>
                          ))}
                          {selectedSources.length < 5 && (
                            <button 
                              onClick={() => {
                                const newSource = `Source ${selectedSources.length + 1}`;
                                if (selectedSources.length < 5) setSelectedSources([...selectedSources, newSource]);
                              }}
                              className="px-[14px] py-[7px] rounded-full bg-white/[0.03] border border-dashed border-white/[0.12] text-[13px] text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-all whitespace-nowrap"
                            >
                              + Add Source
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-[10px]">
                        <label className="text-sm font-medium text-white/70 pl-[4px]">Output Format</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Next.js App Router" 
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-full px-[18px] py-[12px] md:py-[11px] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.15)] transition-all" 
                        />
                      </div>

                      <div className="flex flex-col gap-[10px]">
                        <label className="text-sm font-medium text-white/70 pl-[4px]">AI Model</label>
                        <div className="flex flex-wrap gap-[8px]">
                          {['GPT-4o', 'Claude 3.5', 'Llama 3 (Local)'].map((model, i) => (
                            <button key={i} className={`px-[14px] py-[7px] rounded-full text-[13px] font-medium transition-all border whitespace-nowrap ${
                              i === 0 
                                ? 'bg-white/[0.08] border-white/[0.15] text-white' 
                                : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                            }`}>
                              {model}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-between pt-[16px] border-t border-white/[0.06] gap-[12px]">
                      <button 
                        onClick={() => setCurrentStep(1)}
                        className="flex items-center justify-center gap-[8px] w-full sm:w-auto px-[20px] py-[12px] md:py-[11px] rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] hover:text-white transition-all"
                      >
                        <ArrowLeft size={16} /> Back
                      </button>
                      <button 
                        onClick={() => setCurrentStep(3)}
                        className="flex items-center justify-center gap-[8px] w-full sm:w-auto px-[24px] py-[12px] md:py-[11px] rounded-full bg-gradient-to-r from-primary to-[var(--accent-secondary)] text-sm text-white font-semibold hover:shadow-[0_0_24px_rgba(var(--accent-rgb),0.4)] transition-all"
                      >
                        <Sparkles size={16} /> Generate
                      </button>
                    </div>
                  </motion.div>
                </StepperContent>

                {/* Step 3: Generate */}
                <StepperContent value={3}>
                  <motion.div key="step3" variants={popIn} initial="hidden" animate="visible" exit="hidden" className="flex flex-col items-center justify-center gap-[32px] py-[32px]">
                    
                    <div className="flex flex-col items-center gap-[16px] text-center">
                      {progress < 100 ? (
                        <div className="w-[72px] h-[72px] rounded-full bg-white/[0.04] border border-white/[0.1] flex items-center justify-center">
                          <Loader2 size={36} className="text-[#00D2FF] animate-spin" />
                        </div>
                      ) : (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="w-[72px] h-[72px] rounded-full bg-[#00D97E]/15 border border-[#00D97E]/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,217,126,0.2)]"
                        >
                          <CheckCircle2 size={36} className="text-[#00D97E]" />
                        </motion.div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-white mb-[6px]">
                          {progress < 100 ? 'Synthesizing knowledge...' : 'Artifact Generated!'}
                        </h3>
                        <p className="text-sm text-white/50 px-[16px]">
                          {progress < 100 ? 'Analyzing 42 conversations across 3 providers.' : 'Your Next.js scaffold is ready to download.'}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-[420px] flex flex-col gap-[8px]">
                      <div className="flex justify-between text-xs text-white/40 px-[4px]">
                        <span>Progress</span>
                        <span className="font-mono">{progress}%</span>
                      </div>
                      <div className="h-[6px] w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div 
                          className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--accent-secondary)] relative overflow-hidden"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ ease: "easeOut" }}
                        >
                          <motion.div 
                            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            style={{ mixBlendMode: 'overlay' }}
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                          />
                        </motion.div>
                      </div>
                    </div>

                    {progress === 100 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col sm:flex-row gap-[12px] w-full sm:w-auto"
                      >
                        <button 
                          onClick={() => { 
                            refetch();
                            setCurrentStep(1);
                            setSelectedType(null);
                            setActiveTab('manage');
                          }}
                          className="w-full sm:w-auto px-[24px] py-[12px] md:py-[11px] rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] hover:text-white transition-all font-semibold"
                        >
                          Save & View List
                        </button>
                        <button className="w-full sm:w-auto px-[24px] py-[12px] md:py-[11px] rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all">
                          Download Bundle
                        </button>
                      </motion.div>
                    )}

                  </motion.div>
                </StepperContent>
              </StepperPanel>
            </Stepper>
          </motion.div>
        ) : (
          <motion.div 
            key="manage-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-[20px]"
          >
            {/* Search and Sort controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-[16px] px-[8px]">
              {/* Search */}
              <div className="flex items-center gap-[10px] h-[44px] md:h-[40px] px-[16px] rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40 focus-within:bg-white/[0.08] focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.15)] transition-all duration-300 w-full md:w-[320px]">
                <Search size={16} className="flex-shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search artifact name or type..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-sm text-white placeholder:text-white/30"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="hover:text-white transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-[8px] text-xs text-white/60 overflow-x-auto custom-scrollbar self-start md:self-auto">
                <span className="whitespace-nowrap">Sort by:</span>
                <div className="flex items-center rounded-full bg-white/[0.03] border border-white/[0.08] p-[3px] flex-shrink-0">
                  {([
                    { key: 'date', label: 'Date' },
                    { key: 'name', label: 'Name' },
                    { key: 'size', label: 'Size' }
                  ] as const).map(opt => {
                    const active = sortBy === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleSort(opt.key)}
                        className={`flex items-center gap-[4px] px-[12px] py-[5px] rounded-full transition-all font-medium ${
                          active 
                            ? 'bg-white/[0.08] text-white shadow-sm' 
                            : 'hover:text-white/90'
                        }`}
                      >
                        {opt.label}
                        {active && <ArrowUpDown size={10} className="opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* List of Artifacts */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="rounded-[24px] p-[20px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.04] min-h-[160px] animate-pulse flex flex-col justify-between">
                    <div className="flex gap-[14px]">
                      <div className="w-[44px] h-[44px] rounded-full bg-white/[0.05]" />
                      <div className="flex-1">
                        <div className="h-[16px] w-[60%] bg-white/[0.1] rounded mb-[8px]" />
                        <div className="h-[12px] w-[40%] bg-white/[0.05] rounded mb-[12px]" />
                        <div className="h-[12px] w-[80%] bg-white/[0.05] rounded" />
                      </div>
                    </div>
                    <div className="border-t border-white/[0.05] pt-[14px] mt-[14px] flex justify-between">
                      <div className="h-[12px] w-[40%] bg-white/[0.05] rounded" />
                      <div className="h-[12px] w-[20%] bg-white/[0.05] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-[80px] text-center gap-[12px] bg-white/[0.01] border border-dashed border-red-500/20 rounded-[24px]">
                <AlertCircle className="text-red-400" size={40} />
                <div>
                  <h3 className="text-sm font-semibold text-white/80">Failed to load artifacts</h3>
                  <p className="text-xs text-white/40 mt-[2px]">There was a problem communicating with the backend.</p>
                </div>
                <button onClick={() => refetch()} className="mt-2 flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
                  <RefreshCcw size={16} /> Retry
                </button>
              </div>
            ) : filteredAndSortedArtifacts.length > 0 ? (
              <motion.div 
                variants={staggerList}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-[16px]"
              >
                {filteredAndSortedArtifacts.map(art => {
                  const Icon = getIcon(art.type);
                  return (
                    <motion.div
                      key={art.id}
                      variants={listItem}
                      className="rounded-[24px] p-[20px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200 flex flex-col justify-between gap-[20px] group"
                    >
                      <div className="flex items-start gap-[14px]">
                        <div className="w-[40px] h-[40px] md:w-[44px] md:h-[44px] rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-[#00D2FF] group-hover:bg-[#00D2FF]/10 group-hover:border-[#00D2FF]/30 transition-all flex-shrink-0">
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white/90 font-semibold truncate group-hover:text-white transition-colors text-sm md:text-base">{art.name}</h3>
                          <div className="flex items-center gap-[6px] md:gap-[10px] text-[10px] md:text-xs text-white/40 mt-[3px] flex-wrap">
                            <span className="uppercase font-medium tracking-wider bg-white/[0.05] px-[6px] py-[2px] rounded">{art.type}</span>
                            <span>•</span>
                            <span>{art.time}</span>
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed mt-[10px] line-clamp-2">{art.desc}</p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between border-t border-white/[0.05] pt-[14px] flex-wrap gap-[10px]">
                        <div className="flex items-center gap-[12px] text-[11px] text-white/40">
                          <span className="flex items-center gap-[4px]"><Cpu size={12} /> {art.model}</span>
                          <span className="flex items-center gap-[4px]"><HardDrive size={12} /> {art.size}</span>
                        </div>
                        <div className="flex items-center gap-[8px]">
                          <button 
                            onClick={() => setSelectedPreviewArtifact(art)}
                            className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-white transition-colors"
                          >
                            <Eye size={12} /> <span className="hidden sm:inline">See Details</span>
                          </button>
                          <button 
                            onClick={() => {
                              artifactsApi.delete(art.id).then(() => {
                                setArtifacts((current) => current.filter((item) => item.id !== art.id));
                              });
                            }}
                            className="p-[6px] rounded-full hover:bg-[#FF6584]/10 text-white/30 hover:text-[#FF6584] transition-colors border border-transparent hover:border-[#FF6584]/20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-[80px] text-center gap-[12px] bg-white/[0.01] border border-dashed border-white/[0.08] rounded-[24px]">
                <FileText className="text-white/20" size={40} />
                <div>
                  <h3 className="text-sm font-semibold text-white/80">No artifacts found</h3>
                  <p className="text-xs text-white/40 mt-[2px] px-[16px]">Synthesize a new website or wiki template to get started.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Preview Panel (Responsive Bottom Sheet on Mobile, Sidebar on Desktop) */}
      <AnimatePresence>
        {selectedPreviewArtifact && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPreviewArtifact(null)}
              className="fixed inset-0 z-50 backdrop-blur-sm bg-black/60"
            />

            {/* Sidebar / Bottom Sheet drawer */}
            <motion.div 
              initial={{ y: '100%', x: 0 }}
              animate={{ y: 0, x: 0 }}
              exit={{ y: '100%', x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 md:bottom-auto md:top-0 right-0 h-[85vh] md:h-screen w-full max-w-[100vw] md:max-w-[500px] z-50 backdrop-blur-2xl bg-[#0B0B11]/95 border-t md:border-t-0 md:border-l border-white/[0.1] md:shadow-2xl p-[20px] md:p-[24px] flex flex-col justify-between rounded-t-[24px] md:rounded-t-none"
            >
              {/* Mobile Drag Handle */}
              <div className="w-[32px] h-[4px] rounded-full bg-white/20 mx-auto mb-[16px] md:hidden" />

              {/* Header */}
              <div className="flex flex-col gap-[16px]">
                <div className="flex items-center justify-between">
                  <span className="uppercase text-[10px] font-bold tracking-widest text-[#00D2FF] bg-[#00D2FF]/10 border border-[#00D2FF]/20 px-[8px] py-[3px] rounded-full">
                    {selectedPreviewArtifact.type}
                  </span>
                  <button 
                    onClick={() => setSelectedPreviewArtifact(null)}
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white leading-tight">{selectedPreviewArtifact.name}</h2>
                  <div className="flex items-center gap-[12px] text-xs text-white/40 mt-[6px] flex-wrap">
                    <span className="flex items-center gap-[4px]"><Calendar size={12} /> {selectedPreviewArtifact.time}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-[4px]"><Cpu size={12} /> {selectedPreviewArtifact.model}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-[4px]"><HardDrive size={12} /> {selectedPreviewArtifact.size}</span>
                  </div>
                </div>

                <p className="text-xs md:text-sm text-white/60 leading-relaxed border-b border-white/[0.08] pb-[16px]">{selectedPreviewArtifact.desc}</p>
              </div>

              {/* Code/Data Preview Area */}
              <div className="flex-1 my-[16px] overflow-hidden rounded-[16px] border border-white/[0.08] bg-black/40 p-[12px] md:p-[16px] flex flex-col gap-[10px]">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Template Preview</span>
                <pre className="flex-1 overflow-auto text-[10px] md:text-xs font-mono text-white/80 whitespace-pre-wrap leading-relaxed custom-scrollbar">
                  {selectedPreviewArtifact.previewText}
                </pre>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-[12px] pt-[16px] border-t border-white/[0.08]">
                <button className="w-full sm:flex-1 flex items-center justify-center gap-[8px] py-[12px] md:py-[11px] rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
                  <DownloadCloud size={16} /> Download Source
                </button>
                <button 
                  onClick={() => setSelectedPreviewArtifact(null)}
                  className="w-full sm:w-auto px-[20px] py-[12px] md:py-[11px] rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] hover:text-white transition-all text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
