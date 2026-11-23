/** Pure scoring logic. Accuracy is positional character accuracy, not spellcheck. */
export interface TypingScore {
  elapsedSeconds: number;
  typedCharacters: number;
  correctCharacters: number;
  errors: number;
  accuracy: number;
  wpm: number;
}

export function calculateTypingScore(reference: string, typed: string, elapsedSeconds: number): TypingScore {
  const safeTime = Math.max(1, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 1);
  const correctCharacters = [...typed].reduce((count, character, index) =>
    count + Number(character === [...reference][index]), 0);
  const errors = Math.max(0, [...typed].length - correctCharacters);
  const accuracy = typed.length ? Math.round((correctCharacters / [...typed].length) * 100) : 0;
  const wpm = Math.round((correctCharacters / 5 / (safeTime / 60)) * 10) / 10;
  return { elapsedSeconds: safeTime, typedCharacters: [...typed].length, correctCharacters, errors, accuracy, wpm };
}

export function normalizeRating(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(5, Math.round(value))) : 1;
}
