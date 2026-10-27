const dayNames = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];
const cacheKey = "z2-menu-v1-";
const menus = document.querySelector("#menus");
const status = document.querySelector("#status");
const source = document.querySelector("#source");
const refresh = document.querySelector("#refresh");
const clear = document.querySelector("#clear");
let selectedDay = dayjs().day();
if (selectedDay < 1 || selectedDay > 5) selectedDay = 1;
let records = {};
let loading = false;

function element(tag, text = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey + source.value));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function renderMeal(meal) {
  const item = element("li", "", "meal");
  item.append(element("span", meal.name));
  item.append(element("span", meal.price || "Cena neuvedená", "meal-price"));
  const details = [];
  if (meal.weight) details.push(meal.weight);
  if (meal.allergens) details.push("Alergény: " + meal.allergens);
  if (details.length) item.append(element("span", details.join(" · "), "meal-details"));
  if (meal.note) item.append(element("span", meal.note, "meal-details"));
  return item;
}

function renderDay(day, number) {
  const section = element("section", "", "day-section");
  const heading = element("h4", dayNames[number - 1]);
  if (day?.date) {
    const date = element("time", dayjs(day.date).format("D. M. YYYY"));
    date.dateTime = day.date;
    heading.append(element("span", " · "), date);
  } else if (day?.dateLabel) {
    heading.append(element("span", " · " + day.dateLabel));
  }
  section.append(heading);
  if (!day || !day.meals.length) {
    section.append(element("p", "Menu na tento deň nie je k dispozícii.", "notice"));
    return section;
  }
  if (day.date && dayjs(day.date).isBefore(dayjs().subtract((dayjs().day() + 6) % 7, "day"), "day")) {
    section.append(element("p", "Staršie zverejnené menu. Overte si aktuálnu ponuku.", "notice warning"));
  }
  for (const type of ["soup", "main", "other"]) {
    const meals = day.meals.filter(meal => meal.type === type);
    if (!meals.length) continue;
    section.append(element("h5", { soup: "Polievky", main: "Hlavné jedlá", other: "Ďalšia ponuka" }[type], "course-title"));
    const list = element("ul", "", "meal-list " + type);
    meals.forEach(meal => list.append(renderMeal(meal)));
    section.append(list);
  }
  return section;
}

function render() {
  menus.replaceChildren();
  document.querySelector("#view-title").textContent = selectedDay ? dayNames[selectedDay - 1] + " · obedové menu" : "Menu na celý týždeň";
  document.querySelectorAll(".day-button").forEach(button => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.day) === selectedDay));
  });
  restaurants.forEach(restaurant => {
    if (!document.querySelector("#filter-" + restaurant.id).checked) return;
    const column = element("div", "", "col-12 col-lg-4");
    const card = element("article", "", "card");
    const header = element("header", "", "card-header");
    const title = element("h3");
    const link = element("a", restaurant.name + " ↗");
    link.href = restaurant.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    title.append(link);
    header.append(title, element("p", restaurant.address, "address"));
    const record = records[restaurant.id];
    const updated = element("p", "Aktualizované: ", "updated");
    if (record?.updated) {
      const time = element("time", dayjs(record.updated).format("D. M. YYYY, HH:mm"));
      time.dateTime = record.updated;
      updated.append(time);
    } else updated.append("zatiaľ nenačítané");
    const body = element("div", "", "card-body");
    if (record?.error) body.append(element("p", record.error, "notice warning"));
    if (restaurant.note) header.append(element("p", restaurant.note, "price-note"));
    const numbers = selectedDay ? [selectedDay] : [1, 2, 3, 4, 5];
    numbers.forEach(number => body.append(renderDay(record?.days.find(day => day.day === number), number)));
    card.append(header, body, updated);
    column.append(card);
    menus.append(column);
  });
  if (!menus.children.length) {
    menus.append(element("p", "Nie je vybraná žiadna reštaurácia. Zapnite aspoň jeden filter.", "empty"));
  }
}

async function loadMenus(force = false) {
  if (loading) return;
  loading = true;
  refresh.disabled = clear.disabled = source.disabled = true;
  menus.setAttribute("aria-busy", "true");
  status.textContent = "Načítavam menu…";
  let failures = 0;
  const pending = restaurants.filter(restaurant => force || !records[restaurant.id]?.updated
    || !dayjs(records[restaurant.id].updated).isSame(dayjs(), "day"));
  await Promise.all(pending.map(async restaurant => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(source.value === "local" ? restaurant.file : restaurant.url, {
        signal: controller.signal, cache: "no-store", credentials: "omit"
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const html = await response.text();
      const document = new DOMParser().parseFromString(html, "text/html");
      const days = restaurant.parse(document);
      if (!days.length || !days.some(day => day.meals.length)) throw new Error("Empty menu");
      records[restaurant.id] = { days, updated: new Date().toISOString() };
    } catch {
      failures++;
      const previous = records[restaurant.id];
      const message = source.value === "online"
        ? "Menu sa nepodarilo načítať (CORS alebo nedostupný web). Skúste lokálne kópie."
        : "Lokálnu kópiu sa nepodarilo načítať alebo spracovať.";
      records[restaurant.id] = { days: [], ...previous, error: message + (previous?.updated ? " Zobrazujeme posledné uložené menu." : "") };
    } finally {
      clearTimeout(timer);
    }
  }));
  render();
  status.textContent = failures ? "Niektoré menu sa nepodarilo aktualizovať. Podrobnosti sú pri reštauráciách."
    : "";
  if (pending.length) {
    try {
      localStorage.setItem(cacheKey + source.value, JSON.stringify(records));
    } catch {
      status.textContent += " Dáta sa nepodarilo uložiť do prehliadača.";
    }
  }
  loading = false;
  refresh.disabled = clear.disabled = source.disabled = false;
  menus.setAttribute("aria-busy", "false");
}

dayNames.concat("Celý týždeň").forEach((name, index) => {
  const button = element("button", "", "day-button");
  button.setAttribute("aria-label", name);
  button.append(element("span", name, "day-full"));
  const short = element("span", ["Po", "Ut", "St", "Št", "Pi", "Týždeň"][index], "day-short");
  short.setAttribute("aria-hidden", "true");
  button.append(short);
  button.type = "button";
  button.dataset.day = index === 5 ? 0 : index + 1;
  button.addEventListener("click", () => { selectedDay = Number(button.dataset.day); render(); });
  document.querySelector("#days").append(button);
});
restaurants.forEach(restaurant => {
  const label = element("label");
  const input = element("input");
  input.type = "checkbox";
  input.id = "filter-" + restaurant.id;
  input.checked = true;
  input.addEventListener("change", render);
  label.append(input, restaurant.name);
  document.querySelector("#filters").append(label);
});
refresh.addEventListener("click", () => loadMenus(true));
source.addEventListener("change", () => {
  records = readCache();
  render();
  loadMenus();
});
clear.addEventListener("click", () => {
  try {
    localStorage.removeItem(cacheKey + "local");
    localStorage.removeItem(cacheKey + "online");
    status.textContent = "Uložené dáta boli vymazané. Na opätovné načítanie použite Aktualizovať menu.";
  } catch {
    status.textContent = "Prehliadač neumožnil vymazanie uložených dát.";
  }
  records = {};
  render();
});
records = readCache();
render();
loadMenus();
