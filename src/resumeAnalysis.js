// Pure analysis functions for the Resume Match tab — no React, no UI, no
// storage. Kept separate so the matching logic can be reasoned about (and
// tested) independently of how it's displayed.
import { stemmer } from './porterStemmer';

const STOPWORDS = new Set(['the','and','a','an','to','of','in','on','for','with','is','are','be','as','at','by','or','it','this','that','from','will','you','your','we','our','their','who','have','has','had','not','but','can','into','across','more','most','other','such','no','only','also','than','then','so','if','about','all','both','each','which','while','during','including','within','without','using','use','used','per','etc']);

// Words split in reading order (not deduped/filtered) — needed so bigrams
// ("product manager") reflect real adjacency in the text, not just whatever
// survived stopword filtering.
// Trailing "." is stripped separately from the match itself — the character
// class allows "." mid-word (for terms like "node.js"), but at the end of a
// sentence it's just punctuation, not part of the term (e.g. "...experience."
// should extract as "experience", not "experience.").
export const tokenizeOrdered = (text) => (text.toLowerCase().match(/[a-z][a-z+.#-]{1,}/g) || []).map(w => w.replace(/\.+$/, ''));
const isStopword = (w) => STOPWORDS.has(w) || w.length < 3;
const stem = (w) => stemmer(w);

// ─── word / phrase frequency, stemmed ────────────────────────────────────────
function wordFrequency(tokens) {
  const freq = {}, display = {};
  tokens.forEach(w => {
    if (isStopword(w)) return;
    const s = stem(w);
    freq[s] = (freq[s] || 0) + 1;
    if (!display[s]) display[s] = w;
  });
  return { freq, display };
}

function bigramFrequency(tokens) {
  const freq = {}, display = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];
    if (isStopword(a) || isStopword(b)) continue;
    const key = `${stem(a)} ${stem(b)}`;
    freq[key] = (freq[key] || 0) + 1;
    if (!display[key]) display[key] = `${a} ${b}`;
  }
  return { freq, display };
}

// ─── #4: hard requirements — JD sentences with explicit "must have" signals ──
const REQUIREMENT_SIGNAL = /\b(required|must[- ]have|minimum|at least|\d+\+?\s*years?|essential|mandatory)\b/i;

function extractHardRequirements(jdText, resumeWordStems) {
  const sentences = jdText.split(/(?<=[.!?\n])\s+/).map(s => s.trim()).filter(Boolean);
  const flagged = [];
  for (const sentence of sentences) {
    if (!REQUIREMENT_SIGNAL.test(sentence)) continue;
    const stems = tokenizeOrdered(sentence).filter(w => !isStopword(w)).map(stem);
    if (stems.length === 0) continue;
    const coverage = stems.filter(s => resumeWordStems.has(s)).length / stems.length;
    if (coverage < 0.4) {
      flagged.push({ sentence: sentence.length > 160 ? sentence.slice(0, 157) + '...' : sentence, coverage: Math.round(coverage * 100) });
    }
  }
  return flagged.slice(0, 8);
}

// ─── #7: section-aware gaps — present in Skills but never shown in Experience ─
const SECTION_HEADER_RE = /^(skills?|technical skills|core competencies|key skills|tools?|experience|work experience|professional experience|employment history|career history|summary|profile|about( me)?|education|projects?|certifications?)\s*:?\s*$/i;
const isSkillsSection = (name) => /skill|competenc|tool/i.test(name);
const isExperienceSection = (name) => /experience|employment|career|project/i.test(name);
const isEducationSection = (name) => /education|academic|degree/i.test(name);

function splitResumeSections(resumeText) {
  const lines = resumeText.split(/\r?\n/);
  const sections = [{ name: 'header', lines: [] }];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length < 40 && SECTION_HEADER_RE.test(trimmed)) {
      sections.push({ name: trimmed.toLowerCase(), lines: [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }
  return sections;
}

// Shared by the section-gap, quantified-impact, and experience-years checks
// below — all three need to know which part of the resume is Experience
// (vs. Skills, vs. Education — a college graduation year is not a year of
// work experience, and a comma-separated skills line is not a bullet).
function getSectionTexts(resumeText) {
  const sections = splitResumeSections(resumeText);
  const skillsText = sections.filter(s => isSkillsSection(s.name)).map(s => s.lines.join(' ')).join(' ');
  const experienceText = sections.filter(s => isExperienceSection(s.name)).map(s => s.lines.join('\n')).join('\n');
  // Best-effort text for date-range extraction: prefer the Experience
  // section; if we can't confidently find one, at least exclude any
  // Education section (the single biggest source of false inflation —
  // college years look identical to job years to a plain year-regex).
  const educationSections = sections.filter(s => isEducationSection(s.name));
  const yearScanText = experienceText.trim()
    ? experienceText
    : educationSections.length
      ? sections.filter(s => !isEducationSection(s.name)).map(s => s.lines.join('\n')).join('\n')
      : resumeText;
  return { skillsText, experienceText, yearScanText };
}

function detectSectionGaps(resumeText, presentTerms) {
  const { skillsText, experienceText } = getSectionTexts(resumeText);
  // Only judge this if the resume has headers we can confidently tell apart —
  // guessing on an unstructured resume would just produce noise.
  if (!skillsText.trim() || !experienceText.trim()) return [];

  const skillsStems = new Set(tokenizeOrdered(skillsText).filter(w => !isStopword(w)).map(stem));
  const experienceStems = new Set(tokenizeOrdered(experienceText).filter(w => !isStopword(w)).map(stem));

  return presentTerms
    .filter(({ term }) => {
      const stems = term.split(' ').map(stem);
      return stems.every(s => skillsStems.has(s)) && !stems.every(s => experienceStems.has(s));
    })
    .map(({ term }) => term)
    .slice(0, 10);
}

// ─── #8: experience-years sanity check ───────────────────────────────────────
function extractJDYears(jdText) {
  const nums = [...jdText.matchAll(/(\d{1,2})\+?\s*years?/gi)].map(m => parseInt(m[1], 10)).filter(n => n > 0 && n < 40);
  return nums.length ? Math.max(...nums) : null;
}

function extractResumeYearSpan(resumeText) {
  const years = [...resumeText.matchAll(/\b(19|20)\d{2}\b/g)].map(m => parseInt(m[0], 10));
  const hasPresent = /\bpresent\b/i.test(resumeText);
  if (years.length < 2 && !(years.length === 1 && hasPresent)) return null;
  const minYear = Math.min(...years);
  const maxYear = hasPresent ? new Date().getFullYear() : Math.max(...years);
  const span = maxYear - minYear;
  if (span <= 0 || span > 50) return null;
  return { minYear, maxYearLabel: hasPresent ? 'Present' : String(maxYear), span };
}

function checkExperienceYears(jdText, resumeText) {
  const jdYears = extractJDYears(jdText);
  if (jdYears == null) return null;
  const { yearScanText } = getSectionTexts(resumeText);
  const resumeSpan = extractResumeYearSpan(yearScanText);
  if (resumeSpan == null) return null;
  return { jdYears, resumeSpan: resumeSpan.span, resumeRange: `${resumeSpan.minYear}–${resumeSpan.maxYearLabel}`, meetsBar: resumeSpan.span >= jdYears };
}

// ─── #9: quantified-impact check — do resume bullets have numbers in them? ───
function checkQuantifiedImpact(resumeText) {
  // Prefer scanning just the Experience section — otherwise a long comma-
  // separated Skills line ("Product strategy, SQL, ...") gets misclassified
  // as an unquantified "bullet" and skews the percentage. Falls back to the
  // whole resume only when we can't confidently find an Experience section.
  const { experienceText } = getSectionTexts(resumeText);
  const scanText = experienceText.trim() ? experienceText : resumeText;

  const lines = scanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 25);
  const bulletLike = lines.filter(l => /^[•\-*▪◦]|^\d+[.)]/.test(l) || l.length > 40);
  if (bulletLike.length < 3) return null; // not enough structure to judge confidently
  const withNumbers = bulletLike.filter(l => /\d/.test(l));
  return { pct: Math.round((withNumbers.length / bulletLike.length) * 100), total: bulletLike.length, withNumbers: withNumbers.length };
}

// ─── main entry point ─────────────────────────────────────────────────────────
export function analyzeResumeVsJD(resumeText, jdText) {
  if (!resumeText.trim() || !jdText.trim()) return null;

  const resumeTokens = tokenizeOrdered(resumeText);
  const jdTokens = tokenizeOrdered(jdText);

  const resumeWords = wordFrequency(resumeTokens);
  const jdWords = wordFrequency(jdTokens);
  const resumeBigrams = bigramFrequency(resumeTokens);
  const jdBigrams = bigramFrequency(jdTokens);

  const resumeWordStems = new Set(Object.keys(resumeWords.freq));
  const resumeBigramStems = new Set(Object.keys(resumeBigrams.freq));

  // Phrases first (higher signal than lone words), then single words —
  // excluding any word that's already a component of a listed phrase, so
  // "product" and "manager" don't also show up separately from "product manager".
  const topPhraseKeys = Object.keys(jdBigrams.freq).sort((a, b) => jdBigrams.freq[b] - jdBigrams.freq[a]).slice(0, 15);
  const topPhrases = topPhraseKeys.map(k => ({ term: jdBigrams.display[k], present: resumeBigramStems.has(k) }));

  const phraseComponentStems = new Set(topPhraseKeys.flatMap(k => k.split(' ')));
  const topWordKeys = Object.keys(jdWords.freq)
    .filter(s => !phraseComponentStems.has(s))
    .sort((a, b) => jdWords.freq[b] - jdWords.freq[a])
    .slice(0, 25);
  const topWords = topWordKeys.map(s => ({ term: jdWords.display[s], present: resumeWordStems.has(s) }));

  const allTerms = [...topPhrases, ...topWords];
  const presentCount = allTerms.filter(x => x.present).length;
  const matchPct = allTerms.length ? Math.round((presentCount / allTerms.length) * 100) : null;

  return {
    matchPct,
    topPhrases,
    topWords,
    hardRequirements: extractHardRequirements(jdText, resumeWordStems),
    sectionGaps: detectSectionGaps(resumeText, allTerms.filter(t => t.present)),
    experienceCheck: checkExperienceYears(jdText, resumeText),
    quantifiedImpact: checkQuantifiedImpact(resumeText),
  };
}
