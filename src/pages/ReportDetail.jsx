import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Footprints, Pencil, Ruler, Save, Shield, Trash2, User, X,
} from 'lucide-react';
import {
  useDeleteReport, useMatches, usePlayer, usePlayerReports, useReport, useScouts,
  useTagSuggestions, useUpdateReport,
} from '../lib/queries.js';
import {
  CATEGORIES, EDITABLE_FIELDS, HEIGHTS, RECOMMENDATIONS, STAGES,
  fmtDate, joinTags, splitTags,
} from '../lib/constants.js';
import { Avatar, RecBadge, ScoreBadge, ScorePicker, Skeleton, TagInput } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';

const pick = (r) => Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, r[k] ?? null]));

export default function ReportDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: report, error: loadError } = useReport(id);
  const { data: player } = usePlayer(report?.player_id);
  const { data: siblings = [] } = usePlayerReports(report?.player_id);
  const { data: matches = [] } = useMatches(editing);
  const { data: scouts = [] } = useScouts(editing);
  const { data: tags = {} } = useTagSuggestions(editing);
  const options = { matches, scouts, tags };
  const updateMutation = useUpdateReport(id);
  const deleteMutation = useDeleteReport(id);
  const saving = updateMutation.isPending;
  const error = loadError?.message;

  useEffect(() => { setEditing(false); setDraft(null); }, [id]);

  const changed = useMemo(() => {
    if (!draft || !report) return {};
    const base = pick(report);
    return Object.fromEntries(Object.entries(draft).filter(([k, v]) => v !== base[k]));
  }, [draft, report]);
  const dirty = Object.keys(changed).length > 0;

  const startEdit = () => { setDraft(pick(report)); setEditing(true); };
  const cancel = () => { setEditing(false); setDraft(null); };
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const body = Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v ?? '']));
    updateMutation.mutate(body, {
      onSuccess: () => { cancel(); toast('Report saved'); },
      onError: (e) => toast(e.message, 'error'),
    });
  };

  const remove = () =>
    deleteMutation.mutate(undefined, {
      onSuccess: () => { toast('Report deleted'); nav('/reports', { replace: true }); },
      onError: (e) => toast(e.message, 'error'),
    });

  if (error) {
    return (
      <div className="page">
        <Link to="/reports" className="back"><ArrowLeft size={16} /> All reports</Link>
        <div className="card empty"><h3>Report unavailable</h3><p className="muted">{error}</p></div>
      </div>
    );
  }
  if (!report) return <DetailSkeleton />;

  const v = editing ? draft : report;
  const otherReports = siblings.filter((s) => String(s.id) !== String(id));

  return (
    <div className="page">
      <Link to="/reports" className="back"><ArrowLeft size={16} /> All reports</Link>

      <div className="detail-head card">
        <Avatar name={report.player_name} size={64} />
        <div className="detail-title">
          <h1>{report.player_name}</h1>
          <div className="meta-row">
            {report.player_position && <span><User size={14} /> {report.player_position}</span>}
            {report.player_age_group && <span><CalendarDays size={14} /> Born {report.player_age_group}</span>}
            {player?.team_name && <span><Shield size={14} /> {player.team_name}</span>}
            {player?.strong_foot && <span><Footprints size={14} /> {player.strong_foot}</span>}
          </div>
          <RecBadge value={report.recommendation} />
        </div>
        <div className="head-scores">
          <ScoreBadge value={report.overall_score} label="Overall" size="lg" />
          <ScoreBadge value={report.overall_potential_score} label="Potential" size="lg" />
        </div>
        <div className="head-actions">
          {editing ? (
            <>
              <button className="btn btn-ghost" onClick={cancel} disabled={saving}><X size={16} /> Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
                <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /></button>
              <button className="btn btn-primary" onClick={startEdit}><Pencil size={16} /> Edit report</button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="edit-banner">
          Editing — {dirty ? `${Object.keys(changed).length} unsaved change${Object.keys(changed).length > 1 ? 's' : ''}` : 'no changes yet'}
        </div>
      )}

      <div className="detail-grid">
        <div className="col">
          <section className="card">
            <h2>Overall assessment</h2>
            {editing ? (
              <div className="form-grid">
                <Field label="Overall score"><ScorePicker value={v.overall_score} onChange={(x) => set('overall_score', x)} /></Field>
                <Field label="Potential score"><ScorePicker value={v.overall_potential_score} onChange={(x) => set('overall_potential_score', x)} /></Field>
                <Field label="Recommendation" wide>
                  <input
                    list="rec-list"
                    value={v.recommendation ?? ''}
                    onChange={(e) => set('recommendation', e.target.value || null)}
                    placeholder="Select or type a recommendation"
                  />
                  <datalist id="rec-list">{RECOMMENDATIONS.map((r) => <option key={r} value={r} />)}</datalist>
                </Field>
                <Field label="Overall comment" wide>
                  <textarea
                    rows={9}
                    value={v.overall_comment ?? ''}
                    onChange={(e) => set('overall_comment', e.target.value || null)}
                  />
                </Field>
              </div>
            ) : (
              <p className="comment">{report.overall_comment || <span className="muted">No comment written.</span>}</p>
            )}
          </section>

          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <section className="card cat" key={c.key}>
                <div className="cat-head">
                  <h2>{c.label}</h2>
                  {!editing && <ScoreBadge value={report[c.score]} size="sm" />}
                </div>
                {editing ? (
                  <>
                    <ScorePicker value={v[c.score]} onChange={(x) => set(c.score, x)} />
                    <TagInput
                      tags={splitTags(v[c.key])}
                      suggestions={options.tags[c.key]}
                      onChange={(t) => set(c.key, t.length ? joinTags(t) : null)}
                    />
                  </>
                ) : splitTags(report[c.key]).length ? (
                  <p className="comment">{splitTags(report[c.key]).join(', ')}</p>
                ) : (
                  <span className="muted">Nothing recorded</span>
                )}
              </section>
            ))}
          </div>
        </div>

        <aside className="col">
          <section className="card">
            <h2>Report info</h2>
            {editing ? (
              <div className="form-grid one">
                <Field label="Report date">
                  <input type="date" value={v.report_date?.slice(0, 10) ?? ''} onChange={(e) => set('report_date', e.target.value || null)} />
                </Field>
                <Field label="Scout">
                  <select value={v.scout_id ?? ''} onChange={(e) => set('scout_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— None —</option>
                    {withCurrent(options.scouts, v.scout_id, report.scout_name).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Match">
                  <select value={v.match_id ?? ''} onChange={(e) => set('match_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— None —</option>
                    {withCurrent(options.matches, v.match_id, matchLabelOf(report), 'event').map((m) => (
                      <option key={m.id} value={m.id}>{m.label || matchLabel(m)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Stage of growth">
                  <select value={v.stage_of_growth ?? ''} onChange={(e) => set('stage_of_growth', e.target.value || null)}>
                    <option value="">— Unknown —</option>
                    {STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Height now (cm)">
                  <select value={v.height_now ?? ''} onChange={(e) => set('height_now', e.target.value || null)}>
                    <option value="">— Unknown —</option>
                    {(HEIGHTS.includes(v.height_now) || !v.height_now ? HEIGHTS : [v.height_now, ...HEIGHTS]).map((h) => <option key={h}>{h}</option>)}
                  </select>
                </Field>
              </div>
            ) : (
              <dl className="facts">
                <Fact label="Report date" value={fmtDate(report.report_date)} />
                <Fact label="Scout" value={report.scout_name} />
                <Fact label="Stage of growth" value={report.stage_of_growth} />
                <Fact label="Height now" value={report.height_now && `${report.height_now} cm`} icon={<Ruler size={14} />} />
              </dl>
            )}
          </section>

          <section className="card">
            <h2>Match</h2>
            <dl className="facts">
              <Fact label="Event" value={report.event} />
              <Fact
                label="Fixture"
                value={report.home_team && report.away_team ? `${report.home_team} vs ${report.away_team}` : null}
              />
              <Fact label="Match date" value={report.match_date && fmtDate(report.match_date)} />
            </dl>
            {editing && <p className="hint">Change the match above under “Report info”.</p>}
          </section>

          <section className="card">
            <h2>Player</h2>
            <dl className="facts">
              <Fact label="Name" value={report.player_name} />
              <Fact label="Position" value={report.player_position} />
              <Fact label="Secondary position" value={player?.secondary_position} />
              <Fact label="Team" value={player?.team_name} />
              <Fact label="Jersey" value={player?.jersey_number != null ? `#${player.jersey_number}` : null} />
              <Fact label="Strong foot" value={player?.strong_foot} />
              <Fact label="Location" value={player?.location} />
              <Fact label="Date of birth" value={player?.date_of_birth && fmtDate(player.date_of_birth)} />
              <Fact label="Parents’ height" value={player && (player.mother_height || player.father_height) ? `Mother ${player.mother_height || '—'} · Father ${player.father_height || '—'}` : null} />
            </dl>
          </section>

          {otherReports.length > 0 && (
            <section className="card">
              <h2>Other reports on this player</h2>
              <ul className="siblings">
                {otherReports.map((s) => (
                  <li key={s.id}>
                    <Link to={`/reports/${s.id}`}>
                      <span>
                        <strong>{fmtDate(s.report_date)}</strong>
                        <span className="meta">{s.scout_name || 'Unknown scout'}</span>
                      </span>
                      <ScoreBadge value={s.overall_score} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this report?</h3>
            <p className="muted">The report for {report.player_name} will be permanently removed. This can’t be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Keep it</button>
              <button className="btn btn-danger" onClick={remove}>Delete report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const matchLabel = (m) =>
  `${m.match_date ? fmtDate(m.match_date) : 'No date'} · ${m.home_team_name && m.away_team_name ? `${m.home_team_name} – ${m.away_team_name}` : m.event}`;
const matchLabelOf = (r) => `${fmtDate(r.match_date)} · ${r.home_team} – ${r.away_team}`;

/** Make sure the report's current value is selectable even before options finish loading. */
function withCurrent(list, id, label, labelKey = 'name') {
  if (id == null || list.some((x) => x.id === id)) return list;
  return [{ id, [labelKey]: label, label }, ...list];
}

function Field({ label, wide, children }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Fact({ label, value, icon }) {
  return (
    <div className="fact">
      <dt>{icon}{label}</dt>
      <dd>{value || <span className="muted">—</span>}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="page">
      <Skeleton h={20} w={110} />
      <Skeleton h={110} r={16} />
      <div className="detail-grid">
        <div className="col"><Skeleton h={220} r={16} /><Skeleton h={260} r={16} /></div>
        <div className="col"><Skeleton h={240} r={16} /><Skeleton h={200} r={16} /></div>
      </div>
    </div>
  );
}
