import { createSignal, createMemo, untrack } from '../index.js';
import {
  getIn,
  setIn,
  deepEqual,
  deepClone,
  touchAll,
  hasErrors,
} from './utils/paths.js';
import {
  runAllValidations,
  runValidate,
  runValidationSchemaAt,
} from './utils/validate.js';
import { normalizeValidators, runRules, coerceValidationResult } from './validators.js';

function readConfig(config, key, fallback) {
  const v = config[key];
  return v === undefined ? fallback : v;
}

/**
 * Create a Formik-inspired form bag backed by grainlet signals.
 *
 * @param {object} config
 * @param {object} config.initialValues
 * @param {(values: object, helpers: object) => void|Promise<void>} [config.onSubmit]
 * @param {(values: object, helpers: object) => void} [config.onReset]
 * @param {(values: object) => object|Promise<object>} [config.validate]
 * @param {object|(() => object)} [config.validationSchema]
 * @param {Record<string, Function|Function[]>} [config.rules] built-in / custom validators per path
 * @param {boolean} [config.validateOnChange=true]
 * @param {boolean} [config.validateOnBlur=true]
 * @param {boolean} [config.validateOnMount=false]
 * @param {boolean} [config.enableReinitialize=false]
 * @param {object} [config.initialErrors]
 * @param {object} [config.initialTouched]
 * @param {any} [config.initialStatus]
 */
export function createForm(config = {}) {
  if (!config || config.initialValues == null) {
    throw new Error('createForm: initialValues is required');
  }

  let initialValues = deepClone(config.initialValues);
  let initialErrors = deepClone(config.initialErrors || {});
  let initialTouched = deepClone(config.initialTouched || {});
  let initialStatus = config.initialStatus;

  const [values, setValuesState] = createSignal(deepClone(initialValues));
  const [errors, setErrorsState] = createSignal(deepClone(initialErrors));
  const [touched, setTouchedState] = createSignal(deepClone(initialTouched));
  const [status, setStatus] = createSignal(initialStatus);
  const [isSubmitting, setSubmitting] = createSignal(false);
  const [isValidating, setValidating] = createSignal(false);
  const [submitCount, setSubmitCount] = createSignal(0);

  /** @type {Map<string, { validate?: Function }>} */
  const fieldRegistry = new Map();

  const dirty = createMemo(() => !deepEqual(values(), initialValues));
  const isValid = createMemo(() => !hasErrors(errors()));

  const opts = () => ({
    validateOnChange: readConfig(config, 'validateOnChange', true),
    validateOnBlur: readConfig(config, 'validateOnBlur', true),
    validateOnMount: readConfig(config, 'validateOnMount', false),
    enableReinitialize: readConfig(config, 'enableReinitialize', false),
    validate: config.validate,
    validationSchema: config.validationSchema,
    rules: config.rules,
    onSubmit: config.onSubmit,
    onReset: config.onReset,
  });

  const helpers = {
    setStatus,
    setErrors: setErrorsState,
    setSubmitting,
    setTouched: (next, shouldValidate) => setTouched(next, shouldValidate),
    setValues: (next, shouldValidate) => setValues(next, shouldValidate),
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    validateForm,
    validateField,
    submitForm,
  };

  function setValues(next, shouldValidate) {
    const resolved =
      typeof next === 'function' ? next(untrack(values)) : next;
    setValuesState(deepClone(resolved));
    const doValidate =
      shouldValidate === undefined ? opts().validateOnChange : shouldValidate;
    if (doValidate) {
      return validateForm(resolved);
    }
    return Promise.resolve(untrack(errors));
  }

  function setTouched(next, shouldValidate) {
    const resolved =
      typeof next === 'function' ? next(untrack(touched)) : next;
    setTouchedState(deepClone(resolved));
    const doValidate =
      shouldValidate === undefined ? opts().validateOnBlur : shouldValidate;
    if (doValidate) {
      return validateForm();
    }
    return Promise.resolve(untrack(errors));
  }

  function setFieldValue(field, value, shouldValidate) {
    const nextVal =
      typeof value === 'function'
        ? value(getIn(untrack(values), field))
        : value;
    setValuesState((prev) => setIn(prev, field, nextVal));
    const doValidate =
      shouldValidate === undefined ? opts().validateOnChange : shouldValidate;
    if (doValidate) {
      return validateForm();
    }
    return Promise.resolve(untrack(errors));
  }

  function setFieldError(field, errorMsg) {
    setErrorsState((prev) => setIn(prev, field, errorMsg));
  }

  function setFieldTouched(field, isTouched = true, shouldValidate) {
    setTouchedState((prev) => setIn(prev, field, isTouched));
    const doValidate =
      shouldValidate === undefined ? opts().validateOnBlur : shouldValidate;
    if (doValidate) {
      return validateField(field).then(() => untrack(errors));
    }
    return Promise.resolve(untrack(errors));
  }

  async function validateForm(vals) {
    const current = vals !== undefined ? vals : untrack(values);
    setValidating(true);
    try {
      const nextErrors = await runAllValidations({
        values: current,
        validate: opts().validate,
        validationSchema: opts().validationSchema,
        fieldRegistry,
        rules: opts().rules,
      });
      setErrorsState(nextErrors);
      return nextErrors;
    } finally {
      setValidating(false);
    }
  }

  async function validateField(field) {
    const current = untrack(values);
    const meta = fieldRegistry.get(field);
    let message;

    const fieldValidator = normalizeValidators(meta?.validate);
    if (fieldValidator) {
      let result = fieldValidator(getIn(current, field), current, {
        path: field,
      });
      if (result != null && typeof result.then === 'function') {
        result = await result;
      }
      message = coerceValidationResult(result);
    } else if (opts().rules && opts().rules[field] != null) {
      const ruleErrors = await runRules(
        { [field]: opts().rules[field] },
        current
      );
      message = coerceValidationResult(getIn(ruleErrors, field));
    } else if (opts().validationSchema) {
      message = await runValidationSchemaAt(
        opts().validationSchema,
        field,
        current
      );
    } else if (opts().validate) {
      const all = await runValidate(opts().validate, current);
      message = getIn(all, field);
    }

    setErrorsState((prev) => setIn(prev, field, message));
    return message;
  }

  function getEventValue(e) {
    if (e && e.persist) e.persist();
    const target = e?.target ?? e?.currentTarget;
    if (!target) return undefined;
    const { type, value, checked, options, multiple } = target;
    if (type === 'checkbox') {
      if (target.hasAttribute && target.hasAttribute('value')) {
        // checkbox group-style: store boolean for single, or leave to name path
        return checked;
      }
      return checked;
    }
    if (type === 'file') {
      return target.files;
    }
    if (multiple && options) {
      return Array.from(options)
        .filter((o) => o.selected)
        .map((o) => o.value);
    }
    return value;
  }

  function handleChange(e) {
    const target = e?.target ?? e?.currentTarget;
    if (!target) return;
    const field = target.name || target.id;
    if (!field) return;
    const next = getEventValue(e);
    setFieldValue(field, next);
  }

  function handleBlur(e) {
    const target = e?.target ?? e?.currentTarget;
    if (!target) return;
    const field = target.name || target.id;
    if (!field) return;
    setFieldTouched(field, true);
  }

  function resetForm(nextState) {
    if (nextState && typeof nextState === 'object') {
      if (nextState.values !== undefined) {
        initialValues = deepClone(nextState.values);
      }
      if (nextState.errors !== undefined) {
        initialErrors = deepClone(nextState.errors);
      }
      if (nextState.touched !== undefined) {
        initialTouched = deepClone(nextState.touched);
      }
      if ('status' in nextState) {
        initialStatus = nextState.status;
      }
      setValuesState(deepClone(nextState.values ?? initialValues));
      setErrorsState(deepClone(nextState.errors ?? initialErrors));
      setTouchedState(deepClone(nextState.touched ?? initialTouched));
      setStatus(
        'status' in nextState ? nextState.status : initialStatus
      );
      if (nextState.isSubmitting !== undefined) {
        setSubmitting(!!nextState.isSubmitting);
      } else {
        setSubmitting(false);
      }
      if (nextState.isValidating !== undefined) {
        setValidating(!!nextState.isValidating);
      } else {
        setValidating(false);
      }
      if (nextState.submitCount !== undefined) {
        setSubmitCount(Number(nextState.submitCount) || 0);
      } else {
        setSubmitCount(0);
      }
    } else {
      setValuesState(deepClone(initialValues));
      setErrorsState(deepClone(initialErrors));
      setTouchedState(deepClone(initialTouched));
      setStatus(initialStatus);
      setSubmitting(false);
      setValidating(false);
      setSubmitCount(0);
    }
  }

  function handleReset(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const current = untrack(values);
    if (typeof opts().onReset === 'function') {
      opts().onReset(current, helpers);
    }
    resetForm();
  }

  async function submitForm() {
    setTouchedState(touchAll(untrack(values), true));
    setSubmitting(true);
    setSubmitCount((c) => c + 1);

    const nextErrors = await validateForm();
    if (hasErrors(nextErrors)) {
      setSubmitting(false);
      return Promise.reject(nextErrors);
    }

    const onSubmit = opts().onSubmit;
    if (typeof onSubmit !== 'function') {
      setSubmitting(false);
      return;
    }

    try {
      const result = onSubmit(untrack(values), helpers);
      if (result != null && typeof result.then === 'function') {
        await result;
        setSubmitting(false);
      }
      // sync onSubmit: caller must setSubmitting(false)
    } catch (err) {
      setSubmitting(false);
      throw err;
    }
  }

  function handleSubmit(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation?.();
    }
    // Swallow validation rejection so native submit handlers don't surface
    // unhandledrejection; callers using submitForm() still get the Promise.
    return submitForm().catch((err) => err);
  }

  function registerField(name, fieldMeta = {}) {
    fieldRegistry.set(name, fieldMeta);
  }

  function unregisterField(name) {
    fieldRegistry.delete(name);
  }

  /** Re-bind config from FormProvider props (mutable config object). */
  function updateConfig(next) {
    Object.assign(config, next);
    if (opts().enableReinitialize && next.initialValues != null) {
      const nextInit = deepClone(
        typeof next.initialValues === 'function'
          ? next.initialValues()
          : next.initialValues
      );
      if (!deepEqual(nextInit, initialValues)) {
        initialValues = nextInit;
        if (next.initialErrors != null) {
          initialErrors = deepClone(next.initialErrors);
        }
        if (next.initialTouched != null) {
          initialTouched = deepClone(next.initialTouched);
        }
        if ('initialStatus' in next) {
          initialStatus = next.initialStatus;
        }
        resetForm({
          values: initialValues,
          errors: initialErrors,
          touched: initialTouched,
          status: initialStatus,
        });
      }
    }
  }

  if (opts().validateOnMount) {
    queueMicrotask(() => {
      validateForm();
    });
  }

  const bag = {
    values,
    errors,
    touched,
    status,
    isSubmitting,
    isValidating,
    submitCount,
    dirty,
    isValid,
    initialValues: () => initialValues,
    handleChange,
    handleBlur,
    handleSubmit,
    handleReset,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    setValues,
    setErrors: setErrorsState,
    setTouched,
    setStatus,
    setSubmitting,
    resetForm,
    validateForm,
    validateField,
    submitForm,
    registerField,
    unregisterField,
    updateConfig,
    getFieldHelpers: (name) => ({
      setValue: (v, shouldValidate) => setFieldValue(name, v, shouldValidate),
      setTouched: (t, shouldValidate) =>
        setFieldTouched(name, t, shouldValidate),
      setError: (msg) => setFieldError(name, msg),
    }),
    getFieldMeta: (name) => ({
      value: getIn(values(), name),
      error: getIn(errors(), name),
      touched: !!getIn(touched(), name),
      initialValue: getIn(initialValues, name),
      initialTouched: !!getIn(initialTouched, name),
      initialError: getIn(initialErrors, name),
    }),
    getFieldProps: (nameOrProps) => {
      const name =
        typeof nameOrProps === 'string' ? nameOrProps : nameOrProps.name;
      const type =
        typeof nameOrProps === 'object' ? nameOrProps.type : undefined;
      const value = getIn(values(), name);
      const props = {
        name,
        onInput: handleChange,
        onChange: handleChange,
        onBlur: handleBlur,
      };
      if (type === 'checkbox') {
        props.checked = !!value;
        props.type = 'checkbox';
      } else if (type === 'radio') {
        props.checked =
          value ===
          (typeof nameOrProps === 'object' ? nameOrProps.value : undefined);
        props.type = 'radio';
        if (typeof nameOrProps === 'object' && 'value' in nameOrProps) {
          props.value = nameOrProps.value;
        }
      } else {
        props.value = value ?? '';
      }
      return props;
    },
  };

  return bag;
}
