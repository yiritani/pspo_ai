export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function validateQuestions(value) {
  const questions = Array.isArray(value) ? value : value?.questions;
  if (!Array.isArray(questions) || !questions.length) throw new Error('問題の配列、または { "questions": [...] } を指定してください。');
  const ids = new Set();
  for (const [index, q] of questions.entries()) {
    const label = `${index + 1}問目`;
    if (!q || typeof q.id !== 'string' || !q.id.trim() || ids.has(q.id)) throw new Error(`${label}: idは重複のない文字列にしてください。`);
    ids.add(q.id);
    if (typeof q.question !== 'string' || !q.question.trim()) throw new Error(`${label}: questionが必要です。`);
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`${label}: 選択肢は2つ以上必要です。`);
    const optionIds = new Set();
    for (const o of q.options) {
      if (!o || typeof o.id !== 'string' || !o.id.trim() || optionIds.has(o.id) || typeof o.text !== 'string' || !o.text.trim()) throw new Error(`${label}: optionsには重複のないidとtextが必要です。`);
      optionIds.add(o.id);
    }
    if (!Array.isArray(q.correctOptionIds) || !q.correctOptionIds.length || new Set(q.correctOptionIds).size !== q.correctOptionIds.length || q.correctOptionIds.some(id => !optionIds.has(id))) throw new Error(`${label}: correctOptionIdsに正解の選択肢idを指定してください。`);
    if (q.explanation !== undefined && typeof q.explanation !== 'string') throw new Error(`${label}: explanationは文字列にしてください。`);
  }
  return questions;
}
export function createSession(questions, counts = {}) {
  const prioritized = shuffle(questions).sort((a, b) =>
    (counts[progressKey(a)] || 0) - (counts[progressKey(b)] || 0));
  return { questions: prioritized.slice(0, 40).map(q => ({ ...q, options: shuffle(q.options) })), answers: [], selected: [], index: 0 };
}
export function isCorrect(question, selected) {
  return question.correctOptionIds.length === selected.length && question.correctOptionIds.every(id => selected.includes(id));
}

export function progressKey(question) {
  return JSON.stringify([question.id, question.question, question.options.map(o => [o.id, o.text]).sort((a, b) => a[0].localeCompare(b[0])), [...question.correctOptionIds].sort()]);
}
export const MASTERY_COUNT = 2;
export function availableQuestions(questions, counts) {
  return questions.filter(q => (counts[progressKey(q)] || 0) < MASTERY_COUNT);
}
// 進行中のセッションから、未回答のうち習得済みになった問題を除く。
export function pruneSession(session, counts) {
  if (!session || !Array.isArray(session.questions)) return session;
  const answered = session.questions.slice(0, session.answers.length);
  const questions = [...answered, ...availableQuestions(session.questions.slice(session.answers.length), counts)];
  if (questions.length === session.questions.length) return session;
  const sameCurrent = questions[session.index]?.id === session.questions[session.index]?.id;
  return { ...session, questions, selected: sameCurrent ? session.selected : [] };
}
export function seedCorrectCounts(session) {
  const counts = {};
  session?.answers.forEach((answer, i) => {
    if (answer.correct && session.questions[i]) {
      const key = progressKey(session.questions[i]);
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return counts;
}
export function recordAnswer(session, counts) {
  if (!session || !session.selected.length || session.answers[session.index]) return { session, counts };
  const question = session.questions[session.index];
  const correct = isCorrect(question, session.selected);
  const key = progressKey(question);
  return {
    session: { ...session, answers: [...session.answers, { selected: [...session.selected], correct }] },
    counts: correct ? { ...counts, [key]: (counts[key] || 0) + 1 } : counts,
  };
}
