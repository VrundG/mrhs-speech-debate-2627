export type RosterPerson = { id: string; name: string };

export type NameMatch =
  | { status: 'empty'; suggestions: [] }
  | { status: 'matched'; member: RosterPerson; confidence: number; method: 'exact' | 'reordered' | 'alias' | 'fuzzy'; suggestions: RosterPerson[] }
  | { status: 'review'; confidence: number; suggestions: RosterPerson[] }
  | { status: 'unmatched'; suggestions: RosterPerson[] };

export function normalizePersonName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function canonicalName(value: string) {
  return normalizePersonName(value).split(' ').filter(Boolean).sort().join(' ');
}

function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return row[right.length];
}

function similarity(left: string, right: string) {
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - editDistance(left, right) / longest;
}

function scoreName(input: string, rosterName: string) {
  const normalizedInput = normalizePersonName(input);
  const normalizedRoster = normalizePersonName(rosterName);
  const inputTokens = normalizedInput.split(' ').filter(Boolean);
  const rosterTokens = normalizedRoster.split(' ').filter(Boolean);
  const direct = similarity(normalizedInput, normalizedRoster);
  const reordered = similarity(canonicalName(input), canonicalName(rosterName));
  const tokenScore = inputTokens.reduce((sum, token) => {
    const bestToken = Math.max(...rosterTokens.map((candidate) => similarity(token, candidate)), 0);
    return sum + bestToken;
  }, 0) / Math.max(inputTokens.length, rosterTokens.length, 1);
  return Math.max(direct, reordered * 0.98, tokenScore * 0.94);
}

export function resolveRosterName(
  input: string,
  roster: RosterPerson[],
  confirmedAliases: Record<string, string> = {},
): NameMatch {
  const normalizedInput = normalizePersonName(input);
  if (!normalizedInput) return { status: 'empty', suggestions: [] };

  const aliasMemberId = confirmedAliases[normalizedInput];
  const aliasMember = aliasMemberId ? roster.find((member) => member.id === aliasMemberId) : undefined;
  if (aliasMember) return { status: 'matched', member: aliasMember, confidence: 1, method: 'alias', suggestions: [] };

  const exact = roster.find((member) => normalizePersonName(member.name) === normalizedInput);
  if (exact) return { status: 'matched', member: exact, confidence: 1, method: 'exact', suggestions: [] };

  const reordered = roster.find((member) => canonicalName(member.name) === canonicalName(input));
  if (reordered) return { status: 'matched', member: reordered, confidence: 0.99, method: 'reordered', suggestions: [] };

  const inputTokens = normalizedInput.split(' ');
  if (inputTokens.length === 1) {
    const tokenMatches = roster.filter((member) => normalizePersonName(member.name).split(' ').includes(normalizedInput)).slice(0, 3);
    if (tokenMatches.length) return { status: 'review', confidence: 0.5, suggestions: tokenMatches };
  }

  const ranked = roster
    .map((member) => ({ member, score: scoreName(input, member.name) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const suggestions = ranked.filter((candidate) => candidate.score >= 0.48).slice(0, 3).map((candidate) => candidate.member);
  if (!best) return { status: 'unmatched', suggestions: [] };

  const tokenCount = inputTokens.length;
  const margin = best.score - (runnerUp?.score ?? 0);
  const safeAutomaticMatch = tokenCount >= 2 && (
    (best.score >= 0.92 && margin >= 0.07) ||
    (best.score >= 0.97 && margin >= 0.035)
  );

  if (safeAutomaticMatch) {
    return { status: 'matched', member: best.member, confidence: best.score, method: 'fuzzy', suggestions: [] };
  }
  if (best.score >= 0.55) return { status: 'review', confidence: best.score, suggestions };
  return { status: 'unmatched', suggestions };
}
