/**
 * CampusFind matching algorithm.
 * Explainable keyword + category + location scoring, ported from the original
 * JavaScript implementation. Pure functions, server-side only so scores can
 * never be forged by the browser.
 */

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "up", "about", "into", "over", "after", "lost", "found", "near", "my",
  "item", "has", "have", "was", "were", "is", "are", "this", "that", "there", "here",
  "desk", "room", "floor", "zone", "area", "building",
]);

export interface MatchableItem {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  date: string | null;
}

export interface MatchResult {
  candidate: MatchableItem;
  confidenceScore: number;
  reasons: string[];
}

function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function calculateMatchScore(target: MatchableItem, candidate: MatchableItem): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Category (40 points)
  const targetCat = (target.category ?? "").toLowerCase();
  const candidateCat = (candidate.category ?? "").toLowerCase();
  if (targetCat && targetCat === candidateCat) {
    score += 40;
    reasons.push(`Exact category match (${target.category})`);
  } else if (targetCat === "other" || candidateCat === "other") {
    score += 15;
    reasons.push("General category overlap");
  }

  // 2. Title + description keyword overlap (40 points)
  const targetTokens = new Set(tokenize(`${target.title ?? ""} ${target.description ?? ""}`));
  const candidateTokens = tokenize(`${candidate.title ?? ""} ${candidate.description ?? ""}`);

  if (targetTokens.size > 0 && candidateTokens.length > 0) {
    let matchCount = 0;
    const matchedWords: string[] = [];
    for (const token of candidateTokens) {
      if (targetTokens.has(token)) {
        matchCount++;
        if (!matchedWords.includes(token)) matchedWords.push(token);
      }
    }
    const overlapRatio = matchCount / Math.max(targetTokens.size, candidateTokens.length);
    score += Math.min(40, Math.round(overlapRatio * 100));
    if (matchedWords.length > 0) {
      reasons.push(`Matched keywords: ${matchedWords.slice(0, 4).join(", ")}`);
    }
  }

  // 3. Location similarity (20 points)
  const targetLocTokens = tokenize(target.location);
  const candidateLocTokens = new Set(tokenize(candidate.location));
  const sharedLoc = targetLocTokens.filter((token) => candidateLocTokens.has(token));
  if (sharedLoc.length > 0) {
    score += 20;
    reasons.push(`Nearby location (${candidate.location})`);
  }

  return {
    candidate,
    confidenceScore: Math.min(100, score),
    reasons,
  };
}

export function rankMatches(
  target: MatchableItem,
  candidates: MatchableItem[],
  minScore = 25,
): MatchResult[] {
  return candidates
    .map((candidate) => calculateMatchScore(target, candidate))
    .filter((result) => result.confidenceScore >= minScore)
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5);
}
