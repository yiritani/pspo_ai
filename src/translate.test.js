import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTranslator } from './translate.js';
import { hardQuestions, progressKey, validateQuestions } from './quiz.js';
import { LANGUAGES, languageOf, messages } from './messages.js';
const read = name => JSON.parse(readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8'));
const bundled = read('questions.json');
const hard = read('questions-hard.json');
const LANGS = ['en', 'zh', 'es'];

test('各言語の翻訳は収録問題と同じ問題・選択肢・項目をそろえる', () => {
  for (const lang of LANGS) {
    const translated = read(`questions.${lang}.json`);
    assert.deepEqual(translated.map(t => t.id), bundled.map(q => q.id), lang);
    for (const [i, t] of translated.entries()) {
      const q = bundled[i];
      assert.deepEqual(t.options.map(o => o.id), q.options.map(o => o.id), `${lang} ${q.id}`);
      for (const key of ['explanation', 'domain', 'sourceLabel', 'sourceNote']) assert.equal(key in t, key in q, `${lang} ${q.id} ${key}`);
      assert.equal(Boolean(t.explanation), Boolean(q.explanation), `${lang} ${q.id}`);
      assert.ok(t.question.trim() && t.options.every(o => o.text.trim() && o.explanation.trim()), `${lang} ${q.id}`);
      assert.deepEqual(t.references?.map(r => r.url), q.references?.map(r => r.url), `${lang} ${q.id}`);
    }
    const translatedHard = read(`questions-hard.${lang}.json`);
    assert.deepEqual(translatedHard.map(h => [h.id, h.options.map(o => o.id)]), hard.map(h => [h.id, h.options.map(o => o.id)]), lang);
    const text = JSON.stringify([translated, translatedHard]);
    // 英語・スペイン語に日本語が、中国語にかなが残っていないこと。
    assert.doesNotMatch(text, lang === 'zh' ? /[぀-ヿ]/ : /[぀-ヿ一-鿿]/, lang);
  }
});

test('翻訳は表示だけを変え、正解と習得状況の判定は日本語の収録データのまま', () => {
  const translate = createTranslator(bundled, hard, read('questions.en.json'), read('questions-hard.en.json'));
  const q = { ...bundled[0], options: [...bundled[0].options].reverse() };
  const shown = translate(q);
  assert.equal(shown.question, read('questions.en.json')[0].question);
  assert.deepEqual(shown.options.map(o => o.id), q.options.map(o => o.id));
  assert.deepEqual(shown.correctOptionIds, q.correctOptionIds);
  assert.equal(progressKey(q), progressKey(bundled[0]));
  assert.doesNotMatch(JSON.stringify(shown), /[぀-ヿ]/);
  // ハードモードの選択肢は、差し替えた選択肢の翻訳を使う。
  const hardQ = validateQuestions(hardQuestions(bundled, hard))[0];
  const hardShown = translate(hardQ);
  const wrong = hardShown.options.find(o => !hardQ.correctOptionIds.includes(o.id));
  assert.equal(wrong.text, read('questions-hard.en.json')[0].options.find(o => o.id === wrong.id).text);
  assert.doesNotMatch(JSON.stringify(hardShown), /[぀-ヿ]/);
  // 自分で読み込んだ問題や編集した収録問題は翻訳しない。
  const custom = { ...bundled[0], question: '独自に編集した問題' };
  assert.equal(translate(custom), custom);
  assert.equal(createTranslator(bundled, hard)(bundled[0]), bundled[0]);
});

test('画面の文言は全言語で同じ項目をそろえる', () => {
  const keys = value => Object.entries(value).flatMap(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) ? keys(v).map(x => `${k}.${x}`) : [k]).sort();
  for (const { code } of LANGUAGES) assert.deepEqual(keys(messages[code]), keys(messages.ja), code);
  assert.equal(languageOf('zh-Hans'), 'zh');
  assert.equal(languageOf('en'), 'en');
  assert.equal(languageOf(''), 'ja');
  assert.equal(languageOf('fr'), 'ja');
  assert.throws(() => validateQuestions([], messages.en.validation), /Provide an array/);
});

test('共通トップの初期タイトルと説明文は日本語の文言と一致する', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(messages.ja.pageTitle, html.match(/<title>(.*?)<\/title>/)[1]);
  assert.equal(messages.ja.pageDescription, html.match(/<meta name="description" content="(.*?)"/)[1]);
  assert.doesNotMatch(html, /hreflang=/);
});

import { renderQuestionPages, renderQuestionsPage, questionsPath } from '../scripts/question-pages.js';
import vm from 'node:vm';
test('問題一覧は言語別URLに全問・正解・hreflangを静的に載せる', () => {
  const pages = renderQuestionPages('/pspo_ai/');
  assert.deepEqual(pages.slice(0, 4).map(p => p.fileName), ['questions/index.html', 'en/questions/index.html', 'zh/questions/index.html', 'es/questions/index.html']);
  for (const { code } of LANGUAGES) {
    const html = renderQuestionsPage(code, '/pspo_ai/');
    assert.equal(questionsPath(code), (code === 'ja' ? '' : code + '/') + 'questions/');
    assert.equal((html.match(/<article class="question"/g) || []).length, bundled.length);
    assert.ok(html.includes(`<link rel="canonical" href="https://yiritani.github.io/pspo_ai/${questionsPath(code)}"/>`));
    assert.equal((html.match(/rel="alternate" hreflang=/g) || []).length, 5);
    assert.match(html, /<nav aria-label=/);
    assert.match(html, /href="\/pspo_ai\/en\/questions\/"/);
    assert.match(html, /class="cta" href="\/pspo_ai\/"/);
    assert.doesNotMatch(html, /location\.replace|DOMParser/);
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    let stored;
    vm.runInNewContext(script, { localStorage: { setItem: (key, value) => { stored = [key, value]; } } });
    assert.deepEqual(stored, ['pspo-ai-language', code]);
    if (code !== 'ja') assert.doesNotMatch(html, /[぀-ヿ]/);
  }

});

test('旧URLは言語を保存し、クエリとハッシュを保って共通URLへ移動する', () => {
  const pages = renderQuestionPages('/pspo_ai/').slice(4);
  assert.equal(pages.length, 3);
  for (const page of pages) {
    const code = page.fileName.split('/')[0];
    const target = '/pspo_ai/' + (page.fileName.includes('/questions/') ? 'questions/' : '');
    let stored, redirected;
    const script = page.html.match(/<script>([\s\S]*?)<\/script>/)[1];
    vm.runInNewContext(script, {
      localStorage: { setItem: (key, value) => { stored = [key, value]; } },
      location: { search: '?test=1', hash: '#q1', replace: value => { redirected = value; } },
    });
    assert.deepEqual(stored, ['pspo-ai-language', code]);
    assert.equal(redirected, target + '?test=1#q1');
  }
});

test('サイトマップは共通アプリと4言語の問題一覧を掲載する', () => {
  const xml = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  assert.equal((xml.match(/<loc>/g) || []).length, 5);
  for (const { code } of LANGUAGES) {
    assert.ok(xml.includes(`<loc>https://yiritani.github.io/pspo_ai/${questionsPath(code)}</loc>`));
  }
  assert.doesNotMatch(xml, /<loc>[^<]*\/(en|zh|es)\/<\/loc>/);
});
