import { getIn, setIn, mergeErrors } from './paths.js';
import { normalizeValidators, runRules, coerceValidationResult } from '../validators.js';

/**
 * Normalize validate() result to a Promise of errors object.
 * @param {((values: any) => any)|undefined} validate
 * @param {any} values
 * @returns {Promise<Record<string, any>>}
 */
export async function runValidate(validate, values) {
  if (typeof validate !== 'function') return {};
  const result = validate(values);
  const errors =
    result != null && typeof result.then === 'function'
      ? await result
      : result;
  return errors && typeof errors === 'object' ? errors : {};
}

/**
 * Map Yup ValidationError → nested errors object.
 * @param {import('yup').ValidationError} err
 */
export function yupToErrors(err) {
  if (!err) return {};
  let errors = {};
  if (err.inner && err.inner.length) {
    for (const e of err.inner) {
      if (!e.path) continue;
      if (getIn(errors, e.path) === undefined) {
        errors = setIn(errors, e.path, e.message);
      }
    }
  } else if (err.path) {
    errors = setIn(errors, err.path, err.message);
  } else if (err.message) {
    errors = { ...errors, _error: err.message };
  }
  return errors;
}

/**
 * Run Yup schema.validate (abortEarly: false).
 * @param {any} schema
 * @param {any} values
 * @returns {Promise<Record<string, any>>}
 */
export async function runValidationSchema(schema, values) {
  if (!schema) return {};
  const resolved = typeof schema === 'function' ? schema() : schema;
  if (!resolved || typeof resolved.validate !== 'function') return {};
  try {
    await resolved.validate(values, { abortEarly: false });
    return {};
  } catch (err) {
    if (err && err.name === 'ValidationError') {
      return yupToErrors(err);
    }
    throw err;
  }
}

/**
 * Validate a single path via schema.validateAt when available.
 * @param {any} schema
 * @param {string} field
 * @param {any} values
 */
export async function runValidationSchemaAt(schema, field, values) {
  if (!schema) return undefined;
  const resolved = typeof schema === 'function' ? schema() : schema;
  if (!resolved) return undefined;
  if (typeof resolved.validateAt === 'function') {
    try {
      await resolved.validateAt(field, values);
      return undefined;
    } catch (err) {
      if (err && err.name === 'ValidationError') {
        return err.message;
      }
      throw err;
    }
  }
  const all = await runValidationSchema(resolved, values);
  return getIn(all, field);
}

/**
 * Run all registered field validators (supports composed arrays via normalize).
 * @param {Map<string, { validate?: Function|Function[] }>} fieldRegistry
 * @param {any} values
 */
export async function runFieldValidators(fieldRegistry, values) {
  let errors = {};
  const entries = [...fieldRegistry.entries()];
  await Promise.all(
    entries.map(async ([name, meta]) => {
      const validator = normalizeValidators(meta.validate);
      if (!validator) return;
      const value = getIn(values, name);
      let result = validator(value, values, { path: name });
      if (result != null && typeof result.then === 'function') {
        result = await result;
      }
      if (result != null && result !== '') {
        errors = setIn(errors, name, coerceValidationResult(result));
      }
    })
  );
  return errors;
}

/**
 * Full form validation merge.
 */
export async function runAllValidations({
  values,
  validate,
  validationSchema,
  fieldRegistry,
  rules,
}) {
  const [fieldErrors, formErrors, schemaErrors, ruleErrors] =
    await Promise.all([
      runFieldValidators(fieldRegistry, values),
      runValidate(validate, values),
      runValidationSchema(validationSchema, values),
      runRules(rules, values),
    ]);
  return mergeErrors(fieldErrors, ruleErrors, formErrors, schemaErrors);
}

export { mergeErrors };
