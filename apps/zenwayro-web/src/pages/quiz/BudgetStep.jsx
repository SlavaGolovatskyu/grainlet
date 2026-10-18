import { For } from 'grainlet';
import { QuestionCard } from './QuestionCard.jsx';
import { Tag } from './QuizControls.jsx';
import { BUDGET_OPTIONS } from './pending-quiz.js';

export function BudgetStep(props) {
  return (
    <QuestionCard question={props.t('quiz.budgetPreference')}>
      <div class="flex gap-3 justify-center">
        <For each={BUDGET_OPTIONS} keyed={(option) => option.value}>
          {(option) => (
            <Tag
              label={() => props.t(option.labelKey)}
              selected={() => props.preferences().budget === option.value}
              onClick={() => props.onChange('budget', option.value)}
            />
          )}
        </For>
      </div>
    </QuestionCard>
  );
}
