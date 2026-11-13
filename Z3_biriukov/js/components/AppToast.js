export default {
  props: { message: String, loading: Boolean },
  emits: ['close'],
  template: `
  <div class="toast" role="status" aria-live="polite">
    <span v-if="loading" class="toast-spinner" aria-hidden="true"></span>
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
    <span>{{ message }}</span>
    <button type="button" class="icon-button" aria-label="Zavrieť oznámenie" title="Zavrieť oznámenie" @click="$emit('close')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </button>
  </div>
  `,
};