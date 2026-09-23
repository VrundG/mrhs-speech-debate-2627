import type { Tournament } from '../data/tournaments';
import { normalizePersonName, textSimilarity } from './name-matcher';

export type TournamentMatch =
  | { status: 'not_applicable'; confidence: null; suggestions: [] }
  | { status: 'matched'; tournament: Tournament; confidence: number; suggestions: Tournament[] }
  | { status: 'review'; confidence: number; suggestions: Tournament[] }
  | { status: 'unmatched'; confidence: null; suggestions: Tournament[] };

function tournamentScore(input: string, tournament: Tournament) {
  const aliases: Record<string, string> = {
    'north mecklenburg viking classic': 'n mecklenburg viking classic',
    'north meck viking classic': 'n mecklenburg viking classic',
    'marvin tutorial': 'mrhs fall scrimmage',
    'marvin ridge speech debate tutorial': 'mrhs fall scrimmage',
    'marvin fall scrimmage': 'mrhs fall scrimmage',
    'nsda springboard scrimmage 1 online': 'nsda springboard scrimmage 1',
  };
  const baseInput = normalizePersonName(input.replace(/\([^)]*\d{1,2}\s*\/\s*\d{1,2}[^)]*\)/g, ''));
  const normalizedInput = aliases[baseInput] ?? baseInput;
  const normalizedName = aliases[normalizePersonName(tournament.name)] ?? normalizePersonName(tournament.name);
  const inputTokens = normalizedInput.split(' ').filter(Boolean);
  const nameTokens = normalizedName.split(' ').filter(Boolean);
  if (normalizedName === normalizedInput) return 1;
  if (inputTokens.length >= 2 && inputTokens.every((token) => nameTokens.includes(token))) return 0.96;
  if (inputTokens.length === 1 && inputTokens[0].length >= 4 && nameTokens.includes(inputTokens[0])) return 0.92;
  if (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)) {
    return Math.min(normalizedInput.length, normalizedName.length) / Math.max(normalizedInput.length, normalizedName.length) * 0.94;
  }
  return textSimilarity(normalizedInput, normalizedName);
}

export function resolveTournamentName(input: string, tournaments: Tournament[]): TournamentMatch {
  const normalizedInput = normalizePersonName(input);
  if (!normalizedInput || ['na', 'n a', 'none', 'not applicable'].includes(normalizedInput)) {
    return { status: 'not_applicable', confidence: null, suggestions: [] };
  }

  const ranked = tournaments
    .map((tournament) => ({ tournament, score: tournamentScore(input, tournament) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const suggestions = ranked.filter((candidate) => candidate.score >= 0.48).slice(0, 3).map((candidate) => candidate.tournament);
  if (!best || best.score < 0.5) return { status: 'unmatched', confidence: null, suggestions };

  const sameNameCount = tournaments.filter((candidate) => normalizePersonName(candidate.name) === normalizePersonName(best.tournament.name)).length;
  const margin = best.score - (runnerUp?.score ?? 0);
  if (sameNameCount === 1 && ((best.score >= 0.9 && margin >= 0.07) || best.score >= 0.98)) {
    return { status: 'matched', tournament: best.tournament, confidence: best.score, suggestions: [] };
  }
  return { status: 'review', confidence: best.score, suggestions };
}
