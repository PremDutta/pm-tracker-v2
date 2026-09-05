import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Upload, Loader2, Check, X, Save, Trash2, Copy } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import mammoth from 'mammoth';
import { analyzeResumeVsJD } from '../resumeAnalysis';
import { getSavedResume, setSavedResume, getResumeVersions, saveResumeVersion, deleteResumeVersion } from '../storage';

// Loaded from a CDN at runtime rather than bundled — pdfjs-dist's worker file
// needs extra webpack config to bundle correctly under Create React App
// (well-documented pain point), and a CDN URL sidesteps that entirely. Pinned
// to the exact version installed so the worker and library never mismatch.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// FileReader instead of the newer Blob.text() — supported in every browser
// back to IE10, no real reason to reach for anything newer here.
function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Extracts plain text from an uploaded resume so you don't have to copy-paste
// it by hand. Runs entirely in the browser — the file never leaves your machine.
// Returns { text, warning } — warning is set when a PDF yields suspiciously
// little text, which usually means it's a scanned image, not real text.
async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt') return { text: await readAsText(file), warning: null };

  const arrayBuffer = await file.arrayBuffer();

  if (ext === 'pdf') {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    const warning = text.trim().length < 40 * pdf.numPages
      ? 'This PDF returned very little text — it may be a scanned image rather than a real text PDF. Double-check the box below, or try pasting the text manually.'
      : null;
    return { text, warning };
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value, warning: null };
  }

  throw new Error(`Unsupported file type ".${ext}" — upload a PDF, DOCX, or TXT file.`);
}

function buildAiHandoff(analysis, resume, jd) {
  const lines = [
    `I'm comparing my resume against a job description. Overall keyword overlap: ${analysis.matchPct}%.`,
    '',
    'Suggest 3-5 specific resume bullet points I could add or rewrite to address the most important gaps below — prioritize the explicit requirements over generic keywords.',
  ];
  const missingPhrases = analysis.topPhrases.filter(p => !p.present).map(p => p.term);
  const missingWords = analysis.topWords.filter(w => !w.present).map(w => w.term);
  if (missingPhrases.length) lines.push('', 'Missing key phrases:', missingPhrases.join(', '));
  if (missingWords.length) lines.push('', 'Missing individual keywords:', missingWords.join(', '));
  if (analysis.hardRequirements.length) {
    lines.push('', 'Explicit requirements in the JD my resume doesn\'t clearly address:');
    analysis.hardRequirements.forEach(r => lines.push(`- ${r.sentence}`));
  }
  if (analysis.sectionGaps.length) lines.push('', 'Listed under Skills but never shown in an Experience bullet:', analysis.sectionGaps.join(', '));
  if (analysis.experienceCheck && !analysis.experienceCheck.meetsBar) {
    lines.push('', `The JD asks for ${analysis.experienceCheck.jdYears}+ years; my resume spans about ${analysis.experienceCheck.resumeSpan} years (${analysis.experienceCheck.resumeRange}).`);
  }
  if (analysis.quantifiedImpact && analysis.quantifiedImpact.pct < 50) {
    lines.push('', `Only ${analysis.quantifiedImpact.pct}% of my resume bullets include a number — help me quantify the rest.`);
  }
  lines.push('', '--- MY RESUME ---', resume.trim(), '', '--- JOB DESCRIPTION ---', jd.trim());
  return lines.join('\n');
}

export default function ResumeMatch({ t, card, btnPrimary, btnSecondary }) {
  const [resume, setResume] = useState(() => getSavedResume());
  const [jd, setJd] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [pdfWarning, setPdfWarning] = useState('');
  const [versions, setVersions] = useState(() => getResumeVersions());
  const [versionLabel, setVersionLabel] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-save the draft as you type/paste — this tab used to be blank every visit.
  useEffect(() => { setSavedResume(resume); }, [resume]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    setParseError('');
    setPdfWarning('');
    try {
      const { text, warning } = await extractTextFromFile(file);
      setResume(text.trim());
      if (warning) setPdfWarning(warning);
    } catch (err) {
      setParseError(err.message || 'Could not read that file — try pasting the text instead.');
    } finally {
      setParsing(false);
      e.target.value = ''; // lets you re-upload the same file again later
    }
  };

  const saveVersion = () => {
    const label = versionLabel.trim() || `Version ${versions.length + 1}`;
    setVersions(saveResumeVersion(label, resume));
    setVersionLabel('');
  };
  const loadVersion = (v) => setResume(v.text);
  const removeVersion = (id) => setVersions(deleteResumeVersion(id));

  const analysis = useMemo(() => analyzeResumeVsJD(resume, jd), [resume, jd]);

  const copyHandoff = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(buildAiHandoff(analysis, resume, jd)).catch(() => {}).finally(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const textareaStyle = { width: '100%', minHeight: '220px', padding: '14px', borderRadius: '12px', border: `1px solid ${t.border}`, background: t.inlineBg, color: t.text, fontSize: '13px', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit' };
  const inputStyle = { padding: '8px 12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inlineBg, color: t.text, fontSize: '12px' };
  const termBadge = (present) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: present ? 'transparent' : t.inlineBg, border: `1px solid ${present ? t.success : t.border}`, borderRadius: '8px', fontSize: '12px', color: present ? t.success : t.text, opacity: present ? 0.7 : 1 });

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '10px' }}>Resume ↔ JD Gap Check</h2>
        <p style={{ fontSize: '16px', color: t.textSecondary, maxWidth: '640px', margin: '0 auto' }}>Paste or upload both. Everything runs in your browser — nothing is uploaded anywhere. This checks keyword/phrase overlap, explicit requirements, and a few resume-quality signals — it's still not a real ATS scorer, so use it to catch obvious gaps, not as a pass/fail gate.</p>
      </div>

      {/* Saved resume versions */}
      <div style={{ ...card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: versions.length ? '12px' : 0 }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Saved resume versions</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input style={inputStyle} placeholder="Label (e.g. Startup version)" value={versionLabel} onChange={e => setVersionLabel(e.target.value)} />
            <button onClick={saveVersion} disabled={!resume.trim()} style={{ ...btnSecondary, padding: '7px 14px', fontSize: '12px', opacity: resume.trim() ? 1 : 0.5 }}><Save size={12} /> Save current</button>
          </div>
        </div>
        {versions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {versions.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 6px 6px 12px', background: t.inlineBg, border: `1px solid ${t.border}`, borderRadius: '980px', fontSize: '12px' }}>
                <button onClick={() => loadVersion(v)} style={{ background: 'none', border: 'none', color: t.text, cursor: 'pointer', fontSize: '12px', padding: 0 }}>{v.label} <span style={{ color: t.textTertiary }}>({v.savedAt})</span></button>
                <button onClick={() => removeVersion(v.id)} style={{ background: 'none', border: 'none', color: t.textTertiary, cursor: 'pointer', padding: '4px' }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Your resume text</h3>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '980px', border: `1px solid ${t.border}`, background: t.inlineBg, color: t.text, fontSize: '12px', cursor: parsing ? 'default' : 'pointer', opacity: parsing ? 0.6 : 1 }}>
              {parsing ? <Loader2 size={13} /> : <Upload size={13} />}
              {parsing ? 'Reading file…' : 'Upload PDF / DOCX / TXT'}
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} disabled={parsing} style={{ display: 'none' }} />
            </label>
          </div>
          {parseError && <p style={{ color: t.error, fontSize: '12px', margin: '0 0 8px' }}>{parseError}</p>}
          {pdfWarning && <p style={{ color: t.warning, fontSize: '12px', margin: '0 0 8px' }}>⚠ {pdfWarning}</p>}
          <textarea style={textareaStyle} value={resume} onChange={e => setResume(e.target.value)} placeholder="Paste your resume text here, or upload a file above..." />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600' }}>Job description text</h3>
          <textarea style={textareaStyle} value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the job description here..." />
        </div>
      </div>

      {!analysis ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px', color: t.textSecondary }}>
          <FileText size={28} style={{ marginBottom: '10px', opacity: 0.5 }} />
          <p>Paste or upload both to see the full gap analysis.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Overall score + copy-for-AI */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: analysis.matchPct >= 70 ? t.success : analysis.matchPct >= 40 ? t.warning : t.error }}>{analysis.matchPct}%</div>
                <div style={{ fontSize: '13px', color: t.textSecondary }}>overlap across {analysis.topPhrases.length} key phrases + {analysis.topWords.length} keywords from the JD</div>
              </div>
              <button onClick={copyHandoff} style={{ ...btnPrimary, padding: '9px 16px', fontSize: '13px' }}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy gap summary for AI</>}
              </button>
            </div>
          </div>

          {/* Experience-years + quantified-impact signals */}
          {(analysis.experienceCheck || analysis.quantifiedImpact) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '12px' }}>
              {analysis.experienceCheck && (
                <div style={card}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '12px', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Experience bar</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: analysis.experienceCheck.meetsBar ? t.success : t.warning }}>
                    JD asks for <strong>{analysis.experienceCheck.jdYears}+ years</strong>; your resume spans about <strong>{analysis.experienceCheck.resumeSpan} years</strong> ({analysis.experienceCheck.resumeRange}) {analysis.experienceCheck.meetsBar ? '— meets the bar' : '— below what\'s stated'}.
                  </p>
                </div>
              )}
              {analysis.quantifiedImpact && (
                <div style={card}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '12px', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantified impact</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: analysis.quantifiedImpact.pct >= 50 ? t.success : t.warning }}>
                    <strong>{analysis.quantifiedImpact.pct}%</strong> of your {analysis.quantifiedImpact.total} resume bullets include a number. {analysis.quantifiedImpact.pct < 50 ? 'Quantified impact ("grew X 40%") reads stronger than vague statements.' : 'Good — quantified bullets stand out.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Explicit requirements not addressed */}
          {analysis.hardRequirements.length > 0 && (
            <div style={card}>
              <h4 style={{ margin: '0 0 10px', fontSize: '12px', color: t.error, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Explicit requirements your resume doesn't clearly address</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {analysis.hardRequirements.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: t.inlineBg, borderRadius: '10px', fontSize: '13px' }}>
                    <X size={14} style={{ color: t.error, flexShrink: 0, marginTop: '2px' }} />
                    <span>{r.sentence}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key phrases */}
          <div style={card}>
            <h4 style={{ margin: '0 0 10px', fontSize: '12px', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key phrases from the JD</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {analysis.topPhrases.map(p => (
                <span key={p.term} style={termBadge(p.present)}>{p.present ? <Check size={11} /> : <X size={11} />} {p.term}</span>
              ))}
            </div>
          </div>

          {/* Section gaps */}
          {analysis.sectionGaps.length > 0 && (
            <div style={card}>
              <h4 style={{ margin: '0 0 10px', fontSize: '12px', color: t.warning, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Listed under Skills, but never shown in an Experience bullet</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {analysis.sectionGaps.map(term => <span key={term} style={{ padding: '5px 10px', background: t.inlineBg, border: `1px solid ${t.warning}`, borderRadius: '8px', fontSize: '12px' }}>{term}</span>)}
              </div>
            </div>
          )}

          {/* Individual keywords */}
          <div style={card}>
            <h4 style={{ margin: '0 0 10px', fontSize: '12px', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Individual keywords</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {analysis.topWords.map(w => (
                <span key={w.term} style={termBadge(w.present)}>{w.present ? <Check size={11} /> : <X size={11} />} {w.term}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
