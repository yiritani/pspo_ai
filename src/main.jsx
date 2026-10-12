import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createSession, validateQuestions, availableQuestions, seedCorrectCounts, recordAnswer, progressKey, pruneSession, MASTERY_COUNT, hardQuestions } from './quiz.js';
import './style.css';
import { localizeSaved } from './localize.js';
import { createTranslator } from './translate.js';
import { LANGUAGES, languageOf, messages } from './messages.js';
import defaultQuestions from '../public/questions.json';
import hardOverrides from '../public/questions-hard.json';
const hardBank = validateQuestions(hardQuestions(defaultQuestions, hardOverrides));
function questionText(text) { return text.replace(/[0-9０-９]+つ選んでください/g, '当てはまるものを選んでください'); }
const LANGUAGE_KEY = 'pspo-ai-language';
let initialLang = languageOf(document.documentElement.lang);
try { initialLang = languageOf(localStorage.getItem(LANGUAGE_KEY) || document.documentElement.lang); } catch {}
// 翻訳は表示する言語の分だけ読み込む。
const TRANSLATIONS = {
  en: () => Promise.all([import('../public/questions.en.json'), import('../public/questions-hard.en.json')]),
  zh: () => Promise.all([import('../public/questions.zh.json'), import('../public/questions-hard.zh.json')]),
  es: () => Promise.all([import('../public/questions.es.json'), import('../public/questions-hard.es.json')]),
};
const translators = new Map();
function loadTranslator(code) {
  if (!translators.has(code)) translators.set(code, TRANSLATIONS[code]
    ? TRANSLATIONS[code]().then(([questions, hard]) => createTranslator(defaultQuestions, hardOverrides, questions.default, hard.default), () => { translators.delete(code); return q => q; })
    : Promise.resolve(q => q));
  return translators.get(code);
}
// 言語はURLを変えずに切り替える。
function applyLanguage(code) {
  const t = messages[code];
  document.documentElement.lang = code === 'zh' ? 'zh-Hans' : code;
  document.title = t.pageTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.pageDescription);
  try { localStorage.setItem(LANGUAGE_KEY, code); } catch {}
}
const KEY = 'pspo-ai-study-v1';
function readSaved() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
const saved = localizeSaved(readSaved(), defaultQuestions);
function App({ initialTranslate }) {
  const [lang, setLang] = useState(initialLang);
  const [translate, setTranslate] = useState(() => initialTranslate);
  const t = messages[lang];
  const requestedLang = useRef(initialLang);
  useEffect(() => { applyLanguage(initialLang); }, []);
  async function changeLanguage(code) {
    requestedLang.current = code;
    const next = await loadTranslator(code);
    if (requestedLang.current !== code) return;
    setTranslate(() => next); setLang(code); applyLanguage(code);
  }
  const [bank, setBank] = useState(() => { try { return validateQuestions(saved.bank); } catch { return validateQuestions(defaultQuestions); } });
  const [counts, setCounts] = useState(() => saved.correctCounts || seedCorrectCounts(saved.session));
  const [session, setSession] = useState(() => pruneSession(saved.session, saved.correctCounts || seedCorrectCounts(saved.session)) || null);
  const [mode, setMode] = useState(saved.mode === 'hard' ? 'hard' : 'normal');
  const [view, setView] = useState(saved.session ? 'quiz' : 'home');
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // 再開した問題・結果画面は、そのセッションのモードで配色する。
  const themeMode = view === 'home' ? mode : session?.mode || mode;
  useLayoutEffect(() => {
    document.documentElement.dataset.mode = themeMode;
  }, [themeMode]);
  function persist(nextBank, nextSession, nextCounts = counts, nextMode = mode) { try { localStorage.setItem(KEY, JSON.stringify({ bank: nextBank, session: nextSession, correctCounts: nextCounts, mode: nextMode })); } catch { setNotice(t.saveFailed); } }
  function updateSession(next) { setSession(next); persist(bank, next); }
  function load(raw) {
    try { const next = validateQuestions(JSON.parse(raw), t.validation); setBank(next); setSession(null); persist(next, null); setError(''); setNotice(t.loaded(next.length)); setView('home'); }
    catch (e) { setError(e.message); }
  }
  function sample() { load(JSON.stringify(defaultQuestions)); }
  function changeMode(next) { setMode(next); persist(bank, session, counts, next); }
  // ハードモードは収録問題の選択肢を差し替えたもの。習得状況は選択肢ごとに別に数える。
  const activeBank = mode === 'hard' ? hardBank : bank;
  const available = availableQuestions(activeBank, counts);
  const mastered = activeBank.length - available.length;
  function start(questions = activeBank, sessionMode = mode) {
    const eligible = availableQuestions(questions, counts);
    if (!eligible.length) { setNotice(t.allMastered); return; }
    updateSession({ ...createSession(eligible, counts), mode: sessionMode }); setView('quiz'); setNotice('');
  }
  const finished = session && session.index >= session.questions.length;
  const current = session && session.index < session.questions.length ? translate(session.questions[session.index]) : undefined;
  const answer = session?.answers[session.index];
  const correct = session?.answers.filter(a => a.correct).length || 0;
  const wrong = session?.questions.filter((q, i) => session.answers[i] && !session.answers[i].correct) || [];
  function select(id) {
    if (answer) return;
    const selected = current.correctOptionIds.length === 1 ? [id] : session.selected.includes(id) ? session.selected.filter(x => x !== id) : [...session.selected, id];
    updateSession({ ...session, selected });
  }
  function submit() {
    const next = recordAnswer(session, counts);
    setCounts(next.counts); setSession(next.session); persist(bank, next.session, next.counts);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'questions.json'; a.click(); URL.revokeObjectURL(url);
  }
  function reviewCard(original) {
    const a = session.answers[session.questions.findIndex(x => x.id === original.id)];
    const q = translate(original);
    return <article className="review-card" key={q.id}><span className="eyebrow">{q.id}</span><h3>{questionText(q.question)}</h3>{q.sourceLabel && <span className="source-label">{q.sourceLabel}</span>}{q.domain && <p className="domain">{q.domain}</p>}{q.options.map(o => <div className={`review-option ${q.correctOptionIds.includes(o.id) ? 'right' : a.selected.includes(o.id) ? 'wrong' : ''}`} key={o.id}><span>{q.correctOptionIds.includes(o.id) ? t.correctMark : a.selected.includes(o.id) ? t.yourAnswer : '—'}</span>{o.text}</div>)}<AnswerDetails question={q} t={t}/></article>;
  }
  return <div className="layout"><header><a className="brand" href="#" onClick={e => { e.preventDefault(); setView('home'); }}>PSPO<span>AI</span><small>{t.brandSub}</small></a><span className="header-note">{t.headerNote}</span><nav className="languages" aria-label={t.languageLabel}>{LANGUAGES.map(l => <button type="button" key={l.code} lang={l.code} onClick={() => changeLanguage(l.code)} aria-pressed={l.code === lang}>{l.label}</button>)}</nav><button className="quiet" onClick={() => setView('home')}>{t.dataButton}</button></header>
    <main>{notice && <div className="notice" role="status">{notice}</div>}
      {view === 'home' ? <><div className="hero"><div className="eyebrow">{t.heroEyebrow}</div><h1>{t.heroTitle[0]}<br/><span>{t.heroTitle[1]}</span></h1><p>{t.heroLead(defaultQuestions.length)[0]}<br/>{t.heroLead(defaultQuestions.length)[1]}</p><a className="text-link" href={import.meta.env.BASE_URL + (lang === 'ja' ? '' : lang + '/') + 'questions/'}>{t.questionsLink(defaultQuestions.length)}</a></div><div className="home-grid"><section className="start-card"><span className="eyebrow">{t.practice}</span><div className="mode-switch" role="radiogroup" aria-label={t.difficulty}>{Object.entries(t.modes).map(([key, label]) => <button key={key} role="radio" aria-checked={mode === key} className={mode === key ? "active" : ""} onClick={() => changeMode(key)}>{label}</button>)}</div><p className="mode-note">{t.modeNote[mode]}</p><div className="big-number">{Math.min(40, available.length)}<span>{t.perSession}</span></div><p>{t.registered} <b>{t.count(bank.length)}</b> · {t.eligible} <b>{t.count(available.length)}</b> · {t.masteredLabel} <b>{t.count(mastered)}</b></p><button className="primary" disabled={!available.length} onClick={() => start()}>{t.start} <span>→</span></button>{session && <button className="secondary" onClick={() => setView('quiz')}>{finished ? t.lastResult : t.resume(session.mode === 'hard', session.answers.length, session.questions.length)}</button>}<p>{t.masteryNote(MASTERY_COUNT)}</p><div className="features">{t.features.map(f => <span key={f}>{f}</span>)}</div></section><section className="guide-card"><span className="eyebrow">{t.guideEyebrow}</span><h2>{t.guideTitle}</h2><ol>{t.steps(MASTERY_COUNT).map(([title, body]) => <li key={title}><b>{title}</b>{body}</li>)}</ol><p>{t.privacy}</p><p>{t.openData}</p><p className="disclaimer">{t.disclaimer}</p></section></div><section className="faq"><h2>{t.faqTitle}</h2><dl>{t.faq.map(([q, a]) => <React.Fragment key={q}><dt>{q}</dt><dd>{a}</dd></React.Fragment>)}</dl></section><details className="import-card"><summary>{t.importSummary}</summary><p>{t.importHelp}{lang !== 'ja' && ` ${t.customNote}`}</p><label className="file-button">{t.importFile}<input type="file" accept=".json,application/json" onChange={async e => { const file = e.target.files[0]; if (file) load(await file.text()); e.target.value = ''; }}/></label><textarea aria-label={t.jsonLabel} placeholder={t.jsonPlaceholder} value={json} onChange={e => setJson(e.target.value)} /><button className="secondary" disabled={!json.trim()} onClick={() => load(json)}>{t.importPasted}</button>{error && <p className="error" role="alert">{error}</p>}<div className="import-links"><button className="quiet" onClick={sample}>{t.loadBundled(defaultQuestions.length)}</button><button className="quiet" disabled={!bank.length} onClick={download}>{t.exportJson}</button></div><details><summary>{t.formatSummary}</summary><pre>{JSON.stringify({ id: 'q1', question: t.formatSample.question, options: [{ id: 'a', text: t.formatSample.optionA }, { id: 'b', text: t.formatSample.optionB }], correctOptionIds: ['b'], explanation: t.formatSample.explanation }, null, 2)}</pre><p>{t.formatHelp}</p></details></details></> : finished ? <><div className="hero compact"><span className="eyebrow">{t.finishedEyebrow}</span><h1>{t.finishedTitle}</h1><p>{t.finishedLead}</p></div><section className="result-card"><div><span className="eyebrow">{t.accuracy}</span><div className="score">{Math.round(correct / session.questions.length * 100)}<span>%</span></div></div><div className="result-stats"><p><b>{correct}</b>{t.correctOf(session.questions.length)}</p><p>{t.wrongLabel} <b>{t.count(wrong.length)}</b></p></div><div className="result-actions"><button className="primary" disabled={!availableQuestions(wrong, counts).length} onClick={() => start(wrong, session.mode)}>{t.reviewWrong}</button><button className="secondary" disabled={!available.length} onClick={() => start()}>{t.newRandom}</button></div></section><h2 className="review-title">{t.wrongLabel} <span>{wrong.length}</span></h2>{wrong.length ? wrong.map(reviewCard) : <div className="empty">{t.allCorrect}</div>}</> : session && current ? <div className="quiz-wrap"><div className="quiz-top"><span className="eyebrow">{session.mode === 'hard' ? t.hardMode : t.practice}</span><span>{session.index + 1} <span className="muted">/ {session.questions.length}</span></span></div><div className="progress"><div style={{ width: `${session.answers.length / session.questions.length * 100}%` }}/></div><section className="question-card"><div className="question-meta"><span>{t.questionNumber(session.index + 1)}</span></div><h2>{questionText(current.question)}</h2>{current.sourceLabel && <p className="source-label">{current.sourceLabel}</p>}<p className="muted">{t.progress(counts[progressKey(session.questions[session.index])] || 0, MASTERY_COUNT)}</p>{current.domain && <p className="domain">{current.domain}</p>}<div className="options">{current.options.map(o => { const selected = session.selected.includes(o.id); const right = answer && current.correctOptionIds.includes(o.id); const bad = answer && selected && !right; return <button key={o.id} disabled={!!answer} aria-pressed={selected} className={`option ${selected ? 'selected' : ''} ${right ? 'right' : ''} ${bad ? 'wrong' : ''}`} onClick={() => select(o.id)}><span aria-hidden="true" className={`selection-control ${current.correctOptionIds.length === 1 ? 'radio' : 'checkbox'} ${selected ? 'checked' : ''}`}>{selected && current.correctOptionIds.length > 1 ? '✓' : ''}</span><span>{o.text}</span><span className="option-mark">{right ? '✓' : bad ? '×' : ''}</span></button>; })}</div><div className="quiz-footer"><span className="muted">{t.answeredStats(session.answers.length, correct)}</span>{answer ? <button className="primary" onClick={() => updateSession({ ...session, index: session.index + 1, selected: [] })}>{session.index === session.questions.length - 1 ? t.seeResult : t.next}</button> : <button className="primary" disabled={!session.selected.length} onClick={submit}>{t.check}</button>}</div>{answer && <div className={`feedback ${answer.correct ? 'success' : 'failure'}`} role="status"><b>{answer.correct ? t.correctFeedback : t.wrongFeedback}</b><AnswerDetails question={current} t={t}/></div>}</section></div> : null}
    </main><footer>{t.footer} <span>{t.footerNote}</span></footer></div>;
}
function AnswerDetails({ question, t }) {
  return <div className="answer-details">{question.explanation && <p className="explanation">{question.explanation}</p>}{question.sourceNote && <p className="muted">{question.sourceNote}</p>}<details><summary>{t.optionExplanations}</summary>{question.options.map(o => o.explanation && <p key={o.id}><b>{question.correctOptionIds.includes(o.id) ? '✓ ' : ''}{o.text}</b><br/>{o.explanation}</p>)}</details>{question.references?.length > 0 && <div className="reference-links">{t.references}{question.references.map((ref, i) => <a key={i} href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a>)}</div>}</div>;
}
loadTranslator(initialLang).then(translate => createRoot(document.getElementById('root')).render(<App initialTranslate={translate}/>));
