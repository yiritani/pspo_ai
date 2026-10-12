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

test('言語を切り替えたときのタイトルと説明文は、各言語ページの index.html と一致する', () => {
  const decode = text => text.replace(/&amp;/g, '&');
  for (const { code, path } of LANGUAGES) {
    const html = readFileSync(new URL(`../${path}index.html`, import.meta.url), 'utf8');
    assert.equal(messages[code].pageTitle, decode(html.match(/<title>(.*?)<\/title>/)[1]), code);
    assert.equal(messages[code].pageDescription, decode(html.match(/<meta name="description" content="(.*?)"/)[1]), code);
  }
});

import { renderQuestionPages, questionsPath } from '../scripts/question-pages.js';
test('言語ごとの問題一覧ページに全問・正解・相互リンクを載せる', () => {
  const pages = renderQuestionPages('/pspo_ai/');
  assert.deepEqual(pages.map(p => p.fileName), ['questions/index.html', 'en/questions/index.html', 'zh/questions/index.html', 'es/questions/index.html']);
  for (const [i, { code }] of LANGUAGES.entries()) {
    const html = pages[i].html;
    assert.equal((html.match(/<article class="question"/g) || []).length, bundled.length, code);
    assert.equal((html.match(/rel="alternate" hreflang=/g) || []).length, LANGUAGES.length + 1, code);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://yiritani.github.io/pspo_ai/${questionsPath(code)}"/>`));
    assert.match(html, /<title>[^<]+<\/title>/);
    if (code !== 'ja') assert.doesNotMatch(html.replace(/<nav[\s\S]*?<\/nav>/, ''), /[぀-ヿ]/, code);
  }
  // 問題文や選択肢に含まれる記号はエスケープする。
  assert.doesNotMatch(pages[1].html, /<li class="[^"]*">[^<]*"[^<]*<\/li>/);
});
