import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';

const STOPWORDS = new Set(['the','and','a','an','to','of','in','on','for','with','is','are','be','as','at','by','or','it','this','that','from','will','you','your','we','our','their','who','have','has','had','not','but','can','into','across','more','most','other','such','no','only','also','than','then','so','if','about','all','both','each','which','while','during','including','within','without','using','use','used','per','etc']);

const tokenize = (text) => (text.toLowerCase().match(/[a-z][a-z+.#-]{2,}/g) || []).filter(w => !STOPWORDS.has(w));

const keywordFrequency = (tokens) => {
  const freq = {};
  tokens.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return freq;
};

export default function ResumeMatch({ t, card }) {
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');

  const { missing, matchPct, jdTop } = useMemo(() => {
    if (!resume.trim() || !jd.trim()) return { missing: [], matchPct: null, jdTop: [] };
    const resumeSet = new Set(tokenize(resume));
    const jdFreq = keywordFrequency(tokenize(jd));
    const jdWords = Object.keys(jdFreq).sort((a, b) => jdFreq[b] - jdFreq[a]);
    const jdTop = jdWords.slice(0, 40);
    const missing = jdTop.filter(w => !resumeSet.has(w));
    const present = jdTop.length - missing.length;
    return { missing, matchPct: jdTop.length ? Math.round((present / jdTop.length) * 100) : null, jdTop };
  }, [resume, jd]);

  const textareaStyle = { width: '100%', minHeight: '220px', padding: '14px', borderRadius: '12px', border: `1px solid ${t.border}`, background: t.inlineBg, color: t.text, fontSize: '13px', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit' };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '10px' }}>Resume ↔ JD Gap Check</h2>
        <p style={{ fontSize: '16px', color: t.textSecondary, maxWidth: '560px', margin: '0 auto' }}>Paste both. Everything runs in your browser — nothing is uploaded anywhere. This is a keyword overlap check, not a real ATS scorer — use it to catch obvious gaps before you apply, not as a pass/fail gate.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600' }}>Your resume text</h3>
          <textarea style={textareaStyle} value={resume} onChange={e => setResume(e.target.value)} placeholder="Paste your resume text here..." />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600' }}>Job description text</h3>
          <textarea style={textareaStyle} value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the job description here..." />
        </div>
      </div>

      {matchPct === null ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px', color: t.textSecondary }}>
          <FileText size={28} style={{ marginBottom: '10px', opacity: 0.5 }} />
          <p>Paste both to see which of the JD's frequent keywords are missing from your resume.</p>
        </div>
      ) : (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: matchPct >= 70 ? t.success : matchPct >= 40 ? t.warning : t.error }}>{matchPct}%</div>
            <div style={{ fontSize: '13px', color: t.textSecondary }}>of the JD's top {jdTop.length} keywords also appear in your resume</div>
          </div>
          {missing.length === 0 ? (
            <p style={{ color: t.success, fontSize: '14px' }}>No obvious gaps in the top keywords — good overlap.</p>
          ) : (
            <>
              <h4 style={{ margin: '0 0 10px', fontSize: '12px', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>In the JD, not obviously in your resume</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {missing.map(w => <span key={w} style={{ padding: '5px 10px', background: t.inlineBg, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px' }}>{w}</span>)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
