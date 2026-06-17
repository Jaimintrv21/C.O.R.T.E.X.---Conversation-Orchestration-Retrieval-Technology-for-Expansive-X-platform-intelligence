'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Shield, KeyRound, Bell, Settings as SettingsIcon, Database, User, CreditCard, Box } from 'lucide-react';
import { popIn, staggerList, listItem } from '@/lib/motion';

const tabs = ['Profile', 'Integrations', 'Privacy', 'Workspace', 'Billing'];

const providers = [
  { id: 'openai', name: 'OpenAI (ChatGPT)', status: 'connected', color: '#00D97E' },
  { id: 'anthropic', name: 'Anthropic (Claude)', status: 'connected', color: '#D97757' },
  { id: 'google', name: 'Google (Gemini)', status: 'disconnected', color: '#4A90E2' },
  { id: 'perplexity', name: 'Perplexity API', status: 'error', color: '#FFBC00' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Integrations');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    sync: true,
    localModel: false,
    telemetry: false,
    notifications: true,
    ollamaActive: false
  });
  
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');

  const handleToggle = (key: string) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col gap-[48px] max-w-[1000px]">
      
      {/* Header and Tabs */}
      <div className="flex flex-col gap-[24px]">
        <h1 className="text-2xl font-bold text-white px-[8px]">Settings</h1>
        
        <div className="flex gap-[8px] p-[6px] rounded-full bg-white/[0.04] border border-white/[0.08] w-fit overflow-x-auto custom-scrollbar">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-[20px] py-[8px] text-sm font-medium rounded-full transition-colors duration-200 z-10 whitespace-nowrap ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settingsTabPill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.12] shadow-[0_4px_12px_rgba(0,0,0,0.2)] rounded-full -z-10"
                  />
                )}
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div 
        key={activeTab}
        variants={popIn}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-[48px]"
      >
        {activeTab === 'Integrations' && (
          <>
            <section className="flex flex-col gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-lg font-medium text-white mb-[4px]">Cloud AI Providers</h2>
                <p className="text-sm text-white/50">Connect your accounts to sync conversation history automatically.</p>
              </div>

              <motion.div variants={staggerList} initial="hidden" animate="visible" className="flex flex-col gap-[16px]">
                {providers.map(provider => (
                  <motion.div 
                    key={provider.id}
                    variants={listItem}
                    className="flex items-center justify-between p-[20px] rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.12] transition-colors duration-200"
                  >
                    <div className="flex items-center gap-[16px]">
                      <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center border border-white/[0.1]" style={{ backgroundColor: `${provider.color}15` }}>
                        <Cpu size={24} color={provider.color} />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-white/90 mb-[2px]">{provider.name}</h3>
                        <div className="flex items-center gap-[6px]">
                          <div className={`w-[6px] h-[6px] rounded-full ${provider.status === 'connected' ? 'bg-[#00D97E]' : provider.status === 'error' ? 'bg-[#FFBC00]' : 'bg-white/20'}`} />
                          <span className="text-xs text-white/50 capitalize">{provider.status}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      className={`px-[20px] py-[8px] rounded-full text-sm font-medium transition-all duration-200 border ${
                        provider.status === 'connected'
                          ? 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30'
                          : 'bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                      }`}
                    >
                      {provider.status === 'connected' ? 'Disconnect' : provider.status === 'error' ? 'Reauthorize' : 'Connect'}
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            </section>
            
            {/* Local AI Integration (Ollama) */}
            <section className="flex flex-col gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-lg font-medium text-white mb-[4px]">Local AI Integration (Ollama)</h2>
                <p className="text-sm text-white/50">Run open-source models completely locally. CORTEX can use Ollama for completely private indexing and semantic search.</p>
              </div>

              <motion.div variants={staggerList} initial="hidden" animate="visible" className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[24px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[16px]">
                    <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center border border-[#00D2FF]/30 bg-[#00D2FF]/10">
                      <Database size={24} className="text-[#00D2FF]" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white/90 mb-[2px]">Ollama Local Server</h3>
                      <div className="flex items-center gap-[6px]">
                        <div className={`w-[6px] h-[6px] rounded-full ${toggles.ollamaActive ? 'bg-[#00D97E] shadow-[0_0_6px_#00D97E]' : 'bg-[#FF6584]'}`} />
                        <span className="text-xs text-white/50">{toggles.ollamaActive ? 'Connected & Running' : 'Disconnected'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Connection */}
                  <button 
                    onClick={() => handleToggle('ollamaActive')}
                    className={`relative w-[48px] h-[26px] rounded-full transition-colors duration-200 flex-shrink-0 border border-white/[0.05] ${toggles.ollamaActive ? 'bg-[#00D2FF]' : 'bg-white/[0.1]'}`}
                  >
                    <motion.div 
                      animate={{ x: toggles.ollamaActive ? 22 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-md flex items-center justify-center"
                    >
                      {toggles.ollamaActive && <div className="w-[4px] h-[4px] rounded-full bg-[#00D2FF]" />}
                    </motion.div>
                  </button>
                </div>

                {toggles.ollamaActive && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col gap-[16px] pt-[16px] border-t border-white/[0.06]"
                  >
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-xs text-white/50 pl-[8px]">Ollama Endpoint</label>
                      <input 
                        type="text" 
                        value={ollamaHost}
                        onChange={(e) => setOllamaHost(e.target.value)}
                        className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-sm text-white focus:outline-none focus:border-[#00D2FF]/50 focus:bg-white/[0.05] transition-all" 
                      />
                    </div>
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-xs text-white/50 pl-[8px]">Default Model</label>
                      <input 
                        type="text" 
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        placeholder="e.g. llama3, mistral, phi3"
                        className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-sm text-white focus:outline-none focus:border-[#00D2FF]/50 focus:bg-white/[0.05] transition-all" 
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </section>
          </>
        )}

        {activeTab === 'Privacy' && (
          <section className="flex flex-col gap-[24px]">
            <div className="px-[8px]">
              <h2 className="text-lg font-medium text-white mb-[4px]">Privacy & Data Control</h2>
              <p className="text-sm text-white/50">Control how your data is processed and stored.</p>
            </div>

            <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] flex flex-col overflow-hidden">
              {[
                { key: 'sync', title: 'Cloud Sync', desc: 'Back up your encrypted index to the CORTEX cloud', icon: Shield },
                { key: 'localModel', title: 'Local AI Processing', desc: 'Force all semantic searches to use local Ollama models', icon: Cpu },
                { key: 'telemetry', title: 'Anonymous Telemetry', desc: 'Help us improve by sending crash reports', icon: SettingsIcon },
                { key: 'notifications', title: 'Push Notifications', desc: 'Alert me when background syncs complete', icon: Bell },
              ].map((item, index) => (
                <div key={item.key} className={`p-[24px] flex items-center justify-between gap-[24px] ${index !== 3 ? 'border-b border-white/[0.06]' : ''}`}>
                  <div className="flex items-start gap-[16px]">
                    <div className="w-[40px] h-[40px] rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/50 flex-shrink-0 mt-[2px]">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white/90 mb-[4px]">{item.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleToggle(item.key)}
                    className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 border border-white/[0.05] ${toggles[item.key] ? 'bg-[#6C63FF]' : 'bg-white/[0.1]'}`}
                  >
                    <motion.div 
                      animate={{ x: toggles[item.key] ? 20 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-md flex items-center justify-center"
                    >
                      {toggles[item.key] && <div className="w-[4px] h-[4px] rounded-full bg-[#6C63FF] opacity-50" />}
                    </motion.div>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Placeholders for other tabs */}
        {activeTab === 'Profile' && (
          <section className="flex flex-col gap-[24px]">
            <div className="px-[8px]">
              <h2 className="text-lg font-medium text-white mb-[4px]">User Profile</h2>
              <p className="text-sm text-white/50">Manage your account details and preferences.</p>
            </div>
            
            <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[32px] flex flex-col gap-[32px]">
              <div className="flex items-center gap-[24px]">
                <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D2FF] flex items-center justify-center shadow-[0_0_20px_rgba(108,99,255,0.4)] flex-shrink-0 relative group cursor-pointer">
                  <User size={32} className="text-white" />
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-xs font-medium text-white">Edit</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-white font-medium">Profile Picture</h3>
                  <p className="text-white/50 text-sm mb-[12px]">PNG, JPG up to 5MB</p>
                  <div className="flex gap-[12px]">
                    <button className="px-[16px] py-[6px] rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-medium text-white hover:bg-white/[0.1] transition-all">Upload New</button>
                    <button className="px-[16px] py-[6px] rounded-full border border-transparent text-xs font-medium text-white/50 hover:text-red-400 transition-all">Remove</button>
                  </div>
                </div>
              </div>

              <div className="w-full h-[1px] bg-white/[0.06]" />

              <div className="flex flex-col gap-[24px] max-w-[500px]">
                <div className="flex flex-col gap-[8px]">
                  <label className="text-xs text-white/50 pl-[8px]">Full Name</label>
                  <input type="text" defaultValue="John Doe" className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.05] transition-all" />
                </div>
                <div className="flex flex-col gap-[8px]">
                  <label className="text-xs text-white/50 pl-[8px]">Email Address</label>
                  <input type="email" defaultValue="john@cortex.ai" className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.05] transition-all" />
                </div>
                <div className="flex flex-col gap-[8px]">
                  <label className="text-xs text-white/50 pl-[8px]">Timezone</label>
                  <select className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-sm text-white focus:outline-none focus:border-[#6C63FF]/50 focus:bg-white/[0.05] transition-all appearance-none cursor-pointer">
                    <option className="bg-[#0A0A0F]">Pacific Time (US & Canada)</option>
                    <option className="bg-[#0A0A0F]">Eastern Time (US & Canada)</option>
                    <option className="bg-[#0A0A0F]">UTC</option>
                  </select>
                </div>
                
                <button className="w-fit mt-[8px] px-[24px] py-[10px] rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D2FF] text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(108,99,255,0.4)] transition-all">
                  Save Changes
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Workspace' && (
          <section className="flex flex-col gap-[24px]">
            <div className="px-[8px]">
              <h2 className="text-lg font-medium text-white mb-[4px]">Workspace Settings</h2>
              <p className="text-sm text-white/50">Manage team members and workspace-level configurations.</p>
            </div>
            
            <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[32px] flex flex-col gap-[40px]">
              {/* General Workspace Settings */}
              <div className="flex flex-col gap-[24px]">
                <h3 className="text-base font-medium text-white">General</h3>
                <div className="flex flex-col gap-[8px] max-w-[500px]">
                  <label className="text-xs text-white/50 pl-[8px]">Workspace Name</label>
                  <div className="flex gap-[12px]">
                    <input type="text" defaultValue="Personal Workspace" className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-sm text-white focus:outline-none focus:border-[#00D97E]/50 focus:bg-white/[0.05] transition-all" />
                    <button className="px-[24px] py-[10px] rounded-full bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium hover:bg-white/[0.1] transition-all">
                      Update
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full h-[1px] bg-white/[0.06]" />

              {/* Team Members */}
              <div className="flex flex-col gap-[24px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-white">Team Members</h3>
                  <button className="px-[16px] py-[8px] rounded-full bg-[#00D97E]/20 border border-[#00D97E]/40 text-[#00D97E] text-xs font-medium hover:bg-[#00D97E]/30 transition-all">
                    + Invite Member
                  </button>
                </div>
                
                <div className="flex flex-col rounded-[16px] border border-white/[0.06] overflow-hidden">
                  <div className="p-[16px] border-b border-white/[0.06] flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D2FF] flex items-center justify-center shadow-[0_0_10px_rgba(108,99,255,0.3)]">
                        <User size={16} className="text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">John Doe (You)</span>
                        <span className="text-xs text-white/50">john@cortex.ai</span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-white/40 bg-white/[0.05] px-[10px] py-[4px] rounded-full">Owner</span>
                  </div>
                  
                  <div className="p-[16px] flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[32px] h-[32px] rounded-full bg-white/[0.1] flex items-center justify-center">
                        <User size={16} className="text-white/60" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">Sarah Smith</span>
                        <span className="text-xs text-white/50">sarah@cortex.ai</span>
                      </div>
                    </div>
                    <div className="flex gap-[12px] items-center">
                      <span className="text-xs font-medium text-white/40 bg-white/[0.05] px-[10px] py-[4px] rounded-full">Editor</span>
                      <button className="text-xs text-white/30 hover:text-red-400 transition-colors">Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Billing' && (
          <section className="flex flex-col gap-[24px]">
            <div className="px-[8px]">
              <h2 className="text-lg font-medium text-white mb-[4px]">Billing & Plans</h2>
              <p className="text-sm text-white/50">Manage your subscription and usage limits.</p>
            </div>
            <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[32px] flex items-center justify-center min-h-[300px]">
              <div className="flex flex-col items-center gap-[16px] text-white/40">
                <CreditCard size={48} className="opacity-50" />
                <p>Billing module coming soon</p>
              </div>
            </div>
          </section>
        )}

      </motion.div>
    </div>
  );
}
