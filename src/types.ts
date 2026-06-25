export type NodeType = 'text';

export interface OSINTNode {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  notes?: string;
  
  // Custom Typography & Styles (Requested)
  fontFamily?: 'sans' | 'serif' | 'mono' | 'cursive';
  fontSize?: number; // e.g. 12, 14, 16, 18, 24, 32
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  textColor?: string; // Hex color or simple tailwind classes
  bgColor?: string; // Hex color or clean card background
  borderColor?: string;
  isBoxed?: boolean; // True: square border card, False: pure text overlay (Requested)
  scale?: number;
  manuallyResized?: boolean;
  osintData?: {
    type: string;
    subtype: string;
    target: string;
    toolName: string;
    durationMs?: number;
    status: 'searching' | 'success' | 'failed';
    result?: null | any;
    error?: string;
  };
  osintCollapsed?: boolean;
  mapData?: {
    latitude: number;
    longitude: number;
    address: string;
    notes?: string;
  };
}

export interface OSINTEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  
  // Custom Connection Link Types (Requested)
  lineType?: 'straight' | 'curved' | 'dashed' | 'dotted';
  color?: string;

  // Anchors and Control points for connection lines (requested)
  fromSide?: 'top' | 'bottom' | 'left' | 'right';
  toSide?: 'top' | 'bottom' | 'left' | 'right';
  controlPoint?: { x: number; y: number };
}

export interface BoardStroke {
  id: string;
  points: { x: number; y: number }[]; // Path coordinates relative to (x, y) anchor
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  width_stroke: number; // drawn line thickness
}

export interface BoardComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  x?: number;
  y?: number;
}

export interface PeerCursor {
  name: string;
  color: string;
  x: number;
  y: number;
  lastActive: number;
  avatarUrl?: string;
  avatarColor?: string;
}

export type ThemeType = string;

export interface ThemeColors {
  name?: string;
  bg: string;
  grid: string;
  cardBg: string;
  cardBorder: string;
  cardBorderActive: string;
  textColor: string;
  textSecondary: string;
  sidebarBg: string;
  headerBg?: string;
  accent: string;
  accentHover: string;
  scrollbarBg: string;
}

export const THEMES: Record<string, ThemeColors> = {
  dark: {
    name: 'Черная тема',
    bg: 'bg-zinc-950',
    grid: 'rgba(255, 255, 255, 0.04)',
    cardBg: 'bg-zinc-900/90',
    cardBorder: 'border-zinc-800',
    cardBorderActive: 'border-zinc-200',
    textColor: 'text-zinc-100',
    textSecondary: 'text-zinc-500',
    sidebarBg: 'bg-zinc-950',
    headerBg: 'bg-zinc-950',
    accent: 'bg-zinc-300',
    accentHover: 'hover:bg-zinc-100',
    scrollbarBg: 'scrollbar-thumb-zinc-900',
  },
  light: {
    name: 'Белая тема',
    bg: 'bg-[#fcfdfd]',
    grid: 'rgba(0, 0, 0, 0.03)',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardBorderActive: 'border-slate-800',
    textColor: 'text-slate-900',
    textSecondary: 'text-slate-400',
    sidebarBg: 'bg-slate-50',
    headerBg: 'bg-slate-50',
    accent: 'bg-slate-900',
    accentHover: 'hover:bg-slate-800',
    scrollbarBg: 'scrollbar-thumb-slate-200',
  }
};

export const isStyleColor = (str: string | undefined): boolean => {
  if (!str) return false;
  const s = str.trim();
  return s.startsWith('#') || s.startsWith('rgb') || s.startsWith('hsl') || s === 'transparent';
};
