export const PENDING_QUIZ_STORAGE_KEY = 'pendingQuiz';

export const TOTAL_STEPS = 6;

export const QUIZ_STEP_IDS = [
  'interests',
  'vibe',
  'pace',
  'walking',
  'budget',
  'duration',
];

export const QUIZ_STEP_QUESTIONS = [
  {
    id: 'interests',
    questionKey: 'quiz.whatDrawsYou',
    subtitleKey: 'quiz.selectAllThatApply',
  },
  { id: 'vibe', questionKey: 'quiz.pickTheVibe' },
  {
    id: 'pace',
    questionKey: 'quiz.howPacked',
    subtitleKey: 'quiz.stopsPerDay',
  },
  {
    id: 'walking',
    questionKey: 'quiz.walkingTolerance',
    subtitleKey: 'quiz.walkingToleranceSubtitle',
  },
  { id: 'budget', questionKey: 'quiz.budgetPreference' },
  { id: 'duration', questionKey: 'quiz.howLong' },
];

export const INTERESTS = [
  'museums',
  'nature',
  'food',
  'nightlife',
  'architecture',
  'art',
  'history',
  'shopping',
];

export const INTEREST_KEYS = {
  museums: 'quiz.interestMuseums',
  nature: 'quiz.interestNature',
  food: 'quiz.interestFood',
  nightlife: 'quiz.interestNightlife',
  architecture: 'quiz.interestArchitecture',
  art: 'quiz.interestArt',
  history: 'quiz.interestHistory',
  shopping: 'quiz.interestShopping',
};

export const SELECTED_INTEREST_WEIGHT = 0.9;
export const UNSELECTED_INTEREST_WEIGHT = 0.1;

export const VIBES = [
  { id: 'relaxed', labelKey: 'quiz.vibeRelaxed', src: '/quiz/vibes/relaxed_cafe.jpg' },
  { id: 'market', labelKey: 'quiz.vibeMarket', src: '/quiz/vibes/bustling_market.jpg' },
  { id: 'park', labelKey: 'quiz.vibePark', src: '/quiz/vibes/quiet_park.jpg' },
  { id: 'bar', labelKey: 'quiz.vibeBar', src: '/quiz/vibes/lively_bar.jpg' },
];

export const BUDGET_OPTIONS = [
  { value: 'free', labelKey: 'quiz.budgetFree' },
  { value: 'moderate', labelKey: 'quiz.budgetModerate' },
  { value: 'any', labelKey: 'quiz.budgetNoLimit' },
];

export const DURATION_OPTIONS = [
  { labelKey: 'quiz.halfDay', value: 0.5 },
  { labelKey: 'quiz.fullDay', value: 1 },
  { labelKey: 'quiz.twoDays', value: 3 },
  { labelKey: 'quiz.fourDays', value: 7 },
];

export const PACE_BOUNDS = { min: 3, max: 8 };
export const WALKING_BOUNDS = { min: 2, max: 15 };

export const REQUIRED_QUIZ_ANSWER_FIELDS = [
  'museums',
  'nature',
  'food',
  'nightlife',
  'architecture',
  'art',
  'history',
  'shopping',
  'pace',
  'walkingKm',
  'budget',
  'durationDays',
];

const BUDGET_VALUES = new Set(BUDGET_OPTIONS.map((option) => option.value));

function normalizeTotal(totalSteps) {
  return Number.isInteger(totalSteps) && totalSteps > 0 ? totalSteps : TOTAL_STEPS;
}

export function defaultQuizPreferences() {
  return {
    museums: 0.5,
    nature: 0.5,
    food: 0.5,
    nightlife: 0.3,
    architecture: 0.3,
    art: 0.3,
    history: 0.3,
    shopping: 0.2,
    pace: 5,
    walkingKm: 8,
    budget: 'moderate',
    durationDays: 1,
  };
}

function asInterestSet(selectedInterests) {
  if (selectedInterests instanceof Set) return selectedInterests;
  if (Array.isArray(selectedInterests)) return new Set(selectedInterests);
  return new Set();
}

export function collectQuizAnswers({
  preferences,
  selectedInterests,
  vibe,
} = {}) {
  const finalPrefs = {
    ...defaultQuizPreferences(),
    ...(preferences && typeof preferences === 'object' ? preferences : {}),
  };
  const selected = asInterestSet(selectedInterests);
  for (const interest of INTERESTS) {
    finalPrefs[interest] = selected.has(interest)
      ? SELECTED_INTEREST_WEIGHT
      : UNSELECTED_INTEREST_WEIGHT;
  }
  finalPrefs.vibe = vibe;
  return finalPrefs;
}

export function missingRequiredQuizAnswers(preferences) {
  if (!preferences || typeof preferences !== 'object') {
    return [...REQUIRED_QUIZ_ANSWER_FIELDS];
  }
  return REQUIRED_QUIZ_ANSWER_FIELDS.filter((field) => {
    const value = preferences[field];
    if (field === 'budget') return !BUDGET_VALUES.has(value);
    return typeof value !== 'number' || !Number.isFinite(value);
  });
}

export function buildPendingQuizPayload(preferences) {
  return { preferences };
}

export function clampStepIndex(step, totalSteps = TOTAL_STEPS) {
  const total = normalizeTotal(totalSteps);
  const numeric = typeof step === 'number' && Number.isFinite(step) ? Math.trunc(step) : 0;
  if (numeric < 0) return 0;
  if (numeric > total - 1) return total - 1;
  return numeric;
}

export function nextStepIndex(step, totalSteps = TOTAL_STEPS) {
  const total = normalizeTotal(totalSteps);
  return clampStepIndex(clampStepIndex(step, total) + 1, total);
}

export function previousStepIndex(step, totalSteps = TOTAL_STEPS) {
  const total = normalizeTotal(totalSteps);
  return clampStepIndex(clampStepIndex(step, total) - 1, total);
}

export function quizProgressPercent(step, totalSteps = TOTAL_STEPS) {
  const total = normalizeTotal(totalSteps);
  const index = clampStepIndex(step, total);
  return ((index + 1) / total) * 100;
}

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

export function savePendingQuiz(data, storage) {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.setItem(PENDING_QUIZ_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable */
  }
}

export function loadPendingQuiz(storage) {
  const target = resolveStorage(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(PENDING_QUIZ_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingQuiz(storage) {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.removeItem(PENDING_QUIZ_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPendingQuiz(storage) {
  return loadPendingQuiz(storage) !== null;
}
