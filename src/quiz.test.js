import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, isCorrect, validateQuestions, shuffle } from './quiz.js';
const q = { id: 'q1', question: 'Question', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }], correctOptionIds: ['a', 'c'] };
test('複数回答は完全一致で判定する', () => {
  assert.equal(isCorrect(q, ['c', 'a']), true);
  assert.equal(isCorrect(q, ['a']), false);
  assert.equal(isCorrect(q, ['a', 'b', 'c']), false);
});
test('40問を重複なしで抽出し元データを変更しない', () => {
  const bank = Array.from({ length: 65 }, (_, i) => ({ ...q, id: `q${i}` }));
  const original = JSON.stringify(bank);
  const session = createSession(bank);
  assert.equal(session.questions.length, 40);
  assert.equal(new Set(session.questions.map(x => x.id)).size, 40);
  assert.equal(JSON.stringify(bank), original);
  for (const item of session.questions) assert.equal(isCorrect(item, ['a', 'c']), true);
  assert.equal(createSession([q]).questions.length, 1);
  assert.deepEqual([...shuffle([1, 2, 3])].sort(), [1, 2, 3]);
});
test('不正なデータを拒否する', () => {
  assert.deepEqual(validateQuestions({ questions: [q] }), [q]);
  assert.throws(() => validateQuestions([q, q]));
  assert.throws(() => validateQuestions([{ ...q, correctOptionIds: ['missing'] }]));
  assert.throws(() => validateQuestions([{ ...q, options: [q.options[0], q.options[0]] }]));
  assert.throws(() => validateQuestions([]));
});

import { readFileSync } from 'node:fs';
import { localizeSaved } from './localize.js';
const bundled = JSON.parse(readFileSync(new URL('../public/questions.json', import.meta.url), 'utf8'));
test('追加問題の正解と日本語データを確認する', () => {
  assert.equal(validateQuestions(bundled).length, 124);
  assert.equal(new Set(bundled.map(q => q.id )).size, 124);
  assert.deepEqual(bundled.find(q => q.id === 'q049').correctOptionIds, ['c']);
  assert.deepEqual(bundled.find(q => q.id === 'q050').correctOptionIds, ['c']);
  assert.deepEqual(bundled.find(q => q.id === 'q051').correctOptionIds, ['a', 'c', 'e']);
  for (const q of bundled) {
    for (const text of [q.question, q.explanation, q.domain, ...q.options.flatMap(o => [o.text, o.explanation])]) {
      if (text) assert.match(text, /[\u3040-\u30ff\u3400-\u9fff]/);
    }
  }
  const selected = createSession(bundled).questions;
  assert.equal(selected.length, 40);
  assert.equal(new Set(selected.map(q => q.id)).size, 40);
});
test('保存済みの収録問題に追加し、回答履歴を維持する', () => {
  const bank = bundled.slice(0, 40);
  const session = createSession(bank);
  session.answers = [{ selected: ['b'], correct: false }];
  const saved = { bank, session };
  const updated = localizeSaved(saved, bundled);
  assert.equal(updated.bank.length, 124);
  assert.deepEqual(updated.session, session);
  assert.equal(localizeSaved(updated, bundled).bank.length, 124);
  const custom = [{ ...bank[0], question: '独自に編集した問題' }, ...bank.slice(1)];
  assert.deepEqual(localizeSaved({ bank: custom, session }, bundled).bank, custom);
});

test('シナリオ問題の正解を保持し、重複問題をまとめる', () => {
  const additions = bundled.slice(55, 64);
  assert.equal(additions.length, 9);
  assert.deepEqual(additions.map(q => q.correctOptionIds[0]), ['d', 'c', 'b', 'd', 'b', 'c', 'a', 'a', 'd']);
  assert.deepEqual(bundled.find(q => q.id === 'q059').sourceQuestionNumbers, ['04', '08']);
  assert.equal(new Set(bundled.map(q => q.question)).size, bundled.length);
});

import { availableQuestions, progressKey, recordAnswer, seedCorrectCounts, pruneSession } from './quiz.js';
test('すべての問題を累計2回正解で習得済みとして除外し、問題の順序に依存しない', () => {
  const easy = bundled[0], scenario = bundled[55];
  const key = progressKey(easy);
  assert.equal(availableQuestions([easy], { [key]: 1 }).length, 1);
  assert.equal(availableQuestions([easy], { [key]: 2 }).length, 0);
  assert.equal(availableQuestions([scenario], { [progressKey(scenario)]: 1 }).length, 1);
  assert.equal(availableQuestions([scenario], { [progressKey(scenario)]: 2 }).length, 0);
  assert.equal(progressKey({ ...easy, options: [...easy.options].reverse() }), key);
  assert.equal(availableQuestions([{ ...easy, question: '別の問題' }], { [key]: 3 }).length, 1);
  const counts = Object.fromEntries(bundled.filter(q => q.difficulty === 'easy').map(q => [progressKey(q), 2]));
  assert.equal(createSession(availableQuestions(bundled, counts)).questions.length, 29);
  const allButFive = Object.fromEntries(bundled.slice(5).map(q => [progressKey(q), 2]));
  assert.equal(createSession(availableQuestions(bundled, allButFive), allButFive).questions.length, 5);
});
test('進行中のセッションから未回答の習得済み問題を除く', () => {
  const session = { ...createSession(bundled.slice(0, 5)), answers: [{ selected: ['a'], correct: true }], index: 1, selected: ['b'] };
  const [first, second, third] = session.questions;
  const counts = { [progressKey(first)]: 5, [progressKey(second)]: 2, [progressKey(third)]: 2 };
  const pruned = pruneSession(session, counts);
  assert.deepEqual(pruned.questions.map(q => q.id), [first, ...session.questions.slice(3)].map(q => q.id));
  assert.deepEqual(pruned.answers, session.answers);
  assert.deepEqual(pruned.selected, []);
  assert.equal(pruneSession(session, {}), session);
  assert.equal(pruneSession(null, counts), null);
});
test('正解を1回だけ記録し、不正解でも累計回数を保持する', () => {
  const session = createSession([bundled[0]]);
  session.selected = ['b'];
  const key = progressKey(bundled[0]);
  const recorded = recordAnswer(session, { [key]: 2 });
  assert.equal(recorded.counts[key], 3);
  assert.equal(recordAnswer(recorded.session, recorded.counts).counts[key], 3);
  const wrong = recordAnswer({ ...session, selected: ['a'] }, { [key]: 2 });
  assert.equal(wrong.counts[key], 2);
  assert.equal(recordAnswer({ ...session, selected: [] }, {}).session.answers.length, 0);
  assert.deepEqual(seedCorrectCounts(recorded.session), { [key]: 1 });
});

test('追加40問の分類・正解・欠落データを検証する', () => {
  const additions = bundled.slice(64, 104);
  assert.equal(additions.length, 40);
  assert.ok(additions.every(q => q.difficulty === 'easy'));
  assert.equal(bundled.filter(q => q.difficulty === 'easy').length, 95);
  assert.equal(bundled.filter(q => q.difficulty === 'scenario').length, 29);
  assert.deepEqual(bundled.find(q => q.id === 'q082').correctOptionIds, ['a', 'b', 'd', 'f']);
  assert.deepEqual(bundled.find(q => q.id === 'q102').correctOptionIds, ['a', 'b', 'd', 'f']);
  assert.deepEqual(bundled.find(q => q.id === 'q067').correctOptionIds, ['b']);
  for (const id of ['q082', 'q102']) {
    const q = bundled.find(q => q.id === id);
    assert.equal(q.explanation, '');
    assert.equal(q.domain, '');
    assert.ok(q.sourceNote);
  }
  const counts = Object.fromEntries(bundled.slice(0, 55).map(q => [progressKey(q), 2]));
  const session = createSession(bundled.slice(0, 64));
  const updated = localizeSaved({ bank: bundled.slice(0, 64), session, correctCounts: counts }, bundled);
  assert.equal(updated.bank.length, 124);
  assert.deepEqual(updated.correctCounts, counts);
  assert.deepEqual(updated.session, session);
  assert.equal(availableQuestions(updated.bank, updated.correctCounts).length, 69);
});

test('独自模擬20問に出自・解説を付け、習得済みまで出題する', () => {
  const originals = bundled.filter(q => q.sourceType === 'original');
  assert.equal(originals.length, 20);
  assert.equal(new Set(originals.map(q => q.domain)).size, 3);
  assert.equal(originals.filter(q => q.correctOptionIds.length > 1).length, 3);
  for (const q of originals) {
    assert.equal(q.sourceLabel, '独自模擬問題');
    assert.equal(q.difficulty, 'scenario');
    assert.ok(q.explanation && q.sourceNote);
    assert.ok(q.options.every(o => o.explanation));
    assert.ok(q.references.every(ref => ref.url.startsWith('https://')));
  }
  const saved = { bank: bundled.slice(0, 104), correctCounts: { kept: 2 } };
  const updated = localizeSaved(saved, bundled);
  assert.equal(updated.bank.length, 124);
  assert.deepEqual(updated.correctCounts, saved.correctCounts);
  const counts = Object.fromEntries(originals.map(q => [progressKey(q), 3]));
  assert.equal(availableQuestions(originals, counts).length, 0);
});

test('正解回数が少ない問題を優先し、40問の抽出にも反映する', () => {
  const unseen = bundled.slice(0, 45);
  const answered = bundled.slice(55, 60);
  const counts = Object.fromEntries(answered.map((q, i) => [progressKey(q), i + 1]));
  const bank = [...answered, ...unseen];
  const original = JSON.stringify(bank);
  const session = createSession(bank, counts);
  assert.equal(session.questions.length, 40);
  assert.ok(session.questions.every(q => !counts[progressKey(q)]));
  assert.equal(new Set(session.questions.map(q => q.id)).size, 40);
  assert.equal(JSON.stringify(bank), original);
  const mixed = createSession([...answered, ...unseen.slice(0, 2)], counts);
  assert.deepEqual(mixed.questions.map(q => counts[progressKey(q)] || 0), [0, 0, 1, 2, 3, 4, 5]);
});
