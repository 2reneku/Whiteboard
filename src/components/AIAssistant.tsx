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
      text: 'Приветствую. Я ваш AI-ассистент.\n\nДобавьте объекты на холст, и я помогу вам спроектировать интерактивную карту, выявить пересечения или составить отчёт.',
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
        return <h4 key={idx} className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 mt-4 mb-2 glow-text-teal">{trimmed.replace('###', '').trim()}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={idx} className="text-xs font-mono font-bold uppercase tracking-wider text-teal-400 mt-4 mb-2 glow-text-teal">{trimmed.replace('##', '').trim()}</h3>;
      }
      if (trimmed.startsWith('#')) {
        return <h2 key={idx} className="text-[11px] font-mono font-bold uppercase tracking-widest text-teal-400 mt-4 mb-2 glow-text-teal">{trimmed.replace('#', '').trim()}</h2>;
      }

      // Bold **
      let renderedLine: React.ReactNode = trimmed;
      if (trimmed.includes('**')) {
        const parts = trimmed.split('**');
        renderedLine = parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-teal-300 font-bold">{part}</strong> : part);
      }

      // Bullets '*' or '-'
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        return (
          <div key={idx} className="flex items-start text-[11px] text-zinc-350 ml-2 my-1 leading-relaxed">
            <span className="text-teal-500 mr-2 font-mono shrink-0">◇</span>
            <div>{typeof renderedLine === 'string' ? trimmed.substring(1).trim() : renderedLine}</div>
          </div>
        );
      }

      return <p key={idx} className="text-[11px] text-zinc-350 leading-relaxed my-1.5 break-words whitespace-pre-wrap font-sans">{renderedLine}</p>;
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
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-200 select-text border-l border-zinc-850">
      {/* Header bar */}
      <div className="p-3 border-b border-zinc-900 bg-zinc-950/40 flex items-center justify-between shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center">
          <Brain className="w-3.5 h-3.5 mr-1.5 text-teal-500" /> ИНТЕЛЛЕКТУАЛЬНЫЙ АССИСТЕНТ (AI)
        </span>
        <span className="text-[8.5px] font-mono text-teal-400 bg-teal-950/30 border border-teal-900 px-1.5 py-0.2 select-none glow-teal">
          ONLINE
        </span>
      </div>

      {/* Messages timeline log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-900">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[90%] ${
              msg.role === 'analyst' ? 'ml-auto items-end animate-fade-in' : 'mr-auto items-start'
            }`}
          >
            {/* Header tag */}
            <div className="flex items-center space-x-1.5 mb-1">
              {msg.role === 'analyst' ? (
                <>
                  <span className="text-[9px] uppercase tracking-wider font-mono text-zinc-500 font-bold">Пользователь (Вы)</span>
                  <div className="w-1.5 h-1.5 rounded-none bg-zinc-500" />
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-none bg-teal-400 rotate-45 glow-teal" />
                  <span className="text-[9px] uppercase tracking-wider font-mono text-teal-400 font-bold flex items-center glow-text-teal">
                    <Sparkles className="w-2.5 h-2.5 mr-1 text-teal-400" /> OSINT Co-Analyst
                  </span>
                </>
              )}
            </div>

            {/* Bubble body */}
            <div
              className={`p-3 rounded-none text-[11px] leading-relaxed ${
                msg.role === 'analyst'
                  ? 'bg-zinc-900 text-zinc-100 border border-zinc-805'
                  : 'bg-zinc-950/70 border border-zinc-900 font-sans'
              }`}
            >
              {msg.role === 'analyst' ? (
                <p className="whitespace-pre-wrap font-mono text-[10.5px] text-zinc-200">{msg.text}</p>
              ) : (
                <div className="space-y-1.5">{formatText(msg.text)}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col mr-auto max-w-[85%] items-start">
            <div className="flex items-center space-x-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-none bg-teal-400 animate-ping glow-teal" />
              <span className="text-[9px] uppercase tracking-wider font-mono text-teal-400 font-bold">
                анализ графа расследования...
              </span>
            </div>
            <div className="p-3 bg-zinc-950/80 border border-zinc-90 w-full rounded-none flex items-center space-x-2.5">
              <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
              <span className="text-[10px] font-mono text-zinc-400">Формирую аналитическую гипотезу...</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Preset analytic queries triggers */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex flex-wrap gap-1.5 shrink-0 justify-start">
        <button
          disabled={loading || nodes.length === 0}
          onClick={() => handleSend("Проведи глубокий тактический анализ доски. Выдели ключевых подозреваемых и связи.")}
          className="text-[9px] font-mono font-bold bg-zinc-900/40 border border-zinc-850 hover:border-teal-500 hover:text-teal-300 px-2.5 py-1 rounded-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:glow-teal"
        >
          🔍 Тактический анализ
        </button>
        <button
          disabled={loading || nodes.length === 0}
          onClick={() => handleSend("Какие 3-4 конкретных шага мне следует сделать дальше для верификации улик?")}
          className="text-[9px] font-mono font-bold bg-zinc-900/40 border border-zinc-850 hover:border-teal-500 hover:text-teal-300 px-2.5 py-1 rounded-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:glow-teal"
        >
          ◇ Мероприятия проверки
        </button>
        <button
          disabled={loading || nodes.length === 0}
          onClick={() => handleSend("Найди на доске скрытые связи, аномалии или потенциальные зацепки.")}
          className="text-[9px] font-mono font-bold bg-zinc-900/40 border border-zinc-850 hover:border-teal-500 hover:text-teal-300 px-2.5 py-1 rounded-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:glow-teal"
        >
          ⚡ Поиск аномалий
        </button>
      </div>

      {/* Chat form footer */}
      <div className="p-3 bg-zinc-950/80 border-t border-zinc-900 flex items-center space-x-2 shrink-0">
        <input
          disabled={loading}
          type="text"
          className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-teal-500 text-xs text-zinc-150 px-3 py-1.5 rounded-none outline-none focus:glow-teal transition-all font-mono"
          placeholder="Спросите AI про совпадения, IP, сотовые MCC..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          disabled={loading || !query.trim()}
          onClick={() => handleSend()}
          className="w-8 h-8 rounded-none bg-teal-600 hover:bg-teal-500 text-zinc-950 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer border border-teal-500 hover:glow-teal"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
