import { createSignal, Show, Switch, Match } from 'grainlet';
import { useSession } from 'grainlet/auth';
import { useI18n } from 'grainlet/i18n';
import { navigate } from 'grainlet/route';
import { apiClient } from '../../api/client.js';
import { QUIZ_PATHS } from '../../api/paths/quiz.js';
import { USERS_PATHS } from '../../api/paths/users.js';
import { translateApp } from '../../i18n.js';
import { queryClient } from '../../query.js';
import {
  ROUTE_AUTH_SIGNIN_QUIZ_PENDING,
  ROUTE_EXPLORE,
  ROUTE_HOME,
} from '../../routes.js';
import { BudgetStep } from './BudgetStep.jsx';
import { DurationStep } from './DurationStep.jsx';
import { InterestsStep } from './InterestsStep.jsx';
import { PaceStep } from './PaceStep.jsx';
import {
  GHOST_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
} from './QuizControls.jsx';
import { VibeStep } from './VibeStep.jsx';
import { WalkingStep } from './WalkingStep.jsx';
import {
  TOTAL_STEPS,
  buildPendingQuizPayload,
  collectQuizAnswers,
  defaultQuizPreferences,
  missingRequiredQuizAnswers,
  nextStepIndex,
  previousStepIndex,
  quizProgressPercent,
  savePendingQuiz,
} from './pending-quiz.js';

export function QuizPage() {
  const session = useSession();
  const i18n = useI18n();
  const t = (key) => translateApp(i18n, key);
  const [step, setStep] = createSignal(0);
  const [prefs, setPrefs] = createSignal(defaultQuizPreferences());
  const [selectedInterests, setSelectedInterests] = createSignal(new Set());
  const [selectedVibe, setSelectedVibe] = createSignal(undefined);
  const [submitting, setSubmitting] = createSignal(false);
  const [submitError, setSubmitError] = createSignal('');

  function toggleInterest(interest) {
    setSubmitError('');
    setSelectedInterests((current) => {
      const next = new Set(current);
      if (next.has(interest)) next.delete(interest);
      else next.add(interest);
      return next;
    });
  }

  function updatePref(key, value) {
    setSubmitError('');
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  function selectVibe(vibe) {
    setSubmitError('');
    setSelectedVibe(vibe);
  }

  function handleBack() {
    setSubmitError('');
    if (step() === 0) {
      navigate(ROUTE_HOME);
      return;
    }
    setStep((current) => previousStepIndex(current));
  }

  function handleNext() {
    setSubmitError('');
    setStep((current) => nextStepIndex(current));
  }

  async function handleSubmit() {
    if (submitting()) return;
    const preferences = collectQuizAnswers({
      preferences: prefs(),
      selectedInterests: selectedInterests(),
      vibe: selectedVibe(),
    });
    if (missingRequiredQuizAnswers(preferences).length > 0) {
      setSubmitError(t('quiz.submitToastError'));
      return;
    }
    if (session.status() === 'loading') return;
    setSubmitError('');
    if (session.status() !== 'authenticated') {
      savePendingQuiz(buildPendingQuizPayload(preferences));
      navigate(ROUTE_AUTH_SIGNIN_QUIZ_PENDING);
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(QUIZ_PATHS.complete, preferences);
      try {
        queryClient.invalidateQueries({ queryKey: [USERS_PATHS.me] });
      } catch (error) {
        console.error(error);
      }
      navigate(ROUTE_EXPLORE);
    } catch (error) {
      console.error(error);
      setSubmitError(t('quiz.submitToastError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main class="min-h-dvh bg-white dark:bg-gray-950">
      <div class="min-h-dvh flex flex-col">
        <div class="h-1 bg-gray-200 dark:bg-gray-800">
          <div
            class="h-full bg-indigo-600 transition-all duration-300"
            style={() => ({ width: `${quizProgressPercent(step())}%` })}
          />
        </div>

        <div class="flex-1 flex items-center justify-center p-6">
          <Switch>
            <Match when={() => step() === 0}>
              <InterestsStep
                t={t}
                selected={selectedInterests}
                onToggle={toggleInterest}
              />
            </Match>
            <Match when={() => step() === 1}>
              <VibeStep t={t} selected={selectedVibe} onSelect={selectVibe} />
            </Match>
            <Match when={() => step() === 2}>
              <PaceStep t={t} preferences={prefs} onChange={updatePref} />
            </Match>
            <Match when={() => step() === 3}>
              <WalkingStep t={t} preferences={prefs} onChange={updatePref} />
            </Match>
            <Match when={() => step() === 4}>
              <BudgetStep t={t} preferences={prefs} onChange={updatePref} />
            </Match>
            <Match when={() => step() === 5}>
              <DurationStep t={t} preferences={prefs} onChange={updatePref} />
            </Match>
          </Switch>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-800">
          <Show when={submitError}>
            {(message) => (
              <p class="px-6 pt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {message}
              </p>
            )}
          </Show>
          <div class="flex items-center justify-between px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <button type="button" class={GHOST_BUTTON_CLASS} onClick={handleBack}>
              {t('common.back')}
            </button>
            <span class="text-sm text-gray-500">
              {() => `${step() + 1} / ${TOTAL_STEPS}`}
            </span>
            <Show
              when={() => step() < TOTAL_STEPS - 1}
              fallback={
                <button
                  type="button"
                  class={PRIMARY_BUTTON_CLASS}
                  disabled={() => submitting() || session.status() === 'loading'}
                  onClick={handleSubmit}
                >
                  {() => (submitting() ? t('quiz.saving') : t('quiz.savePreferences'))}
                </button>
              }
            >
              <button type="button" class={PRIMARY_BUTTON_CLASS} onClick={handleNext}>
                {t('common.next')}
              </button>
            </Show>
          </div>
        </div>
      </div>
    </main>
  );
}
