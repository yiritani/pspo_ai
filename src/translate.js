// 収録問題の翻訳を表示時に重ねる。保存データと正解回数は日本語の収録データのまま扱うため、
// 言語を切り替えても習得状況は共通になる。
export function createTranslator(questions, hardOverrides, translated, translatedHard) {
  if (!translated) return q => q;
  const bundled = new Map(questions.map(q => [q.id, q]));
  const hard = new Map(hardOverrides.map(h => [h.id, new Map(h.options.map(o => [o.id, o]))]));
  const texts = new Map(translated.map(t => [t.id, t]));
  const hardTexts = new Map(translatedHard.map(h => [h.id, new Map(h.options.map(o => [o.id, o]))]));
  return q => {
    const base = bundled.get(q.id), t = texts.get(q.id);
    // 自分で読み込んだ問題や、収録問題を編集したものは翻訳しない。
    if (!base || !t || q.question !== base.question) return q;
    const options = q.options.map(o => {
      // 通常の選択肢か、ハードモードで差し替えた選択肢かを本文で見分ける。
      const source = base.options.find(b => b.id === o.id)?.text === o.text ? new Map(t.options.map(x => [x.id, x]))
        : hard.get(q.id)?.get(o.id)?.text === o.text ? hardTexts.get(q.id) : null;
      const text = source?.get(o.id);
      return text ? { ...o, ...text } : o;
    });
    const fields = Object.fromEntries(['question', 'explanation', 'domain', 'sourceLabel', 'sourceNote', 'references'].filter(k => t[k] !== undefined && q[k] !== undefined).map(k => [k, t[k]]));
    return { ...q, ...fields, options };
  };
}
