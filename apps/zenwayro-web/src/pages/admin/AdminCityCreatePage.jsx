import { createSignal, Show } from 'grainlet';
import { createForm, getIn, required } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { useMutation } from 'grainlet/query';
import { ADMIN_PATHS, apiClient } from '../../api.js';
import {
  AdminShell,
  adminText,
  buttonClass,
  fieldClass,
  panelClass,
  useAdminAccess,
} from './AdminChrome.jsx';
import { buildCreateCityBody, DEFAULT_CITY_FORM, errorText } from './admin-helpers.js';

export function AdminCityCreatePage() {
  const access = useAdminAccess('admin');
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  return (
    <AdminShell
      access={access}
      showBack
      title={t('admin.nav.createCity', 'Create City')}
      description={t('admin.cityIntro', 'Add a city to the database and queue POI ingestion.')}
    >
      <CityForm />
    </AdminShell>
  );
}

function readFieldError(error) {
  if (error == null || error === '') return '';
  if (typeof error === 'function') {
    const message = error();
    return message == null ? '' : String(message);
  }
  return String(error);
}

function CityForm() {
  const i18n = useI18n();
  const t = (key, fallback) => adminText(i18n, key, fallback);
  const [message, setMessage] = createSignal('');
  const [messageError, setMessageError] = createSignal(false);
  const createCity = useMutation({
    mutationFn: (body) => apiClient.post(ADMIN_PATHS.createCity, body),
  });
  const form = createForm({
    initialValues: { ...DEFAULT_CITY_FORM },
    rules: {
      name: [required(() => t('admin.cityNameRequired', 'Name and country are required.'))],
      country: [required(() => t('admin.cityNameRequired', 'Name and country are required.'))],
      centerLat: [required(() => t('admin.latRequired', 'Latitude must be between -90 and 90.'))],
      centerLng: [required(() => t('admin.lngRequired', 'Longitude must be between -180 and 180.'))],
    },
    onSubmit: async (values) => {
      const result = buildCreateCityBody(values);
      if (result.error) {
        setMessageError(true);
        setMessage(result.error);
        return;
      }
      try {
        const data = await createCity.mutateAsync(result.body);
        form.resetForm();
        setMessageError(false);
        setMessage(data?.message || t('admin.cityCreated', 'City added. POI ingestion queued and will run within the next minute.'));
      } catch (error) {
        setMessageError(true);
        setMessage(errorText(error, t('admin.cityCreateFailed', 'Failed to create city')));
      }
    },
  });

  function fieldMessage(name) {
    if (!getIn(form.touched(), name)) return '';
    return readFieldError(getIn(form.errors(), name));
  }

  return (
    <form class={`${panelClass} space-y-4`} novalidate onSubmit={form.handleSubmit}>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField name="name" label={t('admin.cityName', 'City Name')} value={form.values().name} onInput={form.handleChange} onBlur={form.handleBlur} message={fieldMessage('name')} required />
        <TextField name="country" label={t('admin.country', 'Country')} value={form.values().country} onInput={form.handleChange} onBlur={form.handleBlur} message={fieldMessage('country')} required />
        <TextField name="centerLat" type="number" label={t('admin.centerLat', 'Center Latitude')} value={form.values().centerLat} onInput={form.handleChange} onBlur={form.handleBlur} message={fieldMessage('centerLat')} required />
        <TextField name="centerLng" type="number" label={t('admin.centerLng', 'Center Longitude')} value={form.values().centerLng} onInput={form.handleChange} onBlur={form.handleBlur} message={fieldMessage('centerLng')} required />
        <TextField name="radiusKm" type="number" label={t('admin.radiusKm', 'Radius (km)')} value={form.values().radiusKm} onInput={form.handleChange} onBlur={form.handleBlur} message="" />
        <label class="flex items-center gap-2 pt-6 text-sm text-gray-700 dark:text-gray-300">
          <input name="hasTiles" type="checkbox" checked={form.values().hasTiles} onChange={form.handleChange} />
          {t('admin.hasTiles', 'Has Valhalla tiles')}
        </label>
      </div>
      <Show when={message()}>
        {(text) => (
          <p class={messageError() ? 'text-sm text-red-600' : 'text-sm text-indigo-700 dark:text-indigo-300'}>{text}</p>
        )}
      </Show>
      <button type="submit" class={buttonClass} disabled={form.isSubmitting() || createCity.isPending()}>
        {createCity.isPending() ? t('admin.creating', 'Creating...') : t('admin.createCity', 'Create City')}
      </button>
    </form>
  );
}

function TextField(props) {
  return (
    <label class="block text-sm text-gray-700 dark:text-gray-300">
      {props.label}
      <input
        class={fieldClass}
        name={props.name}
        type={props.type || 'text'}
        step={props.type === 'number' ? 'any' : undefined}
        required={props.required}
        value={props.value}
        onInput={props.onInput}
        onBlur={props.onBlur}
      />
      <Show when={props.message}>
        {(message) => <p class="mt-1 text-sm text-red-600">{message}</p>}
      </Show>
    </label>
  );
}
