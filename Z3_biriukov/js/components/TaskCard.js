import { formatDate, taskStatus } from '../tasks.js';

export default {
  props: { task: { type: Object, required: true }, busy: Boolean, now: Number, showDescription: Boolean },
  emits: ['edit', 'toggle', 'delete'],
  setup(props, { emit }) {
    return { emit, formatDate, taskStatus };
  },
  template: `
  <li class="task-card" :class="{ completed: task.is_finished, overdue: taskStatus(task, now) === 'Po termíne' }">
    <div class="section-heading">
      <h3>{{ task.title }}</h3>
      <button class="icon-button check-button" role="checkbox" :disabled="busy" :aria-label="\`\${task.is_finished ? 'Znovu otvoriť' : 'Dokončiť'}: \${task.title}\`" :title="task.is_finished ? 'Znovu otvoriť' : 'Dokončiť'" :aria-checked="task.is_finished" @click="emit('toggle')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path v-if="task.is_finished" d="m7 12 3 3 7-7" /></svg>
      </button>
    </div>
    <p class="task-status">{{ taskStatus(task, now) }}</p>
    <p v-if="showDescription && task.description" class="task-description">{{ task.description }}</p>
    <div class="task-dates"><span>Od {{ formatDate(task.date_from) }}</span><span>Do {{ formatDate(task.date_to) }}</span></div>
    <div class="card-actions">
      <button :disabled="busy" @click="emit('edit')" :aria-label="\`Upraviť: \${task.title}\`" title="Upraviť">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5L8 21H3v-5ZM14 5l5 5" /></svg>
      </button>
      <button class="danger" :disabled="busy" @click="emit('delete')" :aria-label="\`Odstrániť: \${task.title}\`" title="Odstrániť">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
      </button>
    </div>
  </li>
  `,
};