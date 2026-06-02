import React, { useState, useRef, useEffect } from 'react';
import { OSINTNode, OSINTEdge, ThemeColors, BoardComment } from '../types';
import { Sparkles, Brain, ArrowUp, Send, RefreshCw, AlertTriangle, FileText } from 'lucide-react';

interface AIAssistantProps {
  nodes: OSINTNode[];
  edges: OSINTEdge[];
  themeColors: ThemeColors;
  comments?: BoardComment[];
  aiAutoQuery?: string | null;
  onClearAutoQuery?: () => void;
}

interface Message {
  role: 'analyst' | 'ai';
  text: string;
}

export default function AIAssistant({
  nodes,
  edges,
  themeColors,
  comments = [],
  aiAutoQuery,
  onClearAutoQuery,
}: AIAssistantProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Приветствую, инспектор. Я ваш AI-ассистент по OSINT-расследованиям.\n\nДобавьте объекты на холст, запустите несколько лукапов, и я помогу вам спроектировать тактическую карту, выявить пересечения или скомпилировать отчёт.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Simple custom renderer for markdown bullet points, bold tags and monspaced code
  const formatText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let trimmed = line.trim();

      // Headers ###
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mt-4 mb-2">{trimmed.replace('###', '').trim()}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={idx} className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mt-4 mb-2">{trimmed.replace('##', '').trim()}</h3>;
      }
      if (trimmed.startsWith('#')) {
        return <h2 key={idx} className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400 mt-4 mb-2">{trimmed.replace('#', '').trim()}</h2>;
      }

      // Bold **
      let renderedLine: React.ReactNode = trimmed;
      if (trimmed.includes('**')) {
        const parts = trimmed.split('**');
        renderedLine = parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-cyan-300 font-semibold">{part}</strong> : part);
      }

      // Bullets '*' or '-'
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        return (
          <div key={idx} className="flex items-start text-[11px] text-slate-300 ml-2 my-1 leading-relaxed">
            <span className="text-cyan-500 mr-2 font-mono shrink-0">◇</span>
            <div>{typeof renderedLine === 'string' ? trimmed.substring(1).trim() : renderedLine}</div>
          </div>
        );
      }

      return <p key={idx} className="text-[11px] text-slate-300 leading-relaxed my-1.5 break-words whitespace-pre-wrap">{renderedLine}</p>;
    });
  };

  const handleSend = async (customQuery?: string) => {
    const activeQuery = customQuery || query;
    if (!activeQuery.trim()) return;

    // Add user message
    const updatedMessages = [...messages, { role: 'analyst' as const, text: activeQuery }];
    setMessages(updatedMessages);
    if (!customQuery) setQuery('');
    setLoading(true);

    try {
      // Build a full board layout representation for the backend Gemini analyzer
      const boardState = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.label,
          notes: n.notes,
        })),
        edges: edges.map((e) => ({
          from: e.from,
          to: e.to,
          label: e.label,
          lineType: e.lineType,
        })),
        comments: comments.map((cmt) => ({
          author: cmt.author,
          text: cmt.text,
          timestamp: cmt.timestamp,
        })),
      };

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          board: boardState,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages([
          ...updatedMessages,
          { role: 'ai', text: `⚠️ Ошибка при анализе доски с помощью AI: ${data.error}` },
        ]);
      } else {
        setMessages([...updatedMessages, { role: 'ai', text: data.text }]);
      }
    } catch (e: any) {
      setMessages([
        ...updatedMessages,
        { role: 'ai', text: `⚠️ Не удалось связаться с сервером AI: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aiAutoQuery) {
      handleSend(aiAutoQuery);
      if (onClearAutoQuery) {
        onClearAutoQuery();
      }
    }
  }, [aiAutoQuery]);

  return (
    <div className="flex flex-col h-full bg-[#0d121f] text-slate-100 select-text">
      {/* Messages timeline log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[85%] ${
              msg.role === 'analyst' ? 'ml-auto items-end animate-fade-in' : 'mr-auto items-start'
            }`}
          >
            {/* Header tag */}
            <div className="flex items-center space-x-1.5 mb-1.5">
              {msg.role === 'analyst' ? (
                <>
                  <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold">инспектор (Вы)</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 rotate-45" />
                  <span className="text-[9px] uppercase tracking-wider font-mono text-cyan-400 font-bold flex items-center">
                    <Sparkles className="w-2.5 h-2.5 mr-1" /> OSINT Co-Analyst
                  </span>
                </>
              )}
            </div>

            {/* Bubble body */}
            <div
              className={`p-3 rounded text-[11px] leading-relaxed shadow-sm ${
                msg.role === 'analyst'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tr-none'
                  : 'bg-slate-900/60 border border-slate-800/80 rounded-tl-none font-sans'
              }`}
            >
              {msg.role === 'analyst' ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <div className="space-y-1.5">{formatText(msg.text)}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col mr-auto max-w-[85%] items-start">
            <div className="flex items-center space-x-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[9px] uppercase tracking-wider font-mono text-cyan-400 font-bold">
                анализ графа расследования...
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded rounded-tl-none flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-[10px] font-mono text-slate-400">Формирую аналитическую гипотезу...</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Preset analytic queries triggers */}
      <div className="p-3 bg-slate-950 border-t border-slate-900 flex flex-wrap gap-1.5 max-h-16 shrink-0 justify-start overflow-hidden">
        <button
          disabled={loading || nodes.length === 0}
          onClick={() => handleSend("Проведи глубокий тактический анализ доски. Выдели ключевых подозреваемых и связи.")}
          className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 hover:border-cyan-500/80 text-cyan-400 px-2.5 py-1 rounded cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🔍 Тактический анализ
        </button>
        <button
          disabled={loading || nodes.length === 0}
          onClick={() => handleSend("Какие 3-4 конкретных шага мне следует сделать дальше для верификации улик?")}
          className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 hover:border-cyan-500/80 text-cyan-400 px-2.5 py-1 rounded cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ◇ Что проверять дальше?
        </button>
        <button
          disabled={loading || nodes.length === 0}
          onClick={() => handleSend("Найди на доске скрытые связи, аномалии или потенциальные зацепки.")}
          className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 hover:border-cyan-500/80 text-cyan-400 px-2.5 py-1 rounded cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⚡ Поиск аномалий
        </button>
      </div>

      {/* Chat form footer */}
      <div className="p-3 bg-[#0a0e1a] border-t border-slate-900 flex items-center space-x-2 shrink-0">
        <input
          disabled={loading}
          type="text"
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-slate-100 px-3 py-1.5 rounded-md outline-none"
          placeholder="Спросите AI про совпадения, IP, сотовые MCC..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          disabled={loading || !query.trim()}
          onClick={() => handleSend()}
          className="w-8 h-8 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
