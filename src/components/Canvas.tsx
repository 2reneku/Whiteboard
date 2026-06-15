import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { OSINTNode, OSINTEdge, PeerCursor, ThemeColors, BoardStroke, BoardComment } from '../types';
import { Link2, Trash2, Plus, Sparkles, Edit2, Layout, RotateCw } from 'lucide-react';
import MapCardNode from './MapCardNode';

export const getEdgeBorderPoints = (edge: OSINTEdge, from: OSINTNode, to: OSINTNode) => {
  const getSidePoint = (node: OSINTNode, side: string) => {
    switch (side) {
      case 'top': return { x: node.x + node.width / 2, y: node.y };
      case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
      case 'left': return { x: node.x, y: node.y + node.height / 2 };
      case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
      default: return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    }
  };

  let fromBorder = { x: 0, y: 0 };
  let toBorder = { x: 0, y: 0 };
  let fromSide: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  let toSide: 'top' | 'bottom' | 'left' | 'right' = 'top';

  if (edge.fromSide) {
    fromBorder = getSidePoint(from, edge.fromSide);
    fromSide = edge.fromSide;
  } else {
    const fromPoints = [
      { side: 'top' as const, x: from.x + from.width / 2, y: from.y },
      { side: 'bottom' as const, x: from.x + from.width / 2, y: from.y + from.height },
      { side: 'left' as const, x: from.x, y: from.y + from.height / 2 },
      { side: 'right' as const, x: from.x + from.width, y: from.y + from.height / 2 },
    ];
    const toPoints = [
      { side: 'top' as const, x: to.x + to.width / 2, y: to.y },
      { side: 'bottom' as const, x: to.x + to.width / 2, y: to.y + to.height },
      { side: 'left' as const, x: to.x, y: to.y + to.height / 2 },
      { side: 'right' as const, x: to.x + to.width, y: to.y + to.height / 2 },
    ];
    let bestFrom = fromPoints[0];
    let minDist = Infinity;
    for (const fp of fromPoints) {
      for (const tp of toPoints) {
        const dx = fp.x - tp.x;
        const dy = fp.y - tp.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          bestFrom = fp;
        }
      }
    }
    fromBorder = { x: bestFrom.x, y: bestFrom.y };
    fromSide = bestFrom.side;
  }

  if (edge.toSide) {
    toBorder = getSidePoint(to, edge.toSide);
    toSide = edge.toSide;
  } else {
    const toPoints = [
      { side: 'top' as const, x: to.x + to.width / 2, y: to.y },
      { side: 'bottom' as const, x: to.x + to.width / 2, y: to.y + to.height },
      { side: 'left' as const, x: to.x, y: to.y + to.height / 2 },
      { side: 'right' as const, x: to.x + to.width, y: to.y + to.height / 2 },
    ];
    let bestTo = toPoints[0];
    let minDist = Infinity;
    for (const tp of toPoints) {
      const dx = fromBorder.x - tp.x;
      const dy = fromBorder.y - tp.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        bestTo = tp;
      }
    }
    toBorder = { x: bestTo.x, y: bestTo.y };
    toSide = bestTo.side;
  }

  return { fromBorder, toBorder, fromSide, toSide };
};

interface CanvasProps {
  nodes: OSINTNode[];
  edges: OSINTEdge[];
  strokes: BoardStroke[];
  comments: BoardComment[];
  selectedNodeIds: string[];
  selectedStrokeIds: string[];
  selectedEdgeId: string | null;
  onSelectNodes: (ids: string[]) => void;
  onSelectStrokes: (ids: string[]) => void;
  onSelectEdge: (id: string | null) => void;
  onNodeDrag: (id: string, x: number, y: number) => void;
  onNodesDrag?: (updates: { id: string; x: number; y: number }[]) => void;
  onNodeDragEnd?: () => void;
  onConnect: (
    from: string,
    to: string,
    fromSide?: 'top' | 'bottom' | 'left' | 'right',
    toSide?: 'top' | 'bottom' | 'left' | 'right'
  ) => void;
  onUpdateEdge?: (edge: OSINTEdge) => void;
  onUpdateEdgeLabel: (edgeId: string, label: string) => void;
  onAddTextNode: (
    x: number,
    y: number,
    isBoxed?: boolean,
    label?: string,
    textColor?: string,
    borderColor?: string,
    bgColor?: string,
    connectFromNodeId?: string,
    width?: number,
    height?: number,
    osintData?: OSINTNode['osintData'],
    mapData?: OSINTNode['mapData']
  ) => void;
  onUpdateNode: (node: OSINTNode) => void;
  peerCursors: PeerCursor[];
  themeColors: ThemeColors;
  activeTool: 'select' | 'connect' | 'text' | 'hand' | 'pencil' | 'map';
  zoom: number;
  setZoom: (z: number) => void;
  pan: { x: number; y: number };
  setPan: (p: { x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onAddStroke: (stroke: BoardStroke) => void;
  strokeColor: string;
  onRunVerification?: (node: OSINTNode) => void;
  onRunOSINTLookup?: (nodeId: string, type: string, subtype: string) => void;
  editingNodeId: string | null;
  onSetEditingNodeId: (id: string | null) => void;
  onChangeActiveTool?: (tool: 'select' | 'connect' | 'text' | 'hand' | 'pencil' | 'map') => void;
  selectedCommentId?: string | null;
  onSelectComment?: (id: string | null) => void;
  onDeleteComment?: (id: string) => void;
}

export default function Canvas({
  nodes,
  edges,
  strokes = [],
  comments = [],
  selectedNodeIds = [],
  selectedStrokeIds = [],
  selectedEdgeId,
  onSelectNodes,
  onSelectStrokes,
  onSelectEdge,
  onNodeDrag,
  onNodesDrag,
  onNodeDragEnd,
  onConnect,
  onUpdateEdge,
  onUpdateEdgeLabel,
  onAddTextNode,
  onUpdateNode,
  peerCursors,
  themeColors,
  activeTool,
  zoom,
  setZoom,
  pan,
  setPan,
  onDeleteNode,
  onAddStroke,
  strokeColor,
  onRunVerification,
  onRunOSINTLookup,
  editingNodeId,
  onSetEditingNodeId,
  onChangeActiveTool,
  selectedCommentId = null,
  onSelectComment,
  onDeleteComment,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [resizingNode, setResizingNode] = useState<{
    id: string;
    corner: 'nw' | 'ne' | 'se' | 'sw';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startNodeX: number;
    startNodeY: number;
    startScale: number;
  } | null>(null);
  const [draggedStrokeId, setDraggedStrokeId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Connect links source tracker of form { nodeId, side }
  const [nodeConnectorSource, setNodeConnectorSource] = useState<{ nodeId: string; side: 'top' | 'bottom' | 'left' | 'right' } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Figma style Smart Alignment Guides Interface & State
  interface AlignmentGuide {
    type: 'h' | 'v';
    coord: number;
  }
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  // Dragging control points and initial nodes/strokes state references
  const [draggedEdgeControlId, setDraggedEdgeControlId] = useState<string | null>(null);
  const [draggedEdgeEndpoint, setDraggedEdgeEndpoint] = useState<{
    edgeId: string;
    end: 'from' | 'to';
  } | null>(null);
  const [activeColorDropdown, setActiveColorDropdown] = useState<'text' | 'bg' | null>(null);
  const dragStartMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialNodesRef = useRef<{ id: string; x: number; y: number }[]>([]);
  const initialStrokesRef = useRef<{ id: string; x: number; y: number }[]>([]);

  // Double click line editing
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [edgeLabelText, setEdgeLabelText] = useState('');
  const [edgeInputPos, setEdgeInputPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Direct edit note name toggle
  const setEditingNodeId = onSetEditingNodeId;
  // Core state storage for menus with custom logging intercepts
  const [nodeContextMenuState, setNodeContextMenuState] = useState<{ id: string; x: number; y: number } | null>(null);
  const setNodeContextMenu = (value: { id: string; x: number; y: number } | null | ((prev: { id: string; x: number; y: number } | null) => { id: string; x: number; y: number } | null)) => {
    const stack = new Error().stack;
    const resolvedValue = typeof value === 'function' ? (value as any)(nodeContextMenuState) : value;
    if (resolvedValue) {
      console.log(
        `%c🟢 [OSINT_DEBUG] OPENING nodeContextMenu for Node ID: "${resolvedValue.id}" at x: ${resolvedValue.x}, y: ${resolvedValue.y}`,
        "color: #34d399; font-weight: bold; background-color: rgba(52, 211, 153, 0.15); padding: 4px; border-radius: 4px;"
      );
      console.log("[OSINT_DEBUG] Open triggering stack trace:\n", stack);
    } else {
      if (nodeContextMenuState) {
        console.warn(
          `%c🔴 [OSINT_DEBUG] CLOSING nodeContextMenu for Node ID: "${nodeContextMenuState.id}" (Причина закрытия и стек вызовов ниже)`,
          "color: #f87171; font-weight: bold; background-color: rgba(248, 113, 113, 0.15); padding: 4px; border-radius: 4px;"
        );
        console.warn("[OSINT_DEBUG] Close triggering stack trace (Стек вызовов закрытия):\n", stack);
      }
    }
    setNodeContextMenuState(resolvedValue);
  };
  const nodeContextMenu = nodeContextMenuState;

  // Track rendering counts to see if the graph fully re-renders
  const canvasRenderCount = useRef(0);
  canvasRenderCount.current += 1;
  console.log(`%c🔄 [OSINT_DEBUG] Canvas Component Render Count (Признак перерисовки графа): ${canvasRenderCount.current}`, "color: #a78bfa; font-weight: bold;");

  // Track window/document global errors to see if there are any exceptions
  useEffect(() => {
    const handleGlobalError = (e: ErrorEvent) => {
      console.error("%c🛑 [OSINT_DEBUG] Unhandled Browser Runtime Error Captured:", "color: #ef4444; font-weight: bold;", e.message, e.error);
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  // Track focus/blur events globally to help identify if an onBlur triggered closure
  useEffect(() => {
    const handleGlobalBlur = (e: FocusEvent) => {
      console.log(
        `%c🔌 [OSINT_DEBUG] Focus Event Blur (onBlur) triggered style/input changes!`,
        "color: #fb7185; font-size: 11px;",
        {
          blurredElement: e.target,
          relatedTarget: e.relatedTarget
        }
      );
    };
    window.addEventListener('blur', handleGlobalBlur, true);
    return () => window.removeEventListener('blur', handleGlobalBlur, true);
  }, []);

  // Auto-edit newly created nodes
  const prevNodesLength = useRef(nodes.length);
  useEffect(() => {
    if (nodes.length > prevNodesLength.current) {
      const newlyCreated = nodes.find(
        (n) => selectedNodeIds.includes(n.id) && (n.label === 'Введите текст...' || n.label === 'Заметка...')
      );
      if (newlyCreated) {
        setEditingNodeId(newlyCreated.id);
      }
    }
    prevNodesLength.current = nodes.length;
  }, [nodes, selectedNodeIds]);

  // Freehand drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<{ x: number; y: number }[]>([]);

  // Selection marquee box
  const [isSelectingMarquee, setIsSelectingMarquee] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Text selection formatting coordinates
  const [selectionRange, setSelectionRange] = useState<{ x: number; y: number; text: string } | null>(null);

  // Canvas context menu options
  const [canvasContextMenuState, setCanvasContextMenuState] = useState<{ x: number; y: number } | null>(null);
  const setCanvasContextMenu = (value: { x: number; y: number } | null | ((prev: { x: number; y: number } | null) => { x: number; y: number } | null)) => {
    const stack = new Error().stack;
    const resolvedValue = typeof value === 'function' ? (value as any)(canvasContextMenuState) : value;
    if (resolvedValue) {
      console.log(
        `%c🟢 [OSINT_DEBUG] OPENING canvasContextMenu at x: ${resolvedValue.x}, y: ${resolvedValue.y}`,
        "color: #38bdf8; font-weight: bold; background-color: rgba(56, 189, 248, 0.15); padding: 4px; border-radius: 4px;"
      );
      console.log("[OSINT_DEBUG] Open triggering stack trace:\n", stack);
    } else {
      if (canvasContextMenuState) {
        console.warn(
          `%c🔴 [OSINT_DEBUG] CLOSING canvasContextMenu (Причина закрытия и стек вызовов ниже)`,
          "color: #f87171; font-weight: bold; background-color: rgba(248, 113, 113, 0.15); padding: 4px; border-radius: 4px;"
        );
        console.warn("[OSINT_DEBUG] Close triggering stack trace (Стек вызовов закрытия):\n", stack);
      }
    }
    setCanvasContextMenuState(resolvedValue);
  };
  const canvasContextMenu = canvasContextMenuState;

  // Intercept window and document clicks to identify click outsides
  useEffect(() => {
    const closeMenus = (e: MouseEvent) => {
      const targetElement = e.target as HTMLElement;
      // Close on ANY click outside the context menu wrapper (regardless of mouse button)
      if (!targetElement.closest('.context-menu-wrapper')) {
        setCanvasContextMenu(null);
        setNodeContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCanvasContextMenu(null);
        setNodeContextMenu(null);
        setEditingNodeId(null);
      }
    };

    window.addEventListener('mousedown', closeMenus);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', closeMenus);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-lock missing fromSide/toSide on legacy edges
  useEffect(() => {
    if (!onUpdateEdge) return;
    const missingKeys = edges.filter(e => !e.fromSide || !e.toSide);
    if (missingKeys.length > 0) {
      missingKeys.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
          const fromPoints = [
            { side: 'top' as const, x: fromNode.x + fromNode.width / 2, y: fromNode.y },
            { side: 'bottom' as const, x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height },
            { side: 'left' as const, x: fromNode.x, y: fromNode.y + fromNode.height / 2 },
            { side: 'right' as const, x: fromNode.x + fromNode.width, y: fromNode.y + fromNode.height / 2 },
          ];
          const toPoints = [
            { side: 'top' as const, x: toNode.x + toNode.width / 2, y: toNode.y },
            { side: 'bottom' as const, x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height },
            { side: 'left' as const, x: toNode.x, y: toNode.y + toNode.height / 2 },
            { side: 'right' as const, x: toNode.x + toNode.width, y: toNode.y + toNode.height / 2 },
          ];
          let bestFrom: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
          let bestTo: 'top' | 'bottom' | 'left' | 'right' = 'top';
          let minDist = Infinity;
          for (const fp of fromPoints) {
            for (const tp of toPoints) {
              const dx = fp.x - tp.x;
              const dy = fp.y - tp.y;
              const d = dx * dx + dy * dy;
              if (d < minDist) {
                minDist = d;
                bestFrom = fp.side;
                bestTo = tp.side;
              }
            }
          }
          onUpdateEdge({
            ...edge,
            fromSide: edge.fromSide || bestFrom,
            toSide: edge.toSide || bestTo,
          });
        }
      });
    }
  }, [edges, nodes, onUpdateEdge]);

  // Monitor text selections in document for floating bubble styling
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelectionRange(null);
        return;
      }

      const text = sel.toString().trim();
      if (!text) {
        setSelectionRange(null);
        return;
      }

      // Ensure highlight is inside one of active contentEditables
      let node = sel.anchorNode;
      let insideEditable = false;
      while (node) {
        if (node instanceof HTMLElement && node.getAttribute('contenteditable') === 'true') {
          insideEditable = true;
          break;
        }
        node = node.parentNode;
      }

      if (!insideEditable) {
        setSelectionRange(null);
        return;
      }

      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (rect && containerRect) {
          setSelectionRange({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 48,
            text,
          });
        }
      } catch (err) {
        setSelectionRange(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Convert screen coordinates to canvas space coordinates
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const getTypographyStyle = (node: OSINTNode, scale: number = 1) => {
    const style: React.CSSProperties = {};
    
    // Font family mapping
    if (node.fontFamily === 'serif') {
      style.fontFamily = 'Georgia, serif';
    } else if (node.fontFamily === 'mono') {
      style.fontFamily = '"JetBrains Mono", Courier, monospace';
    } else if (node.fontFamily === 'cursive') {
      style.fontFamily = '"Comic Sans MS", cursive, sans-serif';
    } else {
      style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';
    }

    // Font size
    const baseSize = node.fontSize || 14;
    style.fontSize = `${baseSize * scale}px`;

    // Decorators
    style.fontWeight = node.bold ? '700' : '400';
    style.fontStyle = node.italic ? 'italic' : 'normal';
    style.textDecoration = node.strikethrough ? 'line-through' : 'none';

    // Colors mapping (only apply backgrounds if card is boxed!)
    if (node.textColor) style.color = node.textColor;
    
    if (node.isBoxed !== false) {
      if (node.bgColor) style.backgroundColor = node.bgColor;
      if (node.borderColor) style.borderColor = node.borderColor;
    } else {
      style.backgroundColor = 'transparent';
      style.borderColor = 'transparent';
    }

    return style;
  };

  // Convert points to SVG stroke path
  const getSvgPathFromPoints = (points: { x: number; y: number }[], offsetX = 0, offsetY = 0) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x + offsetX} ${points[0].y + offsetY} L ${points[0].x + offsetX} ${points[0].y + offsetY}`;
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x + offsetX} ${p.y + offsetY}`;
      return `${acc} L ${p.x + offsetX} ${p.y + offsetY}`;
    }, '');
  };

  // Calculate borders intersections for custom nodes
  const getIntersectionPoint = (
    fromX: number,
    fromY: number,
    fromW: number,
    fromH: number,
    toX: number,
    toY: number,
    toW: number,
    toH: number
  ) => {
    const cx1 = fromX + fromW / 2;
    const cy1 = fromY + fromH / 2;
    const cx2 = toX + toW / 2;
    const cy2 = toY + toH / 2;

    const dx = cx2 - cx1;
    const dy = cy2 - cy1;

    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) {
      return { x: cx2, y: cy2 };
    }

    // Bounding box of destination rectangle
    const padding = 1; // tight precision
    const left = toX - padding;
    const right = toX + toW + padding;
    const top = toY - padding;
    const bottom = toY + toH + padding;

    let tCandidates: number[] = [];

    if (Math.abs(dx) > 1e-4) {
      const tLeft = (cx2 - left) / dx;
      if (tLeft >= 0 && tLeft <= 1) {
        const y = cy2 - tLeft * dy;
        if (y >= top && y <= bottom) tCandidates.push(tLeft);
      }
      const tRight = (cx2 - right) / dx;
      if (tRight >= 0 && tRight <= 1) {
        const y = cy2 - tRight * dy;
        if (y >= top && y <= bottom) tCandidates.push(tRight);
      }
    }

    if (Math.abs(dy) > 1e-4) {
      const tTop = (cy2 - top) / dy;
      if (tTop >= 0 && tTop <= 1) {
        const x = cx2 - tTop * dx;
        if (x >= left && x <= right) tCandidates.push(tTop);
      }
      const tBottom = (cy2 - bottom) / dy;
      if (tBottom >= 0 && tBottom <= 1) {
        const x = cx2 - tBottom * dx;
        if (x >= left && x <= right) tCandidates.push(tBottom);
      }
    }

    if (tCandidates.length > 0) {
      const tMin = Math.min(...tCandidates);
      return {
        x: cx2 - tMin * dx,
        y: cy2 - tMin * dy,
      };
    }

    return { x: cx2, y: cy2 };
  };

  // ──────────────────────────────────────────────────────── SMART ALIGNMENT SNAPPERS (Figma/Miro style)
  const getAlignmentAndSnap = (
    activeId: string,
    dx: number,
    dy: number
  ): { snappedDX: number; snappedDY: number; guides: AlignmentGuide[] } => {
    const activeInitial = initialNodesRef.current.find(n => n.id === activeId);
    if (!activeInitial) return { snappedDX: dx, snappedDY: dy, guides: [] };

    const w = activeInitial.width;
    const h = activeInitial.height;
    
    // TENTATIVE positions before snapping
    let tentativeX = activeInitial.x + dx;
    let tentativeY = activeInitial.y + dy;

    const snapThreshold = 8; // Snap threshold in canvas pixels
    let bestDeltaX = 0;
    let bestDeltaY = 0;
    let minSnapDistanceX = Infinity;
    let minSnapDistanceY = Infinity;

    const guides: AlignmentGuide[] = [];

    // Filter relevant comparative nodes (ignore active and other currently selected nodes)
    const otherNodes = nodes.filter(n => n.id !== activeId && !selectedNodeIds.includes(n.id));

    // 1. HORIZONTAL SNAPPING / VERTICAL GUIDES
    otherNodes.forEach(other => {
      const otherL = other.x;
      const otherCX = other.x + other.width / 2;
      const otherR = other.x + other.width;

      const activeL = tentativeX;
      const activeCX = tentativeX + w / 2;
      const activeR = tentativeX + w;

      const xMatches = [
        { activeVal: activeL, otherVal: otherL, delta: otherL - activeL },
        { activeVal: activeCX, otherVal: otherCX, delta: otherCX - activeCX },
        { activeVal: activeR, otherVal: otherR, delta: otherR - activeR },
        { activeVal: activeL, otherVal: otherR, delta: otherR - activeL },
        { activeVal: activeR, otherVal: otherL, delta: otherL - activeR },
      ];

      xMatches.forEach(m => {
        const dist = Math.abs(m.delta);
        if (dist <= snapThreshold && dist < minSnapDistanceX) {
          minSnapDistanceX = dist;
          bestDeltaX = m.delta;
        }
      });
    });

    if (minSnapDistanceX !== Infinity) {
      tentativeX += bestDeltaX;
    }

    // 2. VERTICAL SNAPPING / HORIZONTAL GUIDES
    otherNodes.forEach(other => {
      const otherT = other.y;
      const otherCY = other.y + other.height / 2;
      const otherB = other.y + other.height;

      const activeT = tentativeY;
      const activeCY = tentativeY + h / 2;
      const activeB = tentativeY + h;

      const yMatches = [
        { activeVal: activeT, otherVal: otherT, delta: otherT - activeT },
        { activeVal: activeCY, otherVal: otherCY, delta: otherCY - activeCY },
        { activeVal: activeB, otherVal: otherB, delta: otherB - activeB },
        { activeVal: activeT, otherVal: otherB, delta: otherB - activeT },
        { activeVal: activeB, otherVal: otherT, delta: otherT - activeB },
      ];

      yMatches.forEach(m => {
        const dist = Math.abs(m.delta);
        if (dist <= snapThreshold && dist < minSnapDistanceY) {
          minSnapDistanceY = dist;
          bestDeltaY = m.delta;
        }
      });
    });

    if (minSnapDistanceY !== Infinity) {
      tentativeY += bestDeltaY;
    }

    // 3. GENERATION OF ALIGNED GUIDES BASED ON FINAL SNAPPED VALUE
    const matchedCoordsX = new Set<number>();
    const matchedCoordsY = new Set<number>();

    otherNodes.forEach(other => {
      const otherL = other.x;
      const otherCX = other.x + other.width / 2;
      const otherR = other.x + other.width;

      const activeL = tentativeX;
      const activeCX = tentativeX + w / 2;
      const activeR = tentativeX + w;

      const otherT = other.y;
      const otherCY = other.y + other.height / 2;
      const otherB = other.y + other.height;

      const activeT = tentativeY;
      const activeCY = tentativeY + h / 2;
      const activeB = tentativeY + h;

      if (Math.abs(activeL - otherL) < 1.1) matchedCoordsX.add(otherL);
      if (Math.abs(activeCX - otherCX) < 1.1) matchedCoordsX.add(otherCX);
      if (Math.abs(activeR - otherR) < 1.1) matchedCoordsX.add(otherR);
      if (Math.abs(activeL - otherR) < 1.1) matchedCoordsX.add(otherR);
      if (Math.abs(activeR - otherL) < 1.1) matchedCoordsX.add(otherL);

      if (Math.abs(activeT - otherT) < 1.1) matchedCoordsY.add(otherT);
      if (Math.abs(activeCY - otherCY) < 1.1) matchedCoordsY.add(otherCY);
      if (Math.abs(activeB - otherB) < 1.1) matchedCoordsY.add(otherB);
      if (Math.abs(activeT - otherB) < 1.1) matchedCoordsY.add(otherB);
      if (Math.abs(activeB - otherT) < 1.1) matchedCoordsY.add(otherT);
    });

    matchedCoordsX.forEach(coord => guides.push({ type: 'v', coord }));
    matchedCoordsY.forEach(coord => guides.push({ type: 'h', coord }));

    return {
      snappedDX: tentativeX - activeInitial.x,
      snappedDY: tentativeY - activeInitial.y,
      guides
    };
  };

  // ──────────────────────────────────────────────────────── MOUSE CORE EVENT HANDLERS
  const handleMouseDown = (e: ReactMouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (activeTool === 'pencil') {
      setIsDrawing(true);
      setCurrentStrokePoints([{ x: coords.x, y: coords.y }]);
      e.stopPropagation();
      return;
    }

    if (activeTool === 'text') {
      e.stopPropagation();
      onAddTextNode(coords.x - 70, coords.y - 20, false); // Create plain text node at point!
      if (onChangeActiveTool) {
        onChangeActiveTool('select');
      }
      return;
    }

    if (activeTool === 'map') {
      e.stopPropagation();
      onAddTextNode(
        coords.x - 175,
        coords.y - 120,
        true,
        '📍 Карта загружается...',
        '#ffffff',
        '#ef4444',
        'rgba(24, 24, 27, 0.95)',
        undefined,
        350,
        240,
        undefined,
        {
          latitude: 37.7456585,
          longitude: 29.0949765,
          address: '14 Mevlana Caddesi, Denizli, Turkey',
          notes: ''
        }
      );
      if (onChangeActiveTool) {
        onChangeActiveTool('select');
      }
      return;
    }

    if (activeTool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.stopPropagation();
      return;
    }

    if (e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.stopPropagation();
      return;
    }

    if (e.button === 2) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setCanvasContextMenu({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
      return;
    }

    if (e.button !== 0) return;

    // Deselect if we click on background elements
    const target = e.target as HTMLElement;
    if (target.closest('.node-card') || target.closest('.no-deselect') || target.closest('.comment-card') || target.closest('path')) return;

    onSelectNodes([]);
    onSelectStrokes([]);
    onSelectEdge(null);
    if (onSelectComment) onSelectComment(null);

    if (activeTool === 'select') {
      setIsSelectingMarquee(true);
      setMarqueeStart(coords);
      setMarqueeEnd(coords);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (draggedNodeId || draggedStrokeId || resizingNode || isPanning) {
      const activeEl = document.activeElement as HTMLElement;
      const isEditingActiveNode = activeEl && activeEl.id === `editable-${draggedNodeId}`;
      if (!isEditingActiveNode) {
        e.preventDefault();
        if (activeEl && activeEl.blur) {
          activeEl.blur();
        }
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
      }
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);
    setMousePos(coords);

    if (isDrawing && activeTool === 'pencil') {
      setCurrentStrokePoints((prev) => [...prev, { x: coords.x, y: coords.y }]);
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (isSelectingMarquee) {
      setMarqueeEnd(coords);

      const minX = Math.min(marqueeStart.x, coords.x);
      const minY = Math.min(marqueeStart.y, coords.y);
      const maxX = Math.max(marqueeStart.x, coords.x);
      const maxY = Math.max(marqueeStart.y, coords.y);

      // Identify selected nodes inside the bounds
      const matchedNodeIds = nodes.filter((n) => {
        const nx1 = n.x;
        const ny1 = n.y;
        const nx2 = n.x + n.width;
        const ny2 = n.y + n.height;
        return !(nx1 > maxX || nx2 < minX || ny1 > maxY || ny2 < minY);
      }).map((n) => n.id);

      // Identify strokes inside bounds
      const matchedStrokeIds = strokes.filter((s) => {
        const sx1 = s.x;
        const sy1 = s.y;
        const sx2 = s.x + s.width;
        const sy2 = s.y + s.height;
        return !(sx1 > maxX || sx2 < minX || sy1 > maxY || sy2 < minY);
      }).map((s) => s.id);

      onSelectNodes(matchedNodeIds);
      onSelectStrokes(matchedStrokeIds);
      return;
    }

    if (resizingNode) {
      const dx = (e.clientX - resizingNode.startX) / zoom;
      const dy = (e.clientY - resizingNode.startY) / zoom;
      const node = nodes.find((n) => n.id === resizingNode.id);
      if (node) {
        let newWidth = resizingNode.startWidth;
        let newHeight = resizingNode.startHeight;
        let newX = resizingNode.startNodeX;
        let newY = resizingNode.startNodeY;

        if (resizingNode.corner === 'se') {
          newWidth = Math.max(50, resizingNode.startWidth + dx);
          const scaleFactor = newWidth / resizingNode.startWidth;
          newHeight = resizingNode.startHeight * scaleFactor;
        } else if (resizingNode.corner === 'sw') {
          newWidth = Math.max(50, resizingNode.startWidth - dx);
          const scaleFactor = newWidth / resizingNode.startWidth;
          newHeight = resizingNode.startHeight * scaleFactor;
          if (newWidth > 50) {
            newX = resizingNode.startNodeX + (resizingNode.startWidth - newWidth);
          }
        } else if (resizingNode.corner === 'ne') {
          newWidth = Math.max(50, resizingNode.startWidth + dx);
          const scaleFactor = newWidth / resizingNode.startWidth;
          newHeight = resizingNode.startHeight * scaleFactor;
          newY = resizingNode.startNodeY + (resizingNode.startHeight - newHeight);
        } else if (resizingNode.corner === 'nw') {
          newWidth = Math.max(50, resizingNode.startWidth - dx);
          const scaleFactor = newWidth / resizingNode.startWidth;
          newHeight = resizingNode.startHeight * scaleFactor;
          if (newWidth > 50) {
            newX = resizingNode.startNodeX + (resizingNode.startWidth - newWidth);
            newY = resizingNode.startNodeY + (resizingNode.startHeight - newHeight);
          }
        }

        const scaleFactor = newWidth / resizingNode.startWidth;
        const nextScale = resizingNode.startScale * scaleFactor;

        onUpdateNode({
          ...node,
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
          scale: nextScale,
          manuallyResized: true,
        });
      }
      return;
    }

    if (draggedNodeId && e.buttons === 1) {
      const totalDX = (e.clientX - dragStartMouseRef.current.x) / zoom;
      const totalDY = (e.clientY - dragStartMouseRef.current.y) / zoom;

      // Smart Guides / Snap constraints calculation
      const { snappedDX, snappedDY, guides } = getAlignmentAndSnap(draggedNodeId, totalDX, totalDY);
      setAlignmentGuides(guides);

      if (selectedNodeIds.includes(draggedNodeId)) {
        if (onNodesDrag) {
          const updates = initialNodesRef.current
            .filter((n) => selectedNodeIds.includes(n.id))
            .map((n) => ({ id: n.id, x: n.x + snappedDX, y: n.y + snappedDY }));
          onNodesDrag(updates);
        } else {
          initialNodesRef.current.forEach((n) => {
            if (selectedNodeIds.includes(n.id)) {
              onNodeDrag(n.id, n.x + snappedDX, n.y + snappedDY);
            }
          });
        }
        // Move selected strokes using absolute offset
        initialStrokesRef.current.forEach((s) => {
          if (selectedStrokeIds.includes(s.id)) {
            const targetStroke = strokes.find((os) => os.id === s.id);
            if (targetStroke) {
              targetStroke.x = s.x + snappedDX;
              targetStroke.y = s.y + snappedDY;
            }
          }
        });
      } else {
        const initialNode = initialNodesRef.current.find((n) => n.id === draggedNodeId);
        if (initialNode) {
          onNodeDrag(draggedNodeId, initialNode.x + snappedDX, initialNode.y + snappedDY);
        }
      }
    }

    if (draggedStrokeId && e.buttons === 1) {
      const totalDX = (e.clientX - dragStartMouseRef.current.x) / zoom;
      const totalDY = (e.clientY - dragStartMouseRef.current.y) / zoom;

      if (selectedStrokeIds.includes(draggedStrokeId)) {
        initialStrokesRef.current.forEach((s) => {
          if (selectedStrokeIds.includes(s.id)) {
            const targetStroke = strokes.find((os) => os.id === s.id);
            if (targetStroke) {
              targetStroke.x = s.x + totalDX;
              targetStroke.y = s.y + totalDY;
            }
          }
        });
        initialNodesRef.current.forEach((n) => {
          if (selectedNodeIds.includes(n.id)) {
            onNodeDrag(n.id, n.x + totalDX, n.y + totalDY);
          }
        });
      } else {
        const initialStroke = initialStrokesRef.current.find((s) => s.id === draggedStrokeId);
        if (initialStroke) {
          const targetStroke = strokes.find((os) => os.id === draggedStrokeId);
          if (targetStroke) {
            targetStroke.x = initialStroke.x + totalDX;
            targetStroke.y = initialStroke.y + totalDY;
          }
        }
      }
    }
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    if (draggedEdgeEndpoint) {
      const edge = edges.find(e => e.id === draggedEdgeEndpoint.edgeId);
      if (edge && onUpdateEdge) {
        // Find nearest node and side
        let bestNode = null;
        let bestSide: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
        let minDist = Infinity;
        for (const n of nodes) {
          const sides = [
            { side: 'top' as const, x: n.x + n.width / 2, y: n.y },
            { side: 'bottom' as const, x: n.x + n.width / 2, y: n.y + n.height },
            { side: 'left' as const, x: n.x, y: n.y + n.height / 2 },
            { side: 'right' as const, x: n.x + n.width, y: n.y + n.height / 2 },
          ];
          for (const s of sides) {
            const dx = s.x - mousePos.x;
            const dy = s.y - mousePos.y;
            const d = dx * dx + dy * dy;
            if (d < minDist) {
              minDist = d;
              bestNode = n;
              bestSide = s.side;
            }
          }
        }
        if (bestNode) {
          if (draggedEdgeEndpoint.end === 'from') {
            onUpdateEdge({
              ...edge,
              from: bestNode.id,
              fromSide: bestSide,
            });
          } else {
            onUpdateEdge({
              ...edge,
              to: bestNode.id,
              toSide: bestSide,
            });
          }
        }
      }
      setDraggedEdgeEndpoint(null);
      return;
    }

    if (resizingNode) {
      setResizingNode(null);
      if (onNodeDragEnd) onNodeDragEnd();
      return;
    }

    if (isDrawing && activeTool === 'pencil') {
      setIsDrawing(false);
      if (currentStrokePoints.length > 1) {
        const xs = currentStrokePoints.map((p) => p.x);
        const ys = currentStrokePoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        const w = Math.max(5, maxX - minX);
        const h = Math.max(5, maxY - minY);

        onAddStroke({
          id: 'stroke-' + Date.now() + Math.floor(Math.random() * 100),
          points: currentStrokePoints.map((p) => ({ x: p.x - minX, y: p.y - minY })),
          x: minX,
          y: minY,
          width: w,
          height: h,
          color: strokeColor,
          width_stroke: 3.0,
        });
      }
      setCurrentStrokePoints([]);
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isSelectingMarquee) {
      setIsSelectingMarquee(false);
      return;
    }

    if (nodeConnectorSource) {
      if (hoveredNodeId && hoveredNodeId !== nodeConnectorSource.nodeId) {
        const toNode = nodes.find(n => n.id === hoveredNodeId);
        if (toNode) {
          const getClosestSide = (node: OSINTNode, pt: { x: number; y: number }) => {
            const sides: { side: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [
              { side: 'top', x: node.x + node.width / 2, y: node.y },
              { side: 'bottom', x: node.x + node.width / 2, y: node.y + node.height },
              { side: 'left', x: node.x, y: node.y + node.height / 2 },
              { side: 'right', x: node.x + node.width, y: node.y + node.height / 2 },
            ];
            let bestSide = sides[0].side;
            let minDist = Infinity;
            for (const s of sides) {
              const dx = s.x - pt.x;
              const dy = s.y - pt.y;
              const dist = dx * dx + dy * dy;
              if (dist < minDist) {
                minDist = dist;
                bestSide = s.side;
              }
            }
            return bestSide;
          };
          
          const toSide = getClosestSide(toNode, mousePos);
          onConnect(nodeConnectorSource.nodeId, hoveredNodeId, nodeConnectorSource.side, toSide);
        }
      }
      setNodeConnectorSource(null);
    }

    if (draggedNodeId || draggedStrokeId || draggedEdgeControlId) {
      if (onNodeDragEnd) onNodeDragEnd();
    }

    setAlignmentGuides([]); // Clear alignment guides on mouseUp!
    setDraggedNodeId(null);
    setDraggedStrokeId(null);
    setDraggedEdgeControlId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const zoomIntensity = 0.12;
    const factor = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
    const nextZoom = Math.max(0.1, Math.min(4, zoom * factor));

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasX = (mouseX - pan.x) / zoom;
    const canvasY = (mouseY - pan.y) / zoom;

    setPan({
      x: mouseX - canvasX * nextZoom,
      y: mouseY - canvasY * nextZoom,
    });
    setZoom(nextZoom);
  };

  const handleDoubleClick = (e: ReactMouseEvent) => {
    // Do nothing on blank bg double-click as requested
  };

  const handleNodeMouseDown = (e: ReactMouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    
    // Close context menus on drag start as requested
    setCanvasContextMenu(null);
    setNodeContextMenu(null);

    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }

    if (e.shiftKey) {
      if (selectedNodeIds.includes(id)) {
        onSelectNodes(selectedNodeIds.filter((nid) => nid !== id));
      } else {
        onSelectNodes([...selectedNodeIds, id]);
        onSelectStrokes([]);
      }
    } else {
      if (!selectedNodeIds.includes(id)) {
        onSelectNodes([id]);
        onSelectStrokes([]);
      }
    }

    onSelectEdge(null);
    setDraggedNodeId(id);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    initialNodesRef.current = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
    initialStrokesRef.current = strokes.map(s => ({ id: s.id, x: s.x, y: s.y }));
  };

  const handleStrokeMouseDown = (e: ReactMouseEvent, id: string) => {
    if (activeTool !== 'select') return;
    if (e.button !== 0) return;
    e.stopPropagation();

    if (e.shiftKey) {
      if (selectedStrokeIds.includes(id)) {
        onSelectStrokes(selectedStrokeIds.filter((sid) => sid !== id));
      } else {
        onSelectStrokes([...selectedStrokeIds, id]);
        onSelectNodes([]);
      }
    } else {
      if (!selectedStrokeIds.includes(id)) {
        onSelectStrokes([id]);
        onSelectNodes([]);
      }
    }

    onSelectEdge(null);
    setDraggedStrokeId(id);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    initialNodesRef.current = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
    initialStrokesRef.current = strokes.map(s => ({ id: s.id, x: s.x, y: s.y }));
  };

  const handleEdgeClick = (e: ReactMouseEvent, id: string) => {
    e.stopPropagation();
    onSelectEdge(id);
    onSelectNodes([]);
    onSelectStrokes([]);
  };

  const handleEdgeDoubleClick = (e: ReactMouseEvent, edge: OSINTEdge, midX: number, midY: number) => {
    e.stopPropagation();
    setEditingEdgeId(edge.id);
    setEdgeLabelText(edge.label || '');
    setEdgeInputPos({ x: midX, y: midY });
  };

  // Predefined Cascading OSINT Node templates generator
  const getOSINTTemplate = (type: string, subtype: string) => {
    let label = '';
    let isBoxed = false;
    let textColor = '#ffffff';
    let borderColor = 'rgba(63, 63, 70, 0.4)';
    let bgColor = 'rgba(9, 9, 11, 0.45)';
    const width = 160;
    const height = 55;

    // Helper to generate premium unified lookups
    const makeWidget = (title: string, badge: string, content: string, color: string) => {
      textColor = color;
      return `
<div style="font-family: var(--font-mono), monospace; font-size: 8.5px; text-align: left; width: 100%;">
  <div style="color: ${color}; font-weight: bold; margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between;">
    <span>🔍 ${title}</span>
    <span style="opacity: 0.85; font-size: 7.5px;">● ${badge}</span>
  </div>
  <div style="color: #cbd5e1; font-size: 8px; line-height: 1.25; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 2px; margin-top: 1px;">
    ${content}
  </div>
</div>
      `.trim();
    };

    if (type === 'phone') {
      borderColor = 'rgba(245, 158, 11, 0.3)';
      bgColor = 'rgba(9, 9, 11, 0.45)';
      if (subtype === 'hlr') {
        label = makeWidget('HLR STATUS', 'ACTIVE', '+79990000000 | Tele2 | MCC:250 MNC:01', '#fbbf24');
      } else if (subtype === 'leaks') {
        label = makeWidget('PHONE LEAKS', 'BREACHED', 'Found in 3 DBs | Deanon, MailRu list', '#fbbf24');
      } else {
        label = makeWidget('GEOLOCATION', 'LOCATED', 'LAC:12043 CID:5219 | Radius: 450m', '#fbbf24');
      }
    } else if (type === 'mail') {
      borderColor = 'rgba(59, 130, 246, 0.3)';
      bgColor = 'rgba(9, 9, 11, 0.45)';
      if (subtype === 'smtp') {
        label = makeWidget('SMTP STATUS', 'DELIVERABLE', 'suspect@proton.me | MX verified', '#93c5fd');
      } else if (subtype === 'leaks') {
        label = makeWidget('EMAIL LEAKS', 'COMPROMISED', 'BreachDirectories: Pwd matched', '#93c5fd');
      } else {
        label = makeWidget('EMAIL SOCIALS', 'FOUND', 'Linked: Github, Spotify, Gravatar', '#93c5fd');
      }
    } else if (type === 'nickname') {
      borderColor = 'rgba(16, 185, 129, 0.3)';
      bgColor = 'rgba(9, 9, 11, 0.45)';
      if (subtype === 'telegram') {
        label = makeWidget('TELEGRAM SCAN', 'FOUND', '@suspect_osint | ID:201948123 | G:12', '#34d399');
      } else if (subtype === 'vk') {
        label = makeWidget('VK PROFILE', 'PUBLIC', 'vk.com/id_suspect | Profile: public', '#34d399');
      } else if (subtype === 'instagram') {
        label = makeWidget('INSTAGRAM SCAN', 'ACTIVE', 'Posts: 4 geotags matched | @suspect_insta', '#34d399');
      } else {
        label = makeWidget('SOCIAL PROFILE', 'RESOLVED', 'Steam: suspect_m | Discord: suspect#9999', '#34d399');
      }
    } else if (type === 'ip') {
      borderColor = 'rgba(139, 92, 246, 0.3)';
      bgColor = 'rgba(9, 9, 11, 0.45)';
      if (subtype === 'shodan') {
        label = makeWidget('SHODAN SCAN', 'OPEN PORTS', '192.168.1.1 | SSH, Nginx | P:22,80,443', '#c084fc');
      } else if (subtype === 'nmap') {
        label = makeWidget('NMAP REPORT', 'SECURE', 'target-site.org | SSLv3 disabled', '#c084fc');
      } else {
        label = makeWidget('DOMAIN WHOIS', 'PROTECTED', 'Registrar: NameCheap | Ver: 2024-11', '#c084fc');
      }
    } else if (type === 'crypto') {
      borderColor = 'rgba(236, 72, 153, 0.3)';
      bgColor = 'rgba(9, 9, 11, 0.45)';
      if (subtype === 'btc') {
        label = makeWidget('BTC TRANSACTIONS', 'STABLE', '1A1zP1eP5Q... | Bal: 0.054 BTC', '#f472b6');
      } else if (subtype === 'tron') {
        label = makeWidget('TRON / USDT', 'COMPLETED', 'TY2uN...USD | Bal: 1,240.50 | TRC20', '#f472b6');
      } else {
        label = makeWidget('ETH CONTRACT', 'VERIFIED', '0x71C...352 | ERC20 Ledger compliant', '#f472b6');
      }
    }

    return { label, isBoxed, textColor, borderColor, bgColor, width, height };
  };

  // Spawn predefined OSINT structures from a parent node option
  const handleSpawnMenuOSINT = (type: string, subtype: string, fromNodeId?: string) => {
    if (fromNodeId && onRunOSINTLookup) {
      onRunOSINTLookup(fromNodeId, type, subtype);
      setCanvasContextMenu(null);
      setNodeContextMenu(null);
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    let spawnX = 100;
    let spawnY = 100;

    if (fromNodeId) {
      const parent = nodes.find(n => n.id === fromNodeId);
      if (parent) {
        // Place the spawned check node right to the side of the parent node with a nice spacing!
        spawnX = parent.x + parent.width + 120;
        spawnY = parent.y + (parent.height / 2) - 40;
      }
    } else if (canvasContextMenu) {
      const canvasPos = getCanvasCoords(canvasContextMenu.x + rect.left, canvasContextMenu.y + rect.top);
      spawnX = canvasPos.x;
      spawnY = canvasPos.y;
    }

    const { label, isBoxed, textColor, borderColor, bgColor, width, height } = getOSINTTemplate(type, subtype);
    
    // Create the node and auto connect it from parent!
    onAddTextNode(spawnX, spawnY, isBoxed, label, textColor, borderColor, bgColor, fromNodeId, width, height);
    
    setCanvasContextMenu(null);
    setNodeContextMenu(null);
  };

  // Get active cursor style for the whiteboard mapping depending on active tool selection
  const getToolCursorStyle = () => {
    if (draggedNodeId || draggedStrokeId || resizingNode) {
      return 'cursor-grabbing';
    }
    if (activeTool === 'pencil') {
      return 'cursor-[url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' style=\'font-size: 16px;\'><text y=\'16\'>✏️</text></svg>")]_0_16,_crosshair';
    }
    if (activeTool === 'text') {
      return 'cursor-text';
    }
    if (activeTool === 'connect') {
      return 'cursor-alias';
    }
    if (activeTool === 'hand') {
      return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    }
    return 'cursor-default';
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden select-none outline-none ${getToolCursorStyle()} ${themeColors.bg}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── DOT GRID BACKDROP */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern
            id="dot-grid"
            width={32 * zoom}
            height={32 * zoom}
            patternUnits="userSpaceOnUse"
            x={pan.x}
            y={pan.y}
          >
            <circle
              cx={1.5}
              cy={1.5}
              r={1 * Math.min(1.5, Math.max(0.6, zoom))}
              fill={themeColors.grid}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* ── ZOOMABLE CANVAS CONTAINER */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 pointer-events-none"
      >
        <svg className="absolute inset-0 w-[8000px] h-[8000px] overflow-visible pointer-events-auto">
          <defs>
            <marker
              id="arrow-classic"
              viewBox="0 0 10 10"
              refX="11"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 L 2 5 z" fill="#71717a" />
            </marker>
            <marker
              id="arrow-classic-selected"
              viewBox="0 0 10 10"
              refX="11"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 L 2 5 z" fill="#ffffff" />
            </marker>
          </defs>

          {/* Smart Aligning Figma/Photoshop Guides rendering */}
          {alignmentGuides.map((guide, idx) => {
            if (guide.type === 'v') {
              return (
                <line
                  key={`smart-guide-v-${idx}`}
                  x1={guide.coord}
                  y1={-30000}
                  x2={guide.coord}
                  y2={30000}
                  stroke="#ec4899" /* Professional vibrant pink alignment smart color */
                  strokeWidth="1.25"
                  strokeDasharray="4,4"
                  className="pointer-events-none"
                />
              );
            } else {
              return (
                <line
                  key={`smart-guide-h-${idx}`}
                  x1={-30000}
                  y1={guide.coord}
                  x2={30000}
                  y2={guide.coord}
                  stroke="#ec4899"
                  strokeWidth="1.25"
                  strokeDasharray="4,4"
                  className="pointer-events-none"
                />
              );
            }
          })}

          {/* ── PAINT WRITTEN PEN STROKES */}
          {strokes && strokes.map((stroke) => {
            const isSelected = selectedStrokeIds.includes(stroke.id);
            const pathD = getSvgPathFromPoints(stroke.points, stroke.x, stroke.y);
            
            return (
              <g key={stroke.id} className="pointer-events-auto">
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                  className="cursor-pointer"
                  onClick={(e) => {
                    if (activeTool !== 'select') return;
                    e.stopPropagation();
                    // Click selects
                    if (e.shiftKey) {
                      onSelectStrokes(
                        selectedStrokeIds.includes(stroke.id)
                          ? selectedStrokeIds.filter(id => id !== stroke.id)
                          : [...selectedStrokeIds, stroke.id]
                      );
                    } else {
                      onSelectStrokes([stroke.id]);
                      onSelectNodes([]);
                    }
                  }}
                  onMouseDown={(e) => {
                    if (activeTool !== 'select') return;
                    e.stopPropagation();
                    handleStrokeMouseDown(e, stroke.id);
                  }}
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? '#a855f7' : stroke.color}
                  strokeWidth={stroke.width_stroke || 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none"
                />

                {isSelected && (
                  <rect
                    x={stroke.x - 6}
                    y={stroke.y - 6}
                    width={stroke.width + 12}
                    height={stroke.height + 12}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.2"
                    strokeDasharray="4,4"
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}

          {/* Active drawing stroke layout */}
          {currentStrokePoints.length > 1 && (
            <path
              d={getSvgPathFromPoints(currentStrokePoints)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}

          {/* ── RENDER EDGES connections */}
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const { fromBorder, toBorder, fromSide, toSide } = getEdgeBorderPoints(edge, fromNode, toNode);

            const isSelected = selectedEdgeId === edge.id;
            const lineType = edge.lineType || 'curved';

            let dynamicFromBorder = fromBorder;
            let dynamicToBorder = toBorder;
            let dynamicFromSide = fromSide;
            let dynamicToSide = toSide;

            const isDraggingThisEdge = draggedEdgeEndpoint && draggedEdgeEndpoint.edgeId === edge.id;
            if (isDraggingThisEdge) {
              if (draggedEdgeEndpoint.end === 'from') {
                dynamicFromBorder = mousePos;
                const hitNode = nodes.find(n => 
                  mousePos.x >= n.x && mousePos.x <= n.x + n.width &&
                  mousePos.y >= n.y && mousePos.y <= n.y + n.height
                );
                if (hitNode) {
                  const sides: { side: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [
                    { side: 'top', x: hitNode.x + hitNode.width / 2, y: hitNode.y },
                    { side: 'bottom', x: hitNode.x + hitNode.width / 2, y: hitNode.y + hitNode.height },
                    { side: 'left', x: hitNode.x, y: hitNode.y + hitNode.height / 2 },
                    { side: 'right', x: hitNode.x + hitNode.width, y: hitNode.y + hitNode.height / 2 },
                  ];
                  let bestSide = sides[0].side;
                  let minDist = Infinity;
                  for (const s of sides) {
                    const dx = s.x - mousePos.x;
                    const dy = s.y - mousePos.y;
                    const d = dx * dx + dy * dy;
                    if (d < minDist) {
                      minDist = d;
                      bestSide = s.side;
                    }
                  }
                  dynamicFromSide = bestSide;
                  if (bestSide === 'top') dynamicFromBorder = { x: hitNode.x + hitNode.width / 2, y: hitNode.y };
                  else if (bestSide === 'bottom') dynamicFromBorder = { x: hitNode.x + hitNode.width / 2, y: hitNode.y + hitNode.height };
                  else if (bestSide === 'left') dynamicFromBorder = { x: hitNode.x, y: hitNode.y + hitNode.height / 2 };
                  else if (bestSide === 'right') dynamicFromBorder = { x: hitNode.x + hitNode.width, y: hitNode.y + hitNode.height / 2 };
                } else {
                  dynamicFromSide = 'bottom';
                }
              } else {
                dynamicToBorder = mousePos;
                const hitNode = nodes.find(n => 
                  mousePos.x >= n.x && mousePos.x <= n.x + n.width &&
                  mousePos.y >= n.y && mousePos.y <= n.y + n.height
                );
                if (hitNode) {
                  const sides: { side: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [
                    { side: 'top', x: hitNode.x + hitNode.width / 2, y: hitNode.y },
                    { side: 'bottom', x: hitNode.x + hitNode.width / 2, y: hitNode.y + hitNode.height },
                    { side: 'left', x: hitNode.x, y: hitNode.y + hitNode.height / 2 },
                    { side: 'right', x: hitNode.x + hitNode.width, y: hitNode.y + hitNode.height / 2 },
                  ];
                  let bestSide = sides[0].side;
                  let minDist = Infinity;
                  for (const s of sides) {
                    const dx = s.x - mousePos.x;
                    const dy = s.y - mousePos.y;
                    const d = dx * dx + dy * dy;
                    if (d < minDist) {
                      minDist = d;
                      bestSide = s.side;
                    }
                  }
                  dynamicToSide = bestSide;
                  if (bestSide === 'top') dynamicToBorder = { x: hitNode.x + hitNode.width / 2, y: hitNode.y };
                  else if (bestSide === 'bottom') dynamicToBorder = { x: hitNode.x + hitNode.width / 2, y: hitNode.y + hitNode.height };
                  else if (bestSide === 'left') dynamicToBorder = { x: hitNode.x, y: hitNode.y + hitNode.height / 2 };
                  else if (bestSide === 'right') dynamicToBorder = { x: hitNode.x + hitNode.width, y: hitNode.y + hitNode.height / 2 };
                } else {
                  dynamicToSide = 'top';
                }
              }
            }

            let pathD = '';
            let labelX = 0;
            let labelY = 0;

            if (lineType === 'straight') {
              pathD = `M ${dynamicFromBorder.x} ${dynamicFromBorder.y} L ${dynamicToBorder.x} ${dynamicToBorder.y}`;
              labelX = (dynamicFromBorder.x + dynamicToBorder.x) / 2;
              labelY = (dynamicFromBorder.y + dynamicToBorder.y) / 2;
            } else {
              // Automatic Miro-style connector:
              const getSideDir = (side: string) => {
                switch (side) {
                  case 'top': return { x: 0, y: -1 };
                  case 'bottom': return { x: 0, y: 1 };
                  case 'left': return { x: -1, y: 0 };
                  case 'right': return { x: 1, y: 0 };
                  default: return { x: 0, y: 0 };
                }
              };

              const v_S = getSideDir(dynamicFromSide);
              const n_E = getSideDir(dynamicToSide);

              // Fixed straight segment near each block
              const D_start = 30;
              const D_end = 30;

              const P1 = { x: dynamicFromBorder.x + v_S.x * D_start, y: dynamicFromBorder.y + v_S.y * D_start };
              const P2 = { x: dynamicToBorder.x + n_E.x * D_end, y: dynamicToBorder.y + n_E.y * D_end };

              const mid_dx = P2.x - P1.x;
              const mid_dy = P2.y - P1.y;
              const dist = Math.sqrt(mid_dx * mid_dx + mid_dy * mid_dy) || 1;

              // Automatic control points strength
              let strength = dist * 0.45;
              if (strength < 20) strength = 20;
              if (strength > 150) strength = 150;

              const C1 = { x: P1.x + v_S.x * strength, y: P1.y + v_S.y * strength };
              const C2 = { x: P2.x + n_E.x * strength, y: P2.y + n_E.y * strength };

              pathD = `M ${dynamicFromBorder.x} ${dynamicFromBorder.y} L ${P1.x} ${P1.y} C ${C1.x} ${C1.y}, ${C2.x} ${C2.y}, ${P2.x} ${P2.y} L ${dynamicToBorder.x} ${dynamicToBorder.y}`;
              
              // Midpoint of Cubic Bezier for label placement
              labelX = 0.125 * P1.x + 0.375 * C1.x + 0.375 * C2.x + 0.125 * P2.x;
              labelY = 0.125 * P1.y + 0.375 * C1.y + 0.375 * C2.y + 0.125 * P2.y;
            }

            const isDashed = lineType === 'dashed';
            const isDotted = lineType === 'dotted';
            const dashArray = isDashed ? "6,6" : isDotted ? "2,4" : undefined;

            return (
              <g key={edge.id} className="group">
                <path
                  d={pathD}
                  stroke="transparent"
                  strokeWidth="12"
                  fill="none"
                  className="cursor-pointer"
                  onClick={(e) => handleEdgeClick(e, edge.id)}
                  onDoubleClick={(e) => handleEdgeDoubleClick(e, edge, labelX, labelY)}
                />

                <path
                  d={pathD}
                  stroke={isSelected ? '#ffffff' : edge.color || '#52525b'}
                  strokeWidth={isSelected ? '2.0' : '1.5'}
                  strokeDasharray={dashArray}
                  fill="none"
                  markerEnd={isSelected ? "url(#arrow-classic-selected)" : "url(#arrow-classic)"}
                  className="transition-all cursor-pointer hover:stroke-zinc-300"
                  onClick={(e) => handleEdgeClick(e, edge.id)}
                  onDoubleClick={(e) => handleEdgeDoubleClick(e, edge, labelX, labelY)}
                />

                {edge.label && edge.label.trim() !== '' && (
                  <g
                    transform={`translate(${labelX}, ${labelY})`}
                    className="no-deselect cursor-pointer"
                    onClick={(e) => handleEdgeClick(e, edge.id)}
                  >
                    <rect
                      x={-42}
                      y={-9}
                      width={84}
                      height={18}
                      rx={3}
                      fill="#09090b"
                      stroke={isSelected ? '#71717a' : '#1f1f23'}
                      strokeWidth="1"
                    />
                    <text
                      x={0}
                      y={3}
                      fill={isSelected ? '#ffffff' : '#e4e4e7'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="pointer-events-none select-none font-medium"
                    >
                      {edge.label}
                    </text>
                  </g>
                )}

                {isSelected && (
                  <>
                    <circle
                      cx={dynamicFromBorder.x}
                      cy={dynamicFromBorder.y}
                      r="6.5"
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth="1.8"
                      className="cursor-pointer hover:scale-130 transition-transform pointer-events-auto"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggedEdgeEndpoint({ edgeId: edge.id, end: 'from' });
                      }}
                      title="Тяните для перепривязки начала"
                    />
                    <circle
                      cx={dynamicToBorder.x}
                      cy={dynamicToBorder.y}
                      r="6.5"
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth="1.8"
                      className="cursor-pointer hover:scale-130 transition-transform pointer-events-auto"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggedEdgeEndpoint({ edgeId: edge.id, end: 'to' });
                      }}
                      title="Тяните для перепривязки конца"
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* Connection drawing helper line */}
          {nodeConnectorSource && (() => {
            const sourceNode = nodes.find((n) => n.id === nodeConnectorSource.nodeId);
            if (!sourceNode) return null;
            
            // Start the draft link exactly from the specified side center/blue dot
            const getSidePoint = (node: OSINTNode, side: string) => {
              switch (side) {
                case 'top': return { x: node.x + node.width / 2, y: node.y };
                case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
                case 'left': return { x: node.x, y: node.y + node.height / 2 };
                case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
                default: return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
              }
            };
            const exactStart = getSidePoint(sourceNode, nodeConnectorSource.side);

            return (
              <line
                x1={exactStart.x}
                y1={exactStart.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
            );
          })()}
        </svg>

        {/* ── PLAIN COLLABORATIVE TEXT NODES */}
        <div className="absolute inset-0 pointer-events-none">
          {nodes.map((node) => {
            const isSelected = selectedNodeIds.includes(node.id);
            const isHovered = hoveredNodeId === node.id;
            const isEditing = editingNodeId === node.id;
            const scale = node.scale || 1;

            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el) {
                    const rect = el.getBoundingClientRect();
                    const measuredW = Math.ceil(rect.width / zoom);
                    const measuredH = Math.ceil(rect.height / zoom);
                    if (
                      resizingNode?.id !== node.id &&
                      (Math.abs(node.width - measuredW) > 1.5 || Math.abs(node.height - measuredH) > 1.5)
                    ) {
                      setTimeout(() => {
                        onUpdateNode({
                          ...node,
                          width: measuredW,
                          height: measuredH,
                        });
                      }, 0);
                    }
                  }
                }}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: (resizingNode?.id === node.id) ? `${node.width}px` : 'max-content',
                  maxWidth: (resizingNode?.id === node.id) ? undefined : '360px',
                  minWidth: '60px',
                  minHeight: (resizingNode?.id === node.id) ? `${node.height}px` : 'auto',
                  padding: node.isBoxed === false 
                    ? `${6 * scale}px` 
                    : (node.osintData ? `${8 * scale}px` : (node.label.includes('<div') ? `${7 * scale}px` : `${11 * scale}px`)),
                  ...getTypographyStyle(node, scale),
                }}
                onMouseDown={(e) => {
                  if (activeTool === 'pencil') return;
                  if (isEditing) {
                    e.stopPropagation();
                  } else {
                    const isAlreadySel = selectedNodeIds.includes(node.id);
                    (e.currentTarget as any)._wasAlreadySelected = isAlreadySel;
                    (e.currentTarget as any)._mouseDownPos = { x: e.clientX, y: e.clientY };
                    handleNodeMouseDown(e, node.id);
                  }
                }}
                onClick={(e) => {
                  if (activeTool === 'pencil' || isEditing) return;
                  e.stopPropagation();
                  const wasAlreadySel = (e.currentTarget as any)._wasAlreadySelected;
                  const startPos = (e.currentTarget as any)._mouseDownPos;
                  
                  if (wasAlreadySel && startPos) {
                    const dx = e.clientX - startPos.x;
                    const dy = e.clientY - startPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    // Standard short click without dragging enters edit mode instantly
                    if (dist < 4) {
                      setEditingNodeId(node.id);
                    }
                  }
                }}
                onDoubleClick={(e) => {
                  if (activeTool === 'pencil') return;
                  if (isEditing) {
                    e.stopPropagation();
                    return;
                  }
                  e.stopPropagation();
                  setEditingNodeId(node.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setNodeContextMenu({
                      id: node.id,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                    setCanvasContextMenu(null); // Close canvas context menu
                  }
                }}
                onMouseEnter={() => {
                  if (activeTool !== 'pencil') setHoveredNodeId(node.id);
                }}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`node-card absolute rounded-none select-none flex flex-col justify-start pointer-events-auto transition-colors duration-150 ${
                  node.isBoxed === false
                    ? isSelected
                      ? 'border border-dashed border-indigo-500 bg-zinc-950/25 shadow-none z-30 cursor-move'
                      : 'border border-transparent bg-transparent shadow-none hover:border-zinc-800 cursor-move'
                    : isSelected
                      ? 'border-2 border-indigo-400 bg-[#07070a]/95 text-zinc-100 shadow-[0_0_25px_rgba(99,102,241,0.35)] z-30 cursor-move glow-indigo'
                      : 'border border-zinc-800 bg-[#07070a]/80 hover:bg-[#09090b]/95 text-zinc-300 hover:border-zinc-650 cursor-move'
                }`}
              >
                {isEditing ? (
                  <div
                    key={`editable-field-${node.id}`}
                    ref={(el) => {
                      if (el && isEditing) {
                        if (!el.dataset.initialized) {
                          let labelText = node.label || '';
                          if (
                            labelText === 'Введите текст...' || 
                            labelText === 'Заметка...' || 
                            labelText === 'Дважды кликните, чтобы ввести текст...' || 
                            labelText === 'Дважды кликните для редактирования'
                          ) {
                            labelText = '';
                          }
                          el.innerHTML = labelText;
                          el.dataset.initialized = 'true';
                          
                          // Focus queuing helper with slight browser microtask tick is extremely reliable
                          setTimeout(() => {
                            el.focus();
                            try {
                              const range = document.createRange();
                              const sel = window.getSelection();
                              range.selectNodeContents(el);
                              range.collapse(false);
                              sel?.removeAllRanges();
                              sel?.addRange(range);
                            } catch (err) {
                              console.warn("Focus caret selection placement error:", err);
                            }
                          }, 10);
                        }
                      }
                    }}
                    contentEditable
                    suppressContentEditableWarning
                    id={`editable-${node.id}`}
                    onBlur={(e) => {
                      let cleaned = e.currentTarget.innerHTML.trim();
                      if (cleaned === '<br>' || cleaned === '<div><br></div>' || cleaned === '<p><br></p>' || cleaned === '<div></div>' || !cleaned) {
                        cleaned = '';
                      }
                      onUpdateNode({ ...node, label: cleaned });
                      setEditingNodeId(null);
                    }}
                    onInput={(e) => {
                      onUpdateNode({ ...node, label: e.currentTarget.innerHTML });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingNodeId(null);
                      }
                    }}
                    className="w-full text-[1em] bg-transparent border-none text-zinc-100 outline-none resize-none placeholder-zinc-500 leading-relaxed font-normal whitespace-pre-wrap select-text cursor-text pointer-events-auto min-h-0 focus:outline-none [&_p]:m-0 [&_div]:m-0"
                  />
                ) : node.mapData ? (
                  <MapCardNode node={node} onUpdateNode={onUpdateNode} />
                ) : node.osintData ? (
                  <div 
                    className="flex flex-col text-left select-none pointer-events-auto cursor-default font-mono w-full h-full"
                    style={{ 
                      fontSize: '0.82em',
                      lineHeight: 1.3,
                      gap: '0.4em'
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-800/40 pb-[0.3em]" style={{ fontSize: '0.9em' }}>
                      <span className="font-bold text-zinc-300 flex items-center" style={{ gap: '0.3em' }}>
                        🌐 {node.osintData.toolName || 'OSINT Lookup'}
                      </span>
                      {node.osintData.status === 'searching' && (
                        <span className="text-indigo-400 font-bold animate-pulse" style={{ fontSize: '0.85em' }}>
                          SEARCHING...
                        </span>
                      )}
                      {node.osintData.status === 'success' && (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-[0.4em] py-[0.1em] rounded-[0.2em]" style={{ fontSize: '0.8em' }}>
                          SUCCESS
                        </span>
                      )}
                      {node.osintData.status === 'failed' && (
                        <span className="text-rose-400 font-bold bg-rose-500/10 px-[0.4em] py-[0.1em] rounded-[0.2em]" style={{ fontSize: '0.8em' }}>
                          FAILED
                        </span>
                      )}
                    </div>

                    {/* Metadata summary Target & Latency */}
                    <div className="text-zinc-450" style={{ fontSize: '0.82em', display: 'flex', flexDirection: 'column', gap: '0.1em' }} onMouseDown={e => e.stopPropagation()}>
                      <div>
                        <span style={{ color: '#64748b' }}>Target:</span> <span className="text-zinc-200 select-all font-semibold font-mono">{node.osintData.target}</span>
                      </div>
                      {node.osintData.durationMs !== undefined && (
                        <div>
                          <span style={{ color: '#64748b' }}>Latency:</span> <span style={{ color: '#94a3b8' }}>{node.osintData.durationMs}ms</span>
                        </div>
                      )}
                    </div>

                    {/* Main payload area */}
                    {node.osintData.status === 'searching' && (
                      <div className="text-zinc-500 italic animate-pulse" style={{ fontSize: '0.8em', margin: '0.5em 0' }}>
                        ⚙️ querying leaked databases of leak networks...
                      </div>
                    )}

                    {node.osintData.status === 'failed' && (
                      <div className="text-rose-400 font-normal bg-rose-950/15 p-[0.4em] border border-rose-900/20 rounded-[0.25em] whitespace-pre-wrap select-text" style={{ fontSize: '0.82em', margin: '0.2em 0' }}>
                        {node.osintData.error || 'Check timed out or signature incorrect.'}
                      </div>
                    )}

                    {node.osintData.status === 'success' && (
                      <div className="flex flex-col" style={{ gap: '0.3em' }}>
                        {/* Selected extracted values list */}
                        {node.osintData.result && typeof node.osintData.result === 'object' && (
                          <div className="flex flex-col text-zinc-300" style={{ gap: '0.15em', fontSize: '0.88em' }}>
                            {Object.entries(node.osintData.result)
                              .slice(0, 6) // Show top primary attributes
                              .map(([k, v]) => {
                                const displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
                                return (
                                  <div key={k} className="flex flex-wrap select-all pr-1">
                                    <span style={{ color: '#64748b', marginRight: '0.3em' }} className="shrink-0">{k}:</span>
                                    <span style={{ color: '#10b981' }} className="font-semibold break-all text-emerald-400">{displayVal}</span>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Collapsible raw details option */}
                        {node.osintData.result && (
                          <div className="flex flex-col mt-[0.3em]" style={{ gap: '0.2em' }}>
                            <button
                              onClick={(evt) => {
                                evt.preventDefault();
                                evt.stopPropagation();
                                onUpdateNode({
                                  ...node,
                                  osintCollapsed: !node.osintCollapsed
                                });
                              }}
                              className="flex items-center text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer py-1"
                              style={{ 
                                gap: '0.25em', 
                                fontSize: '0.88em'
                              }}
                              title="Развернуть полный JSON-ответ"
                            >
                              <span>{node.osintCollapsed === false ? '▼ Свернуть JSON-ответ' : '▶ Развернуть JSON-ответ'}</span>
                            </button>

                            {node.osintCollapsed === false && (
                              <div 
                                className="overflow-y-auto outline-none select-text border border-zinc-800 bg-zinc-950 p-[0.4em] rounded-[0.25em] cursor-text max-h-[14em] text-zinc-300 font-mono" 
                                style={{ 
                                  fontSize: '0.78em',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-all'
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                {JSON.stringify(node.osintData.result, null, 2)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="text-[1em] break-words leading-relaxed whitespace-pre-wrap select-text font-normal [&_p]:m-0 [&_div]:m-0"
                    dangerouslySetInnerHTML={{ __html: node.label || "Заметка..." }}
                  />
                )}

                {/* Connecting lines link node handle element */}
                {isHovered && !isEditing && activeTool === 'connect' && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setNodeConnectorSource({ nodeId: node.id, side: 'right' });
                    }}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-indigo-500 border border-white hover:scale-120 flex items-center justify-center cursor-crosshair shadow-xl transition-all"
                    title="Тяните линию связи"
                  >
                    <Link2 className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Complete Interactive Selection Overlays */}
                {isSelected && !isEditing && (
                  <>
                    {/* Gray and white corners */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setResizingNode({
                          id: node.id,
                          corner: 'nw',
                          startX: e.clientX,
                          startY: e.clientY,
                          startWidth: node.width,
                          startHeight: node.height,
                          startNodeX: node.x,
                          startNodeY: node.y,
                          startScale: node.scale || 1,
                        });
                      }}
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-zinc-550 rounded-full cursor-nwse-resize z-40 hover:scale-130 transition-transform"
                      title="Изменить размер"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setResizingNode({
                          id: node.id,
                          corner: 'ne',
                          startX: e.clientX,
                          startY: e.clientY,
                          startWidth: node.width,
                          startHeight: node.height,
                          startNodeX: node.x,
                          startNodeY: node.y,
                          startScale: node.scale || 1,
                        });
                      }}
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-zinc-550 rounded-full cursor-nesw-resize z-40 hover:scale-130 transition-transform"
                      title="Изменить размер"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setResizingNode({
                          id: node.id,
                          corner: 'sw',
                          startX: e.clientX,
                          startY: e.clientY,
                          startWidth: node.width,
                          startHeight: node.height,
                          startNodeX: node.x,
                          startNodeY: node.y,
                          startScale: node.scale || 1,
                        });
                      }}
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-zinc-550 rounded-full cursor-nesw-resize z-40 hover:scale-130 transition-transform"
                      title="Изменить размер"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setResizingNode({
                          id: node.id,
                          corner: 'se',
                          startX: e.clientX,
                          startY: e.clientY,
                          startWidth: node.width,
                          startHeight: node.height,
                          startNodeX: node.x,
                          startNodeY: node.y,
                          startScale: node.scale || 1,
                        });
                      }}
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-zinc-550 rounded-full cursor-nwse-resize z-40 hover:scale-130 transition-transform"
                      title="Изменить размер"
                    />

                    {/* Round bottom rotating arrow */}
                    <button
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-5.5 h-5.5 bg-white text-zinc-800 border border-zinc-200 rounded-full flex items-center justify-center cursor-pointer shadow-lg z-40 hover:bg-zinc-100 transition-all hover:scale-110"
                      title="Сбросить вращение / Свойства"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <RotateCw className="w-3 h-3 text-zinc-600" />
                    </button>
                  </>
                )}

                {/* Blue side points for connection anchors */}
                {((isSelected && !isEditing) || (nodeConnectorSource !== null && (hoveredNodeId === node.id || node.id === nodeConnectorSource.nodeId))) && (
                  <>
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setNodeConnectorSource({ nodeId: node.id, side: 'top' });
                      }}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full z-45 cursor-crosshair hover:scale-140 transition-transform"
                      title="Провести линию связи"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setNodeConnectorSource({ nodeId: node.id, side: 'bottom' });
                      }}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full z-45 cursor-crosshair hover:scale-140 transition-transform"
                      title="Провести линию связи"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setNodeConnectorSource({ nodeId: node.id, side: 'left' });
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full z-45 cursor-crosshair hover:scale-140 transition-transform"
                      title="Провести линию связи"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setNodeConnectorSource({ nodeId: node.id, side: 'right' });
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full z-45 cursor-crosshair hover:scale-140 transition-transform"
                      title="Провести линию связи"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* ── FLOATING WYSIWYG SELECTION BAR OVER SELECTED NODE CARD */}
          {selectedNodeIds.length === 1 && (() => {
            const node = nodes.find(n => n.id === selectedNodeIds[0]);
            if (!node || editingNodeId === node.id) return null;
            if (draggedNodeId || isPanning || resizingNode) return null;

            return (
              <div
                style={{
                  left: `${node.x + node.width / 2}px`,
                  top: `${node.y - 50}px`,
                  transform: 'translateX(-50%)',
                }}
                className="absolute z-100 bg-white border border-zinc-200 text-zinc-805 rounded-lg px-2.5 py-1.5 shadow-xl flex items-center space-x-2.5 pointer-events-auto select-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                {/* T Type Icon */}
                <div className="flex items-center text-zinc-500 pr-1.5 border-r border-zinc-200">
                  <span className="font-sans font-bold text-xs uppercase text-zinc-700 tracking-wider">T</span>
                </div>

                {/* Font Family selector */}
                <select
                  value={node.fontFamily || 'sans'}
                  onChange={(e) => {
                    onUpdateNode({ ...node, fontFamily: e.target.value as any });
                  }}
                  className="bg-transparent text-[11px] font-sans font-medium text-zinc-700 outline-none border-none cursor-pointer pr-1"
                >
                  <option value="sans">Inter (Sans)</option>
                  <option value="serif">Georgia (Serif)</option>
                  <option value="mono">JetBrains Mono</option>
                  <option value="cursive">Comic Sans</option>
                </select>

                <div className="w-px h-4.5 bg-zinc-200" />

                {/* Font Size stepper */}
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={node.fontSize || 14}
                    readOnly
                    className="w-5 text-center text-xs font-mono font-bold text-zinc-800 bg-transparent border-none outline-none"
                  />
                  <div className="flex flex-col -space-y-0.5">
                    <button
                      onClick={() => {
                        const currentSize = node.fontSize || 14;
                        onUpdateNode({ ...node, fontSize: Math.min(64, currentSize + 2) });
                      }}
                      className="p-0.2 hover:bg-zinc-150 rounded text-[9px] font-bold text-zinc-650 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => {
                        const currentSize = node.fontSize || 14;
                        onUpdateNode({ ...node, fontSize: Math.max(8, currentSize - 2) });
                      }}
                      className="p-0.2 hover:bg-zinc-150 rounded text-[9px] font-bold text-zinc-650 cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                <div className="w-px h-4.5 bg-zinc-200" />

                {/* Bold Toggle */}
                <button
                  onClick={() => {
                    onUpdateNode({ ...node, bold: !node.bold });
                  }}
                  className={`p-1.5 rounded-md hover:bg-zinc-100 cursor-pointer flex items-center justify-center font-bold text-xs ${node.bold ? 'bg-zinc-150 text-zinc-950' : 'text-zinc-500'}`}
                  title="Жирный"
                >
                  B
                </button>

                {/* Italic Toggle */}
                <button
                  onClick={() => {
                    onUpdateNode({ ...node, italic: !node.italic });
                  }}
                  className={`p-1.5 rounded-md hover:bg-zinc-100 cursor-pointer flex items-center justify-center italic font-serif text-xs px-2.5 ${node.italic ? 'bg-zinc-150 text-zinc-950' : 'text-zinc-500'}`}
                  title="Курсив"
                >
                  I
                </button>

                {/* StrikeThrough Toggle */}
                <button
                  onClick={() => {
                    onUpdateNode({ ...node, strikethrough: !node.strikethrough });
                  }}
                  className={`p-1.5 rounded-md hover:bg-zinc-100 cursor-pointer flex items-center justify-center line-through text-xs px-2 ${node.strikethrough ? 'bg-zinc-150 text-zinc-950' : 'text-zinc-500'}`}
                  title="Зачеркнутый"
                >
                  S
                </button>

                <div className="w-px h-4.5 bg-zinc-200" />

                {/* Text Color symbol A */}
                <div className="relative pb-1">
                  <button
                    onClick={() => setActiveColorDropdown(activeColorDropdown === 'text' ? null : 'text')}
                    className="p-1 px-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 cursor-pointer flex flex-col items-center"
                    title="Цвет текста"
                  >
                    <span className="text-xs font-bold leading-none select-none">A</span>
                    <span className="w-4 h-0.5 rounded-xs mt-0.5" style={{ backgroundColor: node.textColor || '#000000' }} />
                  </button>
                  {activeColorDropdown === 'text' && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1.5 z-150">
                      <div className="bg-white border border-zinc-200 p-1.5 rounded-lg shadow-2xl flex gap-1">
                        {['#ffffff', '#ef4444', '#10b981', '#3b82f6', '#fbbf24', '#c084fc', '#94a3b8', '#000000'].map(c => (
                          <button
                            key={c}
                            onClick={() => {
                              onUpdateNode({ ...node, textColor: c });
                              setActiveColorDropdown(null);
                            }}
                            className="w-4 h-4 rounded-full border border-zinc-200 cursor-pointer hover:scale-125 transition-transform"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Background highlight color marker */}
                <div className="relative pb-1">
                  <button
                    onClick={() => setActiveColorDropdown(activeColorDropdown === 'bg' ? null : 'bg')}
                    className="p-1 px-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 cursor-pointer flex flex-col items-center"
                    title="Цвет фона"
                  >
                    <span className="text-xs leading-none select-none">✏️</span>
                    <span className="w-4 h-0.5 rounded-xs mt-0.5" style={{ backgroundColor: node.bgColor || 'rgba(0,0,0,0)' }} />
                  </button>
                  {activeColorDropdown === 'bg' && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1.5 z-150">
                      <div className="bg-white border border-zinc-200 p-1.5 rounded-lg shadow-2xl flex gap-1">
                        {['rgba(0,0,0,0)', 'rgba(239, 68, 68, 0.2)', 'rgba(16, 185, 129, 0.2)', 'rgba(59, 130, 246, 0.2)', 'rgba(245, 158, 11, 0.2)', 'rgba(9,9,11,0.95)', '#ffffff'].map(c => (
                          <button
                            key={c}
                            onClick={() => {
                              onUpdateNode({ ...node, bgColor: c });
                              setActiveColorDropdown(null);
                            }}
                            className="w-4 h-4 rounded border border-zinc-200 cursor-pointer hover:scale-125 transition-transform"
                            style={{ backgroundColor: c === 'rgba(0,0,0,0)' ? '#f3f4f6' : c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transparent backdrop toggle */}
                <button
                  onClick={() => {
                    onUpdateNode({ ...node, isBoxed: !node.isBoxed });
                  }}
                  className={`p-1.5 rounded-md hover:bg-zinc-100 cursor-pointer flex items-center justify-center text-xs ${!node.isBoxed ? 'bg-zinc-150 text-zinc-950 font-bold' : 'text-zinc-500'}`}
                  title="Переключить рамку карточки"
                >
                  🔳
                </button>

                <div className="w-px h-4.5 bg-zinc-200" />

                {/* AI Spark button */}
                <button
                  onClick={() => {
                    if (onRunVerification) onRunVerification(node);
                  }}
                  className="p-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-750 cursor-pointer flex items-center justify-center space-x-1.5 font-bold shadow-sm transition-all text-[10px] uppercase font-mono"
                  title="Запустить AI Анализ OSINT"
                >
                  <span>✨</span>
                  <span>AI</span>
                </button>
              </div>
            );
          })()}


          {/* ── PLIPPED PIN PROTOCOL COOPERATIVE COMMENTS */}
          {comments && comments.map((cmt) => {
            if (cmt.x === undefined || cmt.y === undefined) return null;
            const isSelected = selectedCommentId === cmt.id;
            return (
              <div
                key={cmt.id}
                style={{
                  left: `${cmt.x}px`,
                  top: `${cmt.y}px`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNodes([]);
                  onSelectStrokes([]);
                  onSelectEdge(null);
                  if (onSelectComment) onSelectComment(cmt.id);
                }}
                className={`absolute p-3 rounded-lg shadow-lg backdrop-blur-md max-w-[210px] pointer-events-auto select-none transition-all cursor-pointer comment-card ${
                  isSelected
                    ? 'bg-yellow-500/25 border-yellow-400 ring-2 ring-yellow-400/50 text-white translate-y-[-2px]'
                    : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-100 hover:border-yellow-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 border-b border-yellow-500/20 pb-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-yellow-400 font-bold truncate max-w-[100px]" title={cmt.author}>
                    {cmt.author}
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="font-mono text-[8.5px] text-yellow-500/60">{cmt.timestamp}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteComment) onDeleteComment(cmt.id);
                      }}
                      className="text-yellow-500 hover:text-red-400 cursor-pointer p-0.5 rounded transition-colors"
                      title="Удалить комментарий"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-yellow-50/90 whitespace-pre-wrap leading-relaxed font-sans select-text">
                  {cmt.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── COLLABORATIVE USER CURSORS */}
        {peerCursors.map((peer) => {
          if (Date.now() - peer.lastActive > 15000) return null;
          return (
            <div
              key={peer.name}
              style={{
                left: `${peer.x}px`,
                top: `${peer.y}px`,
              }}
              className="absolute pointer-events-none transition-all duration-75 text-white active"
            >
              <svg width="24" height="24" className="drop-shadow-lg" viewBox="0 0 24 24">
                <path
                  d="M1 1l7.5 17 2.5-6.5 6.5-2.5L1 1z"
                  fill={peer.color}
                  stroke="#000"
                  strokeWidth="1.5"
                />
              </svg>
              <span
                style={{ backgroundColor: peer.color || '#3b82f6' }}
                className="absolute shadow pl-1 pr-2 py-0.5 text-[8px] font-mono font-bold rounded-full top-4 left-4 text-zinc-950 leading-none animate-fade-in flex items-center space-x-1 border border-zinc-950"
              >
                {peer.avatarUrl ? (
                  <img src={peer.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0 select-none pointer-events-none bg-zinc-800" />
                ) : (
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center font-bold text-[7px] text-zinc-950 bg-white"
                    style={{ backgroundColor: peer.avatarColor }}
                  >
                    {peer.name ? peer.name.slice(0, 1).toUpperCase() : '?'}
                  </div>
                )}
                <span className="font-mono text-[8px] tracking-wider uppercase font-extrabold text-[#09090b]">{peer.name}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* ── SELECTION MARQUEE DRAW DISPLAY */}
      {isSelectingMarquee && (() => {
        const x = Math.min(marqueeStart.x, marqueeEnd.x) * zoom + pan.x;
        const y = Math.min(marqueeStart.y, marqueeEnd.y) * zoom + pan.y;
        const w = Math.abs(marqueeStart.x - marqueeEnd.x) * zoom;
        const h = Math.abs(marqueeStart.y - marqueeEnd.y) * zoom;

        return (
          <div
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${w}px`,
              height: `${h}px`,
            }}
            className="absolute border border-dashed border-indigo-500 bg-indigo-500/10 pointer-events-none z-50 rounded-xs"
          />
        );
      })()}

      {/* ── FLOATING WYSIWYG SELECTION BAR ACCORDING TO REQ #4 */}
      {selectionRange && (
        <div
          style={{
            left: `${selectionRange.x}px`,
            top: `${selectionRange.y}px`,
            transform: 'translateX(-50%)',
          }}
          className="absolute z-150 bg-zinc-950 border border-zinc-805 rounded-none p-1 px-1.5 shadow-2xl flex items-center space-x-1 backdrop-blur-md animate-fade-in no-deselect pointer-events-auto glow-indigo"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            onClick={() => {
              document.execCommand('bold', false);
            }}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none font-extrabold text-[10.5px] w-6.5 h-6 ml-0.5 flex items-center justify-center cursor-pointer transition-colors"
            title="Жирный"
          >
            B
          </button>
          
          <button
            onClick={() => {
              document.execCommand('italic', false);
            }}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none italic text-[11px] w-6.5 h-6 flex items-center justify-center cursor-pointer transition-colors"
            title="Курсив"
          >
            I
          </button>
          
          <button
            onClick={() => {
              document.execCommand('underline', false);
            }}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none underline text-[11px] w-6.5 h-6 flex items-center justify-center cursor-pointer transition-colors"
            title="Подчеркнутый"
          >
            U
          </button>

          <div className="w-px h-4.5 bg-zinc-800" />

          {[
            { hex: '#ef4444', label: 'Красный' },
            { hex: '#10b981', label: 'Зеленый' },
            { hex: '#3b82f6', label: 'Синий' },
            { hex: '#fbbf24', label: 'Желтый' },
            { hex: '#ffffff', label: 'Белый' },
            { hex: '#71717a', label: 'Серый' },
          ].map((color) => (
            <button
              key={color.hex}
              onClick={() => {
                document.execCommand('foreColor', false, color.hex);
              }}
              className="w-3.5 h-3.5 rounded-none cursor-pointer hover:scale-130 transition-all border border-black/55"
              style={{ backgroundColor: color.hex }}
              title={color.label}
            />
          ))}
        </div>
      )}

      {/* Cascading Right Click Photoshop-style Menu */}
      {canvasContextMenu && (
        <div
          style={{
            left: `${canvasContextMenu.x}px`,
            top: `${canvasContextMenu.y}px`,
          }}
          className="absolute z-100 bg-[#09090b] border border-zinc-800 rounded-none p-1.5 w-52 shadow-2xl backdrop-blur-md select-none flex flex-col space-y-0.5 font-mono text-xs text-zinc-300 context-menu-wrapper glow-indigo"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Plain options */}
          <button
            onClick={() => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                const canvasPos = getCanvasCoords(canvasContextMenu.x + rect.left, canvasContextMenu.y + rect.top);
                onAddTextNode(canvasPos.x, canvasPos.y, true);
              }
              setCanvasContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-zinc-900 hover:text-white rounded-none flex items-center space-x-2 text-zinc-100 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
            <span>Новая карточка</span>
          </button>

          <button
            onClick={() => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                const canvasPos = getCanvasCoords(canvasContextMenu.x + rect.left, canvasContextMenu.y + rect.top);
                onAddTextNode(canvasPos.x, canvasPos.y, false);
              }
              setCanvasContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-[#1a1a24] hover:text-white rounded-none flex items-center space-x-2 text-zinc-100 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
            <span>Простой текст</span>
          </button>
        </div>
      )}

      {/* Floating edge relationships edit popup bubble */}
      {editingEdgeId && (
        <div
          style={{
            left: `${edgeInputPos.x * zoom + pan.x - 70}px`,
            top: `${edgeInputPos.y * zoom + pan.y - 15}px`,
          }}
          className="absolute z-50 p-1.5 rounded border border-zinc-805 bg-zinc-950 shadow-2xl flex items-center no-deselect pointer-events-auto"
        >
          <input
            autoFocus
            type="text"
            className="w-32 text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-100 px-2 py-1 outline-none rounded"
            placeholder="Связь..."
            value={edgeLabelText}
            onChange={(e) => setEdgeLabelText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateEdgeLabel(editingEdgeId, edgeLabelText);
                setEditingEdgeId(null);
              } else if (e.key === 'Escape') {
                setEditingEdgeId(null);
              }
            }}
            onBlur={() => {
              onUpdateEdgeLabel(editingEdgeId, edgeLabelText);
              setEditingEdgeId(null);
            }}
          />
        </div>
      )}

      {nodeContextMenu && (() => {
        const node = nodes.find(n => n.id === nodeContextMenu.id);
        if (!node) return null;
        
        // Inline lifecycle tracker component to log mounts/unmounts
        const ContextMenuLifecycleTracker = () => {
          useEffect(() => {
            console.log(
              "%c✨ [OSINT_DEBUG] Context Menu Component MOUNTED / OPENED in DOM!", 
              "color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.1); padding: 4px; border-radius: 4px;"
            );
            return () => {
              console.warn(
                "%c🥀 [OSINT_DEBUG] Context Menu Component UNMOUNTED / CLOSED in DOM!", 
                "color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 4px; border-radius: 4px;"
              );
            };
          }, []);
          return null;
        };

        return (
          <div
            style={{
              left: `${nodeContextMenu.x}px`,
              top: `${nodeContextMenu.y}px`,
            }}
            className="absolute z-100 bg-[#09090b] border border-zinc-800 rounded-none p-1.5 w-60 shadow-2xl backdrop-blur-md select-none flex flex-col space-y-0.5 font-mono text-xs text-zinc-300 pointer-events-auto context-menu-wrapper glow-indigo"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuLifecycleTracker />
            <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-550 border-b border-zinc-900 pb-1 flex items-center justify-between">
              <span>Опции Объекта</span>
              <span className="text-[9px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded-none border border-zinc-800 font-mono">{node.id.substring(0, 8)}</span>
            </div>

            <button
              onClick={() => {
                if (onRunVerification) {
                  onRunVerification(node);
                }
                setNodeContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-indigo-600 hover:text-white rounded-none flex items-center space-x-2 text-zinc-100 cursor-pointer font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Запустить проверку OSINT</span>
            </button>

            <button
              onClick={() => {
                setEditingNodeId(node.id);
                setNodeContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-zinc-900 hover:text-white rounded-none flex items-center space-x-2 text-zinc-100 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
              <span>Редактировать текст</span>
            </button>

            <button
              onClick={() => {
                onUpdateNode({ ...node, isBoxed: !node.isBoxed });
                setNodeContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-zinc-900 hover:text-white rounded-none flex items-center space-x-2 text-zinc-100 cursor-pointer"
            >
              <Layout className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
              <span>{node.isBoxed ? 'Переключить в простой текст' : 'Переключить в карточку'}</span>
            </button>

            <div className="border-t border-zinc-900 my-1 pt-1.5" />

            <div className="px-2.5 pb-1 text-[9px] uppercase font-bold text-zinc-650">Цвет карточки:</div>
            <div className="flex px-2 pb-2 gap-1.5 border-b border-zinc-900 mb-1">
              {[
                { name: 'Красный', bg: 'rgba(239, 68, 68, 0.25)', border: '#f87171', text: '#fca5a5' },
                { name: 'Зеленый', bg: 'rgba(16, 185, 129, 0.25)', border: '#34d399', text: '#6ee7b7' },
                { name: 'Синий', bg: 'rgba(59, 130, 246, 0.25)', border: '#60a5fa', text: '#93c5fd' },
                { name: 'Желтый', bg: 'rgba(245, 158, 11, 0.25)', border: '#fbbf24', text: '#fde047' },
                { name: 'Стандарт', bg: 'rgba(9,9,11,0.6)', border: '#27272a', text: '#ffffff' },
              ].map((style) => (
                <button
                  key={style.name}
                  title={style.name}
                  onClick={() => {
                    onUpdateNode({
                      ...node,
                      bgColor: style.bg,
                      borderColor: style.border,
                      textColor: style.text,
                    });
                    setNodeContextMenu(null);
                  }}
                  className="w-4.5 h-4.5 rounded-none border border-zinc-800 hover:scale-120 transition-transform cursor-pointer"
                  style={{ backgroundColor: style.border }}
                />
              ))}
            </div>

            <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-zinc-550">Добавить OSINT связи:</div>

            {/* Cascading Menu Number */}
            <div className="relative group no-deselect">
              <div className="flex items-center justify-between px-2.5 py-1.5 hover:bg-zinc-900 rounded-none cursor-pointer text-zinc-200">
                <span>Телефон (Phone)</span>
                <span className="text-[10px] text-zinc-650">▶</span>
              </div>
              <div className="absolute left-[95%] -top-1 pl-1.5 w-48 bg-[#09090b] border border-zinc-800 rounded-none p-1 shadow-2xl hidden group-hover:flex flex-col space-y-0.5 z-[160] pointer-events-auto glow-teal">
                <div className="absolute top-0 bottom-0 -left-4 w-4 bg-transparent pointer-events-auto" />
                <button
                  onClick={() => handleSpawnMenuOSINT('phone', 'hlr', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • HLR Запрос / Статус
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('phone', 'leaks', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Поиск утечек БД
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('phone', 'geo', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Геолокация (Cell ID)
                </button>
              </div>
            </div>

            {/* Cascading Menu Mail */}
            <div className="relative group no-deselect">
              <div className="flex items-center justify-between px-2.5 py-1.5 hover:bg-zinc-900 rounded-none cursor-pointer text-zinc-200">
                <span>Почта (Email)</span>
                <span className="text-[10px] text-zinc-650">▶</span>
              </div>
              <div className="absolute left-[95%] -top-1 pl-1.5 w-48 bg-[#09090b] border border-zinc-800 rounded-none p-1 shadow-2xl hidden group-hover:flex flex-col space-y-0.5 z-[160] pointer-events-auto glow-teal">
                <div className="absolute top-0 bottom-0 -left-4 w-4 bg-transparent pointer-events-auto" />
                <button
                  onClick={() => handleSpawnMenuOSINT('mail', 'smtp', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Валидация SMTP
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('mail', 'leaks', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Утечки паролей
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('mail', 'social', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Поиск аккаунтов
                </button>
              </div>
            </div>

            {/* Cascading Menu Nickname */}
            <div className="relative group no-deselect">
              <div className="flex items-center justify-between px-2.5 py-1.5 hover:bg-zinc-900 rounded-none cursor-pointer text-zinc-200">
                <span>Никнейм (Nickname)</span>
                <span className="text-[10px] text-zinc-650">▶</span>
              </div>
              <div className="absolute left-[95%] -top-1 pl-1.5 w-48 bg-[#09090b] border border-zinc-800 rounded-none p-1 shadow-2xl hidden group-hover:flex flex-col space-y-0.5 z-[160] pointer-events-auto glow-teal">
                <div className="absolute top-0 bottom-0 -left-4 w-4 bg-transparent pointer-events-auto" />
                <button
                  onClick={() => handleSpawnMenuOSINT('nickname', 'telegram', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Telegram ID / ЧАТЫ
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('nickname', 'vk', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • ВК / Одноклассники
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('nickname', 'instagram', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Insta Профайл
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('nickname', 'other', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Steam, Discord, LinkedIn
                </button>
              </div>
            </div>

            {/* Cascading Menu Net / IP */}
            <div className="relative group no-deselect">
              <div className="flex items-center justify-between px-2.5 py-1.5 hover:bg-zinc-900 rounded-none cursor-pointer text-zinc-200">
                <span>Сеть (IP & Domain)</span>
                <span className="text-[10px] text-zinc-650">▶</span>
              </div>
              <div className="absolute left-[95%] -top-1 pl-1.5 w-48 bg-[#09090b] border border-zinc-800 rounded-none p-1 shadow-2xl hidden group-hover:flex flex-col space-y-0.5 z-[160] pointer-events-auto glow-teal">
                <div className="absolute top-0 bottom-0 -left-4 w-4 bg-transparent pointer-events-auto" />
                <button
                  onClick={() => handleSpawnMenuOSINT('ip', 'shodan', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Shodan & Censys
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('ip', 'nmap', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Порты Nmap Scan
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('ip', 'whois', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Записи WHOIS
                </button>
              </div>
            </div>

            {/* Cascading Menu Crypto */}
            <div className="relative group no-deselect">
              <div className="flex items-center justify-between px-2.5 py-1.5 hover:bg-zinc-900 rounded-none cursor-pointer text-zinc-200">
                <span>Крипто (Wallets)</span>
                <span className="text-[10px] text-zinc-650">▶</span>
              </div>
              <div className="absolute left-[95%] -top-1 pl-1.5 w-48 bg-[#09090b] border border-zinc-800 rounded-none p-1 shadow-2xl hidden group-hover:flex flex-col space-y-0.5 z-[160] pointer-events-auto glow-teal">
                <div className="absolute top-0 bottom-0 -left-4 w-4 bg-transparent pointer-events-auto" />
                <button
                  onClick={() => handleSpawnMenuOSINT('crypto', 'btc', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Bitcoin Explorer
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('crypto', 'tron', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • TRON / USDT Анализ
                </button>
                <button
                  onClick={() => handleSpawnMenuOSINT('crypto', 'eth', node.id)}
                  className="w-full text-left px-2 py-1 text-[11px] hover:bg-zinc-900 rounded-none text-zinc-300 hover:text-white cursor-pointer"
                >
                  • Ethereum Смарт-контракты
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (onDeleteNode) onDeleteNode(node.id);
                setNodeContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-red-955/40 hover:text-red-400 rounded-none flex items-center space-x-2 text-zinc-100 cursor-pointer border-t border-zinc-900 mt-1"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Удалить карточку</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
}
