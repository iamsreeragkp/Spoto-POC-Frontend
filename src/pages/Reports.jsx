import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, Search, Shield, X } from 'lucide-react';
import { usePlayersById, useReports, useStats } from '../lib/queries.js';
import { RECOMMENDATIONS, fmtDate, recTone } from '../lib/constants.js';
import { Avatar, Pagination, RecBadge, ScoreBadge, Skeleton } from '../components/ui.jsx';

const LIMIT = 15;
const SORTS = [
  { value: 'date', label: 'Report date' },
  { value: 'overallScore', label: 'Overall score' },
  { value: 'potentialScore', label: 'Potential score' },
  { value: 'player', label: 'Player name' },
  { value: 'scout', label: 'Scout' },
];

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Reports() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') || 1);
  const recommendation = sp.get('recommendation') || '';
  const minOverallScore = sp.get('minOverallScore') || '';
  const sortBy = sp.get('sortBy') || 'date';
  const order = sp.get('order') || 'desc';
  const urlSearch = sp.get('search') || '';

  const [searchText, setSearchText] = useState(urlSearch);
  const debounced = useDebounced(searchText);

  const { data: stats } = useStats();
  const { data: players = {} } = usePlayersById();
  const reportsQuery = useReports({
    page, limit: LIMIT, search: urlSearch, recommendation, minOverallScore, sortBy, order,
  });

  const update = (patch, resetPage = true) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null ? next.delete(k) : next.set(k, v)));
    if (resetPage) next.delete('page');
    setSp(next, { replace: true });
  };

  useEffect(() => {
    if (debounced !== urlSearch) update({ search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const avg = useMemo(() => {
    const rows = stats?.byOverallScore || [];
    const n = rows.reduce((a, r) => a + r.count, 0);
    return n ? (rows.reduce((a, r) => a + r.overall_score * r.count, 0) / n).toFixed(1) : '–';
  }, [stats]);

  const recCount = (name) => stats?.byRecommendation.find((r) => r.recommendation === name)?.count;
  const filtered = urlSearch || recommendation || minOverallScore;
  const rows = reportsQuery.data?.data ?? [];
  const pagination = reportsQuery.data?.pagination;
  const error = reportsQuery.isError ? reportsQuery.error.message : null;
  const loading = reportsQuery.isFetching;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Player reports</h1>
          <p className="muted">Scouting assessments across all matches and players.</p>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Reports" value={stats?.counts.reports} />
        <Kpi label="Players" value={stats?.counts.players} />
        <Kpi label="Scouts" value={stats?.counts.scouts} />
        <Kpi label="Average score" value={stats ? avg : undefined} suffix="/ 10" />
      </div>

      <div className="card toolbar">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Search player, scout, comment, event…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button className="icon-btn" aria-label="Clear search" onClick={() => setSearchText('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <label className="select">
          <span>Min score</span>
          <select value={minOverallScore} onChange={(e) => update({ minOverallScore: e.target.value })}>
            <option value="">Any</option>
            {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        <label className="select">
          <span>Sort by</span>
          <select value={sortBy} onChange={(e) => update({ sortBy: e.target.value })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <button
          className="btn btn-ghost"
          onClick={() => update({ order: order === 'asc' ? 'desc' : 'asc' })}
          title={order === 'asc' ? 'Ascending' : 'Descending'}
        >
          {order === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
          {order === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      <div className="filter-chips">
        <button className={`fchip ${!recommendation ? 'on' : ''}`} onClick={() => update({ recommendation: '' })}>
          All
        </button>
        {RECOMMENDATIONS.map((r) => (
          <button
            key={r}
            className={`fchip tone-${recTone(r)} ${recommendation === r ? 'on' : ''}`}
            onClick={() => update({ recommendation: recommendation === r ? '' : r })}
          >
            {r}
            {recCount(r) != null && <b>{recCount(r)}</b>}
          </button>
        ))}
      </div>

      <div className="card list">
        <div className="row row-head">
          <div>Player</div>
          <div>Match</div>
          <div>Scout</div>
          <div className="center">Scores</div>
          <div>Recommendation</div>
          <div />
        </div>

        {loading && !rows.length && Array.from({ length: 6 }, (_, i) => (
          <div className="row" key={i}>
            <Skeleton h={40} /><Skeleton h={40} /><Skeleton h={20} /><Skeleton h={40} /><Skeleton h={24} /><span />
          </div>
        ))}

        {error && (
          <div className="empty">
            <h3>Couldn’t load reports</h3>
            <p className="muted">{error}</p>
            <button className="btn" onClick={() => reportsQuery.refetch()}>Retry</button>
          </div>
        )}

        {!loading && !error && !rows.length && (
          <div className="empty">
            <h3>No reports found</h3>
            <p className="muted">Try adjusting your search or filters.</p>
            {filtered && (
              <button className="btn" onClick={() => { setSearchText(''); setSp({}, { replace: true }); }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        <div className={loading && rows.length ? 'fading' : ''}>
          {rows.map((r) => {
            const p = players[r.player_id];
            return (
              <Link to={`/reports/${r.id}`} className="row row-item" key={r.id}>
                <div className="cell-player">
                  <Avatar name={r.player_name} />
                  <div className="stack">
                    <strong>{r.player_name}</strong>
                    <span className="meta">
                      {r.player_position || 'No position'}
                      {r.player_age_group && <> · b. {r.player_age_group}</>}
                    </span>
                    <span className="meta">
                      {p?.team_name && <><Shield size={12} /> {p.team_name}</>}
                      {p?.jersey_number != null && <> · #{p.jersey_number}</>}
                      {p?.strong_foot && <> · {p.strong_foot}</>}
                    </span>
                  </div>
                </div>
                <div className="stack" data-label="Match">
                  <span>{r.home_team && r.away_team ? `${r.home_team} – ${r.away_team}` : r.event || '—'}</span>
                  <span className="meta">{fmtDate(r.match_date || r.report_date)}</span>
                </div>
                <div className="stack" data-label="Scout">
                  <span>{r.scout_name || '—'}</span>
                  <span className="meta">{fmtDate(r.report_date)}</span>
                </div>
                <div className="scores">
                  <ScoreBadge value={r.overall_score} label="Overall" />
                  <ScoreBadge value={r.overall_potential_score} label="Potential" />
                </div>
                <div><RecBadge value={r.recommendation} /></div>
                <ChevronRight className="chev" size={18} />
              </Link>
            );
          })}
        </div>
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPage={(p) => { update({ page: p }, false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, suffix }) {
  return (
    <div className="card kpi">
      <span className="muted">{label}</span>
      {value === undefined ? <Skeleton h={28} w={70} /> : <strong>{value}{suffix && <small> {suffix}</small>}</strong>}
    </div>
  );
}
