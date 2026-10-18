import { QuestionCard } from './QuestionCard.jsx';
import { RangeSlider } from './QuizControls.jsx';
import { PACE_BOUNDS } from './pending-quiz.js';

export function PaceStep(props) {
  return (
    <QuestionCard question={props.t('quiz.howPacked')} subtitle={props.t('quiz.stopsPerDay')}>
      <RangeSlider
        min={PACE_BOUNDS.min}
        max={PACE_BOUNDS.max}
        value={() => props.preferences().pace}
        onChange={(value) => props.onChange('pace', value)}
        valueSuffix={() => ` ${props.t('quiz.stopsPerDaySuffix')}`}
      />
    </QuestionCard>
  );
}
