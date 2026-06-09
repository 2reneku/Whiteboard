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

export type ThemeType = 'dark' | 'light' | 'solarized' | 'matrix' | 'slate';

export interface ThemeColors {
  bg: string;
  grid: string;
  cardBg: string;
  cardBorder: string;
  cardBorderActive: string;
  textColor: string;
  textSecondary: string;
  sidebarBg: string;
  accent: string;
  accentHover: string;
  scrollbarBg: string;
}

export const THEMES: Record<ThemeType, ThemeColors> = {
  dark: {
    bg: 'bg-zinc-950',
    grid: 'rgba(255, 255, 255, 0.04)',
    cardBg: 'bg-zinc-900/90',
    cardBorder: 'border-zinc-800',
    cardBorderActive: 'border-zinc-200',
    textColor: 'text-zinc-100',
    textSecondary: 'text-zinc-500',
    sidebarBg: 'bg-zinc-950',
    accent: 'bg-zinc-300',
    accentHover: 'hover:bg-zinc-100',
    scrollbarBg: 'scrollbar-thumb-zinc-900',
  },
  light: {
    bg: 'bg-[#fcfdfd]',
    grid: 'rgba(0, 0, 0, 0.03)',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardBorderActive: 'border-slate-800',
    textColor: 'text-slate-900',
    textSecondary: 'text-slate-400',
    sidebarBg: 'bg-slate-50',
    accent: 'bg-slate-905',
    accentHover: 'hover:bg-slate-800',
    scrollbarBg: 'scrollbar-thumb-slate-200',
  },
  solarized: {
    bg: 'bg-[#002b36]',
    grid: 'rgba(147, 161, 161, 0.04)',
    cardBg: 'bg-[#073642]/95',
    cardBorder: 'border-[#586e75]',
    cardBorderActive: 'border-[#268bd2]',
    textColor: 'text-[#93a1a1]',
    textSecondary: 'text-[#586e75]',
    sidebarBg: 'bg-[#00212b]',
    accent: 'bg-[#2aa198]',
    accentHover: 'hover:bg-[#208880]',
    scrollbarBg: 'scrollbar-thumb-[#073642]',
  },
  matrix: {
    bg: 'bg-black',
    grid: 'rgba(0, 255, 0, 0.05)',
    cardBg: 'bg-black border border-green-950',
    cardBorder: 'border-green-950/80',
    cardBorderActive: 'border-green-400',
    textColor: 'text-green-400 font-mono',
    textSecondary: 'text-green-700 font-mono',
    sidebarBg: 'bg-black border-r border-green-950',
    accent: 'bg-green-950 border border-green-500',
    accentHover: 'hover:bg-green-900',
    scrollbarBg: 'scrollbar-thumb-green-950',
  },
  slate: {
    bg: 'bg-[#1e293b]',
    grid: 'rgba(255, 255, 255, 0.03)',
    cardBg: 'bg-[#0f172a]/95',
    cardBorder: 'border-slate-700',
    cardBorderActive: 'border-indigo-400',
    textColor: 'text-slate-100',
    textSecondary: 'text-slate-500',
    sidebarBg: 'bg-[#0f172a]',
    accent: 'bg-indigo-600',
    accentHover: 'hover:bg-indigo-500',
    scrollbarBg: 'scrollbar-thumb-slate-800',
  }
};
