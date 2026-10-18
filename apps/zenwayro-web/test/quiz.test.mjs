import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BUDGET_OPTIONS,
  DURATION_OPTIONS,
  INTERESTS,
  PACE_BOUNDS,
  PENDING_QUIZ_STORAGE_KEY,
  QUIZ_STEP_IDS,
  QUIZ_STEP_QUESTIONS,
  REQUIRED_QUIZ_ANSWER_FIELDS,
  TOTAL_STEPS,
  VIBES,
  WALKING_BOUNDS,
  buildPendingQuizPayload,
  clampStepIndex,
  clearPendingQuiz,
  collectQuizAnswers,
  defaultQuizPreferences,
  hasPendingQuiz,
  loadPendingQuiz,
  missingRequiredQuizAnswers,
  nextStepIndex,
  previousStepIndex,
  quizProgressPercent,
  savePendingQuiz,
} from '../src/pages/quiz/pending-quiz.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test('quiz steps stay in source order with the source questions', () => {
  assert.equal(TOTAL_STEPS, 6);
  assert.deepEqual(QUIZ_STEP_IDS, [
    'interests',
    'vibe',
    'pace',
    'walking',
    'budget',
    'duration',
  ]);
  assert.deepEqual(
    QUIZ_STEP_QUESTIONS.map((step) => step.questionKey),
    [
      'quiz.whatDrawsYou',
      'quiz.pickTheVibe',
      'quiz.howPacked',
      'quiz.walkingTolerance',
      'quiz.budgetPreference',
      'quiz.howLong',
    ]
  );
  assert.deepEqual(INTERESTS, [
    'museums',
    'nature',
    'food',
    'nightlife',
    'architecture',
    'art',
    'history',
    'shopping',
  ]);
  assert.deepEqual(
    VIBES.map((vibe) => vibe.id),
    ['relaxed', 'market', 'park', 'bar']
  );
  assert.deepEqual(
    BUDGET_OPTIONS.map((option) => option.value),
    ['free', 'moderate', 'any']
  );
  assert.deepEqual(
    DURATION_OPTIONS.map((option) => option.value),
    [0.5, 1, 3, 7]
  );
  assert.deepEqual(PACE_BOUNDS, { min: 3, max: 8 });
  assert.deepEqual(WALKING_BOUNDS, { min: 2, max: 15 });
});

test('collectQuizAnswers writes interest weights and keeps the other answers', () => {
  const preferences = {
    ...defaultQuizPreferences(),
    pace: 7,
    walkingKm: 12,
    budget: 'any',
    durationDays: 7,
  };
  const answers = collectQuizAnswers({
    preferences,
    selectedInterests: ['museums', 'history'],
    vibe: 'market',
  });

  assert.equal(preferences.museums, 0.5);
  assert.equal(answers.museums, 0.9);
  assert.equal(answers.history, 0.9);
  assert.equal(answers.nature, 0.1);
  assert.equal(answers.food, 0.1);
  assert.equal(answers.nightlife, 0.1);
  assert.equal(answers.architecture, 0.1);
  assert.equal(answers.art, 0.1);
  assert.equal(answers.shopping, 0.1);
  assert.equal(answers.pace, 7);
  assert.equal(answers.walkingKm, 12);
  assert.equal(answers.budget, 'any');
  assert.equal(answers.durationDays, 7);
  assert.equal(answers.vibe, 'market');
  assert.deepEqual(missingRequiredQuizAnswers(answers), []);
});

test('collectQuizAnswers fills required fields from defaults when nothing is selected', () => {
  const answers = collectQuizAnswers();
  assert.deepEqual(missingRequiredQuizAnswers(answers), []);
  for (const interest of INTERESTS) {
    assert.equal(answers[interest], 0.1);
  }
  assert.equal(answers.pace, 5);
  assert.equal(answers.walkingKm, 8);
  assert.equal(answers.budget, 'moderate');
  assert.equal(answers.durationDays, 1);
  assert.equal(answers.vibe, undefined);
});

test('missingRequiredQuizAnswers reports absent and invalid required fields', () => {
  assert.deepEqual(missingRequiredQuizAnswers(null), [...REQUIRED_QUIZ_ANSWER_FIELDS]);
  const answers = collectQuizAnswers({
    preferences: { pace: 4, walkingKm: 3, budget: 'luxury', durationDays: 0.5 },
    selectedInterests: new Set(['food']),
    vibe: 'park',
  });
  assert.deepEqual(missingRequiredQuizAnswers(answers), ['budget']);
});

test('buildPendingQuizPayload stores only the preference vector', () => {
  const answers = collectQuizAnswers({
    preferences: { pace: 4, walkingKm: 6, budget: 'free', durationDays: 0.5 },
    selectedInterests: ['food', 'art'],
    vibe: 'relaxed',
  });
  const payload = buildPendingQuizPayload(answers);
  assert.deepEqual(Object.keys(payload), ['preferences']);
  assert.equal(payload.preferences, answers);
  assert.equal(payload.preferences.food, 0.9);
  assert.equal(payload.preferences.art, 0.9);
  assert.equal(payload.preferences.vibe, 'relaxed');
  assert.equal(payload.preferences.budget, 'free');
});

test('pending quiz payload round-trips through storage and clears', () => {
  const storage = memoryStorage();
  const answers = collectQuizAnswers({
    preferences: { pace: 3, walkingKm: 2, budget: 'moderate', durationDays: 3 },
    selectedInterests: ['nature'],
    vibe: undefined,
  });
  assert.equal(hasPendingQuiz(storage), false);
  savePendingQuiz(buildPendingQuizPayload(answers), storage);
  const loaded = loadPendingQuiz(storage);
  assert.equal(hasPendingQuiz(storage), true);
  assert.equal(loaded.preferences.nature, 0.9);
  assert.equal(loaded.preferences.museums, 0.1);
  assert.equal(loaded.preferences.pace, 3);
  assert.equal(loaded.preferences.walkingKm, 2);
  assert.equal(loaded.preferences.durationDays, 3);
  assert.equal('vibe' in loaded.preferences, false);
  assert.equal(storage.getItem(PENDING_QUIZ_STORAGE_KEY)?.includes('"nature":0.9'), true);
  clearPendingQuiz(storage);
  assert.equal(loadPendingQuiz(storage), null);
  assert.equal(hasPendingQuiz(storage), false);
});

test('loadPendingQuiz returns null for empty and invalid storage', () => {
  const storage = memoryStorage();
  assert.equal(loadPendingQuiz(storage), null);
  storage.setItem(PENDING_QUIZ_STORAGE_KEY, '{');
  assert.equal(loadPendingQuiz(storage), null);
});

test('step index stays inside the six quiz steps', () => {
  assert.equal(clampStepIndex(-1), 0);
  assert.equal(clampStepIndex(0), 0);
  assert.equal(clampStepIndex(3), 3);
  assert.equal(clampStepIndex(5), 5);
  assert.equal(clampStepIndex(6), 5);
  assert.equal(clampStepIndex(99), 5);
  assert.equal(clampStepIndex(2.8), 2);
  assert.equal(clampStepIndex(Number.NaN), 0);
  assert.equal(clampStepIndex(undefined), 0);
  assert.equal(nextStepIndex(5), 5);
  assert.equal(previousStepIndex(0), 0);
  assert.equal(quizProgressPercent(0), (1 / TOTAL_STEPS) * 100);
  assert.equal(quizProgressPercent(5), 100);

  let step = 0;
  const forward = [step];
  while (step < TOTAL_STEPS - 1) {
    const next = nextStepIndex(step);
    assert.equal(next, step + 1);
    step = next;
    forward.push(step);
  }
  assert.deepEqual(forward, [0, 1, 2, 3, 4, 5]);
  assert.equal(nextStepIndex(step), TOTAL_STEPS - 1);

  while (step > 0) {
    const previous = previousStepIndex(step);
    assert.equal(previous, step - 1);
    step = previous;
  }
  assert.equal(previousStepIndex(step), 0);
});
