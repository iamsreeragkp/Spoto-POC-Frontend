export const STAGES = [
  'Very Early developed',
  'Early developed',
  'Average developed',
  'Late developed',
  'Very Late developed',
];

export const HEIGHTS = Array.from({ length: 9 }, (_, i) => `${111 + i * 10}-${120 + i * 10}`);

export const RECOMMENDATIONS = [
  'Golden Boy!!!',
  'Scout recommends this player!',
  'Needs to be watched again!',
  'Not good enough – discontinue monitoring!',
];

export const CATEGORIES = [
  { key: 'physical', label: 'Physical', score: 'score_physical' },
  { key: 'mental', label: 'Mental', score: 'score_mental' },
  { key: 'technical', label: 'Technical', score: 'score_technical' },
  { key: 'tactical', label: 'Tactical', score: 'score_tactical' },
  { key: 'deadball', label: 'Dead ball', score: 'score_deadball' },
  { key: 'x_factor', label: 'X-factor', score: 'score_x_factor' },
];

// Written comment per category (newer assessment exports and all feedback reports)
export const CATEGORY_COMMENTS = {
  physical: 'physical_comment', technical: 'technical_comment', tactical: 'tactical_comment', mental: 'mental_comment',
};

// Feedback reports: a coach about a period of sessions, one score + comment per category
export const FEEDBACK_CATEGORIES = [
  { label: 'Physical', score: 'score_physical', comment: 'physical_comment' },
  { label: 'Technical', score: 'score_technical', comment: 'technical_comment' },
  { label: 'Psychological', score: 'score_mental', comment: 'mental_comment' },
  { label: 'Behavioral', score: 'score_behavioral', comment: 'behavioral_comment' },
  { label: 'Tactical', score: 'score_tactical', comment: 'tactical_comment' },
];

export const EDITABLE_FIELDS = [
  'match_id', 'scout_id', 'report_date', 'stage_of_growth', 'height_now',
  ...CATEGORIES.flatMap((c) => [c.key, c.score]),
  'overall_score', 'overall_potential_score', 'overall_comment', 'recommendation',
  'physical_comment', 'technical_comment', 'tactical_comment', 'mental_comment', 'behavioral_comment', 'score_behavioral',
  'period_start', 'period_end', 'competition_level',
];

/** Where a report is shown: feedback reports have their own page */
export const reportPath = (r) => `${r?.report_type === 'feedback' ? '/feedback-reports' : '/reports'}/${r?.id ?? r?.report_id}`;

export function recTone(rec = '') {
  const r = rec.toLowerCase();
  if (r.includes('golden')) return 'gold';
  if (r.includes('recommends')) return 'green';
  if (r.includes('watched')) return 'blue';
  if (r.includes('not good')) return 'red';
  return 'gray';
}

export function scoreTone(n) {
  if (n === null || n === undefined) return 'none';
  if (n >= 6) return 'great';
  if (n >= 5) return 'good';
  if (n >= 4) return 'mid';
  return 'low';
}

export const splitTags = (s) => (s ? s.split(',').map((t) => t.trim()).filter(Boolean) : []);
export const joinTags = (a) => a.join(', ');

export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(`${d.slice(0, 10)}T00:00:00`);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((p) => p[0]).join('').toUpperCase() || '?';
