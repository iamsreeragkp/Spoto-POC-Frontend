import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bot, Info, MapPin, MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { MAX_MESSAGE, streamChat } from '../lib/chat.js';
import { ScoreBadge } from './ui.jsx';

const SUGGESTIONS = [
  'How many players per position?',
  'Find players with ball-movement or moving with the ball',
  'How many players live within 1 hour from Ikast?',
  'Which player has the best scout comment?',
];

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hi! I’m your scouting assistant. Ask me about players, reports or scouts — for example, counts, lists or comparisons.',
};

let seq = 0;
const nextId = () => `m${++seq}`;

/** Turns "#14" mentions (comment analysis) into links to that report. */
function Linked({ text }) {
  return text.split(/(#\d+)/g).map((part, i) =>
    /^#\d+$/.test(part)
      ? <Link key={i} className="ref" to={`/reports/${part.slice(1)}`}>{part}</Link>
      : part
  );
}

function PlayerCard({ p }) {
  const meta = [p.position, p.team_name, p.age_group && `b. ${p.age_group}`].filter(Boolean).join(' · ');
  return (
    <Link to={`/reports/${p.report_id}`} className="pcard">
      <div className="pcard-main">
        <strong>{p.name}</strong>
        <span>{meta || 'No details recorded'}</span>
        <span className="pcard-tags">
          {p.location && <em><MapPin size={11} /> {p.location}</em>}
          {p.drive_minutes != null && <em>{Math.round(Number(p.drive_minutes))} min drive</em>}
          {p.strong_foot && <em>{p.strong_foot} foot</em>}
          {p.father_height_mid && <em>Father ~{Math.round(Number(p.father_height_mid))} cm</em>}
        </span>
      </div>
      <div className="pcard-scores">
        <ScoreBadge value={p.overall_score} size="sm" />
        <ScoreBadge value={p.overall_potential_score} size="sm" />
      </div>
    </Link>
  );
}

function Groups({ groups }) {
  const max = Math.max(...groups.map((g) => g.count), 1);
  return (
    <div className="groups">
      {groups.map((g) => (
        <div key={String(g.key)} className="grp">
          <span>{g.key ?? 'Not recorded'}</span>
          <div><i style={{ width: `${(g.count / max) * 100}%` }} /></div>
          <b>{g.count}</b>
        </div>
      ))}
    </div>
  );
}

function AssistantMessage({ m }) {
  if (m.pending) {
    return (
      <div className="bubble-col">
        {m.text ? (
          <div className="bubble"><Linked text={m.text} /><span className="caret" /></div>
        ) : (
          <div className="bubble typing"><span /><span /><span /></div>
        )}
        {m.status && <span className="status">{m.status}</span>}
      </div>
    );
  }

  const details = [...(m.interpreted || []), ...(m.assumptions || [])];
  return (
    <div className="bubble-col">
      <div className={`bubble ${m.error ? 'bubble-error' : ''}`}>
        {m.error && <AlertTriangle size={14} />}
        <span className="answer">{m.intent === 'comment_analysis' ? <Linked text={m.text} /> : m.text}</span>
      </div>

      {m.notes?.length > 0 && (
        <div className="notes">
          {m.notes.map((n) => <p key={n}><AlertTriangle size={14} /> {n}</p>)}
        </div>
      )}
      {m.groups?.length > 0 && <Groups groups={m.groups} />}
      {m.players?.length > 0 && (
        <div className="plist">
          {m.players.map((p) => <PlayerCard key={`${p.player_id}-${p.report_id}`} p={p} />)}
        </div>
      )}

      {(details.length > 0 || m.sent_to_llm) && (
        <details className="why">
          <summary><Info size={12} /> How I read this{m.sent_to_llm && <span className="ai-tag">AI-analysed</span>}</summary>
          <ul>{details.map((d) => <li key={d}>{d}</li>)}</ul>
          {m.sent_to_llm && <p>Scout comment text was sent to the AI for this answer.</p>}
        </details>
      )}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const conversationId = useRef(null);
  const cancel = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); cancel.current?.(); };
  }, []);

  const patch = (id, changes) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...changes } : m)));

  const send = (raw) => {
    const value = raw.trim().slice(0, MAX_MESSAGE);
    if (!value || busy) return;
    const replyId = nextId();
    setMessages((ms) => [
      ...ms,
      { id: nextId(), role: 'user', text: value },
      { id: replyId, role: 'assistant', pending: true, text: '', status: 'Thinking…' },
    ]);
    setText('');
    setBusy(true);

    cancel.current = streamChat({
      message: value,
      conversationId: conversationId.current,
      onStatus: (status) => patch(replyId, { status }),
      onToken: (t) => setMessages((ms) => ms.map((m) => (m.id === replyId ? { ...m, text: m.text + t } : m))),
      onResult: (r) => {
        conversationId.current = r.conversation_id;
        patch(replyId, { ...r, text: r.answer, pending: false, status: '' });
        setBusy(false);
      },
      onError: (err) => {
        patch(replyId, { pending: false, status: '', error: true, text: err.message });
        setBusy(false);
      },
    });
  };

  const reset = () => {
    cancel.current?.();
    conversationId.current = null;
    setBusy(false);
    setMessages([WELCOME]);
  };

  return (
    <>
      <section className={`chat ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="AI assistant">
        <header className="chat-head">
          <div className="chat-avatar"><Sparkles size={18} /></div>
          <div>
            <strong>Scouting Assistant</strong>
            <span><i /> Online</span>
          </div>
          <button className="icon-btn" aria-label="New conversation" title="New conversation" onClick={reset}>
            <RotateCcw size={16} />
          </button>
          <button className="icon-btn" aria-label="Close chat" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </header>

        <div className="chat-body">
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>
              {m.role === 'assistant' && <div className="msg-icon"><Bot size={14} /></div>}
              {m.role === 'assistant' ? <AssistantMessage m={m} /> : <div className="bubble">{m.text}</div>}
            </div>
          ))}
          {messages.length === 1 && (
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <input
            ref={inputRef}
            value={text}
            maxLength={MAX_MESSAGE}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask anything about your players…"
            tabIndex={open ? 0 : -1}
          />
          <button type="submit" aria-label="Send" disabled={!text.trim() || busy}>
            <Send size={16} />
          </button>
        </form>
      </section>

      <button
        className={`chat-fab ${open ? 'open' : ''}`}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        onClick={() => setOpen((o) => !o)}
      >
        <MessageCircle className="ic-chat" size={26} />
        <X className="ic-close" size={26} />
      </button>
    </>
  );
}
