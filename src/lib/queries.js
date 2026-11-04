import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import { CATEGORIES, splitTags } from './constants.js';

export const keys = {
  reports: ['reports'],
  reportList: (params) => ['reports', 'list', params],
  report: (id) => ['reports', 'detail', String(id)],
  stats: ['stats'],
  players: ['players'],
  player: (id) => ['players', 'detail', id],
  playerReports: (id) => ['players', id, 'reports'],
  matches: ['matches'],
  scouts: ['scouts'],
  tags: ['reports', 'tag-suggestions'],
};

const STATIC = { staleTime: 5 * 60 * 1000 };

export const useReports = (params) =>
  useQuery({
    queryKey: keys.reportList(params),
    queryFn: () => api.reports(params),
    placeholderData: keepPreviousData,
  });

export const useStats = () =>
  useQuery({ queryKey: keys.stats, queryFn: () => api.stats().then((r) => r.data), ...STATIC });

/** All players keyed by id (the API caps a page at 200). */
export const usePlayersById = () =>
  useQuery({
    queryKey: keys.players,
    queryFn: () => api.players({ limit: 200 }),
    select: (r) => Object.fromEntries(r.data.map((p) => [p.id, p])),
    ...STATIC,
  });

export const useReport = (id) =>
  useQuery({ queryKey: keys.report(id), queryFn: () => api.report(id).then((r) => r.data) });

export const usePlayer = (id) =>
  useQuery({
    queryKey: keys.player(id),
    queryFn: () => api.player(id).then((r) => r.data),
    enabled: id != null,
    ...STATIC,
  });

export const usePlayerReports = (id) =>
  useQuery({
    queryKey: keys.playerReports(id),
    queryFn: () => api.playerReports(id).then((r) => r.data),
    enabled: id != null,
  });

export const useMatches = (enabled) =>
  useQuery({ queryKey: keys.matches, queryFn: () => api.matches({ limit: 200 }).then((r) => r.data), enabled, ...STATIC });

export const useScouts = (enabled) =>
  useQuery({
    queryKey: keys.scouts,
    queryFn: () => api.scouts({ limit: 200, sortBy: 'name' }).then((r) => r.data),
    enabled,
    ...STATIC,
  });

/** Distinct tags seen per category, used for autocomplete in the editor. */
export const useTagSuggestions = (enabled) =>
  useQuery({
    queryKey: keys.tags,
    queryFn: () => api.reports({ limit: 200 }),
    select: ({ data }) =>
      Object.fromEntries(
        CATEGORIES.map((c) => [c.key, [...new Set(data.flatMap((r) => splitTags(r[c.key])))].sort()])
      ),
    enabled,
    ...STATIC,
  });

export function useUpdateReport(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.updateReport(id, body).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(keys.report(id), data);
      qc.invalidateQueries({ queryKey: keys.reports });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useDeleteReport(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteReport(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: keys.report(id) });
      qc.invalidateQueries({ queryKey: keys.reports });
      qc.invalidateQueries({ queryKey: keys.stats });
      qc.invalidateQueries({ queryKey: keys.players });
    },
  });
}
