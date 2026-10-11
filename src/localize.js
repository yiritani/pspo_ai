export function localizeSaved(saved, defaults) {
  const byId = new Map(defaults.map(q => [q.id, q]));
  // 収録問題と同じ問題文なら、収録データの難易度を反映する。
  const withDifficulty = q => {
    const bundled = byId.get(q.id);
    return bundled && q.question === bundled.question ? { ...q, difficulty: bundled.difficulty } : q;
  };
  let bank = Array.isArray(saved.bank) ? saved.bank.map(withDifficulty) : saved.bank;
  // 収録問題だけを使っている場合は、追加された問題を取り込む。
  // 独自に読み込んだ問題や、既存のセッションは変更しない。
  if (Array.isArray(bank) && bank.length >= 40 && bank.every(q => {
    const bundled = byId.get(q.id);
    return bundled && q.question === bundled.question
      && JSON.stringify(q.options) === JSON.stringify(bundled.options)
      && JSON.stringify(q.correctOptionIds) === JSON.stringify(bundled.correctOptionIds);
  })) {
    const existingIds = new Set(bank.map(q => q.id));
    bank = [...bank, ...defaults.filter(q => !existingIds.has(q.id))];
  }
  return { ...saved, bank, session: saved.session && Array.isArray(saved.session.questions) ? { ...saved.session, questions: saved.session.questions.map(withDifficulty) } : saved.session };
}
