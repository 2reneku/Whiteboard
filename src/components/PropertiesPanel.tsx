import React, { useState, useEffect } from 'react';
import { OSINTNode, OSINTEdge, ThemeColors, BoardComment } from '../types';
import { Trash2, Check, Type, Eye, Layers, Palette, Users, MessageSquarePlus } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNode: OSINTNode | null;
  selectedEdge: OSINTEdge | null;
  onUpdateNode: (node: OSINTNode) => void;
  onDeleteNode: (id: string) => void;
  onUpdateEdge: (edge: OSINTEdge) => void;
  onDeleteEdge: (id: string) => void;
  onAddCommentToBoard: (text: string, x: number, y: number) => void;
  themeColors: ThemeColors;
  comments: BoardComment[];
}

export default function PropertiesPanel({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  onAddCommentToBoard,
  themeColors,
  comments = [],
}: PropertiesPanelProps) {
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.label || '');
      setNotes(selectedNode.notes || '');
    }
  }, [selectedNode]);

  useEffect(() => {
    if (selectedEdge) {
      setEdgeLabel(selectedEdge.label || '');
    }
  }, [selectedEdge]);

  if (!selectedNode && !selectedEdge) {
    return (
      <div className={`w-80 border-l ${themeColors.sidebarBg} border-zinc-850 p-5 flex flex-col justify-center items-center text-center select-none`}>
        <Layers className="w-8 h-8 text-zinc-600 mb-3 animate-pulse" />
        <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-zinc-400 mb-1.5 glow-text-indigo">
          // СВОЙСТВА И СТИЛИ
        </h3>
        <p className="text-[10px] font-mono text-zinc-500 max-w-[210px] leading-relaxed">
          Выберите узел текста или связь на доске для настройки шрифта, размера, цвета и типа соединений.
        </p>
      </div>
    );
  }

  const handleNodeSave = () => {
    if (!selectedNode) return;
    onUpdateNode({
      ...selectedNode,
      label,
      notes,
    });
  };

  const handleAddComment = () => {
    if (!newCommentText.trim() || !selectedNode) return;
    // Pin comment slightly to the right of the selected node
    onAddCommentToBoard(
      newCommentText.trim(),
      selectedNode.x + selectedNode.width + 40,
      selectedNode.y + 20
    );
    setNewCommentText('');
  };

  return (
    <div className={`w-80 border-l ${themeColors.sidebarBg} border-zinc-850 p-4 flex flex-col justify-between overflow-y-auto scrollbar-thin ${themeColors.scrollbarBg} h-full select-text`}>
      <div className="space-y-4">
        
        {/* ── CARD NODE FORMATTING PANEL */}
        {selectedNode && (
          <div className="space-y-4">
            <div className="pb-2 text-[10px] border-b border-zinc-850">
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">
                // ФОРМАТИРОВАНИЕ ТЕКСТА
              </span>
              <h2 className="text-xs font-mono font-bold tracking-tight text-white uppercase">
                Блок ID: {selectedNode.id.substring(0, 8)}
              </h2>
            </div>

            {/* Custom fonts family requested */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1.5">
                Семейство Шрифта
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['sans', 'serif', 'mono', 'cursive'] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => onUpdateNode({ ...selectedNode, fontFamily: font })}
                    className={`px-2 py-1.5 text-[11px] rounded-none border font-mono uppercase cursor-pointer transition-all ${
                      selectedNode.fontFamily === font || (!selectedNode.fontFamily && font === 'sans')
                        ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom font size requested */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1.5">
                Размер Шрифта
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    const currentSize = selectedNode.fontSize || 14;
                    onUpdateNode({ ...selectedNode, fontSize: Math.max(10, currentSize - 2) });
                  }}
                  className="px-2.5 py-1 bg-zinc-90 w bg-zinc-900 border border-zinc-850 text-zinc-300 hover:text-white rounded-none text-xs font-bold leading-none cursor-pointer hover:border-zinc-700"
                  title="Уменьшить"
                >
                  A-
                </button>
                <input
                  type="number"
                  min="10"
                  max="64"
                  className="w-16 text-center text-xs font-mono bg-zinc-900 border border-zinc-850 text-zinc-100 py-1 rounded-none focus:outline-none focus:border-zinc-700"
                  value={selectedNode.fontSize || 14}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value);
                    if (!isNaN(parsed) && parsed >= 10 && parsed <= 64) {
                      onUpdateNode({ ...selectedNode, fontSize: parsed });
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const currentSize = selectedNode.fontSize || 14;
                    onUpdateNode({ ...selectedNode, fontSize: Math.min(64, currentSize + 2) });
                  }}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 text-zinc-300 hover:text-white rounded-none text-xs font-bold leading-none cursor-pointer hover:border-zinc-700"
                  title="Увеличить"
                >
                  A+
                </button>
                <span className="text-[10px] font-mono text-zinc-500 pl-1">px</span>
              </div>
            </div>

            {/* Formatting decorators requested */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1.5">
                Начертание текста
              </label>
              <div className="flex space-x-1.5">
                {/* Bold */}
                <button
                  onClick={() => onUpdateNode({ ...selectedNode, bold: !selectedNode.bold })}
                  className={`w-9 h-8 rounded-none border font-bold text-xs flex items-center justify-center cursor-pointer transition-colors ${
                    selectedNode.bold
                      ? 'bg-zinc-100 text-zinc-950 border-white'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-700'
                  }`}
                  title="Жирный"
                >
                  B
                </button>
                {/* Italic */}
                <button
                  onClick={() => onUpdateNode({ ...selectedNode, italic: !selectedNode.italic })}
                  className={`w-9 h-8 rounded-none border italic text-xs flex items-center justify-center cursor-pointer transition-colors ${
                    selectedNode.italic
                      ? 'bg-zinc-100 text-zinc-950 border-white'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-700'
                  }`}
                  title="Курсив"
                >
                  I
                </button>
                {/* Strikethrough */}
                <button
                  onClick={() => onUpdateNode({ ...selectedNode, strikethrough: !selectedNode.strikethrough })}
                  className={`w-9 h-8 rounded-none border flex items-center justify-center cursor-pointer transition-colors ${
                    selectedNode.strikethrough
                      ? 'bg-zinc-100 text-zinc-950 border-white line-through'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-700 line-through'
                  }`}
                  title="Зачеркнутый"
                >
                  S
                </button>
              </div>
            </div>

            {/* Block color themes config */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1.5">
                Цвет Текста и Блока
              </label>
              <div className="flex space-x-2 flex-wrap gap-y-1.5">
                {[
                  { label: 'White', text: '#ffffff', bg: 'rgba(9,9,11,0.6)', border: '#27272a' },
                  { label: 'Green', text: '#34d399', bg: 'rgba(5, 46, 22, 0.4)', border: '#059669' },
                  { label: 'Blue', text: '#60a5fa', bg: 'rgba(30, 58, 138, 0.3)', border: '#2563eb' },
                  { label: 'Yellow', text: '#fcd34d', bg: 'rgba(120, 80, 10, 0.25)', border: '#ca8a04' },
                  { label: 'Red', text: '#f87171', bg: 'rgba(153, 27, 27, 0.25)', border: '#dc2626' },
                ].map((colorObj) => (
                  <button
                    key={colorObj.text}
                    onClick={() =>
                      onUpdateNode({
                        ...selectedNode,
                        textColor: colorObj.text,
                        bgColor: colorObj.bg,
                        borderColor: colorObj.border,
                      })
                    }
                    className="w-5 h-5 rounded-none border border-black/85 cursor-pointer flex items-center justify-center transition-transform hover:scale-115"
                    style={{ backgroundColor: colorObj.text }}
                    title={colorObj.label}
                  />
                ))}
              </div>
            </div>

            {/* Display shape selection boxed vs custom overlay text */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1.5">
                Тип Отображения
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onUpdateNode({ ...selectedNode, isBoxed: true })}
                  className={`px-2 py-1.5 text-[10.5px] rounded-none border font-mono font-bold uppercase cursor-pointer transition-all ${
                    selectedNode.isBoxed !== false
                      ? 'bg-zinc-100 text-zinc-950 border-white glow-indigo shadow'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-700'
                  }`}
                >
                  Карточка
                </button>
                <button
                  onClick={() => onUpdateNode({ ...selectedNode, isBoxed: false })}
                  className={`px-2 py-1.5 text-[10.5px] rounded-none border font-mono font-bold uppercase cursor-pointer transition-all ${
                    selectedNode.isBoxed === false
                      ? 'bg-zinc-100 text-zinc-950 border-white'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-700'
                  }`}
                >
                  Текст
                </button>
              </div>
            </div>

            {/* Note text field */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1">
                Содержимое Заметки
              </label>
              <textarea
                className="w-full text-xs font-mono bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-zinc-100 px-2.5 py-2 outline-none rounded-none min-h-[90px] leading-relaxed resize-y"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  onUpdateNode({ ...selectedNode, label: e.target.value });
                }}
                onBlur={handleNodeSave}
              />
            </div>

            {/* ── COLLABORATIVE COMMENTS ATTACHMENT */}
            <div className="pt-3 border-t border-zinc-850 space-y-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">
                💬 Комментарии коллег
              </span>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Прикрепить видимый комментарий (стикер) на холст возле этого блока:
              </p>
              <div className="flex space-x-1.5 shrink-0">
                <input
                  type="text"
                  className="flex-1 text-xs bg-zinc-900 border border-zinc-850 focus:border-zinc-705 text-white px-2 py-1.5 rounded-none outline-none focus:glow-indigo"
                  placeholder="Ваш комментарий..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                />
                <button
                  disabled={!newCommentText.trim()}
                  onClick={handleAddComment}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-2.5 rounded-none text-xs font-bold leading-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
                >
                  ОК
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONNECTION ROUTING PROPERTIES PANEL */}
        {selectedEdge && (
          <div className="space-y-4">
            <div className="pb-2 text-[10px] border-b border-zinc-850">
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">
                // СВОЙСТВА СВЯЗИ
              </span>
              <h2 className="text-xs font-mono font-bold tracking-tight text-white uppercase">
                Связь ID: {selectedEdge.id.substring(0, 8)}
              </h2>
            </div>

            {/* Connected line type preset choices */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1.5">
                Тип Линии Связи
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['straight', 'curved', 'dashed', 'dotted'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => onUpdateEdge({ ...selectedEdge, lineType: style })}
                    className={`px-2 py-1.5 text-[10.5px] font-mono rounded-none border capitalize cursor-pointer transition-all ${
                      selectedEdge.lineType === style || (!selectedEdge.lineType && style === 'curved')
                        ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-700'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Link relationship label edit */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1">
                Название связи (метка по центру)
              </label>
              <input
                type="text"
                className="w-full text-xs bg-zinc-900 border border-zinc-850 focus:border-zinc-700 text-slate-100 px-2.5 py-1.5 outline-none rounded-none font-mono"
                placeholder="без метки"
                value={edgeLabel}
                onChange={(e) => {
                  setEdgeLabel(e.target.value);
                  onUpdateEdge({ ...selectedEdge, label: e.target.value });
                }}
                onBlur={() => {
                  if (selectedEdge) {
                    onUpdateEdge({ ...selectedEdge, label: edgeLabel });
                  }
                }}
              />
            </div>

            {/* Edge line color choice */}
            <div>
              <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-450 mb-1.5">
                Цвет Связи
              </label>
              <div className="flex space-x-1.5">
                {[
                  { text: '#52525b', label: 'Dark Zinc' },
                  { text: '#10b981', label: 'Green font' },
                  { text: '#3b82f6', label: 'Blue font' },
                  { text: '#f59e0b', label: 'Yellow' },
                  { text: '#ef4444', label: 'Red shadow' },
                ].map((colorObj) => (
                  <button
                    key={colorObj.text}
                    onClick={() => onUpdateEdge({ ...selectedEdge, color: colorObj.text })}
                    className="w-5 h-5 rounded-none border border-black/85 cursor-pointer flex items-center justify-center transition-transform hover:scale-115"
                    style={{ backgroundColor: colorObj.text }}
                    title={colorObj.label}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete button elements */}
      <div className="pt-4 border-t border-zinc-850 mt-4">
        {selectedNode && (
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            className="w-full text-xs uppercase tracking-wider font-mono font-bold bg-[#1e1015] hover:bg-red-950/40 border border-red-900 hover:border-red-500 text-red-500 py-2 rounded-none flex items-center justify-center transition-all cursor-pointer hover:glow-red"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Удалить блок
          </button>
        )}
        {selectedEdge && (
          <button
            onClick={() => onDeleteEdge(selectedEdge.id)}
            className="w-full text-xs uppercase tracking-wider font-mono font-bold bg-[#1e1015] hover:bg-red-950/40 border border-red-900 hover:border-red-500 text-red-500 py-2 rounded-none flex items-center justify-center transition-all cursor-pointer hover:glow-red"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Удалить связь
          </button>
        )}
      </div>
    </div>
  );
}
