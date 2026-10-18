import { For } from 'grainlet';
import { QuestionCard } from './QuestionCard.jsx';
import { Tag } from './QuizControls.jsx';
import { DURATION_OPTIONS } from './pending-quiz.js';

export function DurationStep(props) {
  return (
    <QuestionCard question={props.t('quiz.howLong')}>
      <div class="flex flex-wrap gap-3 justify-center">
        <For each={DURATION_OPTIONS} keyed={(option) => option.value}>
          {(option) => (
            <Tag
              label={() => props.t(option.labelKey)}
              selected={() => props.preferences().durationDays === option.value}
              onClick={() => props.onChange('durationDays', option.value)}
            />
          )}
        </For>
      </div>
    </QuestionCard>
  );
}
