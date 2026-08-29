import {
  required,
  isEmail,
  isNumber,
  isEmpty,
  minLength,
  min,
  notOneOf,
  equalsField,
  compose,
  rules,
  isEmptyValue,
} from '../forms/validators.js';
import { createForm } from '../forms/createForm.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

{
  assert(isEmptyValue('') && isEmptyValue(null) && isEmptyValue([]), 'empty');
  assert(!isEmptyValue('a') && !isEmptyValue(0), 'not empty');
}

{
  assert((await required()('')) === 'Required', 'required empty');
  assert((await required()('x')) === undefined, 'required ok');
  assert((await isEmail()('nope')) === 'Invalid email', 'email bad');
  assert((await isEmail()('a@b.co')) === undefined, 'email ok');
  assert((await isEmail()('')) === undefined, 'email empty passes');
  assert((await isNumber()('12.5')) === undefined, 'number ok');
  assert((await isNumber()('x')) === 'Must be a number', 'number bad');
  assert((await isEmpty()('')) === undefined, 'isEmpty ok');
  assert((await isEmpty()('x')) === 'Must be empty', 'isEmpty fail');
  assert((await minLength(3)('ab')) === 'Must be at least 3 characters', 'minLength');
  assert((await min(18)(17)) === 'Must be at least 18', 'min');
  assert(
    (await notOneOf(['admin'])('admin')) === 'Invalid value',
    'notOneOf'
  );
}

{
  const v = compose(required(), isEmail());
  assert((await v('')) === 'Required', 'compose first');
  assert((await v('bad')) === 'Invalid email', 'compose second');
  assert((await v('ok@x.com')) === undefined, 'compose ok');
}

{
  const validate = rules({
    email: [required(), isEmail()],
    username: [required(), notOneOf(['admin', 'root'], 'Nice try')],
    age: [required(), isNumber(), min(18)],
  });
  const errors = await validate({
    email: 'bad',
    username: 'admin',
    age: '10',
  });
  assert(errors.email === 'Invalid email', 'rules email');
  assert(errors.username === 'Nice try', 'rules username');
  assert(errors.age === 'Must be at least 18', 'rules age');
}

{
  const form = createForm({
    initialValues: {
      email: '',
      password: '',
      confirm: '',
    },
    rules: {
      email: [required(), isEmail()],
      password: [required(), minLength(8)],
      confirm: [required(), equalsField('password', 'Must match')],
    },
    validateOnChange: false,
  });
  let errs = await form.validateForm();
  assert(errs.email === 'Required', 'form rules required');
  form.setFieldValue('email', 'a@b.co', false);
  form.setFieldValue('password', 'password1', false);
  form.setFieldValue('confirm', 'password1', false);
  errs = await form.validateForm();
  assert(Object.keys(errs).length === 0, 'form rules pass');
}

{
  const lazy = () => 'Lazily required';
  const stored = await required(lazy)('');
  assert(typeof stored === 'function', 'lazy msg stored as getter');
  assert(stored() === 'Lazily required', 'lazy msg resolves on read');

  let locale = 'en';
  const t = (key) => (locale === 'uk' ? 'Обовʼязково' : 'Required');
  const msgFn = await required(() => t('validation.required'))('');
  assert(typeof msgFn === 'function', 'lazy locale getter');
  assert(msgFn() === 'Required', 'lazy en');
  locale = 'uk';
  assert(msgFn() === 'Обовʼязково', 'lazy uk without re-validate');
}

{
  const { formatError, coerceValidationResult } = await import('../forms/validators.js');
  const inner = required('Name is required');
  assert(
    formatError(inner) === 'Name is required',
    'formatError resolves validator fn'
  );
  assert(
    coerceValidationResult(inner) === 'Name is required',
    'coerceValidationResult resolves validator fn'
  );
}

console.log('forms-validators: PASS');
