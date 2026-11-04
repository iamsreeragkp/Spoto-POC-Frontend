import { useState } from 'react';
import { X } from 'lucide-react';
import { recTone, scoreTone, initials } from '../lib/constants.js';

export function ScoreBadge({ value, label, size = 'md' }) {
  return (
    <div className={`score score-${size} tone-${scoreTone(value)}`} title={label}>
      <span className="score-num">{value ?? '–'}</span>
      {label && <span className="score-label">{label}</span>}
    </div>
  );
}

export function RecBadge({ value }) {
  if (!value) return <span className="muted">—</span>;
  return <span className={`badge badge-${recTone(value)}`}>{value}</span>;
}

export function Avatar({ name, size = 40 }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', r = 8 }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

/** 0–10 segmented selector; click the active value again to clear. */
export function ScorePicker({ value, onChange }) {
  return (
    <div className="picker" role="radiogroup">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          className={value === i ? `on tone-${scoreTone(i)}` : ''}
          onClick={() => onChange(value === i ? null : i)}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

/** Chip list with inline add (Enter or comma) and optional suggestions. */
export function TagInput({ tags, onChange, suggestions = [], placeholder }) {
  const [text, setText] = useState('');
  const [listId] = useState(() => `dl-${Math.random().toString(36).slice(2)}`);

  const add = (raw) => {
    const t = raw.trim().replace(/,$/, '').trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setText('');
  };

  return (
    <div className="taginput">
      {tags.map((t) => (
        <span key={t} className="chip chip-edit">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={text}
        list={listId}
        placeholder={tags.length ? 'Add…' : placeholder || 'Add a tag…'}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) add(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(text); }
          if (e.key === 'Backspace' && !text && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={() => text && add(text)}
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !tags.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

export function Pagination({ page, totalPages, total, limit, onPage }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <div className="pagination">
      <span className="muted">Showing {from}–{to} of {total}</span>
      <div className="pages">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        {pages.map((p, i) =>
          p === '…' ? <span key={`e${i}`} className="muted">…</span> : (
            <button key={p} className={p === page ? 'on' : ''} onClick={() => onPage(p)}>{p}</button>
          )
        )}
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
