import {
  createEffect,
  createSignal,
  For,
  isServer,
  onCleanup,
  onMount,
  Show,
} from 'grainlet';
import { useSession } from 'grainlet/auth';
import { createForm } from 'grainlet/forms';
import { useI18n } from 'grainlet/i18n';
import { useMutation, useQuery, useQueryClient } from 'grainlet/query';
import { ApiError, apiClient } from '../../api.js';
import { IMAGE_PATHS } from '../../api/paths/images.js';
import { USERS_PATHS } from '../../api/paths/users.js';
import { translateApp } from '../../i18n.js';
import {
  CURRENT_USER_QUERY_KEY,
  imageUploadFailureCopy,
  PROFILE_IMAGE_ACCEPT,
  PROFILE_IMAGE_AVATAR_SIZE,
  profileImageProblem,
  profileImageProblemKeys,
  profileUpdateBody,
  settingsFieldId,
} from './profile.js';
import { getSettingsSecurityCopy, resolveSettingsAuthProvider } from './security.js';
import {
  applyDocumentTheme,
  readStoredTheme,
  resolveAppliedTheme,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  THEME_SWITCHER_CLASS,
  themeOptionClass,
} from './theme.js';

const INPUT_CLASS =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-ring';
const EMAIL_INPUT_CLASS =
  'block w-full rounded-lg border border-border px-3 py-2 text-sm placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-ring bg-gray-200 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
const LABEL_CLASS = 'block text-sm font-medium text-text-secondary mb-1';
const CARD_CLASS = 'rounded-card border border-border bg-surface-elevated shadow-sm p-8';
const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center font-medium border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 disabled:pointer-events-none bg-accent hover:bg-accent-hover text-accent-foreground border-transparent shadow-sm px-4 py-2 text-sm mt-6 w-full rounded-xl';
const GHOST_BUTTON_CLASS =
  'inline-flex items-center justify-center font-medium border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 disabled:pointer-events-none bg-transparent hover:bg-surface-muted text-text-secondary border-transparent py-1.5 text-sm rounded-md px-4';

function noticeClass(kind) {
  if (kind === 'success') return 'mt-4 text-sm text-emerald-500';
  if (kind === 'warning') return 'mt-4 text-sm text-amber-600';
  return 'mt-4 text-sm text-danger';
}

function StatusNotice(props) {
  return (
    <Show when={props.notice()}>
      {(current) => (
        <div class={noticeClass(current.kind)}>
          <p>{current.title}</p>
          <Show when={current.description}>
            {(description) => <p class="mt-1 text-xs">{description}</p>}
          </Show>
        </div>
      )}
    </Show>
  );
}

function ThemeSection(props) {
  const t = props.t;
  const [theme, setTheme] = createSignal('light');

  function prefersDark() {
    if (isServer()) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(next, persist) {
    const resolved = resolveAppliedTheme(next, prefersDark());
    setTheme(next);
    if (isServer()) return;
    if (persist) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* private mode or blocked storage */
      }
    }
    applyDocumentTheme(document.documentElement, resolved);
  }

  onMount(() => {
    let stored = 'light';
    try {
      stored = readStoredTheme(window.localStorage);
    } catch {
      stored = 'light';
    }
    applyTheme(stored, false);
  });

  createEffect(() => {
    if (isServer() || theme() !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => {
      applyDocumentTheme(
        document.documentElement,
        resolveAppliedTheme('system', event.matches)
      );
    };
    media.addEventListener('change', onChange);
    onCleanup(() => media.removeEventListener('change', onChange));
  });

  return (
    <div class={CARD_CLASS}>
      <div class={THEME_SWITCHER_CLASS}>
        <For each={THEME_OPTIONS}>
          {(opt) => (
            <button
              type="button"
              class={themeOptionClass(theme() === opt.value)}
              aria-label={t('theme.switchTo', { name: t(opt.labelKey) })}
              onClick={() => applyTheme(opt.value, true)}
            >
              <span>{opt.icon}</span>
              <span>{t(opt.labelKey)}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  );
}

function SettingsContent(props) {
  const t = props.t;
  const session = props.session;
  const queryClient = useQueryClient();
  const [profileImageUrl, setProfileImageUrl] = createSignal('');
  const [profileNotice, setProfileNotice] = createSignal(null);
  const [photoNotice, setPhotoNotice] = createSignal(null);
  const [stable] = createSignal({ form: null, fileInput: null, updateProfile: null });
  const box = stable();
  let syncedProfile = null;

  const meQuery = useQuery(() => ({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: ({ signal }) => apiClient.get(USERS_PATHS.me, { signal }),
    enabled: session.status() === 'authenticated',
  }));

  if (!box.form) {
    box.form = createForm({
      initialValues: { name: '', username: '' },
      onSubmit: (values) => {
        setProfileNotice(null);
        return box.updateProfile.mutateAsync(profileUpdateBody(values));
      },
    });
  }
  const form = box.form;

  const updateProfile = useMutation({
    mutationFn: (body) => apiClient.patch(USERS_PATHS.me, body),
    onSuccess: (data) => {
      form.setValues(
        {
          name: data?.name ?? '',
          username: data?.username ?? '',
        },
        false
      );
      setProfileNotice({
        kind: 'success',
        title: t('settings.profileUpdateSuccess'),
        description: t('settings.profileUpdateSuccessDescription'),
      });
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
    onError: (error) => {
      const message = error && typeof error.message === 'string' ? error.message : '';
      setProfileNotice({
        kind: 'error',
        title: message || t('settings.profileUpdateFailed'),
        description: '',
      });
    },
  });
  box.updateProfile = updateProfile;

  const uploadPhoto = useMutation({
    mutationFn: (body) => apiClient.post(IMAGE_PATHS.profileUpload, body),
    onSuccess: (data) => {
      setProfileImageUrl(data?.profileImageUrl ?? '');
      setPhotoNotice({
        kind: 'success',
        title: t('settings.imageUploadSuccess'),
        description: t('settings.imageUploadSuccessDescription'),
      });
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
    onError: (error) => {
      const copy = imageUploadFailureCopy(error?.message, error instanceof ApiError);
      setPhotoNotice({
        kind: 'error',
        title: copy.title || t(copy.titleKey),
        description: copy.descriptionKey ? t(copy.descriptionKey) : '',
      });
    },
  });

  createEffect(() => {
    const me = meQuery.data();
    if (!me) return;
    const nextName = me.name ?? '';
    const nextUsername = me.username ?? '';
    const nextUrl = me.profileImageUrl ?? '';
    const signature = `${nextName}\n${nextUsername}\n${nextUrl}`;
    if (signature === syncedProfile) return;
    syncedProfile = signature;
    setProfileImageUrl(nextUrl);
    form.setValues({ name: nextName, username: nextUsername }, false);
  });

  function profileBusy() {
    return meQuery.isPending() || updateProfile.isPending() || !meQuery.data();
  }

  function securityCopy() {
    return getSettingsSecurityCopy(
      resolveSettingsAuthProvider(meQuery.data()?.provider, session.data()?.provider),
      t
    );
  }

  function handlePickImage() {
    box.fileInput?.click();
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const problem = profileImageProblem(file);
    const keys = profileImageProblemKeys(problem);
    if (keys) {
      setPhotoNotice({
        kind: 'warning',
        title: t(keys.title),
        description: t(keys.description),
      });
      event.target.value = '';
      return;
    }
    const body = new FormData();
    body.append('file', file);
    setPhotoNotice(null);
    uploadPhoto.mutate(body);
    event.target.value = '';
  }

  return (
    <div class="min-h-full bg-background py-8">
      <div class="mx-auto w-full px-4 max-w-none">
        <header class="mb-8 space-y-2">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-2">
              <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                {t('settings.title')}
              </h1>
              <p class="text-sm leading-normal text-text-muted">{t('settings.subtitle')}</p>
            </div>
          </div>
        </header>
        <div class="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2">
          <div class={CARD_CLASS}>
            <section>
              <div class="mt-6 rounded-2xl border border-gray-200 bg-gray-100 p-4 dark:border-gray-800 dark:bg-[#1A1A1A]">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3">
                    <Show
                      when={profileImageUrl()}
                      fallback={
                        <div
                          class="inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold dark:bg-indigo-900 dark:text-indigo-300 border border-gray-700"
                          style={{
                            width: `${PROFILE_IMAGE_AVATAR_SIZE}px`,
                            height: `${PROFILE_IMAGE_AVATAR_SIZE}px`,
                            fontSize: `${PROFILE_IMAGE_AVATAR_SIZE * 0.4}px`,
                          }}
                        >
                          ?
                        </div>
                      }
                    >
                      <img
                        src={profileImageUrl()}
                        alt={t('settings.photoLabel')}
                        width={PROFILE_IMAGE_AVATAR_SIZE}
                        height={PROFILE_IMAGE_AVATAR_SIZE}
                        class="rounded-full object-cover border border-gray-700"
                        style={{
                          width: `${PROFILE_IMAGE_AVATAR_SIZE}px`,
                          height: `${PROFILE_IMAGE_AVATAR_SIZE}px`,
                        }}
                      />
                    </Show>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {t('settings.photoLabel')}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{t('settings.photoHint')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class={GHOST_BUTTON_CLASS}
                    onClick={handlePickImage}
                    disabled={uploadPhoto.isPending() || meQuery.isPending()}
                  >
                    {uploadPhoto.isPending() ? t('settings.uploadingPhoto') : t('settings.uploadPhoto')}
                  </button>
                  <input
                    ref={(el) => {
                      box.fileInput = el;
                    }}
                    type="file"
                    accept={PROFILE_IMAGE_ACCEPT}
                    class="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
              <StatusNotice notice={photoNotice} />

              <Show when={meQuery.isError()}>
                <div class="mt-4">
                  <p class="text-sm text-danger">
                    {meQuery.error()?.message || t('errorBoundary.unexpectedError')}
                  </p>
                  <button type="button" class={GHOST_BUTTON_CLASS} onClick={() => meQuery.refetch()}>
                    {t('common.tryAgain')}
                  </button>
                </div>
              </Show>

              <form novalidate onSubmit={form.handleSubmit}>
                <div class="mt-6 space-y-4">
                  <div class="w-full">
                    <label for={settingsFieldId(t('settings.fullName'))} class={LABEL_CLASS}>{t('settings.fullName')}</label>
                    <input
                      id={settingsFieldId(t('settings.fullName'))}
                      name="name"
                      class={INPUT_CLASS}
                      value={form.values().name}
                      onInput={form.handleChange}
                      onBlur={form.handleBlur}
                      disabled={profileBusy()}
                    />
                  </div>
                  <div>
                    <div class="w-full">
                      <label for={settingsFieldId(t('settings.username'))} class={LABEL_CLASS}>{t('settings.username')}</label>
                      <input
                        id={settingsFieldId(t('settings.username'))}
                        name="username"
                        class={INPUT_CLASS}
                        value={form.values().username}
                        onInput={form.handleChange}
                        onBlur={form.handleBlur}
                        disabled={profileBusy()}
                      />
                    </div>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('settings.usernameHint')}</p>
                  </div>
                  <div>
                    <div class="flex items-end gap-3">
                      <div class="w-full">
                        <label for={settingsFieldId(t('settings.emailAddress'))} class={LABEL_CLASS}>{t('settings.emailAddress')}</label>
                        <input
                          id={settingsFieldId(t('settings.emailAddress'))}
                          class={EMAIL_INPUT_CLASS}
                          value={meQuery.data()?.email ?? ''}
                          readonly
                        />
                      </div>
                      <span class="mb-1 rounded-md border border-emerald-600/60 bg-emerald-600/10 px-3 py-2 text-xs font-medium text-emerald-500">
                        {t('settings.verified')}
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('settings.emailReadOnly')}</p>
                  </div>
                </div>
                <button type="submit" class={PRIMARY_BUTTON_CLASS} disabled={profileBusy()}>
                  {updateProfile.isPending() ? t('settings.savingChanges') : t('settings.saveChanges')}
                </button>
                <StatusNotice notice={profileNotice} />
              </form>
            </section>
          </div>

          <div class={CARD_CLASS}>
            <section>
              <div class="mt-6 rounded-2xl border border-gray-200 bg-gray-100 p-4 dark:border-gray-800 dark:bg-[#1A1A1A]">
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-lg font-semibold text-gray-900 dark:bg-gray-200">
                    {securityCopy().securityMethodBadge}
                  </div>
                  <div>
                    <p class="text-base font-semibold text-gray-900 dark:text-white">
                      {securityCopy().securityMethodTitle}
                    </p>
                    <p class="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {securityCopy().securityMethodDescription}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="lg:col-span-2">
            <ThemeSection t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const session = useSession();
  const i18n = useI18n();
  const t = (key, variables) => translateApp(i18n, key, variables);

  return (
    <Show
      when={session.status() !== 'loading'}
      fallback={
        <p class="min-h-full bg-background px-4 py-8 text-sm leading-normal text-text-muted">
          {t('auth.loading')}
        </p>
      }
    >
      <Show when={session.status() === 'authenticated'}>
        <SettingsContent t={t} session={session} />
      </Show>
    </Show>
  );
}
