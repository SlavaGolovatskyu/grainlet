import { For, render } from 'grainlet';
import {
  FormProvider,
  Form,
  Field,
  FieldArray,
  ErrorMessage,
  required,
  minLength,
} from 'grainlet/forms';

/**
 * grainlet/forms — FieldArray push / remove
 */
function FriendsDemo() {
  return (
    <div class="demo">
      <h1>grainlet/forms — FieldArray</h1>
      <p class="lead">
        Dynamic list fields with <code>FieldArray</code> helpers (
        <code>push</code>, <code>remove</code>) and per-row{' '}
        <code>validate</code>.
      </p>

      <FormProvider
        initialValues={{ title: '', friends: [{ name: '' }] }}
        rules={{
          title: [required('Title is required'), minLength(2)],
        }}
        onSubmit={async (values, { setStatus }) => {
          await new Promise((r) => setTimeout(r, 250));
          console.log('friends form', values);
          setStatus({ ok: true, count: values.friends.length });
        }}
      >
        {(form) => (
          <Form>
            <label>
              Trip title
              <Field name="title" type="text" placeholder="Weekend in Lisbon" />
            </label>
            <ErrorMessage name="title">
              {(msg) => <p class="error">{msg}</p>}
            </ErrorMessage>

            <h2 style="font-size:1rem;margin:20px 0 10px">Friends</h2>

            <FieldArray name="friends">
              {(helpers) => (
                <div>
                  <For each={() => helpers.form.values().friends}>
                    {(_friend, index) => {
                      const i =
                        typeof index === 'function' ? index : () => index;
                      const namePath = () => `friends[${i()}].name`;
                      return (
                        <div class="friend">
                          <div class="col">
                            <Field
                              name={namePath}
                              type="text"
                              placeholder={`Friend #${i() + 1}`}
                              validate={[required('Name is required')]}
                            />
                            <ErrorMessage name={namePath}>
                              {(msg) => <p class="error">{msg}</p>}
                            </ErrorMessage>
                          </div>
                          <button
                            type="button"
                            class="ghost"
                            onClick={() => helpers.remove(i())}
                            disabled={
                              helpers.form.values().friends.length <= 1
                            }
                          >
                            Remove
                          </button>
                        </div>
                      );
                    }}
                  </For>

                  <div class="row">
                    <button
                      type="button"
                      class="ghost"
                      onClick={() => helpers.push({ name: '' })}
                    >
                      Add friend
                    </button>
                    <button type="submit" disabled={form.isSubmitting()}>
                      {form.isSubmitting() ? 'Saving…' : 'Save list'}
                    </button>
                  </div>
                </div>
              )}
            </FieldArray>

            {form.status()?.ok ? (
              <div class="success">
                Saved {form.status().count} friend
                {form.status().count === 1 ? '' : 's'}. See console.
              </div>
            ) : null}
          </Form>
        )}
      </FormProvider>
    </div>
  );
}

render(FriendsDemo, document.getElementById('app'));
