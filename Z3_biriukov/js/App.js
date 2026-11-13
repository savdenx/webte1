import { computed, onMounted, onUnmounted, ref, watch } from '../vendor/vue.esm-browser.prod.js';
import AppDialog from './components/AppDialog.js';
import AppToast from './components/AppToast.js';
import TaskForm from './components/TaskForm.js';
import TaskCard from './components/TaskCard.js';
import TaskCalendar from './components/TaskCalendar.js';
import { request } from './api.js';
import { filterTasks } from './tasks.js';

const studentKey = 'z3-student-id';

export default {
  components: { AppDialog, AppToast, TaskForm, TaskCard, TaskCalendar },
  setup() {
    const studentInput = ref('');
    const student = ref('');
    const tasks = ref([]);
    const page = ref('list');
    const search = ref('');
    const status = ref('all');
    const sort = ref('date_from');
    const busy = ref(false);
    // Each task ID points to its running request.
    const pendingTasks = ref(new Map());
    const error = ref('');
    const dialog = ref(null);
    const dialogError = ref('');
    const now = ref(Date.now());
    const toast = ref('');
    const toastVisible = ref(false);
    const processing = computed(() => busy.value || pendingTasks.value.size > 0);
    let toastTimer;
    let timer;
    onMounted(() => {
      try {
        studentInput.value = localStorage.getItem(studentKey) || '';
      } catch {
        // Manual entry still works if browser storage is unavailable.
      }
      if (studentInput.value) {
        loadTasks();
      }
      timer = setInterval(() => {
        now.value = Date.now();
      }, 60000);
    });
    onUnmounted(() => {
      clearInterval(timer);
      clearTimeout(toastTimer);
    });

    function closeToast() {
      clearTimeout(toastTimer);
      toastVisible.value = false;
    }

    function showToast(message) {
      clearTimeout(toastTimer);
      toast.value = message;
      toastVisible.value = true;
      if (!processing.value) {
        toastTimer = setTimeout(closeToast, 3000);
      }
    }

    // Keep progress visible until requests finish; then show the result briefly.
    watch(processing, (active) => {
      closeToast();
      if (active) {
        toast.value = '';
        toastVisible.value = true;
      } else if (toast.value) {
        showToast(toast.value);
      }
    }, { flush: 'sync' });

    const visibleTasks = computed(() => filterTasks(tasks.value, search.value, status.value, sort.value));
    const pendingCount = computed(() => tasks.value.filter((task) => !task.is_finished).length);
    const dialogTitle = computed(() => {
      if (!dialog.value) {
        return '';
      }
      if (dialog.value.type === 'delete') {
        return 'Odstrániť úlohu?';
      }
      if (dialog.value.type === 'reset') {
        return 'Obnoviť ukážkové údaje?';
      }
      if (dialog.value.type === 'details') {
        return 'Detail úlohy';
      }
      if (dialog.value.task.id == null) {
        return 'Nová úloha';
      }
      return 'Upraviť úlohu';
    });

    async function loadTasks() {
      if (busy.value) {
        return;
      }
      const name = student.value || studentInput.value.trim();
      if (!name || name.length > 100) {
        error.value = 'Zadajte identifikátor (najviac 100 znakov).';
        return;
      }
      busy.value = true;
      error.value = '';
      try {
        await Promise.allSettled(pendingTasks.value.values());
        const data = await request(name);
        tasks.value = data.todos;
        student.value = name;
        try {
          localStorage.setItem(studentKey, name);
        } catch {
          // Remembering the identifier is optional; tasks stay on the server.
        }
        showToast('Úlohy sú aktuálne.');
      } catch (failure) {
        error.value = failure.message;
      } finally {
        busy.value = false;
      }
    }

    async function openDialog(type, task = null) {
      if (busy.value || pendingTasks.value.has(task?.id)) {
        return;
      }
      dialogError.value = '';
      if ((type === 'edit' || type === 'details') && task.id != null) {
        busy.value = true;
        error.value = '';
        try {
          task = await request(student.value, `/${task.id}`);
          replaceTask(task);
        } catch (failure) {
          showError(failure);
          return;
        } finally {
          busy.value = false;
        }
      }
      dialog.value = { type, task };
    }

    function createTask(range) {
      if (tasks.value.length >= 50) {
        error.value = 'Limit je 50 úloh. Pred pridaním odstráňte niektorú úlohu.';
        return;
      }
      if (range) {
        openDialog('edit', range);
        return;
      }

      const start = new Date();
      start.setSeconds(0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      openDialog('edit', { date_from: start, date_to: end });
    }

    function replaceTask(updated) {
      const index = tasks.value.findIndex((task) => task.id === updated.id);
      if (index === -1) {
        tasks.value.push(updated);
      } else {
        tasks.value[index] = updated;
      }
    }

    function showError(failure) {
      if (dialog.value) {
        dialogError.value = failure.message;
      } else {
        error.value = failure.message;
      }
    }

    // Wait for task requests, including failed ones, before changing the list.
    async function performChange(operation, message) {
      if (busy.value) {
        return;
      }
      busy.value = true;
      error.value = '';
      dialogError.value = '';
      try {
        await Promise.allSettled(pendingTasks.value.values());
        await operation();
        dialog.value = null;
        showToast(message);
      } catch (failure) {
        showError(failure);
      } finally {
        busy.value = false;
      }
    }

    function saveTask(data) {
      const id = dialog.value.task.id;
      let path = '';
      let method = 'POST';
      if (id != null) {
        path = `/${id}`;
        method = 'PUT';
      }

      return performChange(async () => {
        const savedTask = await request(student.value, path, method, data);
        replaceTask(savedTask);
      }, 'Úloha je uložená.');
    }

    async function toggleTask(task) {
      if (busy.value || pendingTasks.value.has(task.id)) {
        return;
      }
      const name = student.value;
      const currentTasks = tasks.value;
      const currentDialog = dialog.value;
      let action = 'done';
      if (task.is_finished) {
        action = 'undone';
      }

      error.value = '';
      dialogError.value = '';
      const operation = request(name, `/${task.id}/${action}`, 'PATCH');
      pendingTasks.value.set(task.id, operation);
      try {
        const updatedTask = await operation;
        // Ignore responses belonging to a list that is no longer open.
        if (student.value !== name || tasks.value !== currentTasks) return;
        replaceTask(updatedTask);
        if (dialog.value === currentDialog && currentDialog?.task?.id === task.id) {
          dialog.value = null;
        }
        showToast(task.is_finished ? 'Úloha je znovu otvorená.' : 'Úloha je dokončená.');
      } catch (failure) {
        if (student.value !== name || tasks.value !== currentTasks) return;
        if (dialog.value === currentDialog && currentDialog?.task?.id === task.id) {
          dialogError.value = failure.message;
        } else {
          error.value = failure.message;
        }
      } finally {
        pendingTasks.value.delete(task.id);
      }
    }

    function confirmAction() {
      const { type, task } = dialog.value;
      return performChange(async () => {
        if (type === 'delete') {
          await request(student.value, `/${task.id}`, 'DELETE');
          tasks.value = tasks.value.filter((item) => item.id !== task.id);
        } else {
          await request(student.value, '/reset', 'POST');
          // Clear the old snapshot even if the subsequent refresh fails.
          tasks.value = [];
          dialog.value = null;
          const data = await request(student.value);
          tasks.value = data.todos;
        }
      }, type === 'delete' ? 'Úloha je odstránená.' : 'Ukážkové úlohy sú obnovené.');
    }

    function changeStudent() {
      closeToast();
      toast.value = '';
      try {
        localStorage.removeItem(studentKey);
      } catch {
        // Switching remains available if browser storage is blocked.
      }
      student.value = '';
      tasks.value = [];
      error.value = '';
      search.value = '';
      status.value = 'all';
      page.value = 'list';
    }

    return {
      studentInput, student, tasks, page, search, status, sort,
      busy, pendingTasks, error, dialog, dialogError, dialogTitle, now,
      toast, toastVisible, processing, closeToast,
      visibleTasks, pendingCount, loadTasks, openDialog, createTask,
      saveTask, toggleTask, confirmAction, changeStudent,
    };
  },
  template: `
  <header class="app-header">
    <a href="#" class="brand" @click.prevent="page = 'list'"><img src="./favicon.svg" alt="" width="38" height="38"><h1>Môj TODO List</h1></a>
    <div v-if="student && page !== 'about'" class="search-field">
      <label for="task-search" class="sr-only">Hľadať podľa názvu</label>
      <input id="task-search" ref="searchInput" v-model="search" type="search" placeholder="Hľadať úlohu…">
      <button v-if="search" class="icon-button clear-search" type="button" aria-label="Vymazať vyhľadávanie" title="Vymazať vyhľadávanie" @click="search = ''; $refs.searchInput.focus()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <div v-if="student" class="student-info">
      <span class="student-name">ID: {{ student }}</span>
      <button :disabled="busy" @click="changeStudent" aria-label="Zmeniť ID" title="Zmeniť ID">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4" /></svg>
      </button>
    </div>
  </header>

  <div class="app-layout">
    <aside class="sidebar">
      <nav aria-label="Hlavná navigácia">
        <button :class="{ active: page === 'list' }" :aria-current="page === 'list' ? 'page' : undefined" @click="page = 'list'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m7 12 3 3 7-7" /></svg>
          Úlohy <small v-if="student">{{ pendingCount }}</small>
        </button>
        <button :disabled="!student" :class="{ active: page === 'calendar' }" :aria-current="page === 'calendar' ? 'page' : undefined" @click="page = 'calendar'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2" /></svg>
          Kalendár
        </button>
        <button :class="{ active: page === 'about' }" :aria-current="page === 'about' ? 'page' : undefined" @click="page = 'about'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></svg>
          O projekte
        </button>
      </nav>
    </aside>

    <main :aria-busy="busy">
      <div v-if="error" class="error-banner" role="alert">{{ error }} <button v-if="student" :disabled="busy" @click="loadTasks">Obnoviť zoznam</button></div>

      <section v-if="page === 'about'" class="about panel">
        <h2>O projekte</h2>
        <p>Osobné úlohy v zozname aj kalendári. Údaje sa ukladajú na školskom serveri.</p>
        <p>WEBTE1 · Zadanie 3<br>Savelii Biriukov · ZS 2026/2027</p>
        <h3>Použité technológie</h3>
        <ul class="sources">
          <li><a href="https://vuejs.org/">Vue 3</a> – komponenty a stav aplikácie.</li>
          <li><a href="https://fullcalendar.io/">FullCalendar 6</a> – mesačný, týždenný a denný kalendár.</li>
          <li><a href="https://wt1zadanie.iolab.sk/docs">Školské REST API</a> – ukladanie úloh cez Fetch API.</li>
        </ul>
        <p>HTML, CSS a JavaScript. Vlastná SVG ikona, systémové písmo. Dizajn inšpirovaný <a href="https://keep.google.com/">Google Keep</a>.</p>
      </section>

      <section v-else-if="!student" class="welcome panel">
        <h2>Vaše úlohy</h2>
        <form @submit.prevent="loadTasks">
          <label for="student">Váš školský identifikátor (ID)<input id="student" v-model="studentInput" maxlength="100" required autocomplete="username" placeholder="napr. xbiriukovs" :disabled="busy"></label>
          <button class="primary" :disabled="busy">{{ busy ? 'Načítavam…' : 'Otvoriť úlohy' }}</button>
        </form>
      </section>

      <section v-else :aria-labelledby="\`\${page}-title\`">
        <div class="section-heading page-heading">
          <div class="title-actions">
            <h2 :id="\`\${page}-title\`">{{ page === 'list' ? 'Moje úlohy' : 'Kalendár' }}</h2>
            <button :disabled="busy" @click="loadTasks" aria-label="Obnoviť zoznam" title="Obnoviť zoznam">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7" /></svg>
            </button>
            <button class="danger" :disabled="busy" @click="openDialog('reset')" aria-label="Obnoviť 5 ukážkových úloh" title="Obnoviť 5 ukážkových úloh">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a8 8 0 1 1 2 6M4 4v7h7M12 8v5l3 2" /></svg>
            </button>
          </div>
          <button class="primary" :disabled="busy || tasks.length >= 50" @click="createTask()">+ Nová úloha</button>
        </div>
        <p v-if="tasks.length >= 50" class="error">Limit je 50 úloh. Pred pridaním odstráňte niektorú úlohu.</p>
        <div class="filters">
          <label><span class="sr-only">Stav úloh</span><select v-model="status"><option value="all">Všetky úlohy</option><option value="undone">Nedokončené</option><option value="done">Dokončené</option></select></label>
          <label v-if="page === 'list'"><span class="sr-only">Zoradiť úlohy</span><select v-model="sort"><option value="date_from">Podľa začiatku</option><option value="date_to">Podľa konca</option></select></label>
        </div>
        <template v-if="page === 'list'">
          <ul v-if="visibleTasks.length" class="task-grid">
            <TaskCard v-for="task in visibleTasks" :key="task.id" :task="task" :busy="busy || pendingTasks.has(task.id)" :now="now" @edit="openDialog('edit', task)" @toggle="toggleTask(task)" @delete="openDialog('delete', task)" />
          </ul>
          <p v-else class="empty-state">{{ tasks.length ? 'Žiadna úloha nezodpovedá filtru.' : 'Zatiaľ tu nie sú žiadne úlohy. Pridajte prvú.' }}</p>
        </template>
        <template v-else>
          <TaskCalendar :tasks="visibleTasks" :busy="busy" :now="now" @edit="openDialog('details', $event)" @create="createTask" />
          <p v-if="!visibleTasks.length" class="muted">{{ tasks.length ? 'Žiadna úloha nezodpovedá filtru.' : 'Zatiaľ tu nie sú žiadne úlohy.' }}</p>
        </template>
      </section>
    </main>
  </div>
  <footer class="app-footer">Savelii Biriukov · WEBTE1 · 2026</footer>
  <AppToast v-if="toastVisible && !dialog" :message="processing ? 'Prebieha spracovanie…' : toast" :loading="processing" @close="closeToast" />

  <AppDialog v-if="dialog" :key="dialog.type" :title="dialogTitle" :busy="busy || pendingTasks.has(dialog.task?.id)" @close="dialog = null">
    <AppToast v-if="toastVisible" :message="processing ? 'Prebieha spracovanie…' : toast" :loading="processing" @close="closeToast" />
    <template v-if="dialog.type === 'edit'">
      <TaskForm :task="dialog.task" :busy="busy" :error="dialogError" @save="saveTask" @close="dialog = null" />
    </template>
    <template v-else-if="dialog.type === 'details'">
      <ul class="task-grid">
        <TaskCard :task="dialog.task" :busy="busy || pendingTasks.has(dialog.task.id)" :now="now" show-description @edit="openDialog('edit', dialog.task)" @toggle="toggleTask(dialog.task)" @delete="openDialog('delete', dialog.task)" />
      </ul>
      <p v-if="dialogError" class="error" role="alert">{{ dialogError }}</p>
    </template>
    <template v-else>
      <p v-if="dialog.type === 'delete'">Úloha „{{ dialog.task.title }}“ sa natrvalo odstráni.</p>
      <p v-else>Všetky vaše úlohy sa odstránia a nahradia piatimi ukážkovými úlohami.</p>
      <p v-if="dialogError" class="error" role="alert">{{ dialogError }}</p>
      <div class="dialog-actions"><button :disabled="busy" autofocus @click="dialog = null">Zrušiť</button><button class="primary" :disabled="busy" @click="confirmAction">{{ busy ? 'Ukladám…' : dialog.type === 'delete' ? 'Odstrániť' : 'Obnoviť údaje' }}</button></div>
    </template>
  </AppDialog>
  `,
};