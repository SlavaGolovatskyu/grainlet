import { Show } from 'grainlet';
import { useParams } from 'grainlet/route';
import { PlanEditor } from './PlanEditor.jsx';
import { PlanWizard } from './PlanWizard.jsx';

export function PlanPage() {
  const params = useParams();
  const id = () => params().id ?? '';

  return (
    <div class="zenwayro-v2-ui h-full min-h-0 bg-background" data-plan-ui="v2">
      <Show when={id() === 'new'} fallback={<PlanEditor tripId={id} />}>
        <PlanWizard />
      </Show>
    </div>
  );
}
