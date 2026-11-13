import { reactive, ref } from '../../vendor/vue.esm-browser.prod.js';
import { toLocalInput, toPayload, validateTask } from '../tasks.js';

export default {
  props: { task: { type: Object, required: true }, busy: Boolean, error: String },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const draft = reactive({
      title: props.task.title || '',
      description: props.task.description || '',
      date_from: toLocalInput(props.task.date_from),
      date_to: toLocalInput(props.task.date_to),
      is_finished: props.task.is_finished || false,
    });
    const errors = ref({});

    function submit() {
      errors.value = validateTask(draft);
      if (Object.keys(errors.value).length > 0) {
        return;
      }
      const data = toPayload(draft);
      emit('save', data);
    }

    return { draft, errors, submit, emit };
  },
  template: `
  <form novalidate @submit.prevent="submit">
    <fieldset :disabled="busy" class="task-form">
      <label for="title">Názov
        <input id="title" v-model="draft.title" maxlength="200" required autofocus :aria-invalid="!!errors.title" aria-describedby="title-error">
        <small id="title-error" class="error">{{ errors.title }}</small>
      </label>
      <label for="description"><span>Popis <span class="muted">(nepovinný)</span></span>
        <textarea id="description" v-model="draft.description" maxlength="1000" rows="3" :aria-invalid="!!errors.description" aria-describedby="description-error"></textarea>
        <small id="description-error" class="error">{{ errors.description }}</small>
      </label>
      <div class="date-fields">
        <label for="date-from">Začiatok
          <input id="date-from" v-model="draft.date_from" type="datetime-local" required :aria-invalid="!!errors.date_from" aria-describedby="from-error">
          <small id="from-error" class="error">{{ errors.date_from }}</small>
        </label>
        <label for="date-to">Koniec
          <input id="date-to" v-model="draft.date_to" type="datetime-local" required :aria-invalid="!!errors.date_to" aria-describedby="to-error">
          <small id="to-error" class="error">{{ errors.date_to }}</small>
        </label>
      </div>
    </fieldset>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="dialog-actions">
      <button type="button" :disabled="busy" @click="emit('close')">Zrušiť</button>
      <button class="primary" :disabled="busy">{{ busy ? 'Ukladám…' : 'Uložiť' }}</button>
    </div>
  </form>
  `,
};