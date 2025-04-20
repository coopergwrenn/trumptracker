import { createClient } from '@supabase/supabase-js';

// Emotional language patterns
const emotionalPatterns = {
  intensifiers: /\b(very|extremely|incredibly|absolutely|totally)\b/gi,
  superlatives: /\b(best|worst|most|least|greatest|tiniest)\b/gi,
  emotiveVerbs: /\b(slammed|blasted|ripped|destroyed|dominated)\b/gi,
  biasedAdjectives: /\b(terrible|amazing|awesome|horrible|perfect)\b/gi,
  politicalBias: /\b(radical|socialist|communist|fascist|leftist|rightist)\b/gi,
};

// Neutral language patterns
const neutralPatterns = {
  factualVerbs: /\b(stated|reported|announced|explained|described)\b/gi,
  measurementWords: /\b(approximately|estimated|about|roughly|nearly)\b/gi,
  qualifiers: /\b(potentially|possibly|likely|according to|suggests)\b/gi,
};

interface ScoringMetrics {
  emotionalScore: number;
  neutralScore: number;
  biasScore: number;
  finalScore: number;
}

export function calculateNeutralityScore(original: string, neutral: string | null): ScoringMetrics {
  if (!original || !neutral) {
    return {
      emotionalScore: 0,
      neutralScore: 0,
      biasScore: 0,
      finalScore: 0,
    };
  }

  // Calculate emotional language score
  const emotionalScore = Object.values(emotionalPatterns).reduce((score, pattern) => {
    const matches = original.match(pattern) || [];
    return score + matches.length * 10;
  }, 0);

  // Calculate neutral language score
  const neutralScore = Object.values(neutralPatterns).reduce((score, pattern) => {
    const matches = neutral.match(pattern) || [];
    return score + matches.length * 10;
  }, 0);

  // Calculate bias score by comparing sentence structures
  const originalSentences = original.split(/[.!?]+/).filter(Boolean);
  const neutralSentences = neutral.split(/[.!?]+/).filter(Boolean);
  
  const biasScore = originalSentences.reduce((score, sentence, index) => {
    if (index >= neutralSentences.length) return score;
    
    // Check for sentence length differences (indicating potential editorialization)
    const lengthDiff = Math.abs(sentence.length - neutralSentences[index].length);
    const lengthScore = Math.min(lengthDiff / sentence.length * 50, 20);
    
    // Check for quote preservation
    const originalQuotes = sentence.match(/"([^"]*)"/g) || [];
    const neutralQuotes = neutralSentences[index].match(/"([^"]*)"/g) || [];
    const quoteScore = Math.abs(originalQuotes.length - neutralQuotes.length) * 15;
    
    return score + lengthScore + quoteScore;
  }, 0);

  // Calculate final score (0-100, higher means more neutral)
  const rawScore = Math.max(0, 100 - (emotionalScore - neutralScore + biasScore));
  const finalScore = Math.min(100, Math.max(0, rawScore));

  return {
    emotionalScore,
    neutralScore,
    biasScore,
    finalScore: Math.round(finalScore),
  };
}

export function getNeutralityLabel(score: number): string {
  if (score >= 90) return 'Highly Neutral';
  if (score >= 80) return 'Very Neutral';
  if (score >= 70) return 'Moderately Neutral';
  if (score >= 60) return 'Somewhat Neutral';
  return 'Minimally Neutral';
}

export function getNeutralityColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-500';
}