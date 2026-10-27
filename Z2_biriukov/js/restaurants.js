function cleanText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function textOf(node, selector) {
  return cleanText(node.querySelector(selector)?.textContent);
}

function dayNumber(text) {
  return ["pondelok", "utorok", "streda", "štvrtok", "piatok"].findIndex(day => text.toLowerCase().includes(day)) + 1;
}

function menuDate(text) {
  const parts = text.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  return parts ? `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}` : "";
}

function priceOf(text) {
  const value = text.match(/\d+(?:[.,]\d+)?\s*€/);
  return value ? Number(value[0].replace(",", ".").replace("€", "").trim()).toFixed(2).replace(".", ",") + " €" : "";
}

function mealFromText(text, type, price) {
  let name = cleanText(text);
  const allergy = name.match(/\s*(?:A:\s*([\d, ]*)|\(([\d, ]+)\)|\s(\d+(?:\s*,\s*\d+)*))\s*(?:\(V\))?$/);
  const allergens = allergy ? cleanText(allergy[1] || allergy[2] || allergy[3]).replace(/\s/g, "") : "";
  if (allergy) name = name.slice(0, allergy.index).trim();
  const weight = name.match(/\(?\d[\d\s,g./]*[gl]\b\)?/);
  if (weight) name = cleanText(name.replace(weight[0], ""));
  return { type, name, price, weight: weight ? weight[0].replace(/[()]/g, "") : "", allergens };
}

function parseFiit(doc) {
  const days = [];
  for (const block of doc.querySelectorAll("#fiit-food .daily-offer > li")) {
    const heading = textOf(block, ".day-title");
    const day = dayNumber(heading);
    if (!day) continue;
    const meals = [];
    for (const item of block.querySelectorAll(".day-offer > li")) {
      const price = priceOf(textOf(item, ".price"));
      const type = textOf(item, ".brand").startsWith("P.") ? "soup" : "main";
      item.querySelectorAll(".brand").forEach(node => node.remove());
      const meal = mealFromText(item.textContent, type, price);
      if (meal.name) meals.push(meal);
    }
    days.push({ day, date: menuDate(heading), meals });
  }
  return days;
}

function parseEatMeet(doc) {
  const days = [];
  for (let day = 1; day <= 5; day++) {
    const block = doc.querySelector("#day-" + day);
    if (!block) continue;
    const meals = [];
    for (const item of block.querySelectorAll(".menu-details")) {
      const label = textOf(item, "h4").toLowerCase();
      let type = "main";
      if (label.startsWith("polievka")) type = "soup";
      else if (/sladké|múčne|šalát/.test(label)) type = "other";
      const meal = mealFromText(textOf(item, ".desc"), type, cleanText(textOf(item, ".price")));
      if (meal.name) meals.push(meal);
    }
    days.push({ day, meals });
  }
  return days;
}

function parseMachnac(doc) {
  const rates = [...doc.querySelectorAll(".denne_menu_ceny h4")].map(node => cleanText(node.textContent));
  const mainPrice = priceOf(rates.find(text => text.includes("bez polievky")) || "");
  const soupPrice = priceOf(rates.find(text => text.includes("menu polievka")) || "");
  const fullPrice = priceOf(rates.find(text => text.includes("jedlo, polievka")) || "");
  const days = [];
  let current = null;
  // The source has invalid nesting.
  for (const node of doc.querySelectorAll(".menu-container h2, .menu-container h4")) {
    const text = cleanText(node.textContent);
    if (node.tagName === "H2") {
      const day = dayNumber(text);
      current = day ? { day, date: menuDate(text), dateLabel: text.match(/\d{1,2}\.\s*\d{1,2}\./)?.[0] || "", meals: [] } : null;
      if (current) days.push(current);
    } else if (current && text) {
      const type = /^\(\s*\d+[,.]\d+\s*l\)/.test(text) ? "soup" : "main";
      const meal = mealFromText(text, type, type === "soup" ? soupPrice : mainPrice);
      if (type === "main" && fullPrice) meal.note = "S polievkou a nápojom: " + fullPrice;
      if (meal.name) current.meals.push(meal);
    }
  }
  return days;
}

const restaurants = [
  {
    id: "fiit", name: "FIIT Food", address: "Ilkovičova 2 · FIIT STU",
    url: "https://faynfood.sk/menu/#fiit-food", file: "data/fiit-food.html", parse: parseFiit,
    note: "Ceny bez odpočítania študentskej dotácie."
  },
  {
    id: "eat-meet", name: "Eat & Meet", address: "Staré Grunty 36 · Átriaky",
    url: "https://eatandmeet.sk/", file: "data/eat-meet.html", parse: parseEatMeet,
    note: "Bez dotácie / s dotáciou · prílohy nie sú v cene."
  },
  {
    id: "machnac", name: "Machnáč", address: "Nábr. arm. gen. L. Svobodu 42",
    url: "https://machnac.sk/denneMenu.html", file: "data/machnac.html", parse: parseMachnac,
    note: "Nápoj v cene hlavného jedla."
  }
];