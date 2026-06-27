'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppearance } from '@/hooks/useAppearance';
import {
  Cpu, Shield, KeyRound, Bell, Settings as SettingsIcon, Database, User,
  CreditCard, Box, Check, UserPlus, Trash2, X, Palette, Moon, Sun,
  Monitor, Smartphone, Mail, AlertOctagon, Download, Eraser, Sparkles
} from 'lucide-react';
import { popIn, staggerList, listItem } from '@/lib/motion';

const tabs = ['Profile', 'Appearance', 'Integrations', 'Notifications', 'Privacy', 'Workspace', 'Billing', 'Help & Support', 'Danger Zone'];

const providers = [
  { id: 'openai', name: 'OpenAI (ChatGPT)', status: 'connected', color: '#00D97E' },
  { id: 'anthropic', name: 'Anthropic (Claude)', status: 'connected', color: '#D97757' },
  { id: 'google', name: 'Google (Gemini)', status: 'disconnected', color: '#4A90E2' },
  { id: 'perplexity', name: 'Perplexity API', status: 'error', color: '#FFBC00' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Integrations');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUrlChange = () => {
      // 1. Check query parameter (e.g. ?tab=Profile)
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        const matched = tabs.find(t => t.toLowerCase() === tabParam.toLowerCase());
        if (matched) {
          setActiveTab(matched);
          return;
        }
      }

      // 2. Check hash (e.g. #Profile)
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const decoded = decodeURIComponent(hash);
        const matched = tabs.find(t => t.toLowerCase() === decoded.toLowerCase());
        if (matched) {
          setActiveTab(matched);
        }
      }
    };

    handleUrlChange();

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.hash = encodeURIComponent(tab);
      window.history.pushState(null, '', currentUrl.toString());
    }
  };
  const {
    themeStyle, setThemeStyle,
    accentColor, setAccentColor,
    shaderSpeed, setShaderSpeed,
    reduceMotion, setReduceMotion,
    springSidebar, setSpringSidebar,
    sidebarPosition, setSidebarPosition,
    layoutPadding, setLayoutPadding,
    mouseGlow, setMouseGlow,
    particles, setParticles,
    audioFeedback, setAudioFeedback,
    secondaryColor
  } = useAppearance();

  // Dynamic accent color helpers for inline styles
  const ac = accentColor; // shorthand
  const acBg15 = { backgroundColor: `${ac}26` }; // 15% opacity
  const acBorder30 = { borderColor: `${ac}4D` }; // 30% opacity
  const acBorder40 = { borderColor: `${ac}66` }; // 40% opacity
  const acGlow = { boxShadow: `0 0 20px ${ac}26` };
  const acGlowSm = { boxShadow: `0 0 15px ${ac}1A` };
  const acGradient = { background: `linear-gradient(to right, ${ac}, ${secondaryColor})` };
  const acText = { color: ac };
  const acToggleOn = { backgroundColor: ac };
  const acBg20 = { backgroundColor: `${ac}33` }; // 20% opacity
  const acBorder20 = { borderColor: `${ac}33` }; // 20% opacity
  const acBg10 = { backgroundColor: `${ac}1A` }; // 10% opacity

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    sync: true,
    localModel: false,
    telemetry: false,
    ollamaActive: false,
    emailDigest: true,
    pushNotifs: false,
    browserAlerts: true
  });

  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');
  const [activeAppearanceSubTab, setActiveAppearanceSubTab] = useState<'Style' | 'Color' | 'Motion' | 'Layout' | 'Labs'>('Style');
  const [activeSupportTab, setActiveSupportTab] = useState<'Report' | 'FAQ' | 'Policies'>('Report');

  // Workspace Management States
  const [workspaceName, setWorkspaceName] = useState('Personal Workspace');
  const [tempWorkspaceName, setTempWorkspaceName] = useState('Personal Workspace');
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: 'Owner' | 'Editor' | 'Viewer'; isYou?: boolean }>>([
    { id: '1', name: 'John Doe', email: 'john@cortex.ai', role: 'Owner', isYou: true },
    { id: '2', name: 'Sarah Smith', email: 'sarah@cortex.ai', role: 'Editor' }
  ]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'Editor' | 'Viewer'>('Editor');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Integrations states
  const [providerList, setProviderList] = useState([
    { id: 'openai', name: 'OpenAI (ChatGPT)', status: 'connected', color: '#00D97E', apiKey: '••••••••••••••••', model: 'gpt-4o', endpoint: '' },
    { id: 'anthropic', name: 'Anthropic (Claude)', status: 'disconnected', color: '#D97757', apiKey: '', model: 'claude-3-5-sonnet', endpoint: '' },
    { id: 'google', name: 'Google (Gemini)', status: 'disconnected', color: '#4A90E2', apiKey: '', model: 'gemini-1.5-pro', endpoint: '' },
    { id: 'perplexity', name: 'Perplexity API', status: 'error', color: '#FFBC00', apiKey: '', model: 'llama-3-sonar-large', endpoint: '' },
  ]);
  const [connectingProviderId, setConnectingProviderId] = useState<string | null>(null);
  const [provApiKey, setProvApiKey] = useState('');
  const [provModel, setProvModel] = useState('');
  const [provEndpoint, setProvEndpoint] = useState('');
  const [provShowAdvanced, setProvShowAdvanced] = useState(false);

  const handleToggleProvider = (providerId: string) => {
    const provider = providerList.find(p => p.id === providerId);
    if (!provider) return;

    if (provider.status === 'connected') {
      setProviderList(prev => prev.map(p => p.id === providerId ? { ...p, status: 'disconnected', apiKey: '', model: '' } : p));
      triggerToast(`${provider.name} disconnected successfully.`);
    } else {
      setConnectingProviderId(providerId);
      setProvApiKey('');
      setProvModel(provider.model || getDefaultModelForProvider(providerId));
      setProvEndpoint(provider.endpoint || '');
      setProvShowAdvanced(false);
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provApiKey.trim()) {
      triggerToast('Please provide a valid API Key.');
      return;
    }

    setProviderList(prev => prev.map(p => p.id === connectingProviderId ? { 
      ...p, 
      status: 'connected', 
      apiKey: provApiKey, 
      model: provModel,
      endpoint: provEndpoint 
    } : p));

    const provider = providerList.find(p => p.id === connectingProviderId);
    triggerToast(`${provider?.name || 'Provider'} connected successfully!`);
    setConnectingProviderId(null);
  };

  const getDefaultModelForProvider = (id: string) => {
    if (id === 'openai') return 'gpt-4o';
    if (id === 'anthropic') return 'claude-3-5-sonnet';
    if (id === 'google') return 'gemini-1.5-pro';
    return 'llama-3-sonar-large';
  };

  const getModelsForProvider = (id: string) => {
    if (id === 'openai') return [
      { value: 'gpt-4o', label: 'GPT-4o (Flagship Multimodal)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast)' }
    ];
    if (id === 'anthropic') return [
      { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Recommended)' },
      { value: 'claude-3-opus', label: 'Claude 3 Opus (Intelligent)' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Fast)' }
    ];
    if (id === 'google') return [
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Large context)' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Vibrant speed)' }
    ];
    return [
      { value: 'llama-3-sonar-large', label: 'Sonar Large Online (Search-enabled)' },
      { value: 'llama-3-sonar-small', label: 'Sonar Small Online (Fast search)' }
    ];
  };

  const handleUpdateWorkspaceName = () => {
    if (!tempWorkspaceName.trim()) return;
    setWorkspaceName(tempWorkspaceName);
    triggerToast(`Workspace renamed to "${tempWorkspaceName}"`);
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    const newMember = {
      id: Date.now().toString(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole
    };

    setTeamMembers(prev => [...prev, newMember]);
    setInviteEmail('');
    setInviteName('');
    setIsInviteOpen(false);
    triggerToast(`Sent invitation to ${newMember.name}`);
  };

  const handleRemoveMember = (id: string, name: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    triggerToast(`Removed ${name} from workspace`);
  };

  const handleChangeRole = (id: string, role: 'Editor' | 'Viewer') => {
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
    triggerToast(`Updated role to ${role}`);
  };

  const handleToggle = (key: string) => {
    if (key === 'reduceMotion') setReduceMotion(!reduceMotion);
    else if (key === 'springSidebar') setSpringSidebar(!springSidebar);
    else if (key === 'mouseGlow') setMouseGlow(!mouseGlow);
    else if (key === 'particles') setParticles(!particles);
    else if (key === 'audioFeedback') setAudioFeedback(!audioFeedback);
    else {
      setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  // Bug Report Form State
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [reportMethod, setReportMethod] = useState<'normal' | 'github'>('normal');
  const [githubUser, setGithubUser] = useState('');
  const [bugCategory, setBugCategory] = useState<'bug' | 'feature' | 'docs' | 'optimization' | 'styling' | 'security'>('bug');
  const [bugDifficulty, setBugDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  const handleReportBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugTitle || !bugDescription) {
      triggerToast('Please provide both title and description');
      return;
    }
    if (reportMethod === 'github' && !githubUser.trim()) {
      triggerToast('Please provide your GitHub Username');
      return;
    }
    
    setIsSubmittingBug(true);
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
      const screenRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Unknown';
      const viewportRes = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown';
      const currentUrl = typeof window !== 'undefined' ? window.location.href : 'Unknown';

      const formattedDescription = `### 📂 Issue Categorization
| Property | Value |
| :--- | :--- |
| **Category** | \`${bugCategory.toUpperCase()}\` |
| **Suggested Difficulty** | \`${bugDifficulty.toUpperCase()}\` |

### User Description
${bugDescription}

---

### 🛠️ Diagnostic Environment Details
| Property | Value |
| :--- | :--- |
| **URL / Route** | \`${currentUrl}\` |
| **User Agent** | \`${userAgent}\` |
| **Screen Resolution** | \`${screenRes}\` |
| **Viewport Size** | \`${viewportRes}\` |
| **Active Theme** | \`${themeStyle}\` |
| **Accent Color** | \`${accentColor}\` |
| **Layout Padding** | \`${layoutPadding}\` |
| **Shader Speed** | \`${shaderSpeed}\` |
| **Mouse Glow** | \`${mouseGlow ? 'Enabled' : 'Disabled'}\` |
| **Particles Overlay** | \`${particles ? 'Enabled' : 'Disabled'}\` |
| **Audio Feedback** | \`${audioFeedback ? 'Enabled' : 'Disabled'}\` |
| **Report Method** | \`${reportMethod === 'github' ? 'GitHub Issue' : 'Standard Feed'}\` |
| **GitHub Reporter** | \`${reportMethod === 'github' ? `@${githubUser}` : 'N/A'}\` |
| **Reported At** | \`${new Date().toUTCString()}\` |
`;

      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: bugTitle, 
          description: formattedDescription,
          githubUser: reportMethod === 'github' ? githubUser : undefined,
          category: bugCategory,
          difficulty: bugDifficulty
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(reportMethod === 'github' ? 'GitHub issue created successfully!' : 'Bug reported successfully!');
        setBugTitle('');
        setBugDescription('');
        setGithubUser('');
      } else {
        triggerToast(`Failed to report bug: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      triggerToast('Error reporting bug.');
    } finally {
      setIsSubmittingBug(false);
    }
  };

  return (
    <div className="flex flex-col gap-[24px] md:gap-[32px] max-w-[1200px] mx-auto w-full relative pb-[80px]">

      {/* Header and Tabs */}
      <div className="flex flex-col gap-[16px] md:gap-[24px] px-[8px]">
        <h1 className="text-2xl font-bold text-white">Settings</h1>

        <div className="w-full overflow-x-auto custom-scrollbar pb-2 -mb-2">
          <div className="inline-flex gap-[4px] p-[4px] rounded-full bg-white/[0.04] border border-white/[0.08] w-fit min-w-max">
            {tabs.map(tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-[16px] md:px-[20px] py-[6px] md:py-[8px] text-xs md:text-sm font-medium rounded-full transition-colors duration-200 z-10 whitespace-nowrap ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
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
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={popIn}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="flex flex-col gap-[32px]"
        >
          {activeTab === 'Appearance' && (
            <section className="flex flex-col gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-lg font-medium text-white mb-[4px]">Appearance</h2>
                <p className="text-sm text-white/50">Customize the visual aesthetic of the platform.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-[24px] items-start">
                {/* Left Column: Sub-navigation */}
                <div className="w-full md:w-[220px] flex flex-row md:flex-col gap-[6px] p-[6px] rounded-[24px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.06] overflow-x-auto md:overflow-x-visible custom-scrollbar">
                  {[
                    { id: 'Style', label: 'Style', desc: 'Theme styles' },
                    { id: 'Color', label: 'Color', desc: 'Colors & shaders' },
                    { id: 'Motion', label: 'Motion', desc: 'Transitions & animations' },
                    { id: 'Layout', label: 'Layout', desc: 'Sidebar & structure' },
                    { id: 'Labs', label: 'Labs', desc: 'Experimental features' }
                  ].map(subTab => {
                    const isActive = activeAppearanceSubTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => setActiveAppearanceSubTab(subTab.id as any)}
                        style={isActive ? {...acBg15, ...acBorder30, ...acGlowSm} : undefined}
                        className={`flex flex-col items-start px-[18px] py-[10px] rounded-[18px] transition-all text-left w-full min-w-[120px] md:min-w-0 ${
                          isActive
                            ? 'text-white border'
                            : 'border border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/80'
                        }`}
                      >
                        <span className="text-sm font-semibold">{subTab.label}</span>
                        <span className="text-[10px] opacity-60 hidden md:block mt-[2px]">{subTab.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Column: Settings Panel */}
                <div className="flex-1 w-full rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] min-h-[380px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.08),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.08),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.2),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.2)]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeAppearanceSubTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-[28px]"
                    >
                      {/* STYLE SUBTAB */}
                      {activeAppearanceSubTab === 'Style' && (
                        <div className="flex flex-col gap-[24px]">
                          <div>
                            <h3 className="text-base font-semibold text-white mb-[4px]">Theme Preset Style</h3>
                            <p className="text-xs text-white/50">Choose the foundation style for the dashboard containers.</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
                            {[
                              { id: 'liquid-glass', name: 'Liquid Glass', desc: 'Highly refractive, transparent border highlights.', preview: 'border-white/[0.12] bg-white/[0.03] shadow-[inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.2)]' },
                              { id: 'retro-hologram', name: 'Retro Hologram', desc: 'Diffraction spectrum borders, light-refracting scanlines, and custom holographic depth.', preview: 'border-[#00f2fe] bg-[#06060c] shadow-[0_0_15px_rgba(0,255,255,0.2),inset_0_0_10px_rgba(255,0,255,0.1)]' },
                              { id: 'minimal-slate', name: 'Minimal Slate', desc: 'Simple dark gray card layout with soft shadows.', preview: 'border-white/[0.06] bg-zinc-900/40 shadow-none' }
                            ].map(style => (
                              <button
                                key={style.id}
                                onClick={() => {
                                  setThemeStyle(style.id as any);
                                  triggerToast(`Theme style set to ${style.name}`);
                                }}
                                style={themeStyle === style.id ? {...acBg15, ...acBorder40, ...acGlow} : undefined}
                                className={`flex flex-col items-start p-[20px] rounded-[20px] border transition-all text-left h-full ${
                                  themeStyle === style.id
                                    ? 'text-white border'
                                    : 'bg-white/[0.02] border-white/[0.08] text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                                }`}
                              >
                                <div className={`w-full h-[40px] rounded-lg mb-[12px] border ${style.preview}`} />
                                <span className="text-sm font-semibold text-white mb-[4px]">{style.name}</span>
                                <span className="text-xs opacity-70 leading-normal">{style.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* COLOR SUBTAB */}
                      {activeAppearanceSubTab === 'Color' && (
                        <div className="flex flex-col gap-[28px]">
                          <div className="flex flex-col gap-[16px]">
                            <div>
                              <h3 className="text-base font-semibold text-white mb-[4px]">Primary Accent Color</h3>
                              <p className="text-xs text-white/50">Changes buttons, active links, and border highlights.</p>
                            </div>
                            <div className="flex flex-wrap gap-[16px]">
                              {[
                                { color: '#6C63FF', name: 'Violet' },
                                { color: '#00D2FF', name: 'Cyan' },
                                { color: '#00D97E', name: 'Emerald' },
                                { color: '#FF6584', name: 'Rose' },
                                { color: '#FFBC00', name: 'Amber' },
                                { color: '#EF4444', name: 'Crimson' }
                              ].map(accent => (
                                <button
                                  key={accent.color}
                                  onClick={() => {
                                    setAccentColor(accent.color);
                                    triggerToast(`Accent color set to ${accent.name}`);
                                  }}
                                  title={accent.name}
                                  className={`w-[48px] h-[48px] rounded-full transition-all flex items-center justify-center relative ${
                                    accentColor === accent.color 
                                      ? 'scale-110 shadow-[0_0_25px_currentColor]' 
                                      : 'hover:scale-105 hover:shadow-[0_0_10px_currentColor]'
                                  }`}
                                  style={{ backgroundColor: accent.color, color: accent.color }}
                                >
                                  {accentColor === accent.color && <Check size={20} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="w-full h-[1px] bg-white/[0.06]" />

                          <div className="flex flex-col gap-[16px]">
                            <div>
                              <h3 className="text-base font-semibold text-white mb-[4px]">Background Shader Speed</h3>
                              <p className="text-xs text-white/50">Configure animation speed of the interactive WebGL gradient background.</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-[12px]">
                              {[
                                { id: 'disabled', name: 'Disabled' },
                                { id: 'paused', name: 'Paused' },
                                { id: 'slow', name: 'Slow Motion' },
                                { id: 'normal', name: 'Normal' },
                                { id: 'hyper', name: 'Hyper' }
                              ].map(speed => (
                                <button
                                  key={speed.id}
                                  onClick={() => {
                                    setShaderSpeed(speed.id as any);
                                    triggerToast(`Shader background speed set to ${speed.name}`);
                                  }}
                                  style={shaderSpeed === speed.id ? {...acBg15, ...acBorder40} : undefined}
                                  className={`px-[16px] py-[10px] rounded-full border text-xs font-semibold transition-all ${
                                    shaderSpeed === speed.id
                                      ? 'text-white border'
                                      : 'bg-white/[0.02] border-white/[0.08] text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                                  }`}
                                >
                                  {speed.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MOTION SUBTAB */}
                      {activeAppearanceSubTab === 'Motion' && (
                        <div className="flex flex-col gap-[28px]">
                          <div className="flex items-center justify-between gap-[24px]">
                            <div>
                              <h3 className="text-sm font-semibold text-white mb-[4px]">Reduce UI Motion</h3>
                              <p className="text-xs text-white/50">Disables complex 3D background shaders and hover scale animations.</p>
                            </div>
                            <button
                              onClick={() => {
                                handleToggle('reduceMotion');
                                triggerToast(reduceMotion ? 'Animations restored' : 'UI motion reduced');
                              }}
                              style={reduceMotion ? acToggleOn : undefined}
                              className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 border border-white/[0.05] ${reduceMotion ? '' : 'bg-white/[0.1]'}`}
                            >
                              <motion.div
                                animate={{ x: reduceMotion ? 20 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-md"
                              />
                            </button>
                          </div>

                          <div className="w-full h-[1px] bg-white/[0.06]" />

                          <div className="flex items-center justify-between gap-[24px]">
                            <div>
                              <h3 className="text-sm font-semibold text-white mb-[4px]">Sidebar Transition Springs</h3>
                              <p className="text-xs text-white/50">Use spring physics instead of linear animations for sidebar hover expansion.</p>
                            </div>
                            <button
                              onClick={() => {
                                handleToggle('springSidebar');
                                triggerToast(springSidebar ? 'Linear transitions active' : 'Spring transitions active');
                              }}
                              style={springSidebar ? acToggleOn : undefined}
                              className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 border border-white/[0.05] ${springSidebar ? '' : 'bg-white/[0.1]'}`}
                            >
                              <motion.div
                                animate={{ x: springSidebar ? 20 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-md"
                              />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* LAYOUT SUBTAB */}
                      {activeAppearanceSubTab === 'Layout' && (
                        <div className="flex flex-col gap-[28px]">
                          <div className="flex flex-col gap-[16px]">
                             <div>
                              <h3 className="text-base font-semibold text-white mb-[4px]">Sidebar Placement</h3>
                              <p className="text-xs text-white/50">Align the navigation sidebar to the left, right, or hide it completely (accessible via top hamburger menu).</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] max-w-[500px]">
                              {[
                                { id: 'left', name: 'Left Sidebar' },
                                { id: 'right', name: 'Right Sidebar' },
                                { id: 'none', name: 'No Sidebar (Hidden)' }
                              ].map(pos => (
                                <button
                                  key={pos.id}
                                  onClick={() => {
                                    setSidebarPosition(pos.id as any);
                                    triggerToast(pos.id === 'none' ? 'Sidebar hidden' : `Sidebar aligned to the ${pos.id}`);
                                  }}
                                  style={sidebarPosition === pos.id ? {...acBg15, ...acBorder40} : undefined}
                                  className={`px-[12px] py-[12px] rounded-[16px] border text-xs font-semibold transition-all ${
                                    sidebarPosition === pos.id
                                      ? 'text-white border'
                                      : 'bg-white/[0.02] border-white/[0.08] text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                                  }`}
                                >
                                  {pos.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="w-full h-[1px] bg-white/[0.06]" />

                          <div className="flex flex-col gap-[16px]">
                            <div>
                              <h3 className="text-base font-semibold text-white mb-[4px]">Workspace Layout Padding</h3>
                              <p className="text-xs text-white/50">Select spacing level for layout containers and blocks.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-[12px] max-w-[500px]">
                              {[
                                { id: 'compact', name: 'Compact', desc: 'Dense data views' },
                                { id: 'cozy', name: 'Cozy', desc: 'Standard balance' },
                                { id: 'cinematic', name: 'Cinematic', desc: 'Room to breathe' }
                              ].map(pad => (
                                <button
                                  key={pad.id}
                                  onClick={() => {
                                    setLayoutPadding(pad.id as any);
                                    triggerToast(`Layout padding set to ${pad.name}`);
                                  }}
                                  style={layoutPadding === pad.id ? {...acBg15, ...acBorder40} : undefined}
                                  className={`flex flex-col items-center justify-center p-[16px] rounded-[16px] border text-center transition-all ${
                                    layoutPadding === pad.id
                                      ? 'text-white border'
                                      : 'bg-white/[0.02] border-white/[0.08] text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                                  }`}
                                >
                                  <span className="text-xs font-semibold">{pad.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* LABS SUBTAB */}
                      {activeAppearanceSubTab === 'Labs' && (
                        <div className="flex flex-col gap-[28px]">
                          <div>
                            <h3 className="text-base font-semibold text-[#00D2FF] flex items-center gap-[6px]">
                              <Sparkles size={16} /> Experimental Visual Labs
                            </h3>
                            <p className="text-xs text-white/50">Beta feature toggles for high-fidelity animations and premium effects.</p>
                          </div>

                          <div className="flex flex-col gap-[20px]">
                            {[
                              { id: 'mouseGlow', title: 'Mouse-Responsive Glass Glow', desc: 'Simulates organic lighting that follows your mouse cursor across glass panels.' },
                              { id: 'particles', title: 'Orbital Background Particles', desc: 'Overlay floating stardust node particles behind the liquid glass windows.' },
                              { id: 'audioFeedback', title: 'Glass Audio Feedback', desc: 'Enables tiny synthesized glass clicks on button clicks and sidebar navigations.' }
                            ].map(lab => {
                              const isActive = lab.id === 'mouseGlow' ? mouseGlow : lab.id === 'particles' ? particles : audioFeedback;
                              return (
                                <div key={lab.id} className="flex items-center justify-between gap-[24px]">
                                  <div className="max-w-[480px]">
                                    <h4 className="text-sm font-semibold text-white/90 mb-[2px]">{lab.title}</h4>
                                    <p className="text-xs text-white/50 leading-relaxed">{lab.desc}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      handleToggle(lab.id);
                                      triggerToast(`Experimental feature ${lab.title} updated`);
                                    }}
                                    style={isActive ? acToggleOn : undefined}
                                    className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 border border-white/[0.05] ${isActive ? '' : 'bg-white/[0.1]'}`}
                                  >
                                    <motion.div
                                      animate={{ x: isActive ? 20 : 0 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                      className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-md"
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'Notifications' && (
            <section className="flex flex-col gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-lg font-medium text-white mb-[4px]">Notifications</h2>
                <p className="text-sm text-white/50">Decide how and when you want to be alerted.</p>
              </div>

              <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] flex flex-col overflow-hidden">
                {[
                  { key: 'emailDigest', title: 'Weekly Email Digests', desc: 'Receive a summary of new concepts and artifacts generated from your history.', icon: Mail },
                  { key: 'pushNotifs', title: 'Desktop Push Notifications', desc: 'Alerts for long-running artifact generations and workspace invites.', icon: Bell },
                  { key: 'browserAlerts', title: 'In-App Alerts', desc: 'Show toast notifications for errors, successes, and general feedback.', icon: Smartphone },
                ].map((item, index) => (
                  <div key={item.key} className={`p-[20px] md:p-[24px] flex items-center justify-between gap-[16px] md:gap-[24px] ${index !== 2 ? 'border-b border-white/[0.06]' : ''}`}>
                    <div className="flex items-start gap-[16px] min-w-0">
                      <div className="w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/50 flex-shrink-0 mt-[2px]">
                        <item.icon size={18} />
                      </div>
                      <div className="min-w-0 pr-4">
                        <h3 className="text-sm md:text-base font-medium text-white/90 mb-[4px] truncate">{item.title}</h3>
                        <p className="text-xs md:text-sm text-white/50 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(item.key)}
                      style={toggles[item.key] ? acToggleOn : undefined}
                      className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 border border-white/[0.05] ${toggles[item.key] ? '' : 'bg-white/[0.1]'}`}
                    >
                      <motion.div
                        animate={{ x: toggles[item.key] ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-md flex items-center justify-center"
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-[8px]">
                <a href="/dashboard/notifications" className="px-[20px] py-[10px] rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-semibold text-white transition-all text-center hover:bg-gradient-to-r hover:from-primary/20 hover:to-[var(--accent-secondary)]/20 hover:border-primary/30">
                  View All Notifications Page →
                </a>
              </div>
            </section>
          )}

          {activeTab === 'Danger Zone' && (
            <section className="flex flex-col gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-lg font-medium text-red-400 mb-[4px]">Danger Zone</h2>
                <p className="text-sm text-red-400/60">Destructive actions and data wiping. Proceed with caution.</p>
              </div>

              <div className="rounded-[24px] backdrop-blur-xl bg-red-500/[0.03] border border-red-500/20 flex flex-col overflow-hidden">
                <div className="p-[20px] md:p-[24px] flex flex-col md:flex-row items-start md:items-center justify-between gap-[16px] border-b border-red-500/10">
                  <div className="flex items-start gap-[16px]">
                    <div className="w-[40px] h-[40px] rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/70 flex-shrink-0">
                      <Download size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-medium text-white/90 mb-[4px]">Export All Data</h3>
                      <p className="text-xs md:text-sm text-white/50 leading-relaxed max-w-[400px]">Download a complete JSON export of all your synced conversations, artifacts, and knowledge graph edges.</p>
                    </div>
                  </div>
                  <button className="px-[20px] py-[10px] rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all whitespace-nowrap self-start md:self-auto">
                    Export JSON Archive
                  </button>
                </div>

                <div className="p-[20px] md:p-[24px] flex flex-col md:flex-row items-start md:items-center justify-between gap-[16px] border-b border-red-500/10">
                  <div className="flex items-start gap-[16px]">
                    <div className="w-[40px] h-[40px] rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
                      <Eraser size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-medium text-white/90 mb-[4px]">Clear Cloud Index</h3>
                      <p className="text-xs md:text-sm text-white/50 leading-relaxed max-w-[400px]">Wipes your entire vector database and semantic index. This cannot be undone, but you can re-sync from providers later.</p>
                    </div>
                  </div>
                  <button className="px-[20px] py-[10px] rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 hover:text-red-300 transition-all whitespace-nowrap self-start md:self-auto">
                    Clear Index
                  </button>
                </div>

                <div className="p-[20px] md:p-[24px] flex flex-col md:flex-row items-start md:items-center justify-between gap-[16px]">
                  <div className="flex items-start gap-[16px]">
                    <div className="w-[40px] h-[40px] rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                      <AlertOctagon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-medium text-red-400 mb-[4px]">Delete Account</h3>
                      <p className="text-xs md:text-sm text-red-400/60 leading-relaxed max-w-[400px]">Permanently deletes your CORTEX account, all workspaces, artifacts, and integrations. This is irreversible.</p>
                    </div>
                  </div>
                  <button className="px-[20px] py-[10px] rounded-full bg-red-500 hover:bg-red-600 border border-red-400 text-xs font-bold text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all whitespace-nowrap self-start md:self-auto">
                    Delete Account
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'Integrations' && (
            <>
              <section className="flex flex-col gap-[20px] md:gap-[24px]">
                <div className="px-[8px]">
                  <h2 className="text-base md:text-lg font-medium text-white mb-[4px]">Cloud AI Providers</h2>
                  <p className="text-xs md:text-sm text-white/50">Connect your accounts to sync conversation history automatically.</p>
                </div>

                <motion.div variants={staggerList} initial="hidden" animate="visible" className="flex flex-col gap-[16px]">
                  {providerList.map(provider => (
                    <motion.div
                      key={provider.id}
                      variants={listItem}
                      className="flex flex-col p-[16px] md:p-[20px] rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.12] transition-colors duration-200 gap-[16px]"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-[16px]">
                        <div className="flex items-center gap-[16px]">
                          <div className="w-[40px] h-[40px] md:w-[48px] md:h-[48px] rounded-full flex items-center justify-center border border-white/[0.1] flex-shrink-0" style={{ backgroundColor: `${provider.color}15` }}>
                            <Cpu size={20} className="md:w-[24px] md:h-[24px]" color={provider.color} />
                          </div>
                          <div>
                            <h3 className="text-sm md:text-base font-medium text-white/90 mb-[2px]">{provider.name}</h3>
                            <div className="flex items-center gap-[6px]">
                              <div className={`w-[6px] h-[6px] rounded-full ${provider.status === 'connected' ? 'bg-[#00D97E]' : provider.status === 'error' ? 'bg-[#FFBC00]' : 'bg-white/20'}`} />
                              <span className="text-[10px] md:text-xs text-white/50 capitalize">
                                {provider.status === 'connected' && provider.model ? `connected (${provider.model})` : provider.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleProvider(provider.id)}
                          className={`w-full sm:w-auto px-[20px] py-[8px] rounded-full text-[12px] md:text-sm font-medium transition-all duration-200 border ${provider.status === 'connected'
                              ? 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30'
                              : 'bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                            }`}
                        >
                          {provider.status === 'connected' ? 'Disconnect' : provider.status === 'error' ? 'Reauthorize' : 'Connect'}
                        </button>
                      </div>

                      {connectingProviderId === provider.id && (
                        <motion.form
                          onSubmit={handleSaveConnection}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="w-full flex flex-col gap-[12px] pt-[16px] border-t border-white/[0.06] overflow-hidden"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                            <div className="flex flex-col gap-[8px]">
                              <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">API Key</label>
                              <input 
                                type="password"
                                placeholder={provider.id === 'anthropic' ? 'sk-ant-api03-...' : 'sk-...'}
                                value={provApiKey}
                                onChange={(e) => setProvApiKey(e.target.value)}
                                required
                                className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
                              />
                            </div>

                            <div className="flex flex-col gap-[8px]">
                              <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Default Model</label>
                              <select
                                value={provModel}
                                onChange={(e) => setProvModel(e.target.value)}
                                className="bg-[#0A0A0F] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs text-white focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                              >
                                {getModelsForProvider(provider.id).map(m => (
                                  <option key={m.value} value={m.value} className="bg-[#0A0A0F]">{m.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-col gap-[8px]">
                            <div className="flex items-center justify-between">
                              <button 
                                type="button" 
                                onClick={() => setProvShowAdvanced(!provShowAdvanced)}
                                className="text-[11px] text-white/40 hover:text-white/60 transition-colors"
                              >
                                {provShowAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                              </button>
                            </div>

                            {provShowAdvanced && (
                              <div className="flex flex-col gap-[8px] mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Custom API Endpoint (Optional)</label>
                                <input 
                                  type="text"
                                  placeholder={
                                    provider.id === 'openai' 
                                      ? "e.g. https://api.openai.com/v1"
                                      : provider.id === 'anthropic'
                                      ? "e.g. https://api.anthropic.com/v1"
                                      : provider.id === 'google'
                                      ? "e.g. https://generativelanguage.googleapis.com"
                                      : "e.g. https://api.perplexity.ai"
                                  }
                                  value={provEndpoint}
                                  onChange={(e) => setProvEndpoint(e.target.value)}
                                  className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-[12px] mt-4 border-t border-white/[0.04] pt-[12px]">
                            <button 
                              type="button" 
                              onClick={() => setConnectingProviderId(null)}
                              className="px-[20px] py-[8px] rounded-full border border-white/[0.1] text-xs text-white/60 hover:bg-white/[0.05] transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              style={acGradient}
                              className="px-[24px] py-[8px] rounded-full text-xs font-semibold text-white hover:opacity-90 transition-all"
                            >
                              Save & Connect
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </section>

              <section className="flex flex-col gap-[20px] md:gap-[24px]">
                <div className="px-[8px]">
                  <h2 className="text-base md:text-lg font-medium text-white mb-[4px]">Local AI Integration (Ollama)</h2>
                  <p className="text-[11px] md:text-sm text-white/50 leading-relaxed">Run open-source models completely locally. CORTEX can use Ollama for private indexing.</p>
                </div>

                <motion.div variants={staggerList} initial="hidden" animate="visible" className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[16px] md:p-[24px] flex flex-col gap-[24px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[16px]">
                      <div className="w-[40px] h-[40px] md:w-[48px] md:h-[48px] rounded-full flex items-center justify-center border border-[#00D2FF]/30 bg-[#00D2FF]/10 flex-shrink-0">
                        <Database size={20} className="md:w-[24px] md:h-[24px] text-[#00D2FF]" />
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium text-white/90 mb-[2px]">Ollama Local Server</h3>
                        <div className="flex items-center gap-[6px]">
                          <div className={`w-[6px] h-[6px] rounded-full ${toggles.ollamaActive ? 'bg-[#00D97E] shadow-[0_0_6px_#00D97E]' : 'bg-[#FF6584]'}`} />
                          <span className="text-[10px] md:text-xs text-white/50">{toggles.ollamaActive ? 'Connected & Running' : 'Disconnected'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle('ollamaActive')}
                      className={`relative w-[40px] h-[22px] md:w-[48px] md:h-[26px] rounded-full transition-colors duration-200 flex-shrink-0 border border-white/[0.05] ${toggles.ollamaActive ? 'bg-[#00D2FF]' : 'bg-white/[0.1]'}`}
                    >
                      <motion.div
                        animate={{ x: toggles.ollamaActive ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 18 : 22) : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-[2px] left-[2px] w-[16px] h-[16px] md:w-[20px] md:h-[20px] rounded-full bg-white shadow-md flex items-center justify-center"
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
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Ollama Endpoint</label>
                        <input
                          type="text"
                          value={ollamaHost}
                          onChange={(e) => setOllamaHost(e.target.value)}
                          className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs md:text-sm text-white focus:outline-none focus:border-[#00D2FF]/50 focus:bg-white/[0.05] transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Default Model</label>
                        <input
                          type="text"
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          placeholder="e.g. llama3, mistral, phi3"
                          className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs md:text-sm text-white focus:outline-none focus:border-[#00D2FF]/50 focus:bg-white/[0.05] transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </section>
            </>
          )}

          {activeTab === 'Privacy' && (
            <section className="flex flex-col gap-[20px] md:gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-base md:text-lg font-medium text-white mb-[4px]">Privacy & Data Control</h2>
                <p className="text-[11px] md:text-sm text-white/50">Control how your data is processed and stored.</p>
              </div>

              <div className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] flex flex-col overflow-hidden">
                {[
                  { key: 'sync', title: 'Cloud Sync', desc: 'Back up your encrypted index to the CORTEX cloud', icon: Shield },
                  { key: 'localModel', title: 'Local AI Processing', desc: 'Force all semantic searches to use local Ollama models', icon: Cpu },
                  { key: 'telemetry', title: 'Anonymous Telemetry', desc: 'Help us improve by sending crash reports', icon: SettingsIcon }
                ].map((item, index) => (
                  <div key={item.key} className={`p-[16px] md:p-[24px] flex items-center justify-between gap-[16px] md:gap-[24px] ${index !== 2 ? 'border-b border-white/[0.06]' : ''}`}>
                    <div className="flex items-start gap-[12px] md:gap-[16px]">
                      <div className="w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/50 flex-shrink-0 mt-[2px]">
                        <item.icon size={16} className="md:w-[18px] md:h-[18px]" />
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium text-white/90 mb-[2px] md:mb-[4px]">{item.title}</h3>
                        <p className="text-[11px] md:text-sm text-white/50 leading-relaxed max-w-[400px]">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(item.key)}
                      style={toggles[item.key] ? acToggleOn : undefined}
                      className={`relative w-[40px] h-[22px] md:w-[44px] md:h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 border border-white/[0.05] ${toggles[item.key] ? '' : 'bg-white/[0.1]'}`}
                    >
                      <motion.div
                        animate={{ x: toggles[item.key] ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 18 : 20) : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-[2px] left-[2px] w-[16px] h-[16px] md:w-[18px] md:h-[18px] rounded-full bg-white shadow-md flex items-center justify-center"
                      >
                        {toggles[item.key] && <div className="w-[4px] h-[4px] rounded-full opacity-50" />}
                      </motion.div>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'Profile' && (
            <section className="flex flex-col gap-[20px] md:gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-base md:text-lg font-medium text-white mb-[4px]">User Profile</h2>
                <p className="text-[11px] md:text-sm text-white/50">Manage your personal information, preferences, and security settings.</p>
              </div>

              <div className="flex flex-col lg:flex-row gap-[24px]">
                {/* Left Column: Personal Info & Preferences */}
                <div className="flex-1 flex flex-col gap-[24px]">
                  {/* Profile Picture */}
                  <div className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col sm:flex-row items-center sm:items-start gap-[24px] text-center sm:text-left transition-all hover:bg-white/[0.04]">
                    <div style={acGradient} className="w-[80px] h-[80px] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(108,99,255,0.4)] flex-shrink-0 relative group cursor-pointer">
                      <User size={32} className="text-white" />
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <span className="text-xs font-medium text-white flex items-center gap-[4px]"><Palette size={14}/> Edit</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center h-full pt-1">
                      <h3 className="text-white font-medium text-sm md:text-base">Profile Picture</h3>
                      <p className="text-white/50 text-[11px] md:text-sm mb-[16px]">PNG, JPG up to 5MB.</p>
                      <div className="flex justify-center sm:justify-start gap-[12px]">
                        <button className="px-[16px] py-[6px] rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-medium text-white hover:bg-white/[0.1] transition-all shadow-sm">Upload New</button>
                        <button className="px-[16px] py-[6px] rounded-full border border-transparent text-xs font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all">Remove</button>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[20px]">
                    <h3 className="text-sm md:text-base font-medium text-white mb-[4px]">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">First Name</label>
                        <input type="text" defaultValue="John" className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs md:text-sm text-white focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all hover:border-white/[0.15]" />
                      </div>
                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Last Name</label>
                        <input type="text" defaultValue="Doe" className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs md:text-sm text-white focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all hover:border-white/[0.15]" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Email Address</label>
                      <input type="email" defaultValue="john@cortex.ai" className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs md:text-sm text-white focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all hover:border-white/[0.15]" />
                    </div>
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Bio</label>
                      <textarea placeholder="Tell us a little about yourself..." rows={3} className="bg-white/[0.02] border border-white/[0.08] rounded-[16px] px-[16px] py-[12px] text-xs md:text-sm text-white focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all hover:border-white/[0.15] resize-y custom-scrollbar" />
                    </div>
                  </div>
                  
                  {/* Preferences */}
                  <div className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[20px]">
                    <h3 className="text-sm md:text-base font-medium text-white mb-[4px]">Regional Preferences</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Timezone</label>
                        <select className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs md:text-sm text-white focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all hover:border-white/[0.15] appearance-none cursor-pointer">
                          <option className="bg-[#0A0A0F]">Pacific Time (US & Canada)</option>
                          <option className="bg-[#0A0A0F]">Eastern Time (US & Canada)</option>
                          <option className="bg-[#0A0A0F]">UTC</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Language</label>
                        <select className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs md:text-sm text-white focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all hover:border-white/[0.15] appearance-none cursor-pointer">
                          <option className="bg-[#0A0A0F]">English (US)</option>
                          <option className="bg-[#0A0A0F]">Spanish</option>
                          <option className="bg-[#0A0A0F]">French</option>
                          <option className="bg-[#0A0A0F]">German</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button style={acGradient} className="w-full sm:w-auto px-[32px] py-[12px] rounded-full text-white text-sm font-semibold hover:opacity-90 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-0.5">
                      Save Profile Changes
                    </button>
                  </div>
                </div>

                {/* Right Column: Security */}
                <div className="w-full lg:w-[350px] flex flex-col gap-[24px]">
                  <div className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[20px]">
                    <div className="flex items-center gap-2 mb-1">
                      <KeyRound size={16} className="text-white/70" />
                      <h3 className="text-sm md:text-base font-medium text-white">Security</h3>
                    </div>
                    <div className="flex flex-col gap-[16px]">
                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Current Password</label>
                        <input type="password" placeholder="••••••••" className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs text-white focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all hover:border-white/[0.15]" />
                      </div>
                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">New Password</label>
                        <input type="password" placeholder="••••••••" className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs text-white focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all hover:border-white/[0.15]" />
                      </div>
                      <button style={acBg10} className="w-full mt-[8px] px-[20px] py-[10px] rounded-full border border-white/[0.1] text-white text-xs font-semibold hover:border-white/[0.3] hover:bg-white/[0.08] transition-all">
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[16px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor size={16} className="text-white/70" />
                      <h3 className="text-sm md:text-base font-medium text-white">Active Sessions</h3>
                    </div>
                    <div className="flex flex-col gap-[12px]">
                      <div className="flex items-start justify-between p-3 rounded-[16px] bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-white">Windows • Chrome</span>
                          <span className="text-[10px] text-white/50">Current Session • New York, US</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-[#00D97E] mt-1 shadow-[0_0_6px_#00D97E]"></div>
                      </div>
                      <div className="flex items-start justify-between p-3 rounded-[16px] hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.05] group">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">MacBook Pro • Safari</span>
                          <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors">Active 2 days ago • SF, US</span>
                        </div>
                        <button className="text-[10px] text-white/40 hover:text-red-400 transition-colors mt-0.5">Revoke</button>
                      </div>
                    </div>
                    <button className="w-full mt-[4px] px-[20px] py-[8px] rounded-full border border-white/[0.08] text-white/70 text-xs font-medium hover:border-white/[0.15] hover:bg-white/[0.04] transition-all">
                      Sign Out All Devices
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'Workspace' && (
            <section className="flex flex-col gap-[20px] md:gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-base md:text-lg font-medium text-white mb-[4px]">Workspace Settings</h2>
                <p className="text-[11px] md:text-sm text-white/50">Manage team members and workspace configurations.</p>
              </div>

              <div className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[32px] flex flex-col gap-[32px] md:gap-[40px]">
                {/* General Workspace Settings */}
                <div className="flex flex-col gap-[16px] md:gap-[24px]">
                  <h3 className="text-sm md:text-base font-medium text-white">General</h3>
                  <div className="flex flex-col gap-[8px] max-w-[500px]">
                    <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Workspace Name</label>
                    <div className="flex flex-col sm:flex-row gap-[12px]">
                      <input
                        type="text"
                        value={tempWorkspaceName}
                        onChange={(e) => setTempWorkspaceName(e.target.value)}
                        className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[10px] text-xs md:text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
                      />
                      <button
                        onClick={handleUpdateWorkspaceName}
                        disabled={tempWorkspaceName === workspaceName || !tempWorkspaceName.trim()}
                        style={tempWorkspaceName !== workspaceName && tempWorkspaceName.trim() ? {...acBg20, ...acBorder40, ...acText} : undefined}
                        className={`w-full sm:w-auto px-[24px] py-[10px] rounded-full text-xs md:text-sm font-medium transition-all ${tempWorkspaceName === workspaceName || !tempWorkspaceName.trim()
                            ? 'bg-white/[0.02] text-white/20 border border-white/[0.05] cursor-not-allowed'
                            : 'border text-white hover:opacity-90'
                          }`}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-white/[0.06]" />

                {/* Team Members */}
                <div className="flex flex-col gap-[20px] md:gap-[24px]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
                    <h3 className="text-sm md:text-base font-medium text-white">Team Members</h3>
                    <button
                      onClick={() => setIsInviteOpen(true)}
                      className="w-full sm:w-auto justify-center px-[16px] py-[8px] rounded-full bg-[#00D97E]/20 border border-[#00D97E]/40 text-[#00D97E] text-[11px] md:text-xs font-medium hover:bg-[#00D97E]/30 transition-all flex items-center gap-[6px]"
                    >
                      <UserPlus size={14} />
                      Invite Member
                    </button>
                  </div>

                  {isInviteOpen && (
                    <motion.form
                      onSubmit={handleInviteMember}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-[16px] md:p-[24px] rounded-[20px] bg-white/[0.04] border border-white/[0.1] flex flex-col gap-[16px]"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-[13px] md:text-sm font-semibold text-white">Invite New Member</h4>
                        <button
                          type="button"
                          onClick={() => setIsInviteOpen(false)}
                          className="p-[4px] rounded-full hover:bg-white/[0.08] text-white/50 hover:text-white transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[16px]">
                        <div className="flex flex-col gap-[8px]">
                          <label className="text-[10px] md:text-[11px] text-white/40 pl-[8px]">Full Name</label>
                          <input type="text" placeholder="Sarah Connor" value={inviteName} onChange={(e) => setInviteName(e.target.value)} required className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[8px] text-xs text-white focus:outline-none focus:border-primary/50 transition-all" />
                        </div>
                        <div className="flex flex-col gap-[8px]">
                          <label className="text-[10px] md:text-[11px] text-white/40 pl-[8px]">Email Address</label>
                          <input type="email" placeholder="sarah@cortex.ai" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required className="bg-white/[0.02] border border-white/[0.08] rounded-full px-[16px] py-[8px] text-xs text-white focus:outline-none focus:border-primary/50 transition-all" />
                        </div>
                        <div className="flex flex-col gap-[8px]">
                          <label className="text-[10px] md:text-[11px] text-white/40 pl-[8px]">Workspace Role</label>
                          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="bg-[#0A0A0F] border border-white/[0.08] rounded-full px-[16px] py-[8px] text-xs text-white focus:outline-none focus:border-primary/50 transition-all cursor-pointer">
                            <option value="Editor">Editor (Can edit and manage)</option>
                            <option value="Viewer">Viewer (Read-only access)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-[12px] mt-[8px]">
                        <button type="button" onClick={() => setIsInviteOpen(false)} className="w-full sm:w-auto px-[16px] py-[8px] rounded-full border border-white/[0.1] text-xs text-white/60 hover:bg-white/[0.05] transition-all">Cancel</button>
                        <button type="submit" style={acGradient} className="w-full sm:w-auto px-[20px] py-[8px] rounded-full text-xs font-semibold text-white hover:opacity-90 transition-all">Send Invitation</button>
                      </div>
                    </motion.form>
                  )}

                  <div className="flex flex-col rounded-[16px] border border-white/[0.06] overflow-hidden">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="p-[12px] md:p-[16px] border-b last:border-0 border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/[0.02] transition-colors gap-[12px]">
                        <div className="flex items-center gap-[12px]">
                          <div className={`w-[28px] h-[28px] md:w-[32px] md:h-[32px] rounded-full bg-gradient-to-br flex items-center justify-center shadow-sm flex-shrink-0 ${member.role === 'Owner' ? 'from-primary to-primary/60' : 'from-white/10 to-white/5'
                            }`}>
                            <User size={14} className="text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] md:text-sm font-medium text-white">{member.name} {member.isYou && '(You)'}</span>
                            <span className="text-[10px] md:text-xs text-white/50">{member.email}</span>
                          </div>
                        </div>

                        <div className="flex gap-[12px] items-center self-start sm:self-auto pl-[40px] sm:pl-0">
                          {member.role === 'Owner' ? (
                            <span className="text-[11px] md:text-xs font-medium bg-white/[0.08] border border-white/[0.15] px-[10px] py-[4px] rounded-full">Owner</span>
                          ) : (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeRole(member.id, e.target.value as any)}
                                className="bg-white/[0.04] border border-white/[0.08] rounded-full px-[12px] py-[4px] text-[11px] md:text-xs text-white/70 focus:outline-none cursor-pointer hover:bg-white/[0.08] transition-colors"
                              >
                                <option value="Editor" className="bg-[#0A0A0F]">Editor</option>
                                <option value="Viewer" className="bg-[#0A0A0F]">Viewer</option>
                              </select>
                              <button onClick={() => handleRemoveMember(member.id, member.name)} className="p-[6px] rounded-full hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors" title="Remove member">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'Billing' && (
            <section className="flex flex-col gap-[20px] md:gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-base md:text-lg font-medium text-white mb-[4px]">Billing & Plans</h2>
                <p className="text-[11px] md:text-sm text-white/50">Manage your subscription tier, billing cycle, and workspace quotas.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px] md:gap-[24px]">
                {/* Free Tier */}
                <div className="rounded-[32px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] p-8 flex flex-col justify-between gap-8 transition-all relative overflow-hidden group">
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Free</h3>
                        <p className="text-xs text-white/45">Self-Hosted</p>
                      </div>
                      <span className="text-[10px] md:text-xs font-semibold text-[#00D97E] bg-[#00D97E]/10 border border-[#00D97E]/20 px-3 py-1 rounded-full flex-shrink-0">
                        Current
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 border-b border-white/[0.06] pb-6">
                      <span className="text-5xl font-extrabold text-white">$0</span>
                      <span className="text-xs text-white/40">/ month</span>
                    </div>

                    <ul className="flex flex-col gap-3 text-xs text-white/70">
                      {[
                        "Conversation Import (All Providers)",
                        "Local Ollama Integration",
                        "Hybrid Search (BM25 + Semantic)",
                        "Model Compare Mode",
                        "Artifact Generation",
                        "Full Analytics & Heatmaps",
                        "Knowledge Graph",
                        "Cloud Sync & Backups weekly/daily once per day",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="text-[#00D97E] flex-shrink-0 mt-0.5" size={14} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button className="w-full py-[10px] md:py-[11px] rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/40 font-semibold cursor-not-allowed transition-all mt-[12px]">
                    Active Subscription
                  </button>
                </div>

                {/* Pro Tier */}
                <div 
                  style={{ backgroundColor: `${accentColor}05`, borderColor: `${accentColor}33` }} 
                  className="rounded-[32px] backdrop-blur-xl border p-8 flex flex-col justify-between gap-8 transition-all relative overflow-hidden group shadow-[0_0_30px_rgba(var(--accent-rgb),0.1)]"
                >
                  <div className="flex flex-col gap-6">
                    <div 
                      style={{ position: 'absolute', top: -60, right: -60, backgroundColor: `${accentColor}1a`, width: 150, height: 150 }} 
                      className="rounded-full blur-[50px] pointer-events-none group-hover:opacity-100 transition-all duration-500" 
                    />

                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
                        <p className="text-xs text-white/45">Self-hosted Pro</p>
                      </div>
                      <span 
                        style={{ color: accentColor, backgroundColor: `${accentColor}1a`, borderColor: `${accentColor}30`, boxShadow: `0 0 12px ${accentColor}33` }} 
                        className="text-[10px] md:text-xs font-semibold border px-3 py-1 rounded-full flex-shrink-0"
                      >
                        Most Popular
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 border-b border-white/[0.06] pb-6">
                      <span className="text-5xl font-extrabold text-white">$20</span>
                      <span className="text-xs text-white/40">/ month</span>
                    </div>

                    <ul className="flex flex-col gap-3 text-xs text-white/70">
                      {[
                        "Everything in Free +",
                        "Team Workspaces & RBAC (up to 10)",
                        "SSO / SAML",
                        "PII Redaction",
                        "Audit Logs",
                        "Cloud Sync & Backups high and good",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check style={{ color: accentColor }} className="flex-shrink-0 mt-0.5" size={14} />
                          <span className={i === 0 ? '' : 'text-white font-medium'}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button style={acGradient} className="w-full py-[10px] md:py-[11px] rounded-full text-xs text-white font-bold hover:opacity-90 transition-all mt-[12px] relative z-10 shadow-lg">
                    Upgrade to Pro
                  </button>
                </div>

                {/* Enterprise Tier */}
                <div className="rounded-[32px] backdrop-blur-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#00D2FF]/30 p-8 flex flex-col justify-between gap-8 transition-all relative overflow-hidden group">
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Enterprise</h3>
                        <p className="text-xs text-white/45">Custom Deployment</p>
                      </div>
                      <span className="text-[10px] md:text-xs font-semibold text-[#00D2FF] bg-[#00D2FF]/10 border border-[#00D2FF]/20 px-3 py-1 rounded-full flex-shrink-0">
                        Contact Us
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 border-b border-white/[0.06] pb-6">
                      <span className="text-5xl font-extrabold text-white">Custom</span>
                    </div>

                    <ul className="flex flex-col gap-3 text-xs text-white/70">
                      {[
                        "Everything in Pro +",
                        "SSO / SAML integration",
                        "PII redaction pipeline",
                        "Tamper-evident audit logs",
                        "Unlimited users & workspaces",
                        "SLA & dedicated support",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="text-[#00D2FF] flex-shrink-0 mt-0.5" size={14} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a 
                    href="mailto:sales@cortex.ai"
                    className="w-full py-[10px] md:py-[11px] rounded-full bg-white text-black font-semibold text-center hover:bg-white/90 transition-all mt-[12px] block relative z-10"
                  >
                    Contact Sales
                  </a>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'Help & Support' && (
            <section className="flex flex-col gap-[20px] md:gap-[24px]">
              <div className="px-[8px]">
                <h2 className="text-base md:text-lg font-medium text-white mb-[4px]">Help & Support</h2>
                <p className="text-[11px] md:text-sm text-white/50">Report issues, find answers, and review our policies.</p>
              </div>
              
              <div className="flex gap-[8px] px-[8px] overflow-x-auto custom-scrollbar pb-2">
                {['Report', 'FAQ', 'Policies'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSupportTab(tab as any)}
                    className={`px-[16px] py-[8px] rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      activeSupportTab === tab
                        ? 'bg-white/[0.1] text-white border border-white/[0.2]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    {tab === 'Report' ? 'Report a Problem' : tab === 'FAQ' ? 'FAQs' : 'Privacy & Terms'}
                  </button>
                ))}
              </div>

              <div className="rounded-[20px] md:rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[32px] flex flex-col gap-[28px]">
                {activeSupportTab === 'Report' && (
                  <div className="flex flex-col gap-[28px]">
                    <div className="flex flex-col gap-[16px]">
                      <h3 className="text-sm md:text-base font-medium text-white">Report a Problem</h3>
                      <p className="text-[11px] md:text-xs text-white/50">Select your preferred reporting channel. Creating a GitHub issue puts the bug directly onto our public tracking board.</p>
                    </div>

                    {/* Tab selector for report method */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] max-w-[500px]">
                      {[
                        { id: 'normal', name: 'Option 1: Standard Feedback', desc: 'Direct message to internal support logs' },
                        { id: 'github', name: 'Option 2: Create GitHub Issue', desc: 'Creates a public issue in GitHub repo' }
                      ].map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setReportMethod(method.id as any)}
                          style={reportMethod === method.id ? {...acBg15, ...acBorder40} : undefined}
                          className={`flex flex-col items-start p-[16px] rounded-[20px] border text-left transition-all ${
                            reportMethod === method.id
                              ? 'text-white border'
                              : 'bg-white/[0.02] border-white/[0.08] text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                          }`}
                        >
                          <span className="text-xs font-semibold text-white mb-[4px]">{method.name}</span>
                          <span className="text-[10px] text-white/40 leading-normal">{method.desc}</span>
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleReportBug} className="flex flex-col gap-[20px] max-w-[600px] w-full">
                      {reportMethod === 'github' && (
                        <div className="flex flex-col gap-[8px] animate-in fade-in slide-in-from-top-2 duration-200">
                          <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">GitHub Username / ID</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Jaimintrv21" 
                            value={githubUser}
                            onChange={(e) => setGithubUser(e.target.value)}
                            required
                            className="bg-white/[0.02] border border-white/[0.08] rounded-[16px] px-[16px] py-[12px] text-xs md:text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all" 
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                        <div className="flex flex-col gap-[8px]">
                          <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Category</label>
                          <select 
                            value={bugCategory} 
                            onChange={(e: any) => setBugCategory(e.target.value)}
                            className="bg-white/[0.02] border border-white/[0.08] rounded-[16px] px-[16px] py-[12px] text-xs md:text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all cursor-pointer"
                          >
                            <option value="bug" className="bg-[#0A0A0F]">🐛 Bug / Defect</option>
                            <option value="feature" className="bg-[#0A0A0F]">✨ Feature Request</option>
                            <option value="docs" className="bg-[#0A0A0F]">📚 Documentation</option>
                            <option value="optimization" className="bg-[#0A0A0F]">⚡ Optimization / Performance</option>
                            <option value="styling" className="bg-[#0A0A0F]">🎨 Styling / Design</option>
                            <option value="security" className="bg-[#0A0A0F]">🔒 Security Vulnerability</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-[8px]">
                          <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Estimated Difficulty to Fix</label>
                          <select 
                            value={bugDifficulty} 
                            onChange={(e: any) => setBugDifficulty(e.target.value)}
                            className="bg-white/[0.02] border border-white/[0.08] rounded-[16px] px-[16px] py-[12px] text-xs md:text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all cursor-pointer"
                          >
                            <option value="easy" className="bg-[#0A0A0F]">🟢 Easy (Quick fix, minor change)</option>
                            <option value="medium" className="bg-[#0A0A0F]">🟡 Medium (Requires code changes & validation)</option>
                            <option value="hard" className="bg-[#0A0A0F]">🔴 Hard / Complex (Requires deep architecture change)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Bug Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Dashboard fails to load after sync" 
                          value={bugTitle}
                          onChange={(e) => setBugTitle(e.target.value)}
                          required
                          className="bg-white/[0.02] border border-white/[0.08] rounded-[16px] px-[16px] py-[12px] text-xs md:text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all" 
                        />
                      </div>
                      
                      <div className="flex flex-col gap-[8px]">
                        <label className="text-[11px] md:text-xs text-white/50 pl-[8px]">Bug Description</label>
                        <textarea 
                          placeholder="Please provide steps to reproduce the issue, expected behavior, and actual behavior." 
                          rows={5}
                          value={bugDescription}
                          onChange={(e) => setBugDescription(e.target.value)}
                          required
                          className="bg-white/[0.02] border border-white/[0.08] rounded-[16px] px-[16px] py-[16px] text-xs md:text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all resize-y" 
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={isSubmittingBug}
                        className={`w-full sm:w-fit px-[24px] py-[12px] md:py-[10px] rounded-full text-sm font-medium transition-all flex items-center justify-center gap-[8px] ${
                          isSubmittingBug 
                            ? 'bg-white/[0.05] text-white/30 cursor-not-allowed border border-white/[0.1]' 
                            : 'text-white hover:opacity-90'
                        }`}
                        style={!isSubmittingBug ? acGradient : undefined}
                      >
                        {isSubmittingBug ? (
                          <>
                            <div className="w-[16px] h-[16px] border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          reportMethod === 'github' ? 'Create GitHub Issue' : 'Submit Feedback'
                        )}
                      </button>
                    </form>
                  </div>
                )}
                
                {activeSupportTab === 'FAQ' && (
                  <div className="flex flex-col gap-[20px] animate-in fade-in duration-300">
                    <h3 className="text-sm md:text-base font-medium text-white mb-[8px]">Frequently Asked Questions</h3>
                    {[
                      { q: "How does local AI integration work?", a: "C.O.R.T.E.X. connects to your local Ollama instance running on port 11434 by default. This ensures complete privacy as your data never leaves your machine." },
                      { q: "Can I use multiple cloud providers at once?", a: "Yes, you can connect multiple providers (e.g. OpenAI and Anthropic) and select different models for specific tasks or pipelines within your workspace." },
                      { q: "What happens when I delete my account?", a: "Account deletion is permanent. It instantly wipes your profile, settings, and vector database index. However, connected external providers remain untouched." },
                      { q: "How is my data encrypted?", a: "All conversation logs and artifacts are encrypted at rest using AES-256. API keys are stored in a secure enclave and are never exposed to the client." }
                    ].map((faq, i) => (
                      <div key={i} className="flex flex-col gap-[8px] p-[16px] rounded-[16px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                        <h4 className="text-[13px] md:text-sm font-medium text-white/90">{faq.q}</h4>
                        <p className="text-[11px] md:text-xs text-white/50 leading-relaxed">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeSupportTab === 'Policies' && (
                  <div className="flex flex-col gap-[32px] animate-in fade-in duration-300">
                    <div className="flex flex-col gap-[12px]">
                      <h3 className="text-sm md:text-base font-medium text-white">Privacy Policy</h3>
                      <div className="p-[16px] rounded-[16px] bg-white/[0.02] border border-white/[0.05] text-[11px] md:text-xs text-white/60 leading-relaxed h-[150px] overflow-y-auto custom-scrollbar">
                        <p className="mb-2"><strong>1. Data Collection:</strong> We collect only the data necessary to provide you with C.O.R.T.E.X. services. This includes workspace metadata, user preferences, and encrypted API keys. If you opt-in to telemetry, we collect anonymous crash reports.</p>
                        <p className="mb-2"><strong>2. Data Usage:</strong> Your data is used exclusively to power the features of this application. We do not sell, rent, or share your personal information with third parties.</p>
                        <p className="mb-2"><strong>3. Local Processing:</strong> When using the Ollama integration, all processing happens locally on your device. No data is sent to external servers in this mode.</p>
                        <p><strong>4. Data Deletion:</strong> You retain the right to delete your data at any time via the "Danger Zone" tab. This action will completely wipe your local and cloud indices.</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-[12px]">
                      <h3 className="text-sm md:text-base font-medium text-white">Terms & Conditions</h3>
                      <div className="p-[16px] rounded-[16px] bg-white/[0.02] border border-white/[0.05] text-[11px] md:text-xs text-white/60 leading-relaxed h-[150px] overflow-y-auto custom-scrollbar">
                        <p className="mb-2"><strong>1. Acceptance of Terms:</strong> By accessing and using C.O.R.T.E.X., you accept and agree to be bound by the terms and provision of this agreement.</p>
                        <p className="mb-2"><strong>2. User Conduct:</strong> You agree not to use the platform to generate illegal, harmful, or abusive content. API keys provided must belong to you, and you are responsible for any charges incurred with your respective providers.</p>
                        <p className="mb-2"><strong>3. Intellectual Property:</strong> All content, features, and functionality are owned by C.O.R.T.E.X. and are protected by international copyright, trademark, and other intellectual property laws.</p>
                        <p><strong>4. Termination:</strong> We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Glass-morphic Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-[280px] rounded-full backdrop-blur-xl bg-black/80 border border-white/[0.12] px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00D97E] animate-pulse flex-shrink-0" />
          <span className="text-[11px] font-medium text-white/90 whitespace-nowrap">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
