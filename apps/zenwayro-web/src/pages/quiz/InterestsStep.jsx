import { For } from 'grainlet';
import { QuestionCard } from './QuestionCard.jsx';
import { Tag } from './QuizControls.jsx';
import { INTERESTS, INTEREST_KEYS } from './pending-quiz.js';

export function InterestsStep(props) {
  return (
    <QuestionCard
      question={props.t('quiz.whatDrawsYou')}
      subtitle={props.t('quiz.selectAllThatApply')}
    >
      <div class="flex flex-wrap gap-2 justify-center">
        <For each={INTERESTS}>
          {(interest) => (
            <Tag
              label={() => props.t(INTEREST_KEYS[interest])}
              selected={() => props.selected().has(interest)}
              onClick={() => props.onToggle(interest)}
            />
          )}
        </For>
      </div>
    </QuestionCard>
  );
}
