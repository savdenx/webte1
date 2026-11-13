import { computed, onMounted, onBeforeUnmount, ref, watch } from '../../vendor/vue.esm-browser.prod.js';
import { formatDate, taskStatus } from '../tasks.js';

export default {
  props: { tasks: { type: Array, required: true }, busy: Boolean, now: Number },
  emits: ['edit', 'create'],
  setup(props, { emit }) {
    const container = ref(null);
    let calendar;
    const events = computed(() => props.tasks.map((task) => {
      let title = task.title;
      let className = 'event-open';
      if (task.is_finished) {
        title = `✓ ${title}`;
        className = 'event-done';
      }
      return {
        id: String(task.id),
        title,
        start: task.date_from,
        end: task.date_to,
        extendedProps: { task, status: taskStatus(task, props.now) },
        classNames: [className],
      };
    }));

    function selectRange(info) {
      if (props.busy) {
        return;
      }
      const start = new Date(info.start);
      const end = new Date(info.end);
      // Month selections end exclusively at midnight of the following day.
      if (info.allDay) {
        start.setHours(9);
        end.setDate(end.getDate() - 1);
        end.setHours(10);
      }
      emit('create', { date_from: start, date_to: end });
      calendar.unselect();
    }

    onMounted(() => {
      calendar = new FullCalendar.Calendar(container.value, {
        locale: 'sk', timeZone: 'local', initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        buttonText: { today: 'Dnes', month: 'Mesiac', week: 'Týždeň', day: 'Deň' },
        buttonHints: { prev: 'Predchádzajúce obdobie', next: 'Nasledujúce obdobie', today: 'Dnes' },
        allDayText: 'Celý deň', height: 'auto', firstDay: 1, nowIndicator: true,
        selectable: !props.busy, selectMirror: true, select: selectRange,
        eventClick: (info) => {
          if (!props.busy) {
            emit('edit', info.event.extendedProps.task);
          }
        },
        eventInteractive: true, displayEventEnd: true, eventDisplay: 'block',
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        dayMaxEvents: 3, moreLinkText: (count) => `+${count} ďalšie`,
        noEventsText: 'Žiadne úlohy',
        views: { timeGridWeek: { dayHeaderFormat: { weekday: 'short', day: 'numeric' } } },
        events: events.value,
        eventDidMount: ({ el, event }) => {
          const { task, status } = event.extendedProps;
          const label = `${task.title} · ${formatDate(task.date_from)} – ${formatDate(task.date_to)} · ${status}`;
          el.title = label;
          el.setAttribute('aria-label', label);
        },
      });
      calendar.render();
    });
    watch(events, (value) => {
      calendar.removeAllEventSources();
      calendar.addEventSource(value);
    });
    watch(() => props.busy, (value) => calendar.setOption('selectable', !value));
    onBeforeUnmount(() => calendar.destroy());
    return { container };
  },
  template: `
    <div class="calendar"><div ref="container"></div></div>
    <p class="muted calendar-hint">Vyberte deň alebo časový úsek a pridajte úlohu. Na mobile podržte prst.</p>
  `,
};