'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type ThemeStyle = 'liquid-glass' | 'retro-hologram' | 'minimal-slate';
export type ShaderSpeed = 'disabled' | 'paused' | 'slow' | 'normal' | 'hyper';
export type SidebarPosition = 'left' | 'right' | 'none';
export type LayoutPadding = 'compact' | 'cozy' | 'cinematic';

interface AppearanceContextProps {
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  shaderSpeed: ShaderSpeed;
  setShaderSpeed: (speed: ShaderSpeed) => void;
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => void;
  springSidebar: boolean;
  setSpringSidebar: (spring: boolean) => void;
  sidebarPosition: SidebarPosition;
  setSidebarPosition: (pos: SidebarPosition) => void;
  layoutPadding: LayoutPadding;
  setLayoutPadding: (pad: LayoutPadding) => void;
  mouseGlow: boolean;
  setMouseGlow: (glow: boolean) => void;
  particles: boolean;
  setParticles: (particles: boolean) => void;
  audioFeedback: boolean;
  setAudioFeedback: (feedback: boolean) => void;
  secondaryColor: string;
}

const AppearanceContext = createContext<AppearanceContextProps | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexToRgb(hex: string): string {
  hex = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  return `${r}, ${g}, ${b}`;
}

function getSecondaryColor(hex: string): string {
  const predefined: Record<string, string> = {
    '#6C63FF': '#00D2FF',
    '#00D2FF': '#00D97E',
    '#00D97E': '#FFBC00',
    '#FF6584': '#6C63FF',
    '#FFBC00': '#FF6584',
    '#EF4444': '#FFBC00',
  };
  const upperHex = hex.toUpperCase();
  if (predefined[upperHex]) return predefined[upperHex];

  try {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    h = (h + 40 / 360) % 1;
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    const hue2rgb = (t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let r2 = Math.round(hue2rgb(h + 1/3) * 255);
    let g2 = Math.round(hue2rgb(h) * 255);
    let b2 = Math.round(hue2rgb(h - 1/3) * 255);
    const toHexPart = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHexPart(r2)}${toHexPart(g2)}${toHexPart(b2)}`;
  } catch {
    return '#00D2FF';
  }
}

// ── Cookie Helpers ─────────────────────────────────────────

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = `appearance_${name}=${value}${expires}; path=/`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = `appearance_${name}=`;
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// ── Safe localStorage & Cookie read (used for lazy state init) ──────

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    // Try cookie first
    const cookieVal = getCookie(key);
    if (cookieVal !== null) {
      try {
        return JSON.parse(cookieVal) as T;
      } catch {
        return cookieVal as unknown as T;
      }
    }
    // Fallback to localStorage
    const saved = localStorage.getItem(`appearance_${key}`);
    if (saved === null) return fallback;
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    const stringVal = JSON.stringify(value);
    localStorage.setItem(`appearance_${key}`, stringVal);
    setCookie(key, stringVal);
  } catch { /* quota exceeded, ignore */ }
}

// ── Provider ───────────────────────────────────────────────

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  // Use lazy initializers so the FIRST render already uses persisted values
  // This prevents the race condition where save effects overwrite localStorage
  const [themeStyle, setThemeStyleRaw] = useState<ThemeStyle>(() => readStorage('themeStyle', 'liquid-glass' as ThemeStyle));
  const [accentColor, setAccentColorRaw] = useState(() => readStorage('accentColor', '#6C63FF'));
  const [shaderSpeed, setShaderSpeedRaw] = useState<ShaderSpeed>(() => readStorage('shaderSpeed', 'normal' as ShaderSpeed));
  const [reduceMotion, setReduceMotionRaw] = useState(() => readStorage('reduceMotion', false));
  const [springSidebar, setSpringSidebarRaw] = useState(() => readStorage('springSidebar', true));
  const [sidebarPosition, setSidebarPositionRaw] = useState<SidebarPosition>(() => readStorage('sidebarPosition', 'left' as SidebarPosition));
  const [layoutPadding, setLayoutPaddingRaw] = useState<LayoutPadding>(() => readStorage('layoutPadding', 'cozy' as LayoutPadding));
  const [mouseGlow, setMouseGlowRaw] = useState(() => readStorage('mouseGlow', true));
  const [particles, setParticlesRaw] = useState(() => readStorage('particles', false));
  const [audioFeedback, setAudioFeedbackRaw] = useState(() => readStorage('audioFeedback', false));
  const [secondaryColor, setSecondaryColor] = useState(() => getSecondaryColor(readStorage('accentColor', '#6C63FF')));

  // Wrap setters to persist immediately on every change
  const setThemeStyle = useCallback((v: ThemeStyle) => { setThemeStyleRaw(v); writeStorage('themeStyle', v); }, []);
  const setAccentColor = useCallback((v: string) => { setAccentColorRaw(v); writeStorage('accentColor', v); setSecondaryColor(getSecondaryColor(v)); }, []);
  const setShaderSpeed = useCallback((v: ShaderSpeed) => { setShaderSpeedRaw(v); writeStorage('shaderSpeed', v); }, []);
  const setReduceMotion = useCallback((v: boolean) => { setReduceMotionRaw(v); writeStorage('reduceMotion', v); }, []);
  const setSpringSidebar = useCallback((v: boolean) => { setSpringSidebarRaw(v); writeStorage('springSidebar', v); }, []);
  const setSidebarPosition = useCallback((v: SidebarPosition) => { setSidebarPositionRaw(v); writeStorage('sidebarPosition', v); }, []);
  const setLayoutPadding = useCallback((v: LayoutPadding) => { setLayoutPaddingRaw(v); writeStorage('layoutPadding', v); }, []);
  const setMouseGlow = useCallback((v: boolean) => { setMouseGlowRaw(v); writeStorage('mouseGlow', v); }, []);
  const setParticles = useCallback((v: boolean) => { setParticlesRaw(v); writeStorage('particles', v); }, []);
  const setAudioFeedback = useCallback((v: boolean) => { setAudioFeedbackRaw(v); writeStorage('audioFeedback', v); }, []);

  // Apply visual classes and CSS variables to the document element
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Theme class
    root.classList.remove('theme-liquid-glass', 'theme-cyber-obsidian', 'theme-cyberpunk', 'theme-retro-hologram', 'theme-minimal-slate');
    root.classList.add(`theme-${themeStyle}`);

    // Layout class
    root.classList.remove('layout-compact', 'layout-cozy', 'layout-cinematic');
    root.classList.add(`layout-${layoutPadding}`);

    // Mouse glow class
    if (mouseGlow) {
      root.classList.add('mouse-glow-active');
    } else {
      root.classList.remove('mouse-glow-active');
    }

    // Accent color CSS variables
    root.style.setProperty('--accent-color', accentColor);
    root.style.setProperty('--accent-rgb', hexToRgb(accentColor));

    const secColor = getSecondaryColor(accentColor);
    root.style.setProperty('--accent-secondary', secColor);
    root.style.setProperty('--accent-secondary-rgb', hexToRgb(secColor));

    // Tailwind HSL custom properties
    const primaryHsl = hexToHsl(accentColor);
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--ring', primaryHsl);
  }, [themeStyle, accentColor, layoutPadding, mouseGlow]);

  // Audio feedback: synthesized glass click on button/link clicks
  useEffect(() => {
    if (!audioFeedback || typeof window === 'undefined') return;

    const playGlassClick = () => {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch { /* ignore */ }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.getAttribute('role') === 'button') {
        playGlassClick();
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [audioFeedback]);

  // Mouse glow: track cursor position for glass spotlight effect
  useEffect(() => {
    if (!mouseGlow || typeof window === 'undefined') return;

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseGlow]);

  return (
    <AppearanceContext.Provider
      value={{
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
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
}
