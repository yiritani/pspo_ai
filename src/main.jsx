import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createSession, validateQuestions, availableQuestions, seedCorrectCounts, recordAnswer, progressKey, pruneSession, MASTERY_COUNT, hardQuestions } from './quiz.js';
import './style.css';
import { localizeSaved } from './localize.js';
import defaultQuestions from '../public/questions.json';
import hardOverrides from '../public/questions-hard.json';
const hardBank = validateQuestions(hardQuestions(defaultQuestions, hardOverrides));
const MODES = { normal: '通常', hard: 'ハード' };
const KEY = 'pspo-ai-study-v1';
function readSaved() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
const saved = localizeSaved(readSaved(), defaultQuestions);
function App() {
  const [bank, setBank] = useState(() => { try { return validateQuestions(saved.bank); } catch { return validateQuestions(defaultQuestions); } });
  const [counts, setCounts] = useState(() => saved.correctCounts || seedCorrectCounts(saved.session));
  const [session, setSession] = useState(() => pruneSession(saved.session, saved.correctCounts || seedCorrectCounts(saved.session)) || null);
  const [mode, setMode] = useState(saved.mode === 'hard' ? 'hard' : 'normal');
  const [view, setView] = useState(saved.session ? 'quiz' : 'home');
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  function persist(nextBank, nextSession, nextCounts = counts, nextMode = mode) { try { localStorage.setItem(KEY, JSON.stringify({ bank: nextBank, session: nextSession, correctCounts: nextCounts, mode: nextMode })); } catch { setNotice('ブラウザに保存できませんでした。容量・設定をご確認ください。'); } }
  function updateSession(next) { setSession(next); persist(bank, next); }
  function load(raw) {
    try { const next = validateQuestions(JSON.parse(raw)); setBank(next); setSession(null); persist(next, null); setError(''); setNotice(`${next.length}問を読み込みました。`); setView('home'); }
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
    if (!eligible.length) { setNotice('出題対象の問題はありません。すべての問題を習得済みです。'); return; }
    updateSession({ ...createSession(eligible, counts), mode: sessionMode }); setView('quiz'); setNotice('');
  }
  const finished = session && session.index >= session.questions.length;
  const current = session?.questions[session.index];
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
  function reviewCard(q) {
    const a = session.answers[session.questions.findIndex(x => x.id === q.id)];
    return <article className="review-card" key={q.id}><span className="eyebrow">{q.id}</span><h3>{q.question}</h3>{q.sourceLabel && <span className="source-label">{q.sourceLabel}</span>}{q.domain && <p className="domain">{q.domain}</p>}{q.options.map(o => <div className={`review-option ${q.correctOptionIds.includes(o.id) ? 'right' : a.selected.includes(o.id) ? 'wrong' : ''}`} key={o.id}><span>{q.correctOptionIds.includes(o.id) ? '✓ 正解' : a.selected.includes(o.id) ? '× あなたの回答' : '—'}</span>{o.text}</div>)}<AnswerDetails question={q}/></article>;
  }
  return <div className="layout"><header><a className="brand" href="#" onClick={e => { e.preventDefault(); setView('home'); }}>PSPO<span>AI</span><small>学習ルーム</small></a><span className="header-note">順番に頼らず、理解で答える。</span><button className="quiet" onClick={() => setView('home')}>問題データ</button></header>
    <main>{notice && <div className="notice" role="status">{notice}</div>}
      {view === 'home' ? <><div className="hero"><div className="eyebrow">PSPO-AI Essentials 対策</div><h1>PSPO-AIの練習問題を、<br/><span>日本語で、無料で。</span></h1><p>Scrum.orgの認定試験「PSPO-AI Essentials」に向けた{defaultQuestions.length}問の練習問題です。<br/>登録不要。解説を読みながら、ブラウザだけで学べます。</p></div><div className="home-grid"><section className="start-card"><span className="eyebrow">練習問題</span><div className="mode-switch" role="radiogroup" aria-label="難易度">{Object.entries(MODES).map(([key, label]) => <button key={key} role="radio" aria-checked={mode === key} className={mode === key ? "active" : ""} onClick={() => changeMode(key)}>{label}</button>)}</div><p className="mode-note">{mode === "hard" ? "正解とまぎらわしい選択肢で、理解の深さを確かめます。" : "基本を押さえる問題です。まずはここから。"}</p><div className="big-number">{Math.min(40, available.length)}<span>問 / セッション</span></div><p>登録済み <b>{bank.length}問</b> · 出題対象 <b>{available.length}問</b> · 習得済み <b>{mastered}問</b></p><button className="primary" disabled={!available.length} onClick={() => start()}>練習をはじめる <span>→</span></button>{session && <button className="secondary" onClick={() => setView('quiz')}>{finished ? '前回の結果を見る' : `続きから再開（${session.mode === 'hard' ? 'ハード・' : ''}${session.answers.length} / ${session.questions.length}問回答済み）`}</button>}<p>{MASTERY_COUNT}回正解した問題は習得済みになり、出題されません。習得状況はモードごとに記録します。</p><div className="features"><span>↝ 選択肢シャッフル</span><span>◎ 正解率を記録</span><span>↺ 間違いを復習</span></div></section><section className="guide-card"><span className="eyebrow">使い方</span><h2>3ステップで学ぶ</h2><ol><li><b>練習をはじめる</b>まだ習得していない問題から、最大40問をランダムに出題します。</li><li><b>解説で理解する</b>回答するたびに、正解と選択肢ごとの解説を確認できます。</li><li><b>苦手をなくす</b>{MASTERY_COUNT}回正解した問題は習得済みになり、覚えていない問題に集中できます。</li></ol><p>回答結果はこのブラウザのlocalStorageだけに保存され、サーバーには送信しません。会員登録やログインは不要です。</p><p>正解と解説のデータはページに含まれていて、誰でも見られます。答えを覚えるより、解説で理由を理解するのに使ってください。</p><p className="disclaimer">個人が運営する非公式の学習教材です。Scrum.orgとは関係がなく、実際の試験問題ではありません。</p></section></div><section className="faq"><h2>よくある質問</h2><dl><dt>PSPO-AIの過去問はありますか？</dt><dd>本サイトの問題は実際の試験問題（過去問）ではありません。PSPO-AI Essentialsの試験範囲に沿って作った練習問題です。答えを覚えるより、解説で理由を理解する使い方をおすすめします。</dd><dt>PSPO-AI Essentialsとは？</dt><dd>Scrum.orgの認定試験です。AIの理論・基礎、AIのセキュリティと倫理、AIを活用したプロダクトオーナーの仕事が範囲です。</dd><dt>ハードモードとは？</dt><dd>同じ問題を、正解とまぎらわしい選択肢で解くモードです。消去法では解けないので、理解しているかを確かめられます。</dd><dt>無料ですか？</dt><dd>無料です。会員登録もいりません。</dd></dl></section><details className="import-card"><summary>自分の問題を読み込む（JSON・上級者向け）</summary><p>JSONを貼り付けるか、ファイルを読み込んでください。現在の問題と学習結果を置き換えます。</p><label className="file-button">JSONファイルを読み込む<input type="file" accept=".json,application/json" onChange={async e => { const file = e.target.files[0]; if (file) load(await file.text()); e.target.value = ''; }}/></label><textarea aria-label="問題のJSON" placeholder='[ { "id": "q1", "question": "問題文", ... } ]' value={json} onChange={e => setJson(e.target.value)} /><button className="secondary" disabled={!json.trim()} onClick={() => load(json)}>貼り付けたJSONを読み込む</button>{error && <p className="error" role="alert">{error}</p>}<div className="import-links"><button className="quiet" onClick={sample}>収録済み{defaultQuestions.length}問を読み込む</button><button className="quiet" disabled={!bank.length} onClick={download}>JSONを書き出す ↓</button></div><details><summary>JSONの形式を見る</summary><pre>{JSON.stringify({ id: 'q1', question: '問題文', options: [{ id: 'a', text: '選択肢A' }, { id: 'b', text: '選択肢B' }], correctOptionIds: ['b'], explanation: '解説（任意）' }, null, 2)}</pre><p>このオブジェクトを配列 […] に並べます。複数正解なら ["a", "b"] のように指定します。</p></details></details></> : finished ? <><div className="hero compact"><span className="eyebrow">練習完了</span><h1>今日の理解を、振り返る。</h1><p>間違えた問題は、次の学びの手がかり。</p></div><section className="result-card"><div><span className="eyebrow">正解率</span><div className="score">{Math.round(correct / session.questions.length * 100)}<span>%</span></div></div><div className="result-stats"><p><b>{correct}</b> / {session.questions.length} 問正解</p><p>間違えた問題 <b>{wrong.length}問</b></p></div><div className="result-actions"><button className="primary" disabled={!availableQuestions(wrong, counts).length} onClick={() => start(wrong, session.mode)}>間違えた問題だけ復習 →</button><button className="secondary" disabled={!available.length} onClick={() => start()}>新しいランダム問題に挑戦</button></div></section><h2 className="review-title">間違えた問題 <span>{wrong.length}</span></h2>{wrong.length ? wrong.map(reviewCard) : <div className="empty">全問正解です。おつかれさまでした！</div>}</> : session && current ? <div className="quiz-wrap"><div className="quiz-top"><span className="eyebrow">{session.mode === 'hard' ? 'ハードモード' : '練習問題'}</span><span>{session.index + 1} <span className="muted">/ {session.questions.length}</span></span></div><div className="progress"><div style={{ width: `${session.answers.length / session.questions.length * 100}%` }}/></div><section className="question-card"><div className="question-meta"><span>問題 {String(session.index + 1).padStart(2, '0')}</span><span>{current.correctOptionIds.length > 1 ? `${current.correctOptionIds.length}つ選択` : '1つ選択'}</span></div><h2>{current.question}</h2>{current.sourceLabel && <p className="source-label">{current.sourceLabel}</p>}<p className="muted">累計正解 {counts[progressKey(current)] || 0} / {MASTERY_COUNT}回で習得済み</p>{current.domain && <p className="domain">{current.domain}</p>}<div className="options">{current.options.map((o, i) => { const selected = session.selected.includes(o.id); const right = answer && current.correctOptionIds.includes(o.id); const bad = answer && selected && !right; return <button key={o.id} disabled={!!answer} aria-pressed={selected} className={`option ${selected ? 'selected' : ''} ${right ? 'right' : ''} ${bad ? 'wrong' : ''}`} onClick={() => select(o.id)}><span className="letter">{String.fromCharCode(65 + i)}</span><span>{o.text}</span><span className="option-mark">{right ? '✓' : bad ? '×' : selected ? '●' : ''}</span></button>; })}</div><div className="quiz-footer"><span className="muted">回答済み {session.answers.length}問 · 正解 {correct}問</span>{answer ? <button className="primary" onClick={() => updateSession({ ...session, index: session.index + 1, selected: [] })}>{session.index === session.questions.length - 1 ? '結果を見る →' : '次の問題へ →'}</button> : <button className="primary" disabled={!session.selected.length} onClick={submit}>回答を確認する →</button>}</div>{answer && <div className={`feedback ${answer.correct ? 'success' : 'failure'}`} role="status"><b>{answer.correct ? '✓ 正解です' : 'もう一度、理解を確認しましょう'}</b><AnswerDetails question={current}/></div>}</section></div> : null}
    </main><footer>PSPO AI 学習ルーム · 非公式の学習教材 <span>回答結果はこのブラウザ（localStorage）に保存されます</span></footer></div>;
}
function AnswerDetails({ question }) {
  return <div className="answer-details">{question.explanation && <p className="explanation">{question.explanation}</p>}{question.sourceNote && <p className="muted">{question.sourceNote}</p>}<details><summary>選択肢ごとの解説</summary>{question.options.map(o => o.explanation && <p key={o.id}><b>{question.correctOptionIds.includes(o.id) ? '✓ ' : ''}{o.text}</b><br/>{o.explanation}</p>)}</details>{question.references?.length > 0 && <div className="reference-links">参考資料：{question.references.map((ref, i) => <a key={i} href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a>)}</div>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
