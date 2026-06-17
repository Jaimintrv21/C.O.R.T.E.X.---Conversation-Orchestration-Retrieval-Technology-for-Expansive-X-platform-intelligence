'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, LayoutDashboard, FileText, Presentation, 
  BookOpen, Network, CheckCircle2, Loader2, ArrowRight, Check, LoaderCircleIcon
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
  { id: 'website', name: 'Website', icon: Globe, desc: 'Public facing landing pages' },
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, desc: 'Admin interfaces and data' },
  { id: 'report', name: 'Report', icon: FileText, desc: 'Detailed PDF analytics' },
  { id: 'presentation', name: 'Presentation', icon: Presentation, desc: 'Slide decks' },
  { id: 'wiki', name: 'Wiki', icon: BookOpen, desc: 'Knowledge base articles' },
  { id: 'mindmap', name: 'Mind Map', icon: Network, desc: 'Visual concept graphs' },
];

export default function ArtifactsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

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

  return (
    <div className="flex flex-col gap-[48px] max-w-[1000px] mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col gap-[24px]">
        <h1 className="text-2xl font-bold text-white px-[8px]">Generate Artifact</h1>
      </div>

      <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[32px] min-h-[400px]">
        <Stepper
          className="flex flex-col gap-10 w-full"
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
                className="relative flex-col items-center justify-center [&:not(:last-child)]:flex-1"
              >
                <StepperTrigger className="flex flex-col items-center gap-3">
                  <StepperIndicator className="data-[state=completed]:bg-green-500 data-[state=completed]:text-white data-[state=active]:bg-[#6C63FF] data-[state=active]:text-white data-[state=inactive]:bg-white/10 data-[state=inactive]:text-white/50 border-0 w-8 h-8 font-bold">
                    {step.id}
                  </StepperIndicator>
                  <div className="text-center mt-2">
                    <StepperTitle className="text-white font-medium mb-1">{step.title}</StepperTitle>
                    <StepperDescription className="text-white/50 text-xs hidden sm:block">{step.description}</StepperDescription>
                  </div>
                </StepperTrigger>
                {index < steps.length - 1 && (
                  <StepperSeparator className="absolute top-4 left-1/2 w-full -translate-y-1/2 ml-[24px] bg-white/10 group-data-[state=completed]/step:bg-green-500 h-[2px]" />
                )}
              </StepperItem>
            ))}
          </StepperNav>

          {/* Stepper Panels */}
          <StepperPanel className="w-full mt-[16px]">
            <StepperContent value={1}>
              <motion.div key="step1" variants={popIn} initial="hidden" animate="visible" exit="hidden" className="flex flex-col gap-[32px]">
                <div className="text-sm text-white/50">Choose what kind of artifact you want to generate from your knowledge base.</div>
                <motion.div variants={staggerList} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                  {artifactTypes.map(type => {
                    const isSelected = selectedType === type.id;
                    return (
                      <motion.button
                        key={type.id}
                        variants={listItem}
                        onClick={() => setSelectedType(type.id)}
                        className={`flex items-start gap-[16px] p-[20px] rounded-[20px] border text-left transition-all duration-200 ${
                          isSelected 
                            ? 'bg-gradient-to-br from-[#6C63FF]/10 to-[#00D2FF]/5 border-[#00D2FF]/40 shadow-[0_0_20px_rgba(0,210,255,0.1)] -translate-y-[2px]' 
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className={`w-[48px] h-[48px] rounded-full flex items-center justify-center border flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-[#00D2FF]/20 border-[#00D2FF]/50 text-[#00D2FF]' : 'bg-white/[0.04] border-white/[0.08] text-white/50'
                        }`}>
                          <type.icon size={24} />
                        </div>
                        <div>
                          <h3 className={`text-base font-bold mb-[4px] transition-colors ${isSelected ? 'text-white' : 'text-white/80'}`}>{type.name}</h3>
                          <p className="text-sm text-white/40 leading-relaxed">{type.desc}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </motion.div>
                <div className="flex justify-end pt-[16px] border-t border-white/[0.08]">
                  <button 
                    disabled={!selectedType}
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-[8px] px-[24px] py-[12px] rounded-full bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            </StepperContent>

            <StepperContent value={2}>
              <motion.div key="step2" variants={popIn} initial="hidden" animate="visible" exit="hidden" className="flex flex-col gap-[32px]">
                <div className="text-sm text-white/50">Configure parameters for your {selectedType} artifact.</div>
                
                <div className="flex flex-col gap-[32px] flex-1">
                  <div className="flex flex-col gap-[16px]">
                    <label className="text-sm font-medium text-white/80 pl-[8px]">Data Sources</label>
                    <div className="flex items-center gap-[10px] flex-wrap">
                      {['ChatGPT History', 'Claude Projects', 'Engineering Docs'].map((src, i) => (
                        <button key={i} className="px-[16px] py-[8px] rounded-full bg-[#6C63FF]/20 border border-[#6C63FF]/40 text-sm text-white hover:bg-[#6C63FF]/30 transition-colors">
                          ✓ {src}
                        </button>
                      ))}
                      <button className="px-[16px] py-[8px] rounded-full bg-white/[0.04] border border-white/[0.1] text-sm text-white/50 hover:bg-white/[0.08] transition-colors">
                        + Add Source
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-[16px]">
                    <label className="text-sm font-medium text-white/80 pl-[8px]">Output Format</label>
                    <div className="flex gap-[16px]">
                      <input type="text" placeholder="e.g. Next.js App Router" className="w-full bg-white/[0.02] border border-white/[0.08] rounded-full px-[20px] py-[12px] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.05] transition-all" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-[16px] border-t border-white/[0.08]">
                  <button 
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-[8px] px-[24px] py-[12px] rounded-full bg-white/[0.05] border border-white/[0.1] text-white/70 hover:bg-white/[0.08] hover:text-white transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-[8px] px-[24px] py-[12px] rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] text-white font-medium hover:shadow-[0_0_20px_rgba(108,99,255,0.4)] transition-all"
                  >
                    Generate
                  </button>
                </div>
              </motion.div>
            </StepperContent>

            <StepperContent value={3}>
              <motion.div key="step3" variants={popIn} initial="hidden" animate="visible" exit="hidden" className="flex flex-col items-center justify-center gap-[40px] h-[300px]">
                
                <div className="flex flex-col items-center gap-[16px] text-center">
                  {progress < 100 ? (
                    <div className="w-[64px] h-[64px] rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                      <Loader2 size={32} className="text-[#00D2FF] animate-spin" />
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-[64px] h-[64px] rounded-full bg-[#00D97E]/20 border border-[#00D97E]/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,217,126,0.2)]"
                    >
                      <CheckCircle2 size={32} className="text-[#00D97E]" />
                    </motion.div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-[8px]">
                      {progress < 100 ? 'Synthesizing knowledge...' : 'Artifact Generated!'}
                    </h3>
                    <p className="text-sm text-white/50">
                      {progress < 100 ? 'Analyzing 42 conversations across 3 providers.' : 'Your Next.js scaffold is ready to download.'}
                    </p>
                  </div>
                </div>

                <div className="w-full max-w-[400px] flex flex-col gap-[8px]">
                  <div className="flex justify-between text-xs text-white/40 px-[8px]">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-[8px] w-full rounded-full bg-white/[0.06] overflow-hidden relative">
                    <motion.div 
                      className="h-full rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] relative overflow-hidden"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    >
                      <motion.div 
                        className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        style={{ mixBlendMode: 'overlay' }}
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      />
                    </motion.div>
                  </div>
                </div>

                {progress === 100 && (
                  <div className="flex gap-[16px] mt-[16px]">
                    <button 
                      onClick={() => setCurrentStep(1)}
                      className="px-[32px] py-[12px] rounded-full bg-white/[0.05] border border-white/[0.1] text-white/70 hover:bg-white/[0.08] hover:text-white transition-all"
                    >
                      Create Another
                    </button>
                    <motion.button 
                      variants={popIn}
                      initial="hidden"
                      animate="visible"
                      className="px-[32px] py-[12px] rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
                    >
                      Download Bundle
                    </motion.button>
                  </div>
                )}

              </motion.div>
            </StepperContent>
          </StepperPanel>
        </Stepper>

      </div>
    </div>
  );
}
