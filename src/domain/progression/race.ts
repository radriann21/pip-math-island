export const RACE_SECONDS = 60;

/** XP awarded for a finished quick race. */
export function raceXp(score: number): number {
  return score * 2;
}

/** Pure race state so the UI keeps no scoring logic. */
export interface RaceTracker {
  score: number;
  combo: number;
  bestCombo: number;
}

export function initialRace(): RaceTracker {
  return { score: 0, combo: 0, bestCombo: 0 };
}

/** Reducer: a correct answer adds a point and extends the combo; a wrong one resets the combo. */
export function answerRace(state: RaceTracker, correct: boolean): RaceTracker {
  if (!correct) return { ...state, combo: 0 };
  const combo = state.combo + 1;
  return { score: state.score + 1, combo, bestCombo: Math.max(state.bestCombo, combo) };
}
