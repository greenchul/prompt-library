/**
 * @typedef {{ min: number, max: number, confidence: 'high'|'medium'|'low' }} TokenEstimate
 */
/**
 * Estimate from the full text, counting whitespace-separated words and Unicode characters.
 * Keep formula results unrounded; confidence uses the larger estimate after the code multiplier.
 * @param {string} text
 * @param {boolean} isCode
 * @returns {TokenEstimate}
 */
export function estimateTokens(text, isCode) {
  const wordCount = text.trim() ? text.trim().split(/\s+/u).length : 0;
  const characterCount = Array.from(text).length;
  const multiplier = isCode ? 1.3 : 1;
  const min = 0.75 * wordCount * multiplier;
  const max = 0.25 * characterCount * multiplier;
  const upperEstimate = Math.max(min, max);
  return {
    min,
    max,
    confidence:
      upperEstimate < 1000 ? "high" : upperEstimate <= 5000 ? "medium" : "low",
  };
}
