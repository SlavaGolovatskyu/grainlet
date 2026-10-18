import { QuestionCard } from './QuestionCard.jsx';
import { RangeSlider } from './QuizControls.jsx';
import { WALKING_BOUNDS } from './pending-quiz.js';

export function WalkingStep(props) {
  return (
    <QuestionCard
      question={props.t('quiz.walkingTolerance')}
      subtitle={props.t('quiz.walkingToleranceSubtitle')}
    >
      <RangeSlider
        min={WALKING_BOUNDS.min}
        max={WALKING_BOUNDS.max}
        value={() => props.preferences().walkingKm}
        onChange={(value) => props.onChange('walkingKm', value)}
        valueSuffix={() => ` ${props.t('quiz.kmSuffix')}`}
      />
    </QuestionCard>
  );
}
