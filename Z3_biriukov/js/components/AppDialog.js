import { onMounted, ref } from '../../vendor/vue.esm-browser.prod.js';

export default {
  props: { title: { type: String, required: true }, busy: Boolean },
  emits: ['close'],
  setup(props, { emit }) {
    const dialog = ref(null);
    onMounted(() => dialog.value.showModal());

    return { dialog, emit };
  },
  template: `
  <dialog ref="dialog" aria-labelledby="dialog-title" @cancel.prevent="!busy && emit('close')">
    <div class="section-heading">
      <h2 id="dialog-title">{{ title }}</h2>
      <button type="button" class="icon-button" aria-label="Zavrieť" :disabled="busy" @click="emit('close')">×</button>
    </div>
    <slot />
  </dialog>
  `,
};