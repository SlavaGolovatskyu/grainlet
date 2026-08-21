import type { JSX } from '../jsx-runtime.js';

export type MessageInput = string | (() => string);

/** Field / rules validator — return message or undefined. */
export type Validator = (
  value: any,
  values?: any,
  meta?: { path: string }
) => string | undefined | Promise<string | undefined>;

export type FormErrors<Values = any> = {
  [K in keyof Values]?: Values[K] extends any[]
    ? Values[K][number] extends object
      ? FormErrors<Values[K][number]>[] | string | string[]
      : string | string[]
    : Values[K] extends object
      ? FormErrors<Values[K]>
      : string;
};

export type FormTouched<Values = any> = {
  [K in keyof Values]?: Values[K] extends any[]
    ? Values[K][number] extends object
      ? FormTouched<Values[K][number]>[] | boolean
      : boolean
    : Values[K] extends object
      ? FormTouched<Values[K]>
      : boolean;
};

export interface FormHelpers<Values = any> {
  setStatus: (status?: any) => void;
  setErrors: (errors: FormErrors<Values>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setTouched: (
    touched: FormTouched<Values>,
    shouldValidate?: boolean
  ) => Promise<FormErrors<Values>>;
  setValues: (
    values: Values | ((prev: Values) => Values),
    shouldValidate?: boolean
  ) => Promise<FormErrors<Values>>;
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean
  ) => Promise<FormErrors<Values>>;
  setFieldError: (field: string, message: string | undefined) => void;
  setFieldTouched: (
    field: string,
    isTouched?: boolean,
    shouldValidate?: boolean
  ) => Promise<FormErrors<Values>>;
  resetForm: (nextState?: Partial<FormState<Values>>) => void;
  validateForm: (values?: Values) => Promise<FormErrors<Values>>;
  validateField: (field: string) => Promise<any>;
  submitForm: () => Promise<void>;
}

export interface FormState<Values = any> {
  values: Values;
  errors: FormErrors<Values>;
  touched: FormTouched<Values>;
  isSubmitting: boolean;
  isValidating: boolean;
  status?: any;
  submitCount: number;
}

export interface FormConfig<Values = any> {
  initialValues: Values;
  initialErrors?: FormErrors<Values>;
  initialTouched?: FormTouched<Values>;
  initialStatus?: any;
  onSubmit?: (
    values: Values,
    helpers: FormHelpers<Values>
  ) => void | Promise<any>;
  onReset?: (values: Values, helpers: FormHelpers<Values>) => void;
  validate?: (
    values: Values
  ) => FormErrors<Values> | Promise<FormErrors<Values>>;
  validationSchema?: any | (() => any);
  /** Per-path built-in / custom validators: `{ email: [required(), isEmail()] }` */
  rules?: Record<string, Validator | Validator[]>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
  enableReinitialize?: boolean;
}

export interface FormBag<Values = any> extends FormHelpers<Values> {
  values: () => Values;
  errors: () => FormErrors<Values>;
  touched: () => FormTouched<Values>;
  status: () => any;
  isSubmitting: () => boolean;
  isValidating: () => boolean;
  submitCount: () => number;
  dirty: () => boolean;
  isValid: () => boolean;
  initialValues: () => Values;
  handleChange: (e: any) => void;
  handleBlur: (e: any) => void;
  handleSubmit: (e?: any) => Promise<void>;
  handleReset: (e?: any) => void;
  registerField: (name: string, meta?: { validate?: Function }) => void;
  unregisterField: (name: string) => void;
  updateConfig: (next: Partial<FormConfig<Values>>) => void;
  getFieldHelpers: (name: string) => FieldHelperProps;
  getFieldMeta: (name: string) => FieldMetaProps;
  getFieldProps: (nameOrProps: string | Record<string, any>) => FieldInputProps;
}

export interface FieldInputProps {
  name: string;
  value?: any;
  checked?: boolean;
  onInput: (e: any) => void;
  onChange: (e: any) => void;
  onBlur: (e: any) => void;
  type?: string;
}

export interface FieldMetaProps {
  value: any;
  error?: any;
  touched: boolean;
  initialValue?: any;
  initialTouched?: boolean;
  initialError?: any;
}

export interface FieldHelperProps {
  setValue: (value: any, shouldValidate?: boolean) => Promise<any>;
  setTouched: (isTouched?: boolean, shouldValidate?: boolean) => Promise<any>;
  setError: (message: string | undefined) => void;
}

export interface FieldArrayHelpers<Values = any> {
  name: string;
  form: FormBag<Values>;
  push: (value: any) => void;
  unshift: (value: any) => void;
  pop: () => any;
  remove: (index: number) => any;
  insert: (index: number, value: any) => void;
  swap: (indexA: number, indexB: number) => void;
  move: (from: number, to: number) => void;
  replace: (index: number, value: any) => void;
}

export interface FormProviderProps<Values = any> extends FormConfig<Values> {
  children?: JSX.Element | ((form: FormBag<Values>) => JSX.Element);
}

export interface FieldProps {
  name: string;
  type?: string;
  validate?: Validator | Validator[];
  as?: any;
  component?: any;
  value?: any;
  children?: any;
  [key: string]: any;
}

export interface ErrorMessageProps {
  name: string;
  component?: any;
  as?: any;
  children?: ((message: string) => any) | any;
}

export interface FieldArrayProps {
  name: string;
  children?: ((helpers: FieldArrayHelpers) => any) | any;
}

export declare function createForm<Values = any>(
  config: FormConfig<Values>
): FormBag<Values>;

export declare function FormProvider<Values = any>(
  props: FormProviderProps<Values>
): any;

export declare function Form(props: Record<string, any>): any;

export declare function Field(props: FieldProps): any;

export declare function ErrorMessage(props: ErrorMessageProps): any;

export declare function FieldArray(props: FieldArrayProps): any;

export declare function useFormContext<Values = any>(): FormBag<Values>;

export declare function useField(
  nameOrProps: string | FieldProps
): [FieldInputProps, FieldMetaProps, FieldHelperProps];

export declare const FormContext: any;

export declare function getIn(obj: any, path: string | Array<string | number>, fallback?: any): any;

export declare function setIn(obj: any, path: string | Array<string | number>, value: any): any;

export declare function rules(
  map: Record<string, Validator | Validator[]>
): (values: any) => Promise<Record<string, any>>;

export declare function runRules(
  map: Record<string, Validator | Validator[]> | undefined,
  values: any
): Promise<Record<string, any>>;

export declare function compose(...validators: Validator[]): Validator;
export declare const all: typeof compose;
export declare function normalizeValidators(
  validate: Validator | Validator[] | undefined
): Validator | undefined;
export declare function isEmptyValue(value: any): boolean;

export declare function required(message?: MessageInput): Validator;
export declare const isNotEmpty: typeof required;
export declare function isEmpty(message?: MessageInput): Validator;
export declare function isEmail(message?: MessageInput): Validator;
export declare const email: typeof isEmail;
export declare function isNumber(message?: MessageInput): Validator;
export declare const number: typeof isNumber;
export declare function isInteger(message?: MessageInput): Validator;
export declare const integer: typeof isInteger;
export declare function minLength(min: number, message?: MessageInput): Validator;
export declare function maxLength(max: number, message?: MessageInput): Validator;
export declare function min(minVal: number, message?: MessageInput): Validator;
export declare function max(maxVal: number, message?: MessageInput): Validator;
export declare function matches(regex: RegExp | string, message?: MessageInput): Validator;
export declare const pattern: typeof matches;
export declare function isUrl(message?: MessageInput): Validator;
export declare const url: typeof isUrl;
export declare function oneOf(list: any[], message?: MessageInput): Validator;
export declare function notOneOf(list: any[], message?: MessageInput): Validator;
export declare function equalsField(otherPath: string, message?: MessageInput): Validator;
export declare function test(
  predicate: (
    value: any,
    values?: any,
    meta?: { path: string }
  ) => boolean | Promise<boolean>,
  message?: MessageInput
): Validator;
