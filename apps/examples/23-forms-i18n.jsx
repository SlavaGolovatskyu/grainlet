import { createSignal, render } from 'grainlet';
import {
  FormProvider,
  Form,
  Field,
  ErrorMessage,
  required,
  isEmail,
  minLength,
} from 'grainlet/forms';

const MESSAGES = {
  en: {
    title: 'Translated validation messages',
    lead:
      'Validators accept () => t(key) so switching locale updates the next error without remounting rules.',
    email: 'Email',
    password: 'Password',
    submit: 'Continue',
    'validation.required': 'Required',
    'validation.email': 'Enter a valid email',
    'validation.minLength': 'Use at least {count} characters',
    switchHint: 'Switch language — validation messages update immediately.',
  },
  uk: {
    title: 'Перекладені повідомлення валідації',
    lead:
      'Валідатори приймають () => t(key), тож зміна мови оновлює текст помилки без пересоздання rules.',
    email: 'Ел. пошта',
    password: 'Пароль',
    submit: 'Далі',
    'validation.required': 'Обовʼязково',
    'validation.email': 'Введіть коректний email',
    'validation.minLength': 'Щонайменше {count} символів',
    switchHint:
      'Змініть мову — повідомлення валідації оновляться одразу.',
  },
};

function createT(locale) {
  return (key, vars = {}) => {
    const dict = MESSAGES[locale()] || MESSAGES.en;
    let text = dict[key] ?? MESSAGES.en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
    return text;
  };
}

/**
 * grainlet/forms — lazy i18n messages on built-in validators
 */
function I18nFormsDemo() {
  const [locale, setLocale] = createSignal('en');
  const t = createT(locale);

  const rules = {
    email: [
      required(() => t('validation.required')),
      isEmail(() => t('validation.email')),
    ],
    password: [
      required(() => t('validation.required')),
      minLength(8, () => t('validation.minLength', { count: 8 })),
    ],
  };

  return (
    <div class="demo">
      <h1>{() => t('title')}</h1>
      <p class="lead">{() => t('lead')}</p>

      <div class="locale">
        <button
          type="button"
          class={() => (locale() === 'en' ? 'active' : '')}
          onClick={() => setLocale('en')}
        >
          English
        </button>
        <button
          type="button"
          class={() => (locale() === 'uk' ? 'active' : '')}
          onClick={() => setLocale('uk')}
        >
          Українська
        </button>
      </div>

      <FormProvider
        initialValues={{ email: '', password: '' }}
        rules={rules}
        onSubmit={async (values) => {
          console.log('i18n form', values, 'locale', locale());
          alert(`${t('submit')}: ${values.email}`);
        }}
      >
        {(form) => (
          <Form>
            <label>
              {() => t('email')}
              <Field name="email" type="email" />
            </label>
            <ErrorMessage name="email">
              {(msg) => <p class="error">{msg}</p>}
            </ErrorMessage>

            <label>
              {() => t('password')}
              <Field name="password" type="password" />
            </label>
            <ErrorMessage name="password">
              {(msg) => <p class="error">{msg}</p>}
            </ErrorMessage>

            <button
              type="submit"
              class="submit"
              disabled={form.isSubmitting()}
            >
              {() => t('submit')}
            </button>

            <p class="hint">{() => t('switchHint')}</p>
          </Form>
        )}
      </FormProvider>
    </div>
  );
}

render(I18nFormsDemo, document.getElementById('app'));
