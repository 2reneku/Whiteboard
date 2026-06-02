import React, { useState } from 'react';
import { ThemeColors, BoardComment } from '../types';
import { FolderOpen, Plus, Trash2, Edit2, MessageSquare, Send, Calendar, Clock, Lock, Pointer, Layout, Pencil, Link2, FileText, Grid3X3, Maximize2 } from 'lucide-react';

interface Board {
  id: string;
  name: string;
  updatedAt: number;
}

interface SidebarProps {
  boards: Board[];
  currentBoardId: string;
  onSwitchBoard: (id: string) => void;
  onCreateBoard: () => void;
  onRenameBoard: (id: string, newName: string) => void;
  onDeleteBoard: (id: string, e: React.MouseEvent) => void;
  comments: BoardComment[];
  onAddGeneralComment: (text: string) => void;
  themeColors: ThemeColors;
  currentUsername: string;
  activeTool: 'select' | 'connect' | 'text' | 'hand' | 'pencil';
  onChangeActiveTool: (tool: 'select' | 'connect' | 'text' | 'hand' | 'pencil') => void;
  penColor: string;
  setPenColor: (color: string) => void;
  onRecenter: () => void;
  onAutoLayout: () => void;
  onClearSelection?: () => void;
  newlyCreatedBoardId?: string | null;
  onClearNewlyCreatedBoardId?: () => void;
}

export default function Sidebar({
  boards = [],
  currentBoardId,
  onSwitchBoard,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
  comments = [],
  onAddGeneralComment,
  themeColors,
  currentUsername,
  activeTool,
  onChangeActiveTool,
  penColor,
  setPenColor,
  onRecenter,
  onAutoLayout,
  onClearSelection,
  newlyCreatedBoardId = null,
  onClearNewlyCreatedBoardId,
}: SidebarProps) {
  const [boardEditId, setBoardEditId] = useState<string | null>(null);
  const [boardRenameVal, setBoardRenameVal] = useState('');
  const [chatInput, setChatInput] = useState('');
  const hasCanceledRef = React.useRef(false);

  // Auto-focus and rename brand new board
  React.useEffect(() => {
    if (newlyCreatedBoardId) {
      const b = boards.find(x => x.id === newlyCreatedBoardId);
      if (b) {
        setBoardEditId(b.id);
        setBoardRenameVal(b.name);
      }
      if (onClearNewlyCreatedBoardId) {
        onClearNewlyCreatedBoardId();
      }
    }
  }, [newlyCreatedBoardId, boards, onClearNewlyCreatedBoardId]);

  const submitRename = (id: string) => {
    if (boardRenameVal.trim()) {
      onRenameBoard(id, boardRenameVal.trim());
    }
    setBoardEditId(null);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    onAddGeneralComment(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className={`w-80 h-full border-r ${themeColors.sidebarBg} border-zinc-850 flex flex-col pt-3 z-10 select-none`}>
      {/* Tools Section at the very top */}
      <div className="px-4 pb-3.5 border-b border-zinc-900/60 flex flex-col space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-450 font-bold">
            Инструменты
          </span>
          <span className="bg-zinc-900 text-zinc-400 font-mono text-[8.5px] px-2 py-0.5 rounded uppercase font-bold">
            {currentUsername}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1.5 font-mono text-xs text-zinc-400">
          <button
            onClick={() => {
              onChangeActiveTool('select');
              if (onClearSelection) onClearSelection();
            }}
            className={`w-full p-2 rounded-lg flex items-center space-x-3 transition-colors cursor-pointer text-left ${
              activeTool === 'select' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'hover:bg-zinc-900/60 hover:text-white'
            }`}
          >
            <Pointer className="w-4 h-4 shrink-0" />
            <span className="text-[11px]">Указатель (Pointer)</span>
          </button>

          <button
            onClick={() => onChangeActiveTool('hand')}
            className={`w-full p-2 rounded-lg flex items-center space-x-3 transition-colors cursor-pointer text-left ${
              activeTool === 'hand' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'hover:bg-zinc-900/60 hover:text-white'
            }`}
          >
            <Layout className="w-4 h-4 shrink-0" />
            <span className="text-[11px]">Рука (Hand / Pan)</span>
          </button>

          <button
            onClick={() => onChangeActiveTool('pencil')}
            className={`w-full p-2 rounded-lg flex items-center space-x-3 transition-colors cursor-pointer text-left ${
              activeTool === 'pencil' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'hover:bg-zinc-900/60 hover:text-white'
            }`}
          >
            <Pencil className="w-4 h-4 shrink-0" />
            <span className="text-[11px]">Карандаш (Brush)</span>
          </button>

          {activeTool === 'pencil' && (
            <div className="flex items-center space-x-1.5 pl-7 py-1">
              {[
                { hex: '#ef4444', name: 'Красный' },
                { hex: '#10b981', name: 'Зеленый' },
                { hex: '#3b82f6', name: 'Синий' },
                { hex: '#f59e0b', name: 'Желтый' },
                { hex: '#ffffff', name: 'Белый' },
              ].map((colorObj) => (
                <button
                  key={colorObj.hex}
                  onClick={() => setPenColor(colorObj.hex)}
                  className={`w-4 h-4 rounded-full cursor-pointer border ${penColor === colorObj.hex ? 'border-white scale-110 shadow' : 'border-transparent'}`}
                  style={{ backgroundColor: colorObj.hex }}
                  title={colorObj.name}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => onChangeActiveTool('connect')}
            className={`w-full p-2 rounded-lg flex items-center space-x-3 transition-colors cursor-pointer text-left ${
              activeTool === 'connect' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'hover:bg-zinc-900/60 hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4 shrink-0" />
            <span className="text-[11px]">Связи (Connect)</span>
          </button>

          <button
            onClick={() => onChangeActiveTool('text')}
            className={`w-full p-2 rounded-lg flex items-center space-x-3 transition-colors cursor-pointer text-left ${
              activeTool === 'text' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'hover:bg-zinc-900/60 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="text-[11px]">Текст (Rich Text Box)</span>
          </button>

          <div className="h-px bg-zinc-900 my-1 font-sans" />

          <button
            onClick={onAutoLayout}
            className="w-full p-2 rounded-lg flex items-center space-x-3 hover:bg-zinc-900/60 hover:text-white transition-colors cursor-pointer text-left"
          >
            <Grid3X3 className="w-4 h-4 shrink-0 text-zinc-550" />
            <span className="text-[11px]">Выровнять структуру</span>
          </button>

          <button
            onClick={onRecenter}
            className="w-full p-2 rounded-lg flex items-center space-x-3 hover:bg-zinc-900/60 hover:text-white transition-colors cursor-pointer text-left"
          >
            <Maximize2 className="w-4 h-4 shrink-0 text-zinc-550" />
            <span className="text-[11px]">Подогнать камеру</span>
          </button>
        </div>
      </div>

      {/* ── Delo / Boards section */}
      <div className="p-3 border-b border-zinc-900/60 flex flex-col space-y-2 max-h-[220px] overflow-y-auto shrink-0 scrollbar-thin">
        <div className="flex items-center justify-between">
          <span className="text-[9.5px] font-mono tracking-wider text-zinc-500 font-bold uppercase">Доски и Проекты</span>
          <button
            onClick={onCreateBoard}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer flex items-center space-x-1"
            title="Создать новую интерактивную доску"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono font-bold">Добавить</span>
          </button>
        </div>

        <div className="space-y-1">
          {boards.map((b) => {
            const isActive = b.id === currentBoardId;
            const isEditing = boardEditId === b.id;

            return (
              <div
                key={b.id}
                onClick={() => !isEditing && onSwitchBoard(b.id)}
                className={`group flex items-center p-2 rounded-md border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-zinc-900/80 border-zinc-800 text-white shadow'
                    : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-950/40 hover:text-zinc-200'
                }`}
              >
                <FolderOpen className={`w-3.5 h-3.5 mr-2 shrink-0 ${isActive ? 'text-zinc-200' : 'text-zinc-650'}`} />
                <div className="flex-1 min-w-0 pr-1.5">
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      className="w-full text-xs font-sans bg-zinc-950 border border-zinc-800 px-1 py-0.5 rounded text-white"
                      value={boardRenameVal}
                      onChange={(e) => setBoardRenameVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          submitRename(b.id);
                        }
                        if (e.key === 'Escape') {
                          hasCanceledRef.current = true;
                          setBoardEditId(null);
                        }
                      }}
                      onBlur={() => {
                        if (!hasCanceledRef.current) {
                          submitRename(b.id);
                        }
                        hasCanceledRef.current = false;
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className="text-[11.5px] font-medium truncate leading-tight group-hover:text-zinc-100">
                      {b.name}
                    </p>
                  )}
                </div>

                {!isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBoardEditId(b.id);
                        setBoardRenameVal(b.name);
                      }}
                      className="p-0.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
                      title="Переименовать"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                    {boards.length > 1 && (
                      <button
                        onClick={(e) => onDeleteBoard(b.id, e)}
                        className="p-0.5 hover:bg-red-950/30 rounded text-zinc-500 hover:text-red-400"
                        title="Удалить доску"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Co-op discussions and comments chat feed */}
      <div className="flex-1 min-h-0 flex flex-col p-3.5 bg-zinc-950/20 select-text">
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-505 block mb-2 font-bold flex items-center">
          <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /> Обсуждение и Чат (SSE)
        </span>

        {/* Scrollable comments stream card */}
        <div className="flex-1 min-h-0 overflow-y-auto mb-3.5 space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-900">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <MessageSquare className="w-6 h-6 text-zinc-800 mb-1.5" />
              <p className="text-[10px] text-zinc-650 leading-relaxed max-w-[170px]">
                Чат пока пуст. Оставьте первый комментарий, его мгновенно увидят другие!
              </p>
            </div>
          ) : (
            comments.map((cmt) => (
              <div
                key={cmt.id}
                className={`p-2 rounded-lg border text-zinc-300 leading-normal flex flex-col space-y-1 ${
                  cmt.author === currentUsername
                    ? 'bg-zinc-900/60 border-zinc-800/80 self-end ml-4'
                    : 'bg-zinc-950/70 border-zinc-900 self-start mr-4'
                }`}
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-0.5 gap-x-3 shrink-0">
                  <span className={`font-mono text-[8.5px] font-bold ${cmt.author === currentUsername ? 'text-indigo-400' : 'text-zinc-400'}`}>
                    {cmt.author}
                  </span>
                  <div className="flex items-center space-x-1 text-[8px] text-zinc-600 font-mono shrink-0">
                    <Clock className="w-2.5 h-2.5 scale-90" />
                    <span>{cmt.timestamp}</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-100 font-sans whitespace-pre-wrap leading-relaxed select-text">
                  {cmt.text}
                </p>
                {cmt.x !== undefined && (
                  <span className="text-[8px] font-mono text-yellow-500 font-medium">
                    Закреплен на холсте ({Math.round(cmt.x)}, {Math.round(cmt.y)})
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Send message area */}
        <div className="flex items-center space-x-1.5 h-8 shrink-0 relative select-none">
          <input
            type="text"
            className="flex-1 text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-755 focus:border-zinc-600 text-zinc-100 px-2.5 py-1.5 outline-none rounded-md"
            placeholder="Что думаете по схеме?..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendChat();
            }}
          />
          <button
            onClick={handleSendChat}
            disabled={!chatInput.trim()}
            className="h-full p-2 bg-zinc-900 hover:bg-zinc-800 rounded-md border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Отправить сообщение коллегам"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
