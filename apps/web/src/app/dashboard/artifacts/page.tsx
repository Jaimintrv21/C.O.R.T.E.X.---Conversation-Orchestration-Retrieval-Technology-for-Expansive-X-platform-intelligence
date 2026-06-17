'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, LayoutDashboard, FileText, Presentation, 
  BookOpen, Network, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Check, LoaderCircleIcon, Sparkles,
  Search, ArrowUpDown, Eye, Trash2, Calendar, HardDrive, Cpu, X, DownloadCloud
} from 'lucide-react';
import { popIn, staggerList, listItem } from '@/lib/motion';

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

const initialArtifacts = [
  { id: 'art-1', name: 'CORTEX Marketing Strategy', type: 'wiki', model: 'Claude 3.5', size: '1.2 MB', time: '2h ago', timestamp: Date.now() - 2 * 60 * 60 * 1000, desc: 'A complete wiki detailing market placement, user personas, and target messaging derived from user sessions.', previewText: '# Marketing Strategy Wiki\n\n## Target Audience\n- AI Engineers & Developers\n- Technology Orchestrators\n- Enterprise Architects\n\n## Value Proposition\nLocal-first, secure, cross-platform intelligence parsing.' },
  { id: 'art-2', name: 'Next.js App Router Blueprint', type: 'website', model: 'GPT-4o', size: '4.5 MB', time: '1d ago', timestamp: Date.now() - 24 * 60 * 60 * 1000, desc: 'Fully structured next.js codebase template using Tailwind CSS, TypeScript, and shadcn component standards.', previewText: '// Next.js App Router Template\nexport default function Page() {\n  return (\n    <main className="min-h-screen bg-black text-white p-8">\n      <h1>Welcome to CORTEX</h1>\n    </main>\n  );\n}' },
  { id: 'art-3', name: 'Subsystem Budget Cost Summary', type: 'report', model: 'Llama 3 (Local)', size: '2.1 MB', time: '3d ago', timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, desc: 'Fabrication and procurement costing report for ANVIKSHA subsystem metrics.', previewText: 'Cost Audit Report - June 2026\n\n- Component Procurement (B): 30%\n- Fabrication & Testing (C): 70%\n- Lifecycle Escallations: Active\n- Total Budget Ceiling Locked: $450,000' },
  { id: 'art-4', name: 'Cross-Platform Synced Architecture', type: 'mindmap', model: 'GPT-4o', size: '512 KB', time: '1w ago', timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, desc: 'Mental blueprint map tracing how Ollama local synchronization is wired with React components.', previewText: 'Graph Visualization Data:\n- Nodes: 12\n- Connections: 24\n- Main Anchor: /dashboard/layout\n- Sync Interval: 5000ms' }
];

export default function ArtifactsPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'manage'>('generate');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Manage Tab States
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPreviewArtifact, setSelectedPreviewArtifact] = useState<typeof initialArtifacts[0] | null>(null);

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
        // Simple parser for MB/KB comparison
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
          <div className="w-[48px] h-[48px] rounded-full bg-gradient-to-br from-[#6C63FF]/20 to-[#00D2FF]/20 border border-[#6C63FF]/30 flex items-center justify-center">
            <Sparkles className="text-[#00D2FF]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Artifacts Hub</h1>
            <p className="text-sm text-white/50">Synthesize structured assets and manage your generated templates.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-[3px] rounded-full bg-white/[0.04] border border-white/[0.08] self-start md:self-auto">
          <button 
            onClick={() => setActiveTab('generate')}
            className={`px-[16px] py-[6px] rounded-full text-xs font-semibold transition-all ${
              activeTab === 'generate' ? 'bg-[#6C63FF]/30 border border-[#6C63FF]/40 text-white shadow-[0_0_15px_rgba(108,99,255,0.2)]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Generate New
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`px-[16px] py-[6px] rounded-full text-xs font-semibold transition-all ${
              activeTab === 'manage' ? 'bg-[#6C63FF]/30 border border-[#6C63FF]/40 text-white shadow-[0_0_15px_rgba(108,99,255,0.2)]' : 'text-white/50 hover:text-white/80'
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
            className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[28px] md:p-[36px] min-h-[420px]"
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
                      <StepperIndicator className="data-[state=completed]:bg-[#00D97E] data-[state=completed]:text-white data-[state=active]:bg-[#6C63FF] data-[state=active]:text-white data-[state=active]:shadow-[0_0_16px_rgba(108,99,255,0.4)] data-[state=inactive]:bg-white/10 data-[state=inactive]:text-white/50 border-0 w-9 h-9 font-bold transition-all duration-300">
                        {step.id}
                      </StepperIndicator>
                      <div className="text-center mt-1">
                        <StepperTitle className="text-white font-medium text-sm">{step.title}</StepperTitle>
                        <StepperDescription className="text-white/40 text-xs hidden sm:block mt-[2px]">{step.description}</StepperDescription>
                      </div>
                    </StepperTrigger>
                    {index < steps.length - 1 && (
                      <StepperSeparator className="absolute top-[18px] left-1/2 w-[calc(100%-36px)] -translate-y-1/2 ml-[18px] bg-white/10 group-data-[state=completed]/step:bg-[#00D97E] h-[2px] transition-colors duration-500" />
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
                    <motion.div variants={staggerList} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                      {artifactTypes.map(type => {
                        const isSelected = selectedType === type.id;
                        return (
                          <motion.button
                            key={type.id}
                            variants={listItem}
                            onClick={() => setSelectedType(type.id)}
                            className={`flex items-start gap-[14px] p-[18px] rounded-[20px] border text-left transition-all duration-200 ${
                              isSelected 
                                ? 'bg-gradient-to-br from-[#6C63FF]/10 to-[#00D2FF]/5 border-[#00D2FF]/40 shadow-[0_0_20px_rgba(0,210,255,0.1)] -translate-y-[2px]' 
                                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                            }`}
                          >
                            <div className={`w-[44px] h-[44px] rounded-full flex items-center justify-center border flex-shrink-0 transition-all duration-200 ${
                              isSelected ? 'bg-[#00D2FF]/20 border-[#00D2FF]/50 text-[#00D2FF] shadow-[0_0_12px_rgba(0,210,255,0.2)]' : 'bg-white/[0.04] border-white/[0.08] text-white/50'
                        }`}>
                              <type.icon size={22} />
                            </div>
                            <div className="min-w-0">
                              <h3 className={`text-[15px] font-semibold mb-[3px] transition-colors ${isSelected ? 'text-white' : 'text-white/80'}`}>{type.name}</h3>
                              <p className="text-[13px] text-white/40 leading-relaxed">{type.desc}</p>
                            </div>
                          </motion.button>
                        )
                      })}
                    </motion.div>
                    <div className="flex justify-end pt-[16px] border-t border-white/[0.06]">
                      <button 
                        disabled={!selectedType}
                        onClick={() => setCurrentStep(2)}
                        className="flex items-center gap-[8px] px-[24px] py-[11px] rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
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
                        <label className="text-sm font-medium text-white/70 pl-[4px]">Data Sources</label>
                        <div className="flex items-center gap-[8px] flex-wrap">
                          {['ChatGPT History', 'Claude Projects', 'Engineering Docs'].map((src, i) => (
                            <button key={i} className="px-[14px] py-[7px] rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/30 text-[13px] text-white/90 hover:bg-[#6C63FF]/25 transition-colors">
                              ✓ {src}
                            </button>
                          ))}
                          <button className="px-[14px] py-[7px] rounded-full bg-white/[0.03] border border-dashed border-white/[0.12] text-[13px] text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-all">
                            + Add Source
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-[10px]">
                        <label className="text-sm font-medium text-white/70 pl-[4px]">Output Format</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Next.js App Router" 
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-full px-[18px] py-[11px] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(108,99,255,0.15)] transition-all" 
                        />
                      </div>

                      <div className="flex flex-col gap-[10px]">
                        <label className="text-sm font-medium text-white/70 pl-[4px]">AI Model</label>
                        <div className="flex gap-[8px]">
                          {['GPT-4o', 'Claude 3.5', 'Llama 3 (Local)'].map((model, i) => (
                            <button key={i} className={`px-[14px] py-[7px] rounded-full text-[13px] font-medium transition-all border ${
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

                    <div className="flex justify-between pt-[16px] border-t border-white/[0.06]">
                      <button 
                        onClick={() => setCurrentStep(1)}
                        className="flex items-center gap-[8px] px-[20px] py-[11px] rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] hover:text-white transition-all"
                      >
                        <ArrowLeft size={16} /> Back
                      </button>
                      <button 
                        onClick={() => setCurrentStep(3)}
                        className="flex items-center gap-[8px] px-[24px] py-[11px] rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] text-sm text-white font-semibold hover:shadow-[0_0_24px_rgba(108,99,255,0.4)] transition-all"
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
                        <p className="text-sm text-white/50">
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
                          className="h-full rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] relative overflow-hidden"
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
                        className="flex gap-[12px]"
                      >
                        <button 
                          onClick={() => { 
                            // Add newly generated artifact dynamically
                            const name = `Synthesized ${selectedType ? selectedType.toUpperCase() : 'Artifact'}`;
                            const newArt = {
                              id: `art-${Date.now()}`,
                              name,
                              type: selectedType || 'wiki',
                              model: 'GPT-4o',
                              size: '256 KB',
                              time: 'Just now',
                              timestamp: Date.now(),
                              desc: 'Dynamically synthesized content framework.',
                              previewText: '# ' + name + '\n\nAutomatically generated CORTEX template.'
                            };
                            setArtifacts([newArt, ...artifacts]);
                            setCurrentStep(1);
                            setSelectedType(null);
                            setActiveTab('manage');
                          }}
                          className="px-[24px] py-[11px] rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] hover:text-white transition-all font-semibold"
                        >
                          Save & View List
                        </button>
                        <button className="px-[24px] py-[11px] rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all">
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
              <div className="flex items-center gap-[10px] h-[40px] px-[16px] rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40 focus-within:bg-white/[0.08] focus-within:border-[#6C63FF]/50 focus-within:shadow-[0_0_0_3px_rgba(108,99,255,0.15)] transition-all duration-300 w-full md:w-[320px]">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search artifact name or type..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-sm text-white placeholder:text-white/30"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-[8px] text-xs text-white/60">
                <span>Sort by:</span>
                <div className="flex items-center rounded-full bg-white/[0.03] border border-white/[0.08] p-[3px]">
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
            {filteredAndSortedArtifacts.length > 0 ? (
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
                        <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-[#00D2FF] group-hover:bg-[#00D2FF]/10 group-hover:border-[#00D2FF]/30 transition-all">
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white/90 font-semibold truncate group-hover:text-white transition-colors">{art.name}</h3>
                          <div className="flex items-center gap-[10px] text-xs text-white/40 mt-[3px]">
                            <span className="uppercase font-medium tracking-wider text-[10px] bg-white/[0.05] px-[6px] py-[2px] rounded">{art.type}</span>
                            <span>•</span>
                            <span>{art.time}</span>
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed mt-[10px] line-clamp-2">{art.desc}</p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between border-t border-white/[0.05] pt-[14px]">
                        <div className="flex items-center gap-[12px] text-[11px] text-white/40">
                          <span className="flex items-center gap-[4px]"><Cpu size={12} /> {art.model}</span>
                          <span className="flex items-center gap-[4px]"><HardDrive size={12} /> {art.size}</span>
                        </div>
                        <div className="flex items-center gap-[8px]">
                          <button 
                            onClick={() => setSelectedPreviewArtifact(art)}
                            className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-white transition-colors"
                          >
                            <Eye size={12} /> See Details
                          </button>
                          <button 
                            onClick={() => setArtifacts(artifacts.filter(a => a.id !== art.id))}
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
                  <p className="text-xs text-white/40 mt-[2px]">Synthesize a new website or wiki template to get started.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Preview Panel */}
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

            {/* Sidebar drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-screen w-full max-w-[500px] z-50 backdrop-blur-2xl bg-[#0B0B11]/95 border-l border-white/[0.1] shadow-2xl p-[24px] flex flex-col justify-between"
            >
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
                  <h2 className="text-xl font-bold text-white leading-tight">{selectedPreviewArtifact.name}</h2>
                  <div className="flex items-center gap-[12px] text-xs text-white/40 mt-[6px]">
                    <span className="flex items-center gap-[4px]"><Calendar size={12} /> {selectedPreviewArtifact.time}</span>
                    <span>•</span>
                    <span className="flex items-center gap-[4px]"><Cpu size={12} /> {selectedPreviewArtifact.model}</span>
                    <span>•</span>
                    <span className="flex items-center gap-[4px]"><HardDrive size={12} /> {selectedPreviewArtifact.size}</span>
                  </div>
                </div>

                <p className="text-sm text-white/60 leading-relaxed border-b border-white/[0.08] pb-[16px]">{selectedPreviewArtifact.desc}</p>
              </div>

              {/* Code/Data Preview Area */}
              <div className="flex-1 my-[16px] overflow-hidden rounded-[16px] border border-white/[0.08] bg-black/40 p-[16px] flex flex-col gap-[10px]">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Template Preview</span>
                <pre className="flex-1 overflow-auto text-xs font-mono text-white/80 whitespace-pre-wrap leading-relaxed custom-scrollbar">
                  {selectedPreviewArtifact.previewText}
                </pre>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-[12px] pt-[16px] border-t border-white/[0.08]">
                <button className="flex-1 flex items-center justify-center gap-[8px] py-[11px] rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
                  <DownloadCloud size={16} /> Download Source
                </button>
                <button 
                  onClick={() => setSelectedPreviewArtifact(null)}
                  className="px-[20px] py-[11px] rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] hover:text-white transition-all"
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
