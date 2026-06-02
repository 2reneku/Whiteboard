import React, { useState, useEffect, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { NodeType, OSINTNode, OSINTEdge, PeerCursor, ThemeType, THEMES, BoardStroke, BoardComment } from './types';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AIAssistant from './components/AIAssistant';
import InteractiveBackground from './components/InteractiveBackground';
import {
  Share2, Sparkles, Maximize2, Grid3X3, CornerUpLeft, X,
  LogOut, Plus, Trash2, Edit2, Pencil, Pointer, Link2, FileText,
  UserCheck, Lock, Palette, Search, Layout, ChevronRight, FolderPlus, Clock
} from 'lucide-react';

interface OSINTBoard {
  id: string;
  name: string;
  nodes: OSINTNode[];
  edges: OSINTEdge[];
  strokes: BoardStroke[];
  comments: BoardComment[];
  updatedAt: number;
}

export default function App() {
  // Authentication states
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Boards dataset
  const [boards, setBoards] = useState<OSINTBoard[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string>('');

  // Two views structure: 'dashboard' (list of boards) and 'board' (active canvas)
  const [currentView, setCurrentView] = useState<'dashboard' | 'board'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Core visual data elements
  const [nodes, setNodes] = useState<OSINTNode[]>([]);
  const [edges, setEdges] = useState<OSINTEdge[]>([]);
  const [strokes, setStrokes] = useState<BoardStroke[]>([]);
  const [comments, setComments] = useState<BoardComment[]>([]);

  // Local editing note tracker to protect state overrides
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const strokesRef = useRef(strokes);
  const commentsRef = useRef(comments);
  const editingNodeIdRef = useRef<string | null>(editingNodeId);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);
  useEffect(() => {
    editingNodeIdRef.current = editingNodeId;
  }, [editingNodeId]);

  // Multi selection states
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Derive singular selectedNodeId for properties / chat panel compliance
  const selectedNodeId = selectedNodeIds[0] || null;

  // Layout metrics
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 100, y: 80 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('dark');
  const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'text' | 'hand' | 'pencil'>('select');
  const [penColor, setPenColor] = useState('#ef4444');

  // Side drawers toggling
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  
  const [showAIState, setShowAIState] = useState(false);
  const setShowAI = (value: boolean | ((prev: boolean) => boolean)) => {
    const stack = new Error().stack;
    const resolvedValue = typeof value === 'function' ? (value as any)(showAIState) : value;
    if (resolvedValue) {
      console.log(
        `%c🔮 [OSINT_DEBUG] OPENING AI Sidebar Drawer (showAI -> true)`,
        "color: #a78bfa; font-weight: bold; background-color: rgba(167, 139, 250, 0.15); padding: 4px; border-radius: 4px;"
      );
      console.log("[OSINT_DEBUG] AI Sidebar Open triggering stack trace:\n", stack);
    } else {
      if (showAIState) {
        console.warn(
          `%c🔮 [OSINT_DEBUG] CLOSING AI Sidebar Drawer (showAI -> false)`,
          "color: #fb7185; font-weight: bold; background-color: rgba(251, 113, 133, 0.15); padding: 4px; border-radius: 4px;"
        );
        console.warn("[OSINT_DEBUG] AI Sidebar Close triggering stack trace (Стек вызовов закрытия AI-панели):\n", stack);
      }
    }
    setShowAIState(resolvedValue);
  };
  const showAI = showAIState;

  const [aiAutoQuery, setAiAutoQuery] = useState<string | null>(null);

  // Collab room
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastCursorUpdateRef = useRef<number>(0);
  const currentTheme = THEMES[selectedTheme];

  // History stack for Undo trigger
  const [history, setHistory] = useState<{ nodes: OSINTNode[]; edges: OSINTEdge[]; strokes: BoardStroke[] }[]>([]);

  // Rename board states in dashboard
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingText, setRenamingText] = useState('');
  const [newlyCreatedBoardId, setNewlyCreatedBoardId] = useState<string | null>(null);
  const dashboardCanceledRef = useRef(false);

  // ──────────────────────────────────────────────────────── AUTHENTICATION CHECKS on Startup
  useEffect(() => {
    const stored = localStorage.getItem('whiteboard_user');
    if (stored) {
      setCurrentUsername(stored);
      loadUserBoards(stored);
    }
  }, []);

  // Save changes locally if guest/offline
  useEffect(() => {
    if (currentUsername && currentBoardId && !roomId) {
      const updated = boards.map((b) =>
        b.id === currentBoardId ? { ...b, nodes, edges, strokes, comments, updatedAt: Date.now() } : b
      );
      setBoards(updated);
      localStorage.setItem(`whiteboard_boards_${currentUsername}`, JSON.stringify(updated));
    }
  }, [nodes, edges, strokes, comments]);

  // Global Key Bindings for Quick Tool switching and deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing inside inputs or contentEditables
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      const code = e.code;
      if (code === 'KeyV') {
        setActiveTool('select');
      } else if (code === 'KeyT') {
        setActiveTool('text');
      } else if (code === 'KeyH') {
        setActiveTool('hand');
      } else if (code === 'Delete' || code === 'Backspace' || e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        
        // Remove selected nodes and connected edges
        if (selectedNodeIds.length > 0) {
          saveStateToHistory();
          const nextNodes = nodes.filter(n => !selectedNodeIds.includes(n.id));
          const nextEdges = edges.filter(ed => !selectedNodeIds.includes(ed.from) && !selectedNodeIds.includes(ed.to));
          setNodes(nextNodes);
          setEdges(nextEdges);
          setSelectedNodeIds([]);
          pushCollabUpdate(nextNodes, nextEdges, strokes, comments);
        }

        // Remove selected strokes
        if (selectedStrokeIds.length > 0) {
          saveStateToHistory();
          const nextStrokes = strokes.filter(s => !selectedStrokeIds.includes(s.id));
          setStrokes(nextStrokes);
          setSelectedStrokeIds([]);
          pushCollabUpdate(nodes, edges, nextStrokes, comments);
        }

        // Remove selected edge
        if (selectedEdgeId) {
          saveStateToHistory();
          const nextEdges = edges.filter(ed => ed.id !== selectedEdgeId);
          setEdges(nextEdges);
          setSelectedEdgeId(null);
          pushCollabUpdate(nodes, nextEdges, strokes, comments);
        }
      } else if (e.ctrlKey && code === 'KeyZ') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, selectedStrokeIds, selectedEdgeId, nodes, edges, strokes, comments, history]);

  const loadUserBoards = (username: string) => {
    const raw = localStorage.getItem(`whiteboard_boards_${username}`);
    let loaded: OSINTBoard[] = [];
    if (raw) {
      try {
        loaded = JSON.parse(raw);
      } catch (err) {
        loaded = [];
      }
    }

    if (loaded.length === 0) {
      const defaultBoard: OSINTBoard = {
        id: 'board-welcome',
        name: 'Интерактивная доска №1',
        nodes: [
          {
            id: 'n1',
            type: 'text',
            x: 250,
            y: 160,
            width: 250,
            height: 90,
            label: '<b>Добро пожаловать на белую OSINT доску!</b>\n\nИспользуйте инструменты снизу для того, чтобы рисовать, добавлять новые карточки текста и соединять их.',
            fontFamily: 'mono',
            fontSize: 12,
            textColor: '#ffffff',
            bgColor: 'rgba(9,9,11,0.6)',
            borderColor: '#27272a',
            isBoxed: true,
          }
        ],
        edges: [],
        strokes: [],
        comments: [
          {
            id: 'welc-cmt',
            author: 'Система',
            text: 'Это совместное интерактивное полотно. Оставьте отзыв в чате слева.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            x: 300,
            y: 320,
          }
        ],
        updatedAt: Date.now(),
      };
      loaded = [defaultBoard];
      localStorage.setItem(`whiteboard_boards_${username}`, JSON.stringify(loaded));
    }

    setBoards(loaded);
    const active = loaded[0];
    setCurrentBoardId(active.id);
    setNodes(active.nodes || []);
    setEdges(active.edges || []);
    setStrokes(active.strokes || []);
    setComments(active.comments || []);
  };

  // ──────────────────────────────────────────────────────── API ACTION HANDLERS (register/login)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError('Введите имя пользователя и пароль');
      return;
    }

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Произошла непредвиденная ошибка');
        return;
      }

      if (authMode === 'register') {
        setAuthSuccess('Регистрация успешна! Теперь вы можете войти.');
        setAuthMode('login');
      } else {
        localStorage.setItem('whiteboard_user', data.username);
        setCurrentUsername(data.username);
        loadUserBoards(data.username);
        setCurrentView('dashboard');
      }
    } catch (err) {
      setAuthError('Не удалось подключиться к серверу базы данных. Пожалуйста войдите как гость.');
    }
  };

  const handleLogout = () => {
    handleDisconnectCollab();
    setCurrentUsername(null);
    setBoards([]);
    setNodes([]);
    setEdges([]);
    setStrokes([]);
    setComments([]);
    setCurrentBoardId('');
    setCurrentView('dashboard');
    localStorage.removeItem('whiteboard_user');
  };

  // ──────────────────────────────────────────────────────── HISTORY UNDO COMPONENT
  const saveStateToHistory = (customNodes = nodes, customEdges = edges, customStrokes = strokes) => {
    setHistory((prev) => [...prev.slice(-30), { nodes: customNodes, edges: customEdges, strokes: customStrokes }]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((old) => old.slice(0, -1));

    setNodes(prev.nodes);
    setEdges(prev.edges);
    setStrokes(prev.strokes);
    pushCollabUpdate(prev.nodes, prev.edges, prev.strokes, comments);
  };

  // ──────────────────────────────────────────────────────── SSE COLLABORATION SYNC
  const connectToCollaboration = (roomCode: string) => {
    if (!currentUsername) return;
    handleDisconnectCollab();

    const url = `/api/collab/${roomCode}/stream?name=${encodeURIComponent(currentUsername)}&color=${encodeURIComponent(penColor)}`;
    const source = new EventSource(url);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          const nextSrv = data.nodes || [];
          const currEditId = editingNodeIdRef.current;
          if (currEditId) {
            const merged = nextSrv.map((sn: OSINTNode) => {
              if (sn.id === currEditId) {
                const currentLocal = nodesRef.current.find(n => n.id === currEditId);
                return currentLocal || sn;
              }
              return sn;
            });
            setNodes(merged);
          } else {
            setNodes(nextSrv);
          }
          setEdges(data.edges || []);
          setStrokes(data.strokes || []);
          setComments(data.comments || []);
        } else if (data.type === 'update') {
          const nextSrv = data.nodes || [];
          const currEditId = editingNodeIdRef.current;
          if (currEditId) {
            const merged = nextSrv.map((sn: OSINTNode) => {
              if (sn.id === currEditId) {
                const currentLocal = nodesRef.current.find(n => n.id === currEditId);
                return currentLocal || sn;
              }
              return sn;
            });
            setNodes(merged);
          } else {
            setNodes(nextSrv);
          }
          setEdges(data.edges || []);
          setStrokes(data.strokes || []);
          setComments(data.comments || []);
        } else if (data.type === 'cursors') {
          const list = Object.values(data.cursors || {}) as PeerCursor[];
          setPeerCursors(list.filter((c) => c.name !== currentUsername));
        }
      } catch (e) {
        console.error('SSE sync parse failure', e);
      }
    };

    setRoomId(roomCode);
    setShowCollabModal(false);
  };

  const handleDisconnectCollab = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setRoomId(null);
    setPeerCursors([]);
  };

  const pushCollabUpdate = async (
    targetNodes = nodes,
    targetEdges = edges,
    targetStrokes = strokes,
    targetComments = comments
  ) => {
    if (!roomId) return;
    try {
      await fetch(`/api/collab/${roomId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: targetNodes,
          edges: targetEdges,
          strokes: targetStrokes,
          comments: targetComments,
        }),
      });
    } catch (e) {
      console.warn('Failed to publish state updates to replication cluster.');
    }
  };

  // Dispatch mouse moves to display peer cursor
  const handleWorkspacePointerMove = (e: ReactMouseEvent) => {
    if (!roomId || !currentUsername) return;
    
    // Throttle cursor synchronization to once per 100ms
    const now = Date.now();
    if (now - lastCursorUpdateRef.current < 100) return;
    lastCursorUpdateRef.current = now;

    const canvasSurface = document.getElementById('workspace-surface');
    if (!canvasSurface) return;

    const rect = canvasSurface.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    fetch(`/api/collab/${roomId}/cursor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: currentUsername,
        color: penColor,
        x,
        y,
      }),
    }).catch(() => {});
  };

  // ──────────────────────────────────────────────────────── VISUAL DATA GRAPH MODIFICATIONS
  const handleAddNode = (
    type: NodeType,
    label?: string,
    customX?: number,
    customY?: number,
    isBoxed = true,
    textColor?: string,
    borderColor?: string,
    bgColor?: string,
    connectFromNodeId?: string,
    width?: number,
    height?: number,
    osintData?: OSINTNode['osintData']
  ) => {
    if (!currentUsername) return;
    saveStateToHistory();

    const finalX = customX !== undefined ? customX : 200;
    const finalY = customY !== undefined ? customY : 150;

    const newId = 'node-' + Date.now() + Math.floor(Math.random() * 90);
    const newNode: OSINTNode = {
      id: newId,
      type: 'text',
      x: finalX,
      y: finalY,
      width: width !== undefined ? width : 140, // compact width by default
      height: height !== undefined ? height : 60, // compact height by default
      label: label || 'Заметка...',
      fontFamily: 'mono',
      fontSize: 12,
      textColor: textColor || '#ffffff',
      bgColor: bgColor || 'rgba(9,9,11,0.6)',
      borderColor: borderColor || '#27272a',
      isBoxed,
      scale: 1,
      manuallyResized: width !== undefined || height !== undefined ? true : undefined,
      osintData,
      osintCollapsed: false,
    };

    const nextNodes = [...nodes, newNode];
    let nextEdges = [...edges];

    if (connectFromNodeId) {
      const newEdge: OSINTEdge = {
        id: 'edge-' + Date.now() + Math.floor(Math.random() * 90),
        from: connectFromNodeId,
        to: newId,
        lineType: 'curved',
      };
      nextEdges.push(newEdge);
      setEdges(nextEdges);
    }

    setNodes(nextNodes);
    setSelectedNodeIds([newId]);
    setActiveTool('select');
    pushCollabUpdate(nextNodes, nextEdges, strokes, comments);
    return newId;
  };

  const handleNodesDrag = (updates: { id: string; x: number; y: number }[]) => {
    const updateMap = new Map(updates.map(u => [u.id, u]));
    const next = nodes.map((n) => {
      const u = updateMap.get(n.id);
      return u ? { ...n, x: u.x, y: u.y } : n;
    });
    setNodes(next);
  };

  const handleUpdateNode = (updated: OSINTNode, skipSync = false) => {
    setNodes((prevNodes) => {
      const next = prevNodes.map((n) => (n.id === updated.id ? updated : n));
      if (!skipSync) {
        pushCollabUpdate(next, edges, strokes, comments);
      }
      return next;
    });
  };

  const handleRunVerification = (node: OSINTNode) => {
    setShowAI(true);
    setAiAutoQuery(`Пожалуйста, проведите глубокий OSINT анализ следующего объекта: "${node.label}" (тип: ${node.isBoxed ? 'карточка' : 'простой текст'}). Предоставьте связанные риски, утечки информации, метаданные и дайте практические рекомендации по расследованию.`);
  };

  const handleRunOSINTLookup = (nodeId: string, type: string, subtype: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Get a clean version of parent's label (strip HTML tags structure if any)
    const cleanLabel = node.label.replace(/<[^>]*>/g, '').trim();

    // Spawn a nicely styled loading node connected to parent
    const spawnX = node.x + node.width + 120;
    const spawnY = node.y + (node.height / 2) - 50;

    const loadingLabel = `
<div style="font-family: var(--font-mono), monospace; font-size: 8.5px; text-align: left; line-height: 1.25; color: #a1a1aa; pointer-events: none; user-select: none;">
  <span style="color: #64748b;">Lookup:</span> <span style="color: #6366f1; font-weight: bold;">searching</span>
  <div style="color: #71717a; font-size: 7.5px; margin-top: 1px;">⚙️ querying databases...</div>
</div>
    `.trim();

    const spawnedNodeId = handleAddNode(
      'text',
      loadingLabel,
      spawnX,
      spawnY,
      false, // isBoxed (make it floating text, absolutely no background border container)
      '#a1a1aa', // textColor
      'transparent', // borderColor
      'transparent', // bgColor
      nodeId, // connect from parent
      150, // custom width (compact square-like width)
      50, // custom height (compact height)
      {
        type,
        subtype,
        target: cleanLabel,
        toolName: `${type.toUpperCase()} Lookup`,
        status: 'searching'
      }
    );

    if (!spawnedNodeId) return;

    // Muted professional dark theme credentials
    const textColor = '#cbd5e1';
    const borderColor = 'transparent';
    const bgColor = 'transparent';

    const payload = { type, subtype, target: cleanLabel };

    // Fire the real API lookup to express
    fetch('/api/osint/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.error || 'Inquiry timed out.');
        }
        return data;
      })
      .then((data) => {
        const { toolName, durationMs, status, target, result } = data;
        
        let formattedLines = '';
        if (result && typeof result === 'object') {
          formattedLines = Object.entries(result)
            .slice(0, 5)
            .map(([k, v]) => {
              const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
              const valDisplay = valStr.length > 20 ? valStr.slice(0, 18) + '..' : valStr;
              return `  ${k}: ${valDisplay}`;
            })
            .join('\n');
        } else {
          formattedLines = `  status: ${status || 'SUCCESS'}`;
        }

        // Beautiful compact monospace presentation layout
        const finalContent = `
<div style="font-family: var(--font-mono), monospace; font-size: 8.5px; text-align: left; line-height: 1.25; color: #a1a1aa; pointer-events: none; user-select: none;">
  <span style="color: #64748b;">Lookup:</span> <span style="color: #10b981; font-weight: bold;">success</span>
  <div style="margin-top: 2px; color: #cbd5e1; font-family: monospace; white-space: pre-wrap; word-break: break-all;">{
${formattedLines}
}</div>
</div>
        `.trim();

        // Update with successful values!
        handleUpdateNode({
          id: spawnedNodeId,
          type: 'text',
          x: spawnX,
          y: spawnY,
          width: 170,
          height: 110,
          label: finalContent,
          fontFamily: 'mono',
          fontSize: 10,
          textColor,
          borderColor,
          bgColor,
          isBoxed: false,
          scale: 1,
          manuallyResized: true,
          osintData: {
            type,
            subtype,
            target: cleanLabel,
            toolName: toolName || `${type.toUpperCase()} ${subtype.toUpperCase()}`,
            durationMs,
            status: 'success',
            result: result
          },
          osintCollapsed: false
        });
      })
      .catch((err) => {
        const errMsg = err.message || 'Error occurred';
        const formattedErr = errMsg.length > 20 ? errMsg.slice(0, 18) + '..' : errMsg;
        const errorContent = `
<div style="font-family: var(--font-mono), monospace; font-size: 8.5px; text-align: left; line-height: 1.25; color: #f87171; pointer-events: none; user-select: none;">
  <span style="color: #ef4444; font-weight: bold;">Lookup: failed</span>
  <div style="margin-top: 2px; color: #fecaca; font-family: monospace; white-space: pre-wrap; word-break: break-all;">{
  error: "${formattedErr}"
}</div>
</div>
        `.trim();

        handleUpdateNode({
          id: spawnedNodeId,
          type: 'text',
          x: spawnX,
          y: spawnY,
          width: 170,
          height: 70,
          label: errorContent,
          fontFamily: 'mono',
          fontSize: 10,
          textColor: '#fca5a5',
          borderColor: 'transparent',
          bgColor: 'transparent',
          isBoxed: false,
          scale: 1,
          manuallyResized: true,
          osintData: {
            type,
            subtype,
            target: cleanLabel,
            toolName: `${type.toUpperCase()} Lookup`,
            status: 'failed',
            error: errMsg
          },
          osintCollapsed: false
        });
      });
  };

  const handleDeleteNode = (nodeId: string) => {
    saveStateToHistory();
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNodeIds(prev => prev.filter(id => id !== nodeId));
    pushCollabUpdate(nextNodes, nextEdges, strokes, comments);
  };

  const handleConnectNodes = (
    from: string,
    to: string,
    fromSide?: 'top' | 'bottom' | 'left' | 'right',
    toSide?: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    saveStateToHistory();
    const newEdge: OSINTEdge = {
      id: 'edge-' + Date.now() + Math.floor(Math.random() * 90),
      from,
      to,
      lineType: 'curved',
      fromSide,
      toSide,
    };
    const nextEdges = [...edges, newEdge];
    setEdges(nextEdges);
    pushCollabUpdate(nodes, nextEdges, strokes, comments);
  };

  const handleUpdateEdge = (updated: OSINTEdge) => {
    const next = edges.map((e) => (e.id === updated.id ? updated : e));
    setEdges(next);
    pushCollabUpdate(nodes, next, strokes, comments);
  };

  const handleDeleteEdge = (edgeId: string) => {
    saveStateToHistory();
    const nextEdges = edges.filter((e) => e.id !== edgeId);
    setEdges(nextEdges);
    setSelectedEdgeId(null);
    pushCollabUpdate(nodes, nextEdges, strokes, comments);
  };

  // Add a newly drawn freehand path stroke
  const handleAddStroke = (newStroke: BoardStroke) => {
    saveStateToHistory();
    const nextStrokes = [...strokes, newStroke];
    setStrokes(nextStrokes);
    pushCollabUpdate(nodes, edges, nextStrokes, comments);
  };

  // Co-op sticky comment visual boards pin
  const handleAddCommentToBoard = (text: string, x: number, y: number) => {
    if (!currentUsername) return;
    
    const newComment: BoardComment = {
      id: 'cmt-' + Date.now() + Math.floor(Math.random() * 900),
      author: currentUsername,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      x,
      y,
    };

    const nextComments = [...comments, newComment];
    setComments(nextComments);
    pushCollabUpdate(nodes, edges, strokes, nextComments);
  };

  // General sidebar chat feed comment dispatcher
  const handleAddGeneralComment = (text: string) => {
    if (!currentUsername) return;

    if (roomId) {
      fetch(`/api/collab/${roomId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: currentUsername,
          text,
        }),
      }).catch(() => {});
    } else {
      const newComment: BoardComment = {
        id: 'cmt-' + Date.now() + Math.floor(Math.random() * 900),
        author: currentUsername,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const nextComments = [...comments, newComment];
      setComments(nextComments);
    }
  };

  const handleSwitchBoard = (id: string) => {
    const target = boards.find((b) => b.id === id);
    if (target) {
      setCurrentBoardId(id);
      setNodes(target.nodes || []);
      setEdges(target.edges || []);
      setStrokes(target.strokes || []);
      setComments(target.comments || []);
      setSelectedNodeIds([]);
      setSelectedStrokeIds([]);
      setSelectedEdgeId(null);
      setHistory([]);
      pushCollabUpdate(target.nodes, target.edges, target.strokes, target.comments);
    }
  };

  const handleCreateNewBoard = () => {
    if (!currentUsername) return;
    const newId = 'board-' + Date.now();
    const defaultName = `Проект #${boards.length + 1}`;
    const newBoard: OSINTBoard = {
      id: newId,
      name: defaultName,
      nodes: [],
      edges: [],
      strokes: [],
      comments: [],
      updatedAt: Date.now(),
    };
    const nextList = [...boards, newBoard];
    setBoards(nextList);
    localStorage.setItem(`whiteboard_boards_${currentUsername}`, JSON.stringify(nextList));
    
    // Trigger rename inline edit mode silently without board auto-switching:
    setNewlyCreatedBoardId(newId);
    
    if (currentView !== 'board') {
      setRenamingBoardId(newId);
      setRenamingText(defaultName);
    }
  };

  const handleRenameBoard = (id: string, newName: string) => {
    if (!currentUsername) return;
    const nextList = boards.map((b) => (b.id === id ? { ...b, name: newName } : b));
    setBoards(nextList);
    localStorage.setItem(`whiteboard_boards_${currentUsername}`, JSON.stringify(nextList));
  };

  const handleDeleteBoard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (boards.length <= 1) return;
    const filtered = boards.filter((b) => b.id !== id);
    setBoards(filtered);
    localStorage.setItem(`whiteboard_boards_${currentUsername!}`, JSON.stringify(filtered));
    if (id === currentBoardId) {
      const fallback = filtered[0];
      setCurrentBoardId(fallback.id);
      setNodes(fallback.nodes || []);
      setEdges(fallback.edges || []);
      setStrokes(fallback.strokes || []);
      setComments(fallback.comments || []);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges, strokes, comments }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `whiteboard_export_${currentBoardId || 'board'}.json`);
    dlAnchorElem.click();
  };

  const handleGraphAutoLayout = () => {
    if (nodes.length === 0) return;
    saveStateToHistory();

    let tempNodes = [...nodes];
    const width = 160;
    const height = 44;

    const iterations = 45;
    const k = 140; 
    const attraction_coefficient = 0.05;
    const repulsion_coefficient = 6000;

    for (let iter = 0; iter < iterations; iter++) {
      const forces = tempNodes.map(() => ({ fx: 0, fy: 0 }));

      for (let i = 0; i < tempNodes.length; i++) {
        for (let j = 0; j < tempNodes.length; j++) {
          if (i === j) continue;
          const dx = tempNodes[i].x - tempNodes[j].x;
          const dy = tempNodes[i].y - tempNodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 400) {
            const force = repulsion_coefficient / (dist * dist);
            forces[i].fx += (dx / dist) * force;
            forces[i].fy += (dy / dist) * force;
          }
        }
      }

      edges.forEach((edge) => {
        const fromIdx = tempNodes.findIndex((n) => n.id === edge.from);
        const toIdx = tempNodes.findIndex((n) => n.id === edge.to);

        if (fromIdx !== -1 && toIdx !== -1) {
          const dx = tempNodes[toIdx].x - tempNodes[fromIdx].x;
          const dy = tempNodes[toIdx].y - tempNodes[fromIdx].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = attraction_coefficient * (dist - k);
          forces[fromIdx].fx += (dx / dist) * force;
          forces[fromIdx].fy += (dy / dist) * force;

          forces[toIdx].fx -= (dx / dist) * force;
          forces[toIdx].fy -= (dy / dist) * force;
        }
      });

      tempNodes = tempNodes.map((node, idx) => {
        const dx = Math.max(-50, Math.min(50, forces[idx].fx));
        const dy = Math.max(-50, Math.min(50, forces[idx].fy));
        return {
          ...node,
          x: node.x + dx,
          y: node.y + dy,
        };
      });
    }

    setNodes(tempNodes);
    pushCollabUpdate(tempNodes, edges, strokes, comments);
    handleFitToScreen(tempNodes);
  };

  const handleFitToScreen = (customNodesArr = nodes) => {
    const activeNodes = customNodesArr;
    if (activeNodes.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    activeNodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const w = maxX - minX;
    const h = maxY - minY;

    const surface = document.getElementById('workspace-surface');
    if (!surface) return;

    const viewW = surface.clientWidth;
    const viewH = surface.clientHeight;

    const padding = 120;
    const scale = Math.max(0.3, Math.min(2.0, Math.min(viewW / (w + padding), viewH / (h + padding))));

    setZoom(scale);
    setPan({
      x: (viewW - w * scale) / 2 - minX * scale,
      y: (viewH - h * scale) / 2 - minY * scale,
    });
  };

  // ──────────────────────────────────────────────────────── RENDER THE APPLICATION GATEWAY (LOGIN/REGISTER)
  if (!currentUsername) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-zinc-100 font-sans p-4 antialiased relative overflow-hidden">
        <InteractiveBackground />
        <div className="w-full max-w-md bg-zinc-950/70 backdrop-blur-md border border-zinc-900 rounded-xl p-8 shadow-3xl flex flex-col space-y-6 relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 via-zinc-400 to-zinc-900 animate-pulse" />
          
          <div className="space-y-2 text-center select-none">
            <h1 className="text-xl font-mono tracking-wider text-white uppercase font-black">
              WHITEBOARD OSINT
            </h1>
            <p className="text-xs text-zinc-450 uppercase tracking-widest leading-relaxed">
              Интерактивная доска для расследований и визуализации карт
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-955/20 border border-red-900/60 rounded text-red-400 text-xs font-mono font-medium leading-relaxed">
              ✖ {authError}
            </div>
          )}

          {authSuccess && (
            <div className="p-3 bg-emerald-955/20 border border-emerald-900/60 rounded text-emerald-400 text-xs font-mono font-medium leading-relaxed">
              ✔ {authSuccess}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[9.5px] uppercase font-mono tracking-widest text-zinc-550 mb-1 font-bold">
                Логин
              </label>
              <input
                type="text"
                autoComplete="username"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-620 text-xs font-mono px-3.5 py-2.5 rounded text-white outline-none placeholder-zinc-700 font-medium"
                placeholder="Имя аналитика"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[9.5px] uppercase font-mono tracking-widest text-zinc-550 mb-1 font-bold">
                Пароль
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-620 text-xs font-mono px-3.5 py-2.5 rounded text-white outline-none placeholder-zinc-700 font-medium"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-white hover:bg-zinc-200 text-black py-2.5 rounded text-xs font-mono font-bold uppercase cursor-pointer transition-all duration-100 flex items-center justify-center space-x-2"
            >
              <UserCheck className="w-4 h-4 ml-1" />
              <span>{authMode === 'login' ? 'Войти' : 'Зарегистрировать'}</span>
            </button>
          </form>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-xs font-mono text-zinc-500">
            <span>
              {authMode === 'login' ? 'Нет аккаунта?' : 'Уже зарегистрированы?'}
            </span>
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
                setAuthSuccess('');
              }}
              className="text-white hover:underline cursor-pointer font-bold"
            >
              {authMode === 'login' ? 'Регистрация' : 'Вход'}
            </button>
          </div>

          <button
            onClick={() => {
              localStorage.setItem('whiteboard_user', 'Инспектор_Демо');
              setCurrentUsername('Инспектор_Демо');
              loadUserBoards('Инспектор_Демо');
              setCurrentView('dashboard');
            }}
            className="w-full py-2 bg-transparent hover:bg-zinc-900/40 text-[10px] font-mono tracking-widest text-zinc-400 font-bold rounded border border-zinc-900 flex items-center justify-center cursor-pointer transition-colors"
          >
            Войти как Гость (Песочница)
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────── RENDER MAIN BOARDS MENU/DASHBOARD (Page 1)
  if (currentView === 'dashboard') {
    const filteredBoards = boards.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className={`w-screen h-screen overflow-y-auto font-sans text-zinc-300 relative select-none flex flex-col ${THEMES.dark.bg} overflow-hidden`}>
        <InteractiveBackground />
        {/* Subtle decorative visual elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-905/40 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-zinc-905/40 rounded-full blur-3xl pointer-events-none z-0" />

        {/* COMPACT DASHBOARD HEADER */}
        <header className="h-11 border-b border-zinc-900/60 flex items-center justify-between px-6 bg-zinc-950/40 backdrop-blur-md shrink-0 z-10 select-none">
          <div className="flex items-center space-x-3">
            <Layout className="w-4.5 h-4.5 text-zinc-400 animate-pulse" />
            <span className="font-mono text-xs text-white uppercase font-black tracking-widest">
              WHITEBOARD OSINT HUB
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Аналитик: <strong className="text-zinc-200">{currentUsername}</strong>
            </span>
            <div className="w-px h-4.5 bg-zinc-850" />
            <button
              onClick={handleLogout}
              className="text-[10px] font-mono text-zinc-500 hover:text-red-400 flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </header>

        {/* CORE CONTAINER */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 z-10 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-zinc-900/80">
            <div>
              <h1 className="text-xl font-mono text-white tracking-tight font-bold uppercase">
                Панель Аналитических Проектов
              </h1>
              <p className="text-xs text-zinc-500 leading-normal mt-1 max-w-lg">
                Управляйте независимыми холстами расследований. Создавайте новые пространства для визуализации связей, утечек и OSINT-логов.
              </p>
            </div>

            <button
              onClick={handleCreateNewBoard}
              className="bg-white hover:bg-zinc-200 text-black px-4.5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase transition-all duration-100 flex items-center cursor-pointer shrink-0 shadow-lg"
            >
              <FolderPlus className="w-4 h-4 mr-1.5" />
              Создать Доску
            </button>
          </div>

          {/* SEARCH & FILTERS CONTROLS */}
          <div className="flex items-center space-x-3.5 py-5.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-650 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по названию расследования..."
                className="w-full bg-[#09090b]/80 border border-zinc-850 focus:border-zinc-700 text-xs font-mono pl-9 pr-4 py-2 rounded-lg text-white outline-none placeholder-zinc-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* GRID BOARDS */}
          {filteredBoards.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center py-24 text-center border border-dashed border-zinc-900 rounded-2xl bg-[#09090b]/20 select-none">
              <Clock className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest font-bold">Ничего не найдено</p>
              <p className="text-[11px] text-zinc-600 max-w-xs leading-relaxed mt-1">Отредактируйте параметры поиска или создайте свой первый проект</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBoards.map((b) => {
                const nodeCount = b.nodes?.length || 0;
                const edgeCount = b.edges?.length || 0;
                const strokeCount = b.strokes?.length || 0;
                const commentCount = b.comments?.length || 0;
                const dateLabel = new Date(b.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      handleSwitchBoard(b.id);
                      setCurrentView('board');
                    }}
                    className="group border border-zinc-850 hover:border-zinc-650 bg-zinc-950/60 hover:bg-zinc-950 rounded-xl p-5 flex flex-col justify-between h-44 cursor-pointer relative overflow-hidden transition-all duration-150 shadow-md select-none"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        {renamingBoardId === b.id ? (
                          <input
                            autoFocus
                            type="text"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 text-xs px-2 py-1 outline-none text-white rounded font-bold w-11/12"
                            value={renamingText}
                            onChange={(e) => setRenamingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (renamingText.trim()) {
                                  handleRenameBoard(b.id, renamingText.trim());
                                }
                                setRenamingBoardId(null);
                              } else if (e.key === 'Escape') {
                                dashboardCanceledRef.current = true;
                                setRenamingBoardId(null);
                              }
                            }}
                            onBlur={() => {
                              if (!dashboardCanceledRef.current) {
                                if (renamingText.trim()) {
                                  handleRenameBoard(b.id, renamingText.trim());
                                }
                              }
                              dashboardCanceledRef.current = false;
                              setRenamingBoardId(null);
                            }}
                          />
                        ) : (
                          <h3 className="font-mono text-xs font-bold text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                            {b.name}
                          </h3>
                        )}

                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            title="Переименовать"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingBoardId(b.id);
                              setRenamingText(b.name);
                            }}
                            className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Удалить доску"
                            disabled={boards.length <= 1}
                            onClick={(e) => handleDeleteBoard(b.id, e)}
                            className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-red-400 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info metrics */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded">
                          Ноды: {nodeCount}
                        </span>
                        <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded">
                          Связи: {edgeCount}
                        </span>
                        {strokeCount > 0 && (
                          <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded">
                            Рисунки: {strokeCount}
                          </span>
                        )}
                        {commentCount > 0 && (
                          <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded">
                            💬 {commentCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-900 pt-2.5 mt-4">
                      <span className="text-[10px] font-mono text-zinc-550 flex items-center space-x-1 select-none">
                        <Clock className="w-3 h-3 text-zinc-600 mr-0.5" /> {dateLabel}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white flex items-center font-bold tracking-wider">
                        ОТКРЫТЬ <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────── RENDER THE CORE APPLICATION WORKSPACE (Page 2)
  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden text-zinc-100 ${currentTheme.bg}`}>
      
      {/* ── TOP BAR (EXQUISITE COMPACT MINIMALIST HEADER) */}
      <header className="h-11 border-b border-zinc-900/60 flex items-center justify-between px-3 select-none bg-zinc-950/40 backdrop-blur-md shrink-0 z-40">
        
        {/* Left section: Back navigation, Switch theme inline and board quick stats */}
        <div className="flex items-center space-x-3.5">
          {/* Back button requested #6 */}
          <button
            onClick={() => {
              setCurrentView('dashboard');
              setSelectedNodeIds([]);
              setSelectedStrokeIds([]);
              setSelectedEdgeId(null);
            }}
            className="bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-805 text-zinc-300 text-[10.5px] uppercase font-mono tracking-wider font-bold py-1 px-3 rounded flex items-center cursor-pointer transition-colors"
          >
            ← В МЕНЮ РАССПЛЕДОВАНИЙ
          </button>

          <div className="w-px h-4.5 bg-zinc-800" />

          {/* Inline Theme Changer Dropdown */}
          <div className="flex items-center space-x-1.5 bg-zinc-900/40 px-2 py-1 rounded border border-zinc-850">
            <Palette className="w-3.5 h-3.5 text-zinc-500" />
            <select
              className="bg-transparent text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300 outline-none border-none cursor-pointer pr-1"
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value as ThemeType)}
              title="Изменить тему доски"
            >
              <option value="dark" className="bg-zinc-950 text-white">DEFAULT DARK</option>
              <option value="light" className="bg-white text-black">LIGHT CANVAS</option>
              <option value="solarized" className="bg-[#002b36] text-[#93a1a1]">SOLARIZED</option>
              <option value="matrix" className="bg-black text-green-400">MATRIX CODE</option>
              <option value="slate" className="bg-[#1e293b] text-slate-100">SLATE INDIGO</option>
            </select>
          </div>
        </div>

        {/* Right section: System, AI Assistant & Collaboration settings */}
        <div className="flex items-center space-x-2">
          
          {roomId ? (
            <div className="flex items-center space-x-1.5 bg-emerald-950/20 border border-emerald-900/40 px-2.5 py-1 rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[9px] text-emerald-300 font-bold uppercase">КООПЕРАЦИЯ: {roomId}</span>
              <button
                onClick={handleDisconnectCollab}
                className="text-[9px] font-mono text-zinc-400 hover:text-white font-bold ml-1.5 cursor-pointer hover:underline"
              >
                Выйти
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCollabModal(true)}
              className="bg-zinc-900/70 hover:bg-zinc-850/80 border border-zinc-850/80 hover:border-zinc-700 text-zinc-300 text-[10px] uppercase font-mono tracking-wider font-bold py-1 px-2.5 rounded flex items-center cursor-pointer transition-all duration-100"
            >
              <Share2 className="w-3.5 h-3.5 mr-1 text-zinc-400" />
              Коллаборация
            </button>
          )}

          <div className="w-px h-4.5 bg-zinc-800" />

          {/* AI Guardian summary analyzer */}
          <button
            onClick={() => setShowAI(!showAI)}
            className={`font-mono text-[10px] uppercase tracking-wider font-bold py-1 px-2.5 rounded flex items-center cursor-pointer transition-all ${
              showAI
                ? 'bg-zinc-100 text-zinc-950 shadow'
                : 'bg-zinc-900/70 hover:bg-zinc-850 text-zinc-300 border border-zinc-80d hover:border-zinc-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-400" />
            AI Аналитик
          </button>

          <button
            onClick={handleExportJSON}
            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 py-1 px-2.5 rounded text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Export
          </button>

          <button
            onClick={handleLogout}
            className="p-1 px-2.5 bg-zinc-900 hover:bg-red-955/20 text-zinc-500 hover:text-red-400 rounded cursor-pointer border border-zinc-850"
            title={`Выйти из аналитика: ${currentUsername}`}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── ACTIVE CANVAS WORKSPACE PANELS */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT COMPACT MANAGEMENT PANEL (SIDEBAR) */}
        <div className={`transition-all duration-300 relative shrink-0 z-20 flex ${sidebarOpen ? 'w-80' : 'w-0'}`}>
          <div className="w-full h-full overflow-hidden">
            <Sidebar
              boards={boards}
              currentBoardId={currentBoardId}
              onSwitchBoard={handleSwitchBoard}
              onCreateBoard={handleCreateNewBoard}
              onRenameBoard={handleRenameBoard}
              onDeleteBoard={handleDeleteBoard}
              comments={comments}
              onAddGeneralComment={handleAddGeneralComment}
              themeColors={currentTheme}
              currentUsername={currentUsername}
              activeTool={activeTool}
              onChangeActiveTool={setActiveTool}
              penColor={penColor}
              setPenColor={setPenColor}
              onRecenter={() => handleFitToScreen()}
              onAutoLayout={handleGraphAutoLayout}
              onClearSelection={() => {
                setSelectedNodeIds([]);
                setSelectedStrokeIds([]);
              }}
              newlyCreatedBoardId={newlyCreatedBoardId}
              onClearNewlyCreatedBoardId={() => setNewlyCreatedBoardId(null)}
            />
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-4 h-16 bg-zinc-950 border border-zinc-850 border-l-0 hover:bg-zinc-900/90 rounded-r-md flex items-center justify-center text-zinc-450 hover:text-white cursor-pointer z-10 shadow-lg"
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {/* Workspace Canvas Board Layer */}
        <div id="workspace-surface" onMouseMove={handleWorkspacePointerMove} className="flex-1 h-full relative overflow-hidden">
          <Canvas
            nodes={nodes}
            edges={edges}
            strokes={strokes}
            comments={comments}
            selectedNodeIds={selectedNodeIds}
            selectedStrokeIds={selectedStrokeIds}
            selectedEdgeId={selectedEdgeId}
            onSelectNodes={setSelectedNodeIds}
            onSelectStrokes={setSelectedStrokeIds}
            onSelectEdge={(id) => {
              setSelectedEdgeId(id);
              if (id) {
                setPropertiesOpen(true);
              }
            }}
            onNodeDrag={(id, x, y) => {
              const node = nodes.find((n) => n.id === id);
              if (node) {
                handleUpdateNode({ ...node, x, y }, true);
              }
            }}
            onNodesDrag={handleNodesDrag}
            onNodeDragEnd={() => {
              pushCollabUpdate(nodes, edges, strokes, comments);
            }}
            onRunVerification={handleRunVerification}
            onRunOSINTLookup={handleRunOSINTLookup}
            onConnect={handleConnectNodes}
            onUpdateEdge={handleUpdateEdge}
            onUpdateEdgeLabel={(edgeId, label) => {
              const edge = edges.find((e) => e.id === edgeId);
              if (edge) handleUpdateEdge({ ...edge, label });
            }}
            onAddTextNode={(x, y, isBoxed, label, textColor, borderColor, bgColor, connectFromNodeId) =>
              handleAddNode('text', label || 'Заметка...', x, y, isBoxed, textColor, borderColor, bgColor, connectFromNodeId)
            }
            onUpdateNode={handleUpdateNode}
            peerCursors={peerCursors}
            themeColors={currentTheme}
            activeTool={activeTool}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
            onDeleteNode={handleDeleteNode}
            onAddStroke={handleAddStroke}
            strokeColor={penColor}
            editingNodeId={editingNodeId}
            onSetEditingNodeId={setEditingNodeId}
            onChangeActiveTool={setActiveTool}
          />

          {/* Quick Stats monitor panel - scale only */}
          <div className="absolute bottom-4 left-4 p-2.5 bg-zinc-950/90 backdrop-blur-md rounded border border-zinc-850 text-[9.5px] font-mono leading-relaxed pointer-events-none select-none md:block hidden text-zinc-300">
            Масштаб: <strong className="text-zinc-100">{Math.round(zoom * 100)}%</strong>
          </div>
        </div>

        {/* RIGHT COLLAPSIBLE DRAWER (PROPERTIES INSPECTOR) */}
        <div className={`transition-all duration-300 relative shrink-0 z-20 flex ${propertiesOpen ? 'w-80' : 'w-0'}`}>
          <button
            onClick={() => setPropertiesOpen(!propertiesOpen)}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-4 h-16 bg-zinc-950 border border-zinc-850 border-r-0 hover:bg-zinc-900/90 rounded-l-md flex items-center justify-center text-zinc-455 hover:text-white cursor-pointer z-10 shadow-lg"
          >
            {propertiesOpen ? '›' : '‹'}
          </button>

          <div className="w-full h-full overflow-hidden">
            <PropertiesPanel
              selectedNode={nodes.find((n) => n.id === selectedNodeId) || null}
              selectedEdge={edges.find((e) => e.id === selectedEdgeId) || null}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onUpdateEdge={handleUpdateEdge}
              onDeleteEdge={handleDeleteEdge}
              onAddCommentToBoard={handleAddCommentToBoard}
              themeColors={currentTheme}
              comments={comments}
            />
          </div>
        </div>

        {/* AI CO-ANALYST ASSISTANT OVERLAY SIDEBAR */}
        {showAI && (
          <div className="w-85 h-full border-l border-zinc-850 flex flex-col shrink-0 relative z-30 shadow-3xl bg-zinc-950 select-text">
            <div className="h-11 bg-zinc-950 border-b border-zinc-850 px-4 flex items-center justify-between shrink-0">
              <span className="font-mono text-[9.5px] uppercase tracking-widest text-zinc-410 font-bold flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-zinc-400" /> AI Аналитик Доски
              </span>
              <button
                onClick={() => setShowAI(false)}
                className="text-zinc-500 hover:text-white cursor-pointer font-bold text-sm"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <AIAssistant
                nodes={nodes}
                edges={edges}
                themeColors={currentTheme}
                comments={comments}
                aiAutoQuery={aiAutoQuery}
                onClearAutoQuery={() => setAiAutoQuery(null)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── COLLABORATION JOIN POPUP MODAL */}
      {showCollabModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-96 bg-zinc-950 border border-zinc-850 rounded-xl p-5 shadow-2xl space-y-4 relative z-50">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase tracking-widest font-black text-white">
                Подключить коллаборацию
              </h3>
              <button
                onClick={() => setShowCollabModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-455 leading-relaxed font-sans select-none">
              Введите единый код комнаты, чтобы синхронизировать рисование, заметки, форматирование шрифтов и мышиные курсоры в реальном времени!
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">
                  Имя (Ваш Позывной)
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full text-xs font-mono bg-zinc-900 border border-zinc-850 text-zinc-440 px-3 py-1.5 rounded outline-none cursor-not-allowed select-none"
                  value={currentUsername || ''}
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold mb-1">
                  Идентификатор Комнаты (Room ID)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="flex-1 text-xs font-mono bg-zinc-900 border border-zinc-805 text-white font-bold px-3 py-1.5 rounded outline-none placeholder-zinc-700"
                    placeholder="E.g., MY_ROOM_CODE"
                    value={roomId || ''}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  />
                  <button
                    onClick={() => {
                      const code = 'OSINT-' + Math.floor(Math.random() * 90000 + 10000);
                      setRoomId(code);
                    }}
                    className="bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-[10px] uppercase font-mono px-3 rounded font-bold cursor-pointer transition-colors border border-zinc-800"
                  >
                    Сгенерировать
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowCollabModal(false)}
                className="flex-1 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 py-2.5 text-[10px] uppercase font-mono tracking-wider rounded font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                disabled={!roomId}
                onClick={() => connectToCollaboration(roomId!)}
                className="flex-1 bg-white text-black hover:bg-zinc-200 py-2.5 text-[10px] uppercase font-mono tracking-wider rounded font-bold cursor-pointer transition-colors disabled:opacity-40"
              >
                Подключить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
