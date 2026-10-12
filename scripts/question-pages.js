// 収録問題と解説の一覧ページ（/questions/、/en/questions/ など）を言語ごとに静的HTMLで作る。
// アプリはJavaScriptで問題を表示するため、検索エンジンが各言語の本文を読めるようにする。
import { readFileSync } from 'node:fs';
import { LANGUAGES, messages } from '../src/messages.js';

export const SITE_URL = 'https://yiritani.github.io/pspo_ai/';
const LOCALES = { ja: 'ja_JP', en: 'en_US', zh: 'zh_CN', es: 'es_ES' };
const HREFLANG = { ja: 'ja', en: 'en', zh: 'zh-Hans', es: 'es' };
const read = name => JSON.parse(readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8'));
const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// アプリと同じく、日本語の問題文では正解の数を伏せる。
const questionText = text => text.replace(/[0-9０-９]+つ選んでください/g, '当てはまるものを選んでください');
export const questionsPath = code => `${LANGUAGES.find(l => l.code === code).path}questions/`;

function localized(code) {
  const questions = read('questions.json');
  if (code === 'ja') return questions;
  const texts = new Map(read(`questions.${code}.json`).map(t => [t.id, t]));
  return questions.map(q => {
    const t = texts.get(q.id);
    return { ...q, ...t, options: q.options.map(o => ({ ...o, ...t.options.find(x => x.id === o.id) })) };
  });
}

function renderQuestion(q, t) {
  const p = t.questionsPage;
  const letter = i => String.fromCharCode(65 + i);
  const correct = q.options.flatMap((o, i) => q.correctOptionIds.includes(o.id) ? [letter(i)] : []);
  return `<article class="question" id="${escape(q.id)}">
<h3>${escape(questionText(q.question))}</h3>
${q.correctOptionIds.length > 1 ? `<p class="tag">${escape(p.multiple)}</p>` : ''}${q.sourceLabel ? `<p class="tag">${escape(q.sourceLabel)}</p>` : ''}
<ol class="options">${q.options.map(o => `<li class="${q.correctOptionIds.includes(o.id) ? 'correct' : ''}">${escape(o.text)}</li>`).join('')}</ol>
<p class="answer"><b>${escape(p.answer)}:</b> ${correct.join(', ')}</p>
${q.explanation ? `<p class="explanation"><b>${escape(p.explanation)}:</b> ${escape(q.explanation)}</p>` : ''}${q.sourceNote ? `<p class="note">${escape(q.sourceNote)}</p>` : ''}
<details><summary>${escape(t.optionExplanations)}</summary>${q.options.filter(o => o.explanation).map(o => `<p><b>${q.correctOptionIds.includes(o.id) ? '✓ ' : ''}${escape(o.text)}</b><br>${escape(o.explanation)}</p>`).join('')}</details>
${q.references?.length ? `<p class="note">${escape(t.references)}${q.references.map(r => `<a href="${escape(r.url)}" rel="noopener">${escape(r.title)}</a>`).join(' · ')}</p>` : ''}
</article>`;
}

export function renderQuestionsPage(code, base = '/') {
  const t = messages[code], p = t.questionsPage;
  const questions = localized(code);
  const groups = new Map();
  for (const q of questions) {
    const domain = q.domain || p.otherDomain;
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain).push(q);
  }
  // 分野のない問題は最後にまとめる。
  const ordered = [...groups].sort(([a], [b]) => (a === p.otherDomain) - (b === p.otherDomain));
  const url = c => SITE_URL + questionsPath(c);
  const appUrl = base + LANGUAGES.find(l => l.code === code).path;
  return `<!doctype html>
<html lang="${HREFLANG[code]}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="theme-color" content="#152f2b"/>
<title>${escape(p.title)}</title>
<meta name="description" content="${escape(p.description)}"/>
<link rel="canonical" href="${url(code)}"/>
${LANGUAGES.map(l => `<link rel="alternate" hreflang="${HREFLANG[l.code]}" href="${url(l.code)}"/>`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${url('en')}"/>
<link rel="icon" href="${base}favicon.ico" sizes="48x48"/>
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${url(code)}"/>
<meta property="og:locale" content="${LOCALES[code]}"/>
<meta property="og:title" content="${escape(p.title)}"/>
<meta property="og:description" content="${escape(p.description)}"/>
<meta name="twitter:card" content="summary"/>
<style>
:root{color:#203b36;background:#f6f7f2;font-family:system-ui,sans-serif;line-height:1.75}
:root:lang(ja){font-family:'Hiragino Sans','Noto Sans JP',sans-serif}
:root:lang(zh-Hans){font-family:'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif}
body{margin:0}
main,header,footer{max-width:820px;margin:auto;padding:0 16px}
header{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;padding-top:24px;padding-bottom:16px;border-bottom:1px solid #dce2d8}
header .brand{font-weight:700;color:inherit;text-decoration:none;margin-right:auto}
nav a{color:#52675e;text-decoration:none;padding:4px 8px;border-radius:6px;font-size:14px}
nav a[aria-current]{background:#e7efd9;color:#183d33;font-weight:600}
h1{font-size:clamp(26px,5vw,36px);line-height:1.4;margin:32px 0 12px}
h2{font-size:21px;margin:48px 0 12px;padding-top:12px;border-top:1px solid #dce2d8}
h3{font-size:17px;margin:0 0 12px;white-space:pre-wrap}
.lead{color:#5f6f63}
.cta{display:inline-block;margin:8px 0 24px;padding:12px 18px;border-radius:8px;background:#234c3e;color:#fff;text-decoration:none;font-weight:600}
.toc{padding-left:20px}.toc a{color:#2f5a49}
.question{background:#fff;border:1px solid #dde3d7;border-radius:12px;padding:20px;margin:16px 0}
.tag{display:inline-block;font-size:12px;background:#edf1e4;border-radius:5px;padding:2px 8px;margin:0 6px 12px 0}
.options{padding-left:24px;list-style:upper-alpha}.options li{margin:4px 0}
.options .correct{font-weight:600;color:#2f6a3c}
.answer{margin:12px 0 4px}
.explanation{background:#f6f8f1;padding:12px;border-radius:8px}
.note{font-size:13px;color:#5f6f63}.note a{color:#526e4c;margin:0 4px}
details{font-size:14px;color:#52675e}summary{cursor:pointer}
.top{font-size:13px}.top a{color:#526e4c}
footer{margin-top:48px;padding-top:24px;padding-bottom:40px;border-top:1px solid #dce2d8;font-size:13px;color:#748279}
</style>
</head>
<body>
<header><a class="brand" href="${appUrl}">PSPO AI ${escape(t.brandSub)}</a><nav aria-label="${escape(t.languageLabel)}">${LANGUAGES.map(l => `<a href="${base}${questionsPath(l.code)}" hreflang="${HREFLANG[l.code]}" lang="${HREFLANG[l.code]}"${l.code === code ? ' aria-current="page"' : ''}>${escape(l.label)}</a>`).join('')}</nav></header>
<main>
<h1 id="top">${escape(p.heading)}</h1>
<p class="lead">${escape(p.intro(questions.length))}</p>
<p class="lead">${escape(t.disclaimer)}</p>
<a class="cta" href="${appUrl}">${escape(p.practice)} →</a>
<h2>${escape(p.contents)}</h2>
<ol class="toc">${ordered.map(([domain, qs], i) => `<li><a href="#topic-${i + 1}">${escape(domain)}</a> (${qs.length})</li>`).join('')}</ol>
${ordered.map(([domain, qs], i) => `<section>
<h2 id="topic-${i + 1}">${escape(domain)}</h2>
${qs.map(q => renderQuestion(q, t)).join('\n')}
<p class="top"><a href="#top">↑ ${escape(p.backToTop)}</a></p>
</section>`).join('\n')}
<a class="cta" href="${appUrl}">${escape(p.practice)} →</a>
</main>
<footer>${escape(t.footer)}</footer>
</body>
</html>
`;
}

export function renderQuestionPages(base = '/') {
  return LANGUAGES.map(l => ({ fileName: `${questionsPath(l.code)}index.html`, html: renderQuestionsPage(l.code, base) }));
}
