import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, CirclePlus, Search, SlidersHorizontal } from 'lucide-react';
import { usePlayersById, useReports, useStats } from '../lib/queries.js';
import { RECOMMENDATIONS } from '../lib/constants.js';
import { Pagination, Skeleton } from '../components/ui.jsx';

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

  const [showFilters, setShowFilters] = useState(false);
  const sortHead = (key, label) => (
    <th className="sortable" onClick={() => update(sortBy === key ? { order: order === 'asc' ? 'desc' : 'asc' } : { sortBy: key, order: 'asc' })}>
      {label} <ArrowDown size={12} className={sortBy === key && order === 'asc' ? 'flip' : ''} />
    </th>
  );
  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  return (
    <div className="page">
      <h1>Published Assessment Reports</h1>

      <div className="list-bar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <div className="bar-right">
          <button className="bulk"><CirclePlus size={20} /> BULK UPLOAD</button>
          <button className="filter-btn" aria-label="Filters" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <label className="select"><span>Min score</span>
            <select value={minOverallScore} onChange={(e) => update({ minOverallScore: e.target.value })}>
              <option value="">Any</option>
              {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </label>
          <label className="select"><span>Recommendation</span>
            <select value={recommendation} onChange={(e) => update({ recommendation: e.target.value })}>
              <option value="">All</option>
              {RECOMMENDATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
      )}

      <div className={`table-wrap ${loading && rows.length ? 'fading' : ''}`}>
        <table className="dtable">
          <thead>
            <tr>
              <th className="cb"><input type="checkbox" aria-label="Select all" /></th>
              <th>Color</th>
              {sortHead('player', 'Player Name')}
              <th>Gender <ArrowDown size={12} /></th>
              <th>Jersey Number <ArrowDown size={12} /></th>
              {sortHead('date', 'Publish Date')}
              <th>Position</th>
              {sortHead('potentialScore', 'Potential Score')}
              <th>Age Group</th>
              {sortHead('overallScore', 'Overall Score')}
              <th>Team</th>
              <th>Recommendations</th>
              {sortHead('scout', 'Scout Name')}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = players[r.player_id];
              return (
                <tr key={r.id}>
                  <td className="cb"><input type="checkbox" aria-label="Select row" /></td>
                  <td><span className="swatch" /></td>
                  <td><Link className="ulink" to={`/reports/${r.id}`}>{r.player_name}</Link></td>
                  <td>{p?.gender || ''}</td>
                  <td>{p?.jersey_number != null ? <Link className="ulink" to={`/reports/${r.id}`}>{p.jersey_number}</Link> : ''}</td>
                  <td>{fmt(r.report_date)}</td>
                  <td>{r.player_position || ''}</td>
                  <td>{r.overall_potential_score ?? ''}</td>
                  <td>{r.player_age_group || ''}</td>
                  <td>{r.overall_score ?? ''}</td>
                  <td>{p?.team_name || ''}</td>
                  <td>{r.recommendation || ''}</td>
                  <td>{r.scout_name || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && !rows.length && <div className="empty"><Skeleton h={24} w={300} /></div>}
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
            {filtered && <button className="btn" onClick={() => { setSearchText(''); setSp({}, { replace: true }); }}>Clear filters</button>}
          </div>
        )}
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
