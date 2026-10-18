import { createEffect, createSignal, For, Show } from 'grainlet';
import { createForm } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { Link, navigate, useParams } from 'grainlet/route';
import { apiClient, ENTITY_REGISTRY_PATHS } from '../../api.js';
import {
  AdminShell,
  adminText,
  buttonClass,
  fieldClass,
  secondaryButtonClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import {
  buildEntityWritePayload,
  entityFieldControl,
  entityFormInitialValues,
  entityRecordHref,
  entityRecordsHref,
  errorText,
  isCreateRecord,
  readEntityError,
} from './admin-helpers.js';

export function AdminEntityEditPage() {
  const access = useAdminAccess('admin');
  const params = useParams();
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const entityKey = () => params().entityKey;
  const recordId = () => params().recordId;
  const creating = () => isCreateRecord(recordId());
  return (
    <AdminShell
      access={access}
      showBack
      title={creating() ? t('admin.newRecord', 'New record') : t('admin.editRecord', 'Edit record')}
      description={entityKey() || t('admin.missingEntity', 'Missing entity.')}
    >
      <Show when={entityKey()} fallback={<p class="text-sm text-red-600">{t('admin.missingEntity', 'Missing entity.')}</p>}>
        <EditBody entityKey={entityKey()} recordId={recordId()} creating={creating()} />
      </Show>
    </AdminShell>
  );
}

function EditBody(props) {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const schemaQuery = useQuery(() => ({
    queryKey: ['admin', 'entity-schema', props.entityKey],
    enabled: Boolean(props.entityKey),
    queryFn: ({ signal }) => apiClient.get(ENTITY_REGISTRY_PATHS.schema(props.entityKey), { signal }),
  }));
  const recordQuery = useQuery(() => ({
    queryKey: ['admin', 'entity-record', props.entityKey, props.recordId],
    enabled: Boolean(props.entityKey) && !props.creating && Boolean(props.recordId),
    queryFn: ({ signal }) => apiClient.get(ENTITY_REGISTRY_PATHS.record(props.entityKey, props.recordId), { signal }),
  }));
  const schema = () => schemaQuery.data()?.schema;
  const unavailable = () => props.creating && schema() && schema().capabilities?.create === false;
  const ready = () => Boolean(schema()) && !unavailable() && (props.creating || Boolean(recordQuery.data()?.record));
  return (
    <div class="space-y-4">
      <Link href={entityRecordsHref(props.entityKey)} class="text-sm text-indigo-600 hover:underline">
        {t('admin.backToRecords', 'Back to records')}
      </Link>
      <Show when={schemaQuery.isPending() || (!props.creating && recordQuery.isPending())}>
        <p class="text-sm text-gray-500">{t('admin.loading', 'Loading…')}</p>
      </Show>
      <Show when={schemaQuery.error() || recordQuery.error()}>
        {(err) => <p class="text-sm text-red-600">{errorText(err, t('admin.recordLoadError', 'Could not load this record.'))}</p>}
      </Show>
      <Show when={unavailable()}>
        <p class="text-sm text-gray-600">{t('admin.createUnavailable', 'This entity cannot be created here.')}</p>
      </Show>
      <Show when={!props.creating && !props.recordId && !schemaQuery.isPending()}>
        <p class="text-sm text-red-600">{t('admin.missingRecord', 'Missing record.')}</p>
      </Show>
      <Show when={ready()}>
        <RecordForm
          entityKey={props.entityKey}
          recordId={props.recordId}
          creating={props.creating}
          schema={schema()}
          values={props.creating ? null : recordQuery.data()?.record?.values}
        />
      </Show>
    </div>
  );
}

function RecordForm(props) {
  const i18n = useI18n();
  const client = useQueryClient();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [initialDraft, setInitialDraft] = createSignal(entityFormInitialValues(props.schema.fields, props.values));
  const [fieldErrors, setFieldErrors] = createSignal([]);
  const [formError, setFormError] = createSignal('');
  const [statusMessage, setStatusMessage] = createSignal(
    !props.creating && props.schema.capabilities?.update === false
      ? t('admin.updateUnavailable', 'Updates are not available for this entity.')
      : '',
  );
  const save = useMutation({
    mutationFn: ({ path, body, method }) =>
      method === 'post' ? apiClient.post(path, body) : apiClient.patch(path, body),
  });
  const remove = useMutation({
    mutationFn: () => apiClient.delete(ENTITY_REGISTRY_PATHS.record(props.entityKey, props.recordId)),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin', 'entity-records', props.entityKey] });
      navigate(entityRecordsHref(props.entityKey));
    },
    onError: (error) => setFormError(readEntityError(error, t('admin.deleteRecordError', 'Could not delete this record.')).message),
  });
  const form = createForm({
    initialValues: entityFormInitialValues(props.schema.fields, props.values),
    onSubmit: async (values) => {
      if (props.creating && !props.schema.capabilities?.create) return;
      if (!props.creating && !props.schema.capabilities?.update) return;
      const result = buildEntityWritePayload({
        fields: props.schema.fields,
        draft: values,
        initialDraft: initialDraft(),
        mode: props.creating ? 'create' : 'update',
      });
      if (result.status === 'unchanged') {
        setFieldErrors([]);
        setFormError(t('admin.unchanged', 'No changes to save.'));
        return;
      }
      if (result.status === 'invalid') {
        setFieldErrors(result.fieldErrors);
        setFormError(t('admin.invalidRecord', 'Fix the highlighted fields.'));
        return;
      }
      setFieldErrors([]);
      setFormError('');
      try {
        if (props.creating) {
          const response = await save.mutateAsync({
            method: 'post',
            path: ENTITY_REGISTRY_PATHS.records(props.entityKey),
            body: result.body,
          });
          client.invalidateQueries({ queryKey: ['admin', 'entity-records', props.entityKey] });
          const id = response?.record?.id;
          navigate(id ? entityRecordHref(props.entityKey, id) : entityRecordsHref(props.entityKey));
          return;
        }
        const response = await save.mutateAsync({
          method: 'patch',
          path: ENTITY_REGISTRY_PATHS.record(props.entityKey, props.recordId),
          body: result.body,
        });
        const next = entityFormInitialValues(props.schema.fields, response.record.values);
        setInitialDraft(next);
        form.setValues(next);
        setStatusMessage(t('admin.saved', 'Saved.'));
        client.invalidateQueries({ queryKey: ['admin', 'entity-record', props.entityKey, props.recordId] });
      } catch (error) {
        const parsed = readEntityError(error, t('admin.saveRecordError', 'Could not save this record.'));
        setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.message);
      }
    },
  });

  let loadedToken = '';
  createEffect(() => {
    const token = `${props.creating ? 'new' : props.recordId ?? ''}`;
    props.values;
    if (!token || loadedToken === token) return;
    loadedToken = token;
    const next = entityFormInitialValues(props.schema.fields, props.values);
    setInitialDraft(next);
    form.setValues(next);
  });

  function messageFor(name) {
    return fieldErrors().find((item) => item.field === name)?.message ?? '';
  }

  function onDelete() {
    if (!window.confirm(t('admin.deleteRecordConfirm', 'Delete this record?'))) return;
    remove.mutate();
  }

  const canSave = () => (props.creating ? props.schema.capabilities?.create === true : props.schema.capabilities?.update === true);

  return (
    <form class="space-y-4" novalidate onSubmit={form.handleSubmit}>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        {props.creating ? t('admin.newRecord', 'New record') : t('admin.editRecord', 'Edit record')}
        {props.schema.label ? `: ${props.schema.label}` : ''}
      </h2>
      <Show when={statusMessage()}>
        {(message) => <p class="text-sm text-gray-600">{message}</p>}
      </Show>
      <div class="space-y-4">
        <For each={props.schema.fields}>
          {(field) => (
            <FieldControl
              field={field}
              value={form.values()[field.name]}
              message={messageFor(field.name)}
              onInput={form.handleChange}
              onChange={form.handleChange}
            />
          )}
        </For>
      </div>
      <Show when={formError()}>
        {(message) => <p class="text-sm text-red-600">{message}</p>}
      </Show>
      <div class="flex flex-wrap gap-3">
        <Show when={canSave()}>
          <button type="submit" class={buttonClass} disabled={save.isPending()}>
            {save.isPending() ? t('admin.saving', 'Saving…') : t('admin.save', 'Save')}
          </button>
        </Show>
        <Show when={!props.creating && props.schema.capabilities?.delete}>
          <button type="button" class={secondaryButtonClass} disabled={remove.isPending() || save.isPending()} onClick={onDelete}>
            {t('admin.delete', 'Delete')}
          </button>
        </Show>
      </div>
    </form>
  );
}

function FieldControl(props) {
  const kind = () => entityFieldControl(props.field);
  const disabled = () => props.field.editable === false || kind() === 'readonly';
  return (
    <label class="block text-sm text-gray-700 dark:text-gray-300">
      <span>
        {props.field.label}
        <Show when={props.field.requiredOnCreate}>
          <span class="text-red-600"> *</span>
        </Show>
      </span>
      <Show when={kind() === 'checkbox'}>
        <input
          class="ml-2"
          name={props.field.name}
          type="checkbox"
          checked={props.value === true}
          disabled={disabled()}
          onChange={props.onChange}
        />
      </Show>
      <Show when={kind() === 'textarea' || kind() === 'readonly'}>
        <textarea class={`${fieldClass} min-h-24`} name={props.field.name} value={props.value ?? ''} disabled={disabled()} onInput={props.onInput} />
      </Show>
      <Show when={kind() === 'select'}>
        <select class={fieldClass} name={props.field.name} value={props.value ?? ''} disabled={disabled()} onChange={props.onChange}>
          <option value=""></option>
          <For each={props.field.enumValues ?? []}>{(option) => <option value={option}>{option}</option>}</For>
        </select>
      </Show>
      <Show when={kind() === 'input' || kind() === 'number' || kind() === 'date' || kind() === 'datetime'}>
        <input
          class={fieldClass}
          name={props.field.name}
          type={kind() === 'input' ? 'text' : kind() === 'datetime' ? 'datetime-local' : kind()}
          step={kind() === 'number' ? 'any' : kind() === 'datetime' ? '1' : undefined}
          value={props.value ?? ''}
          disabled={disabled()}
          onInput={props.onInput}
        />
      </Show>
      <Show when={props.message}>
        {(message) => <p class="mt-1 text-sm text-red-600">{message}</p>}
      </Show>
    </label>
  );
}
