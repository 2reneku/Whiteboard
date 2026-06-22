import React, { useState, useEffect, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { NodeType, OSINTNode, OSINTEdge, PeerCursor, ThemeType, THEMES, BoardStroke, BoardComment } from './types';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AIAssistant from './components/AIAssistant';
import InteractiveBackground from './components/InteractiveBackground';
import BottomMapPanel from './components/BottomMapPanel';
import {
  Share2, Sparkles, Maximize2, Grid3X3, CornerUpLeft, X, Check,
  LogOut, Plus, Trash2, Edit2, Pencil, Pointer, Link2, FileText,
  UserCheck, Lock, Palette, Search, Layout, ChevronRight, FolderPlus, Clock,
  Mail, Chrome, Server, Send, Shield, ChevronDown
} from 'lucide-react';

interface OSINTBoard {
  id: string;
  name: string;
  nodes: OSINTNode[];
  edges: OSINTEdge[];
  strokes: BoardStroke[];
  comments: BoardComment[];
  updatedAt: number;
  isCollab?: boolean;
  roomId?: string;
}

export default function App() {
  // Check for invite link on loading
  const [pendingInvite, setPendingInvite] = useState<{ roomId: string; name: string } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Authentication states
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
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
  const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'text' | 'hand' | 'pencil' | 'map'>('select');
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
  const [draggedBoardId, setDraggedBoardId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const dashboardCanceledRef = useRef(false);

  // ──────────────────────────────────────────────────────── GOOGLE SIGN-IN & SMTP SYSTEM STATES
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState('');
  const [currentUserAvatarColor, setCurrentUserAvatarColor] = useState('#3b82f6');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const [tempAvatarColor, setTempAvatarColor] = useState('#3b82f6');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);

  const handleUpdateProfile = async (url: string, color: string) => {
    if (!currentUsername) return false;
    try {
      const res = await fetch('/api/auth/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          avatarUrl: url,
          avatarColor: color
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserAvatarUrl(data.avatarUrl || '');
        setCurrentUserAvatarColor(data.avatarColor || '#3b82f6');
        localStorage.setItem(`whiteboard_avatar_url_${currentUsername}`, data.avatarUrl || '');
        localStorage.setItem(`whiteboard_avatar_color_${currentUsername}`, data.avatarColor || '#3b82f6');
        return true;
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    }
    return false;
  };

  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  const handleDeleteComment = (id: string) => {
    saveStateToHistory();
    const nextComments = comments.filter(c => c.id !== id);
    setComments(nextComments);
    if (selectedCommentId === id) {
      setSelectedCommentId(null);
    }
    pushCollabUpdate(nodes, edges, strokes, nextComments);
  };

  // ──────────────────────────────────────────────────────── AUTHENTICATION CHECKS on Startup
  useEffect(() => {
    const autoLogin = async () => {
      const deviceToken = localStorage.getItem('whiteboard_device_token');
      if (deviceToken) {
        try {
          const res = await fetch('/api/auth/auto-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceToken })
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUsername(data.username);
            setCurrentUserAvatarUrl(data.avatarUrl || '');
            setCurrentUserAvatarColor(data.avatarColor || '#3b82f6');
            localStorage.setItem(`whiteboard_avatar_url_${data.username}`, data.avatarUrl || '');
            localStorage.setItem(`whiteboard_avatar_color_${data.username}`, data.avatarColor || '#3b82f6');
            loadUserBoards(data.username);
            return;
          }
        } catch (err) {
          console.error("Auto login failed:", err);
        }
        // If deviceToken exists but failed (e.g. server restarted or invalid token),
        // clear local storage so the analytic can enter credentials properly and cleanly.
        localStorage.removeItem('whiteboard_device_token');
        localStorage.removeItem('whiteboard_user');
      }
    };
    
    autoLogin();
  }, []);

  // Check for invite code in URL search params on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get('invite');
      let inviteName = params.get('name');
      if (inviteCode) {
        if (inviteName) {
          try {
            inviteName = decodeURIComponent(inviteName);
          } catch (e) {
            inviteName = inviteName.replace(/%[0-9A-F]{2}/gi, ' ');
          }
        }
        setPendingInvite({
          roomId: inviteCode.trim().toUpperCase(),
          name: inviteName ? inviteName.trim() : 'Совместное расследование'
        });
      }
    } catch (e) {
      console.error('Failed to parse invite link params', e);
    }
  }, []);

  // Process invite code once user boards are loaded and username exists
  useEffect(() => {
    if (currentUsername && pendingInvite && boards.length > 0) {
      // Is there already a board in our list that points to this roomId?
      const existingBoard = boards.find(b => b.roomId === pendingInvite.roomId);
      if (existingBoard) {
        // Switch board
        handleSwitchBoard(existingBoard.id);
        setCurrentView('board');
        setToastNotification({
          message: `Переключение на существующую кооперативную доску: "${existingBoard.name}"`,
          type: 'info'
        });
        setTimeout(() => setToastNotification(null), 4000);
      } else {
        // Create a new collaborative board
        const newBoard: OSINTBoard = {
          id: 'board-' + Date.now(),
          name: `[КООП] ${pendingInvite.name}`,
          nodes: [],
          edges: [],
          strokes: [],
          comments: [],
          updatedAt: Date.now(),
          isCollab: true,
          roomId: pendingInvite.roomId
        };
        const nextList = [newBoard, ...boards];
        setBoards(nextList);
        localStorage.setItem(`whiteboard_boards_${currentUsername}`, JSON.stringify(nextList));
        
        // Select it
        setCurrentBoardId(newBoard.id);
        setNodes([]);
        setEdges([]);
        setStrokes([]);
        setComments([]);
        setCurrentView('board');
        
        // Auto connect
        connectToCollaboration(pendingInvite.roomId);
        
        setToastNotification({
          message: `Кооперативная доска "${pendingInvite.name}" успешно подключена и добавлена в ваши проекты!`,
          type: 'success'
        });
        setTimeout(() => setToastNotification(null), 5000);
      }
      
      setPendingInvite(null);

      // Clean search query params so page refresh is clean
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        url.searchParams.delete('name');
        window.history.replaceState({}, document.title, url.pathname);
      } catch (err) {}
    }
  }, [currentUsername, pendingInvite, boards]);

  // Fetch security audit logs when authentication screen is showing
  useEffect(() => {
    if (!currentUsername) {
      const fetchLogs = async () => {
        try {
          const res = await fetch('/api/auth/logs');
          if (res.ok) {
            const data = await res.json();
            setSecurityLogs(data.logs || []);
          }
        } catch (err) {
          console.error("Failed to fetch auth logs:", err);
        }
      };
      
      fetchLogs();
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUsername]);

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

        // Remove selected comment
        if (selectedCommentId) {
          saveStateToHistory();
          const nextComments = comments.filter(c => c.id !== selectedCommentId);
          setComments(nextComments);
          setSelectedCommentId(null);
          pushCollabUpdate(nodes, edges, strokes, nextComments);
        }
      } else if ((e.ctrlKey || e.metaKey) && (code === 'KeyZ' || e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'я')) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, selectedStrokeIds, selectedEdgeId, selectedCommentId, nodes, edges, strokes, comments, history]);

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
      setAuthError('Укажите развед-позывной и пароль');
      return;
    }

    if (authUsername.trim().length < 2) {
      setAuthError('Имя позывного должно содержать как минимум 2 символа');
      return;
    }

    let endpoint = '/api/auth/login';
    let payload: any = {
      username: authUsername.trim(),
      password: authPassword.trim(),
      rememberDevice: rememberDevice
    };

    if (authMode === 'register') {
      endpoint = '/api/auth/register';
    } else if (authMode === 'reset') {
      endpoint = '/api/auth/reset-password';
      payload = {
        username: authUsername.trim(),
        newPassword: authPassword.trim()
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Действие не удалось.');
        return;
      }

      if (authMode === 'register') {
        setAuthSuccess('Регистрация осуществлена успешно! Теперь вы можете авторизоваться.');
        setAuthMode('login');
        if (data.deviceToken && rememberDevice) {
          localStorage.setItem('whiteboard_device_token', data.deviceToken);
        }
      } else if (authMode === 'reset') {
        setAuthSuccess('Пароль успешно сброшен и обновлен! Теперь вы можете авторизоваться.');
        setAuthMode('login');
      } else {
        if (data.deviceToken && rememberDevice) {
          localStorage.setItem('whiteboard_device_token', data.deviceToken);
        } else {
          localStorage.removeItem('whiteboard_device_token');
        }
        localStorage.setItem('whiteboard_user', data.username);
        setCurrentUsername(data.username);
        setCurrentUserAvatarUrl(data.avatarUrl || '');
        setCurrentUserAvatarColor(data.avatarColor || '#3b82f6');
        localStorage.setItem(`whiteboard_avatar_url_${data.username}`, data.avatarUrl || '');
        localStorage.setItem(`whiteboard_avatar_color_${data.username}`, data.avatarColor || '#3b82f6');
        loadUserBoards(data.username);
        setCurrentView('dashboard');
      }
    } catch (err) {
      setAuthError('Ошибка подключения к серверу авторизации. Войдите в гостевом режиме.');
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
    localStorage.removeItem('whiteboard_device_token');
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

    const url = `/api/collab/${roomCode}/stream?name=${encodeURIComponent(currentUsername)}&color=${encodeURIComponent(penColor)}&avatarUrl=${encodeURIComponent(currentUserAvatarUrl)}&avatarColor=${encodeURIComponent(currentUserAvatarColor)}`;
    const source = new EventSource(url);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          const nextSrv = data.nodes || [];
          const hasServerData = nextSrv.length > 0 || (data.edges && data.edges.length > 0) || (data.strokes && data.strokes.length > 0) || (data.comments && data.comments.length > 0);
          
          if (!hasServerData && (nodesRef.current.length > 0 || edgesRef.current.length > 0 || strokesRef.current.length > 0 || commentsRef.current.length > 0)) {
            // Seed server room with client board contents
            fetch(`/api/collab/${roomCode}/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodes: nodesRef.current,
                edges: edgesRef.current,
                strokes: strokesRef.current,
                comments: commentsRef.current,
              }),
            }).catch(() => {});
          } else {
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
          }
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

    if (currentBoardId) {
      setBoards((prevBoards) => {
        const updated = prevBoards.map((b) =>
          b.id === currentBoardId ? { ...b, isCollab: true, roomId: roomCode } : b
        );
        localStorage.setItem(`whiteboard_boards_${currentUsername}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleDisconnectCollab = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setRoomId(null);
    setPeerCursors([]);
  };

  const handleCopyInviteLink = () => {
    if (!roomId) return;
    const activeBoard = boards.find(b => b.id === currentBoardId);
    const bName = activeBoard ? activeBoard.name : 'Расследование';
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${roomId}&name=${encodeURIComponent(bName)}`;
    
    try {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2000);
      }).catch((err) => {
        console.error('navigator.clipboard error', err);
      });
    } catch (e) {
      console.error('Clipboard copy fail', e);
    }
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
        avatarUrl: currentUserAvatarUrl,
        avatarColor: currentUserAvatarColor,
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
    osintData?: OSINTNode['osintData'],
    mapData?: OSINTNode['mapData']
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
      mapData,
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
      
      if (target.isCollab && target.roomId) {
        connectToCollaboration(target.roomId);
      } else {
        handleDisconnectCollab();
      }
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

  const handleMergeBoards = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const sourceBoard = boards.find(b => b.id === sourceId);
    const targetBoard = boards.find(b => b.id === targetId);
    if (!sourceBoard || !targetBoard) return;

    // Find bounding box for target board elements
    let targetMaxX = -Infinity;
    let targetMinY = Infinity;
    
    if (targetBoard.nodes && targetBoard.nodes.length > 0) {
      targetBoard.nodes.forEach(n => {
        const right = (n.x || 0) + (n.width || 280);
        if (right > targetMaxX) targetMaxX = right;
        if (n.y < targetMinY) targetMinY = n.y;
      });
    }
    if (targetBoard.strokes && targetBoard.strokes.length > 0) {
      targetBoard.strokes.forEach(s => {
        if (s.points) {
          s.points.forEach(p => {
            if (p.x > targetMaxX) targetMaxX = p.x;
            if (p.y < targetMinY) targetMinY = p.y;
          });
        }
      });
    }
    if (targetBoard.comments && targetBoard.comments.length > 0) {
      targetBoard.comments.forEach(c => {
        if (c.x !== undefined) {
          if (c.x > targetMaxX) targetMaxX = c.x;
          if (c.y !== undefined && c.y < targetMinY) targetMinY = c.y;
        }
      });
    }

    // Find bounding box for source board elements
    let sourceMinX = Infinity;
    let sourceMinY = Infinity;

    if (sourceBoard.nodes && sourceBoard.nodes.length > 0) {
      sourceBoard.nodes.forEach(n => {
        if (n.x < sourceMinX) sourceMinX = n.x;
        if (n.y < sourceMinY) sourceMinY = n.y;
      });
    }
    if (sourceBoard.strokes && sourceBoard.strokes.length > 0) {
      sourceBoard.strokes.forEach(s => {
        if (s.points) {
          s.points.forEach(p => {
            if (p.x < sourceMinX) sourceMinX = p.x;
            if (p.y < sourceMinY) sourceMinY = p.y;
          });
        }
      });
    }
    if (sourceBoard.comments && sourceBoard.comments.length > 0) {
      sourceBoard.comments.forEach(c => {
        if (c.x !== undefined) {
          if (c.x < sourceMinX) sourceMinX = c.x;
          if (c.y !== undefined && c.y < sourceMinY) sourceMinY = c.y;
        }
      });
    }

    const hasTargetElements = targetMaxX !== -Infinity && targetMinY !== Infinity;
    const hasSourceElements = sourceMinX !== Infinity && sourceMinY !== Infinity;

    let shiftX = 0;
    let shiftY = 0;

    if (hasTargetElements && hasSourceElements) {
      const spacingX = 350; // Spacious padding to avoid overlaps
      shiftX = (targetMaxX + spacingX) - sourceMinX;
      shiftY = targetMinY - sourceMinY; // Match tops of structures so they align nicely
    }

    // Shift all source nodes, strokes and comments to avoid overlapping
    const shiftedSourceNodes = (sourceBoard.nodes || []).map(n => ({
      ...n,
      x: n.x + shiftX,
      y: n.y + shiftY
    }));

    const shiftedSourceStrokes = (sourceBoard.strokes || []).map(s => {
      if (s.points) {
        return {
          ...s,
          points: s.points.map(p => ({
            ...p,
            x: p.x + shiftX,
            y: p.y + shiftY
          }))
        };
      }
      return s;
    });

    const shiftedSourceComments = (sourceBoard.comments || []).map(c => {
      if (c.x !== undefined) {
        return {
          ...c,
          x: c.x + shiftX,
          y: c.y !== undefined ? c.y + shiftY : undefined
        };
      }
      return c;
    });

    // Combine materials: nodes, edges, strokes, comments
    const mergedNodes = [...(targetBoard.nodes || []), ...shiftedSourceNodes];
    const mergedEdges = [...(targetBoard.edges || []), ...(sourceBoard.edges || [])];
    const mergedStrokes = [...(targetBoard.strokes || []), ...shiftedSourceStrokes];
    const mergedComments = [...(targetBoard.comments || []), ...shiftedSourceComments];

    // Build the updated target board
    const updatedTargetBoard = {
      ...targetBoard,
      nodes: mergedNodes,
      edges: mergedEdges,
      strokes: mergedStrokes,
      comments: mergedComments,
      updatedAt: Date.now()
    };

    // Filter out the source board and update target board in the array
    const updatedList = boards
      .filter(b => b.id !== sourceId)
      .map(b => b.id === targetId ? updatedTargetBoard : b);

    setBoards(updatedList);
    if (currentUsername) {
      localStorage.setItem(`whiteboard_boards_${currentUsername}`, JSON.stringify(updatedList));
    }

    // If we merged the current active board into another, switch to target
    if (currentBoardId === sourceId) {
      setCurrentBoardId(targetId);
      setNodes(mergedNodes);
      setEdges(mergedEdges);
      setStrokes(mergedStrokes);
      setComments(mergedComments);
    } else if (currentBoardId === targetId) {
      // Just update current board state if we are active on target
      setNodes(mergedNodes);
      setEdges(mergedEdges);
      setStrokes(mergedStrokes);
      setComments(mergedComments);
    }

    setToastNotification({
      message: `Доска "${sourceBoard.name}" успешно объединена с "${targetBoard.name}"!`,
      type: 'success'
    });
    setTimeout(() => setToastNotification(null), 3500);
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
      <div className="w-screen h-screen flex items-center justify-center bg-black text-zinc-100 font-sans p-4 antialiased relative overflow-hidden select-none">
        <InteractiveBackground />
        
        <div className="w-full max-w-sm bg-zinc-950/85 backdrop-blur-md border border-zinc-900 rounded-xl p-8 shadow-2xl relative z-10 flex flex-col transition-all duration-300 animate-fade-in divide-y divide-zinc-900">
          <div className="pb-6 space-y-2 text-center">
            <h1 className="text-xl font-mono tracking-widest text-white uppercase font-black">
              WHITEBOARD OSINT
            </h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed">
              Интерактивная доска для расследований и визуализации карт
            </p>
          </div>

          <div className="pt-6 space-y-5">
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

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1.5 font-bold">
                  Позывной оператора (Nickname)
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-zinc-500 text-xs font-mono px-3.5 py-2.5 rounded text-white outline-none placeholder-zinc-700 font-medium transition-colors"
                  placeholder="Например, Inspector_X"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1.5 font-bold">
                  {authMode === 'reset' ? 'Новый секретный пароль' : 'Секретный пароль'}
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-zinc-500 text-xs font-mono px-3.5 py-2.5 rounded text-white outline-none placeholder-zinc-700 font-medium transition-colors"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              {authMode !== 'reset' && (
                <div className="flex items-center space-x-2 py-0.5">
                  <input
                    type="checkbox"
                    id="rememberDevice"
                    className="accent-white cursor-pointer w-3.5 h-3.5 focus:ring-0 rounded"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                  />
                  <label htmlFor="rememberDevice" className="text-[9.5px] font-mono text-zinc-404 select-none cursor-pointer">
                    Запомнить устройство
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-white hover:bg-zinc-200 text-black py-2.5 rounded text-xs font-mono font-bold uppercase cursor-pointer transition-all duration-100 flex items-center justify-center space-x-2"
              >
                <UserCheck className="w-4 h-4 animate-pulse mr-0.5" />
                <span>
                  {authMode === 'login' ? 'Авторизоваться' : authMode === 'register' ? 'Зарегистрироваться' : 'Сбросить пароль'}
                </span>
              </button>
            </form>

            <div className="flex flex-col space-y-2 pt-2 text-[10.5px] font-mono text-zinc-400">
              {authMode === 'login' ? (
                <div className="flex justify-between items-center w-full">
                  <button
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError('');
                      setAuthSuccess('');
                    }}
                    className="text-white hover:underline cursor-pointer font-bold"
                  >
                    Создать аккаунт
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('reset');
                      setAuthError('');
                      setAuthSuccess('');
                    }}
                    className="text-zinc-400 hover:text-white hover:underline cursor-pointer"
                  >
                    Забыли пароль?
                  </button>
                </div>
              ) : authMode === 'register' ? (
                <div className="flex justify-between items-center w-full">
                  <span>Уже зарегистрированы?</span>
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      setAuthSuccess('');
                    }}
                    className="text-white hover:underline cursor-pointer font-bold"
                  >
                    Войти в систему
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center w-full">
                  <span>Вспомнили позывной?</span>
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      setAuthSuccess('');
                    }}
                    className="text-white hover:underline cursor-pointer font-bold"
                  >
                    Вернуться к входу
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                localStorage.setItem('whiteboard_user', 'Инспектор_Демо');
                setCurrentUsername('Инспектор_Демо');
                setCurrentUserAvatarUrl('');
                setCurrentUserAvatarColor('#ef4444');
                loadUserBoards('Инспектор_Демо');
                setCurrentView('dashboard');
              }}
              className="w-full py-2 bg-transparent hover:bg-zinc-900/40 text-[9.5px] font-mono tracking-wider text-zinc-505 hover:text-zinc-300 font-bold rounded border border-zinc-900 flex items-center justify-center cursor-pointer transition-colors"
            >
              Войти как Временный Гость
            </button>
          </div>
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
        <header className="h-11 border-b border-zinc-900/60 flex items-center justify-between px-6 bg-zinc-950/40 backdrop-blur-md shrink-0 z-[150] relative select-none">
          <div className="flex items-center space-x-3">
            <Layout className="w-4.5 h-4.5 text-zinc-400 animate-pulse" />
            <span className="font-mono text-xs text-white uppercase font-black tracking-widest">
              WHITEBOARD OSINT HUB
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-1.5 p-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 hover:text-white rounded-lg cursor-pointer transition-all pr-2.5"
              title="Открыть меню профиля"
            >
              <div
                className="w-5.5 h-5.5 rounded-full flex items-center justify-center font-mono text-[9px] text-white font-bold shrink-0 overflow-hidden"
                style={{ backgroundColor: currentUserAvatarColor }}
              >
                {currentUserAvatarUrl ? (
                  <img src={currentUserAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUsername ? currentUsername.slice(0, 2).toUpperCase() : 'AN'
                )}
              </div>
              <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase">{currentUsername}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {profileDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[99999]" 
                  onClick={() => setProfileDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-52 bg-zinc-950 border border-zinc-850 rounded-lg shadow-2xl z-[100000] p-1 animate-fade-in divide-y divide-zinc-900 animate-scale-up">
                  <div className="px-2.5 py-2 text-left">
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Профиль</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5 truncate">{currentUsername}</div>
                    <div className="text-[8px] font-mono text-emerald-500 flex items-center mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                      В сети
                    </div>
                  </div>
                  <div className="py-1 text-left">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowMyProfileModal(true);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-900 rounded font-sans transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <span>📂</span>
                      <span>Мой профиль</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setTempAvatarUrl(currentUserAvatarUrl);
                        setTempAvatarColor(currentUserAvatarColor);
                        setShowProfileModal(true);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-900 rounded font-sans transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <span>⚙️</span>
                      <span>Настройки профиля</span>
                    </button>
                  </div>
                  <div className="py-1 text-left">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-[11px] text-red-400 hover:text-red-300 hover:bg-red-955/15 rounded font-sans transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Выйти</span>
                    </button>
                  </div>
                </div>
              </>
            )}
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
                    draggable={renamingBoardId !== b.id}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDraggedBoardId(b.id);
                    }}
                    onDragEnd={() => {
                      setDraggedBoardId(null);
                      setDragOverBoardId(null);
                    }}
                    onDragOver={(e) => {
                      if (draggedBoardId && draggedBoardId !== b.id) {
                        e.preventDefault();
                      }
                    }}
                    onDragEnter={(e) => {
                      if (draggedBoardId && draggedBoardId !== b.id) {
                        setDragOverBoardId(b.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverBoardId === b.id) {
                        setDragOverBoardId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverBoardId(null);
                      if (draggedBoardId && draggedBoardId !== b.id) {
                        handleMergeBoards(draggedBoardId, b.id);
                      }
                    }}
                    className={`group border rounded-xl p-5 flex flex-col justify-between h-44 cursor-pointer relative overflow-hidden transition-all duration-150 shadow-md select-none ${
                      dragOverBoardId === b.id 
                        ? 'border-indigo-500 bg-indigo-950/25 ring-2 ring-indigo-500/50 scale-[1.02]' 
                        : 'border-zinc-850 hover:border-zinc-650 bg-zinc-950/60 hover:bg-zinc-950'
                    }`}
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
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors truncate">
                              {b.name}
                            </h3>
                            {b.isCollab && (
                              <span className="text-[8.5px] items-center shrink-0 font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-1.5 py-0.5 rounded flex tracking-wider uppercase" title={`Комната: ${b.roomId}`}>
                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse mr-1" />
                                🔐 КООП
                              </span>
                            )}
                          </div>
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

        {/* ── PROFILE CUSTOMIZATION & AVATAR EDITOR MODAL ── */}
        {showProfileModal && (
          <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl p-6 relative animate-fade-in space-y-5 animate-scale-up">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-left">
                <h3 className="font-mono text-xs uppercase tracking-widest font-black text-white flex items-center space-x-2">
                  <span>👤</span>
                  <span>Редактирование профиля</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-1 leading-normal font-sans">
                  Настройте свой визуальный аватар и цветовой позывной для совместной OSINT-деятельности.
                </p>
              </div>

              {/* AVATAR LIVE PREVIEW */}
              <div className="flex flex-col items-center justify-center p-4.5 bg-zinc-900/40 border border-zinc-900/60 rounded-lg space-y-2">
                <div
                  className="w-16 h-16 rounded-full border border-zinc-800 shadow-inner flex items-center justify-center font-mono text-xl font-black text-white overflow-hidden relative"
                  style={{ backgroundColor: tempAvatarColor }}
                >
                  {tempAvatarUrl ? (
                    <img src={tempAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    currentUsername ? currentUsername.slice(0, 2).toUpperCase() : 'AN'
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-zinc-300 uppercase">{currentUsername}</span>
              </div>

              {/* COLOR PRESETS */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
                  Цвет позывного (Color Accent)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1', '#e11d48'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTempAvatarColor(c)}
                      className="w-6 h-6 rounded-full border border-black/50 hover:scale-110 cursor-pointer transition-transform relative flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c }}
                    >
                      {tempAvatarColor === c && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3.5px] drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* PRESET AVATARS */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
                  Стиль аватара (Cyber Presets)
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    'https://api.dicebear.com/7.x/bottts/svg?seed=Hacker3',
                    'https://api.dicebear.com/7.x/bottts/svg?seed=CyberGhost',
                    'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowOp',
                    'https://api.dicebear.com/7.x/bottts/svg?seed=Mainframe',
                    'https://api.dicebear.com/7.x/identicon/svg?seed=AgentZ',
                    'https://api.dicebear.com/7.x/pixel-art/svg?seed=WhiteRose'
                  ].map((pUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTempAvatarUrl(pUrl)}
                      className={`w-10 h-10 rounded border overflow-hidden cursor-pointer transition-all ${
                        tempAvatarUrl === pUrl ? 'border-indigo-500 ring-2 ring-indigo-550/40' : 'border-zinc-850 hover:border-zinc-750'
                      }`}
                    >
                      <img src={pUrl} alt="" className="w-full h-full object-cover bg-zinc-900" />
                    </button>
                  ))}
                </div>
              </div>

              {/* FILE UPLOAD & URL FORM */}
              <div className="space-y-3 pt-1 text-left">
                <div>
                  <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold mb-1">
                    Загрузить картинку с компьютера
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="profile-avatar-file-dash"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setTempAvatarUrl(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="profile-avatar-file-dash"
                      className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 text-[10px] font-mono font-bold uppercase py-2 px-3.5 rounded text-center cursor-pointer transition-colors"
                    >
                      Выбрать файл изображения...
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold mb-1">
                    Или укажите прямую ссылку (Image URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/my-photo.png"
                    className="w-full text-xs font-mono bg-zinc-900 border border-zinc-850 text-zinc-100 px-3 py-1.5 rounded focus:border-zinc-500 outline-none transition-colors"
                    value={tempAvatarUrl.startsWith('data:') ? '' : tempAvatarUrl}
                    onChange={(e) => setTempAvatarUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 py-2.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded border border-zinc-850 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const success = await handleUpdateProfile(tempAvatarUrl, tempAvatarColor);
                    if (success) {
                      setShowProfileModal(false);
                      setToastNotification({
                        message: 'Профиль аналитика успешно обновлен!',
                        type: 'success'
                      });
                      setTimeout(() => setToastNotification(null), 3000);
                    } else {
                      alert('Не удалось сохранить изменения профиля.');
                    }
                  }}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 py-2.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirmation Dialog Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl p-6 relative animate-fade-in space-y-5 animate-scale-up text-left">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-rose-500 flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>Выход</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-2 leading-normal font-sans">
                  Вы уверены, что хотите выйти из учетной записи?
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 py-2.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded border border-zinc-850 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    handleLogout();
                  }}
                  className="flex-1 bg-rose-650 hover:bg-rose-700 text-white py-2.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded cursor-pointer transition-colors"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View My Profile Dossier Modal */}
        {showMyProfileModal && (
          <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl p-5 relative animate-fade-in space-y-4 animate-scale-up text-left">
              <button
                onClick={() => setShowMyProfileModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest font-black text-white flex items-center space-x-2">
                  <span>👤</span>
                  <span>Профиль аналитика</span>
                </h3>
                <p className="text-[9px] text-zinc-500 font-mono mt-0.5 leading-tight uppercase">
                  Информация об учетной записи
                </p>
              </div>

              <div className="p-4 bg-zinc-900/40 border border-zinc-900/60 rounded-lg flex items-center space-x-4">
                <div
                  className="w-14 h-14 rounded-full border border-zinc-800 shadow-inner flex items-center justify-center font-mono text-lg font-black text-white overflow-hidden shrink-0"
                  style={{ backgroundColor: currentUserAvatarColor }}
                >
                  {currentUserAvatarUrl ? (
                    <img src={currentUserAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUsername ? currentUsername.slice(0, 2).toUpperCase() : 'AN'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Пользователь:</div>
                  <div className="text-sm font-bold text-zinc-200 uppercase tracking-wide truncate">{currentUsername}</div>
                  <div className="text-[8.5px] font-mono text-emerald-500 mt-1 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                    В сети
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-zinc-900 pt-3 text-[10px] font-mono">
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="text-zinc-550">Провайдер:</span>
                  <span className="text-zinc-300">Локальный</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="text-zinc-550">Адрес:</span>
                  <span className="text-zinc-300 select-all font-mono text-[9px]">{`${currentUsername?.toLowerCase()}@whiteboard.com`}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="text-zinc-550">Количество досок:</span>
                  <span className="text-zinc-300 font-bold">{boards.length}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowMyProfileModal(false)}
                  className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 py-2 text-[10px] uppercase font-mono tracking-wider font-bold rounded border border-zinc-850 cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating self-fading notification toast */}
        {toastNotification && (
          <div className="fixed bottom-6 right-6 z-[9999] bg-zinc-950/90 border border-zinc-800 text-white px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-3.5 animate-bounce font-sans text-xs max-w-sm">
            <div className={`w-2 h-2 rounded-full shrink-0 ${toastNotification.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
            <p className="font-mono text-zinc-105">{toastNotification.message}</p>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────── RENDER THE CORE APPLICATION WORKSPACE (Page 2)
  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden text-zinc-100 ${currentTheme.bg}`}>
      
      {/* ── TOP BAR (EXQUISITE COMPACT MINIMALIST HEADER) */}
      <header className="h-11 border-b border-zinc-900/60 flex items-center justify-between px-3 select-none bg-zinc-950/40 backdrop-blur-md shrink-0 z-[150]">
        
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
              <span className="font-mono text-[9px] text-emerald-300 font-bold uppercase mr-1">КООПЕРАЦИЯ: {roomId}</span>
              
              {/* Overlapping active participant avatars */}
              <div className="flex -space-x-1.5 items-center mr-2 pl-2 border-l border-emerald-900/40 overflow-visible shrink-0">
                {/* 1. Self */}
                <div
                  className="w-5 h-5 rounded-full border border-zinc-950 flex items-center justify-center font-mono text-[8px] text-white font-black shrink-0 overflow-hidden relative"
                  style={{ backgroundColor: currentUserAvatarColor }}
                  title={`${currentUsername} (Вы)`}
                >
                  {currentUserAvatarUrl ? (
                    <img src={currentUserAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUsername ? currentUsername.slice(0, 2).toUpperCase() : 'ME'
                  )}
                </div>

                {/* 2. Connected peers */}
                {peerCursors
                  .filter((p) => Date.now() - p.lastActive <= 15000 && p.username !== currentUsername)
                  .map((peer, pIdx) => (
                    <div
                      key={peer.username + pIdx}
                      className="w-5 h-5 rounded-full border border-zinc-950 flex items-center justify-center font-mono text-[8px] text-white font-black shrink-0 overflow-hidden relative"
                      style={{ backgroundColor: peer.avatarColor || '#64748b' }}
                      title={`${peer.username}`}
                    >
                      {peer.avatarUrl ? (
                        <img src={peer.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        peer.username ? peer.username.slice(0, 2).toUpperCase() : 'OP'
                      )}
                    </div>
                  ))}
              </div>

              <span className="text-zinc-750 font-mono text-[9px] px-0.5 pointer-events-none">|</span>

              <button
                onClick={handleCopyInviteLink}
                className="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 font-bold ml-1.5 flex items-center space-x-1 cursor-pointer hover:underline"
                title="Скопировать пригласительную ссылку для коллаборации"
              >
                <Link2 className="w-3 h-3 text-emerald-400" />
                <span>{copiedInvite ? 'Скопировано!' : 'Пригласить'}</span>
              </button>

              <span className="text-zinc-750 font-mono text-[9px] px-1 pointer-events-none">|</span>

              <button
                onClick={handleDisconnectCollab}
                className="text-[9px] font-mono text-zinc-400 hover:text-white font-bold cursor-pointer hover:underline"
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



          <button
            onClick={handleExportJSON}
            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 py-1 px-2.5 rounded text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Export
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-1.5 p-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 hover:text-white rounded-lg cursor-pointer transition-all pr-1.5"
              title="Открыть меню профиля"
            >
              <div
                className="w-5.5 h-5.5 rounded-full flex items-center justify-center font-mono text-[9px] text-white font-bold shrink-0 overflow-hidden"
                style={{ backgroundColor: currentUserAvatarColor }}
              >
                {currentUserAvatarUrl ? (
                  <img src={currentUserAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUsername ? currentUsername.slice(0, 2).toUpperCase() : 'AN'
                )}
              </div>
              <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase pr-1 md:inline hidden">{currentUsername}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {profileDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[99999]" 
                  onClick={() => setProfileDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-52 bg-zinc-950 border border-zinc-850 rounded-lg shadow-2xl z-[100000] p-1 animate-fade-in divide-y divide-zinc-900 animate-scale-up">
                  <div className="px-2.5 py-2 text-left">
                    <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Профиль</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5 truncate">{currentUsername}</div>
                    <div className="text-[8px] font-mono text-emerald-500 flex items-center mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 mr-1 animate-pulse" />
                      В сети
                    </div>
                  </div>
                  <div className="py-1 text-left">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowMyProfileModal(true);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-900 rounded font-sans transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <span>📂</span>
                      <span>Мой профиль</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setTempAvatarUrl(currentUserAvatarUrl);
                        setTempAvatarColor(currentUserAvatarColor);
                        setShowProfileModal(true);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-900 rounded font-sans transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <span>⚙️</span>
                      <span>Настройки профиля</span>
                    </button>
                  </div>
                  <div className="py-1 text-left">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-[11px] text-red-400 hover:text-red-300 hover:bg-red-955/15 rounded font-sans transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Выйти</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
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
              onMergeBoards={handleMergeBoards}
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
            onAddTextNode={(x, y, isBoxed, label, textColor, borderColor, bgColor, connectFromNodeId, w, h, osint, map) =>
              handleAddNode('text', label || 'Заметка...', x, y, isBoxed, textColor, borderColor, bgColor, connectFromNodeId, w, h, osint, map)
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
            selectedCommentId={selectedCommentId}
            onSelectComment={setSelectedCommentId}
            onDeleteComment={handleDeleteComment}
          />

          {/* Quick Stats monitor panel - scale only */}
          <div className="absolute bottom-12 left-4 p-2.5 bg-zinc-950/90 backdrop-blur-md rounded border border-zinc-850 text-[9.5px] font-mono leading-relaxed pointer-events-none select-none md:block hidden text-zinc-300 z-[98]">
            Масштаб: <strong className="text-zinc-100">{Math.round(zoom * 100)}%</strong>
          </div>

          <BottomMapPanel
            onAddMapCard={(lat, lng, address) => {
              // Estimate center of visible canvas area
              const xPoint = -pan.x + (window.innerWidth / 2) - 175;
              const yPoint = -pan.y + (window.innerHeight / 2) - 120;

              handleAddNode(
                'text',
                '📍 ' + address,
                xPoint,
                yPoint,
                true,
                '#ffffff',
                '#ef4444',
                'rgba(24,24,27,0.95)',
                undefined,
                350,
                240,
                undefined,
                {
                  latitude: lat,
                  longitude: lng,
                  address: address,
                  notes: ''
                }
              );
            }}
          />
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

      {/* ── COLLABORATION JOIN & MULTIPLAYER CONTROLS MODAL ── */}
      {showCollabModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl p-6 relative flex flex-col space-y-4">
            
            <button
              onClick={() => setShowCollabModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="space-y-1 text-left">
              <h3 className="font-mono text-xs uppercase tracking-widest font-black text-white flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Мультиплеер и Связь</span>
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans select-none">
                Синхронизируйте рисование, геометрические узлы, умозаключения и курсоры мыши других специалистов в режиме реального времени!
              </p>
            </div>

            <div className="space-y-3.5 pt-1 text-left">
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">
                  Аналитик (Позывной)
                </label>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-5.5 h-5.5 rounded-full flex items-center justify-center font-mono text-[9px] text-white font-bold shrink-0 overflow-hidden"
                    style={{ backgroundColor: currentUserAvatarColor }}
                  >
                    {currentUserAvatarUrl ? (
                      <img src={currentUserAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      currentUsername ? currentUsername.slice(0, 2) : 'A'
                    )}
                  </div>
                  <input
                    type="text"
                    disabled
                    className="flex-1 text-xs font-mono bg-zinc-900/60 border border-zinc-850 text-zinc-400 px-3 py-2 rounded outline-none cursor-not-allowed select-none"
                    value={currentUsername || 'Inspector_Demo'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold mb-1">
                  Идентификатор Комнаты (Room ID)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="flex-1 text-xs font-mono bg-zinc-900 border border-zinc-850 text-white font-bold px-3 py-2 rounded outline-none placeholder-zinc-800 focus:border-zinc-500 transition-colors"
                    placeholder="E.g., MY_ROOM_CODE"
                    value={roomId || ''}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  />
                  <button
                    onClick={() => {
                      const code = 'OSINT-' + Math.floor(Math.random() * 90000 + 10000);
                      setRoomId(code);
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] uppercase font-mono px-3.5 rounded font-bold cursor-pointer transition-colors border border-zinc-850"
                  >
                    Генерация
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-2.5 pt-3">
              <button
                onClick={() => setShowCollabModal(false)}
                className="flex-1 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 py-2.5 text-[10px] uppercase font-mono tracking-wider rounded font-bold cursor-pointer transition-colors"
              >
                Отмена
              </button>
              <button
                disabled={!roomId}
                onClick={() => connectToCollaboration(roomId!)}
                className="flex-1 bg-white text-black hover:bg-zinc-200 py-2.5 text-[10px] uppercase font-mono tracking-wider rounded font-bold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Подключить
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* ── PROFILE CUSTOMIZATION & AVATAR EDITOR MODAL ── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl p-6 relative animate-fade-in space-y-5">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-left">
              <h3 className="font-mono text-xs uppercase tracking-widest font-black text-white flex items-center space-x-2">
                <span>👤</span>
                <span>Редактирование профиля</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 leading-normal font-sans">
                Настройте свой визуальный аватар и цветовой позывной для совместной OSINT-деятельности.
              </p>
            </div>

            {/* AVATAR LIVE PREVIEW */}
            <div className="flex flex-col items-center justify-center p-4.5 bg-zinc-900/40 border border-zinc-900/60 rounded-lg space-y-2">
              <div
                className="w-16 h-16 rounded-full border border-zinc-800 shadow-inner flex items-center justify-center font-mono text-xl font-black text-white overflow-hidden relative"
                style={{ backgroundColor: tempAvatarColor }}
              >
                {tempAvatarUrl ? (
                  <img src={tempAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  currentUsername ? currentUsername.slice(0, 2).toUpperCase() : 'AN'
                )}
              </div>
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase">{currentUsername}</span>
            </div>

            {/* COLOR PRESETS */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
                Цвет позывного (Color Accent)
              </label>
              <div className="flex flex-wrap gap-2">
                {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1', '#e11d48'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTempAvatarColor(c)}
                    className="w-6 h-6 rounded-full border border-black/50 hover:scale-110 cursor-pointer transition-transform relative flex items-center justify-center shrink-0"
                    style={{ backgroundColor: c }}
                  >
                    {tempAvatarColor === c && (
                      <Check className="w-3.5 h-3.5 text-white stroke-[3.5px] drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* PRESET AVATARS */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
                Стиль аватара (Cyber Presets)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[
                  'https://api.dicebear.com/7.x/bottts/svg?seed=Hacker3',
                  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberGhost',
                  'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowOp',
                  'https://api.dicebear.com/7.x/bottts/svg?seed=Mainframe',
                  'https://api.dicebear.com/7.x/identicon/svg?seed=AgentZ',
                  'https://api.dicebear.com/7.x/pixel-art/svg?seed=WhiteRose'
                ].map((pUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTempAvatarUrl(pUrl)}
                    className={`w-10 h-10 rounded border overflow-hidden cursor-pointer transition-all ${
                      tempAvatarUrl === pUrl ? 'border-indigo-500 ring-2 ring-indigo-550/40' : 'border-zinc-850 hover:border-zinc-750'
                    }`}
                  >
                    <img src={pUrl} alt="" className="w-full h-full object-cover bg-zinc-900" />
                  </button>
                ))}
              </div>
            </div>

            {/* FILE UPLOAD & URL FORM */}
            <div className="space-y-3 pt-1 text-left">
              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold mb-1">
                  Загрузить картинку с компьютера
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="profile-avatar-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setTempAvatarUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="profile-avatar-file"
                    className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 text-[10px] font-mono font-bold uppercase py-2 px-3.5 rounded text-center cursor-pointer transition-colors"
                  >
                    Выбрать файл изображения...
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold mb-1">
                  Или укажите прямую ссылку (Image URL)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/my-photo.png"
                  className="w-full text-xs font-mono bg-zinc-900 border border-zinc-850 text-zinc-100 px-3 py-1.5 rounded focus:border-zinc-500 outline-none transition-colors"
                  value={tempAvatarUrl.startsWith('data:') ? '' : tempAvatarUrl}
                  onChange={(e) => setTempAvatarUrl(e.target.value)}
                />
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 py-2.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded border border-zinc-850 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={async () => {
                  const success = await handleUpdateProfile(tempAvatarUrl, tempAvatarColor);
                  if (success) {
                    setShowProfileModal(false);
                    setToastNotification({
                      message: 'Профиль аналитика успешно обновлен!',
                      type: 'success'
                    });
                    setTimeout(() => setToastNotification(null), 3000);
                  } else {
                    alert('Не удалось сохранить изменения профиля.');
                  }
                }}
                className="flex-1 bg-white text-black hover:bg-zinc-200 py-2.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl p-6 relative animate-fade-in space-y-5 animate-scale-up text-left">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-rose-500 flex items-center space-x-2">
                <span>⚠️</span>
                <span>Выход</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-2 leading-normal font-sans">
                Вы уверены, что хотите выйти из учетной записи?
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 py-2.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded border border-zinc-850 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="flex-1 bg-rose-650 hover:bg-rose-700 text-white py-2.5 text-[10px] uppercase font-mono tracking-wider font-bold rounded cursor-pointer transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View My Profile Dossier Modal */}
      {showMyProfileModal && (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl p-5 relative animate-fade-in space-y-4 animate-scale-up text-left">
            <button
              onClick={() => setShowMyProfileModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest font-black text-white flex items-center space-x-2">
                <span>👤</span>
                <span>Профиль аналитика</span>
              </h3>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5 leading-tight uppercase">
                Информация об учетной записи
              </p>
            </div>

            <div className="p-4 bg-zinc-900/40 border border-zinc-900/60 rounded-lg flex items-center space-x-4">
              <div
                className="w-14 h-14 rounded-full border border-zinc-800 shadow-inner flex items-center justify-center font-mono text-lg font-black text-white overflow-hidden shrink-0"
                style={{ backgroundColor: currentUserAvatarColor }}
              >
                {currentUserAvatarUrl ? (
                  <img src={currentUserAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUsername ? currentUsername.slice(0, 2).toUpperCase() : 'AN'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Пользователь:</div>
                <div className="text-sm font-bold text-zinc-200 uppercase tracking-wide truncate">{currentUsername}</div>
                <div className="text-[8.5px] font-mono text-emerald-500 mt-1 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  В сети
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-zinc-900 pt-3 text-[10px] font-mono">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-zinc-550">Провайдер:</span>
                <span className="text-zinc-300">Локальный</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-zinc-550">Адрес:</span>
                <span className="text-zinc-300 select-all font-mono text-[9px]">{`${currentUsername?.toLowerCase()}@whiteboard.com`}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-zinc-550">Количество досок:</span>
                <span className="text-zinc-300 font-bold">{boards.length}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMyProfileModal(false)}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 py-2 text-[10px] uppercase font-mono tracking-wider font-bold rounded border border-zinc-850 cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating self-fading notification toast */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-zinc-950/90 border border-zinc-800 text-white px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-3.5 animate-bounce font-sans text-xs max-w-sm">
          <div className={`w-2 h-2 rounded-full shrink-0 ${toastNotification.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
          <p className="font-mono text-zinc-105">{toastNotification.message}</p>
        </div>
      )}
    </div>
  );
}
