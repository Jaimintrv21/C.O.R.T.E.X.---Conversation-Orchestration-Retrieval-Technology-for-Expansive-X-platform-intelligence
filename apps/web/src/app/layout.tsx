import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppearanceProvider } from "@/hooks/useAppearance";

export const metadata: Metadata = {
  title: "C.O.R.T.E.X. — AI Conversation Intelligence Platform",
  description: "Import, search, analyze, and generate knowledge from all your AI conversations. Your data. Your control.",
};

// Helper color parsers
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

function parseCookie(val: string | undefined, fallback: any) {
  if (!val) return fallback;
  try {
    return JSON.parse(decodeURIComponent(val));
  } catch {
    return val;
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read cookies server-side to set initial classes/variables and avoid FOUC / hydration mismatches
  const cookieStore = cookies();
  const themeStyle = parseCookie(cookieStore.get("appearance_themeStyle")?.value, "liquid-glass");
  const accentColor = parseCookie(cookieStore.get("appearance_accentColor")?.value, "#6C63FF");
  const layoutPadding = parseCookie(cookieStore.get("appearance_layoutPadding")?.value, "cozy");
  const mouseGlow = parseCookie(cookieStore.get("appearance_mouseGlow")?.value, true);

  const htmlClass = `dark theme-${themeStyle} layout-${layoutPadding} ${mouseGlow ? 'mouse-glow-active' : ''}`;

  const primaryHsl = hexToHsl(accentColor);
  const secColor = getSecondaryColor(accentColor);

  const styleObj = {
    '--accent-color': accentColor,
    '--accent-rgb': hexToRgb(accentColor),
    '--accent-secondary': secColor,
    '--accent-secondary-rgb': hexToRgb(secColor),
    '--primary': primaryHsl,
    '--ring': primaryHsl,
  } as React.CSSProperties;

  return (
    <html lang="en" className={htmlClass} style={styleObj} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <AppearanceProvider>
          {children}
        </AppearanceProvider>
      </body>
    </html>
  );
}
