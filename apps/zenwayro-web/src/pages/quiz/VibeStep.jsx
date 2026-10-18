import { For } from 'grainlet';
import { QuestionCard } from './QuestionCard.jsx';
import { ImageOption } from './QuizControls.jsx';
import { VIBES } from './pending-quiz.js';

export function VibeStep(props) {
  return (
    <QuestionCard question={props.t('quiz.pickTheVibe')}>
      <div class="grid grid-cols-2 gap-4">
        <For each={VIBES}>
          {(vibe) => (
            <ImageOption
              src={vibe.src}
              label={() => props.t(vibe.labelKey)}
              selected={() => props.selected() === vibe.id}
              onClick={() => props.onSelect(vibe.id)}
            />
          )}
        </For>
      </div>
    </QuestionCard>
  );
}
