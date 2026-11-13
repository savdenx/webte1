export function toLocalInput(value) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function validateTask(task) {
  const errors = {};
  if (!task.title.trim() || task.title.length > 200) {
    errors.title = 'Zadajte názov (najviac 200 znakov).';
  }
  if (task.description.length > 1000) {
    errors.description = 'Popis môže mať najviac 1 000 znakov.';
  }

  const start = new Date(task.date_from).getTime();
  const end = new Date(task.date_to).getTime();
  
  if (!task.date_from || !Number.isFinite(start) || toLocalInput(task.date_from) !== task.date_from.slice(0, 16)) {
    errors.date_from = 'Zadajte platný dátum a čas.';
  }
  if (!task.date_to || !Number.isFinite(end) || toLocalInput(task.date_to) !== task.date_to.slice(0, 16)) {
    errors.date_to = 'Zadajte platný dátum a čas.';
  }
  if (!errors.date_from && !errors.date_to && start > end) {
    errors.date_to = 'Koniec nesmie byť pred začiatkom.';
  }
  return errors;
}

export function toPayload(task) {
  return {
    title: task.title.trim(),
    description: task.description,
    date_from: new Date(task.date_from).toISOString(),
    date_to: new Date(task.date_to).toISOString(),
    is_finished: task.is_finished,
  };
}

export function formatDate(value) {
  return new Date(value).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function taskStatus(task, now = Date.now()) {
  if (task.is_finished) {
    return 'Dokončená';
  }
  if (new Date(task.date_to).getTime() < now) {
    return 'Po termíne';
  }
  return 'Nedokončená';
}

export function filterTasks(tasks, search, status, sortBy) {
  const searchText = search.trim().toLocaleLowerCase('sk');
  const filteredTasks = tasks.filter((task) => {
    const title = task.title.toLocaleLowerCase('sk');
    if (!title.includes(searchText)) {
      return false;
    }
    if (status === 'done' && !task.is_finished) {
      return false;
    }
    if (status === 'undone' && task.is_finished) {
      return false;
    }
    return true;
  });

  // Sort the filtered copy, keeping the shared task list in its original order.
  filteredTasks.sort((first, second) => {
    const firstDate = new Date(first[sortBy]).getTime();
    const secondDate = new Date(second[sortBy]).getTime();
    return firstDate - secondDate;
  });
  return filteredTasks;
}