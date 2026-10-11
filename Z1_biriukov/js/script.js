// ========================================
// CONSTANTS
// ========================================

const SEMESTER_START = new Date(2026, 8, 14);
const SEMESTER_END = new Date(2026, 11, 14, 23, 59);

const DAY_NAMES = ["v nedeľu", "v pondelok", "v utorok", "v stredu", "vo štvrtok", "v piatok", "v sobotu"];

const SCHOOL = { name: "FEI STU", lat: 48.151965, lng: 17.072995 };
const HOME = { name: "ŠD Mladosť", lat: 48.158941, lng: 17.064097 };

const STORAGE_KEY = "mapPoints";


// ========================================
// HAMBURGER MENU
// ========================================

const menuButton = document.querySelector(".nav__toggle");
const menuList = document.getElementById("main-menu");

if (menuButton && menuList) {
    menuButton.addEventListener("click", function () {
        const isOpen = menuList.classList.toggle("nav__list--open");
        menuButton.setAttribute("aria-expanded", isOpen);
    });
}


// ========================================
// SCHEDULE
// ========================================

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return day + "." + month + "." + date.getFullYear();
}

function timeToHours(text) {
    const parts = text.split(":");
    return Number(parts[0]) + Number(parts[1]) / 60;
}

function getLessonName(cell) {
    return cell.querySelector("abbr").title;
}

function showCurrentLesson() {
    const status = document.getElementById("lesson-status");
    const lessons = document.querySelectorAll(".lesson");

    if (!status || lessons.length === 0) {
        return;
    }

    const now = new Date();
    const today = now.getDay();
    const hourNow = now.getHours() + now.getMinutes() / 60;

    if (now < SEMESTER_START) {
        status.textContent = "Semester ešte nezačal. Výučba začína " + formatDate(SEMESTER_START) + ".";
        return;
    }
    if (now > SEMESTER_END) {
        status.textContent = "Semester sa skončil " + formatDate(SEMESTER_END) + ". Teraz mám čas.";
        return;
    }

    let currentLesson = null;
    let nextLesson = null;
    let nextLessonWait = 1000;

    lessons.forEach(function (cell) {
        const day = Number(cell.dataset.day);
        const start = timeToHours(cell.dataset.start);
        const end = timeToHours(cell.dataset.end);

        // is the lesson happening right now?
        if (day === today && hourNow >= start && hourNow < end) {
            cell.classList.add("lesson--now");
            currentLesson = cell;
        }

        // how many hours until this lesson starts?
        let daysAhead = (day - today + 7) % 7;
        if (daysAhead === 0 && start <= hourNow) {
            daysAhead = 7;
        }
        const wait = daysAhead * 24 + start - hourNow;

        if (wait < nextLessonWait) {
            nextLessonWait = wait;
            nextLesson = cell;
        }
    });

    if (currentLesson !== null) {
        status.textContent = "Práve prebieha: " + getLessonName(currentLesson) +
            " (" + currentLesson.dataset.start + " – " + currentLesson.dataset.end + ").";
        return;
    }

    const nextDay = Number(nextLesson.dataset.day);
    status.textContent = "Momentálne neprebieha žiadna výučba, takže mám čas. Najbližšie: " +
        getLessonName(nextLesson) + " – " + DAY_NAMES[nextDay] + " o " + nextLesson.dataset.start + ".";
}

function setupFilters() {
    const buttons = document.querySelectorAll(".filter-button");
    const lessons = document.querySelectorAll(".lesson");
    const emptyMessage = document.getElementById("filter-empty");

    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            const filter = button.dataset.filter;
            let visibleCount = 0;

            lessons.forEach(function (cell) {
                if (filter === "all" || cell.dataset.type === filter) {
                    cell.classList.remove("lesson--hidden");
                    visibleCount++;
                } else {
                    cell.classList.add("lesson--hidden");
                }
            });

            // mark the active filter
            buttons.forEach(function (otherButton) {
                otherButton.classList.remove("tab--active");
            });
            button.classList.add("tab--active");

            // message when the filter found nothing
            emptyMessage.hidden = visibleCount > 0;
        });
    });
}

function showSemesterProgress() {
    const progress = document.getElementById("semester-progress");
    const text = document.getElementById("semester-progress-text");

    if (!progress || !text) {
        return;
    }

    document.getElementById("semester-start").textContent = formatDate(SEMESTER_START);
    document.getElementById("semester-end").textContent = formatDate(SEMESTER_END);

    const total = SEMESTER_END - SEMESTER_START;    // difference, milliseconds
    const passed = new Date() - SEMESTER_START;
    let percent = Math.round(passed / total * 100);

    if (percent < 0) {
        percent = 0;
    }
    if (percent > 100) {
        percent = 100;
    }

    progress.value = percent;
    text.textContent = "Zo semestra ubehlo " + percent + " %.";
}

showCurrentLesson();
setupFilters();
showSemesterProgress();


// ========================================
// MAP
// ========================================

let map = null;
let points = [];          // points by the user
let pointMarkers = [];    // Leaflet circles for these points
let distanceLine = null;

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

// Haversine formula
function getDistanceKm(lat1, lng1, lat2, lng2) {
    const EARTH_RADIUS_KM = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}

function formatDistance(km) {
    return km.toFixed(2).replace(".", ",") + " km";
}

function loadPoints() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        points = JSON.parse(saved);
    }
}

function savePoints() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
}

// draws all user points on the map again
function drawPoints() {
    pointMarkers.forEach(function (marker) {
        marker.remove();
    });
    pointMarkers = [];

    points.forEach(function (point) {
        const marker = L.circleMarker([point.lat, point.lng], { radius: 9, className: "map-point" })
            .addTo(map)
            .bindTooltip(point.name);
        pointMarkers.push(marker);
    });
}

// fills the <select> with the names of the points
function renderPointList(selectedIndex) {
    const select = document.getElementById("point-select");

    select.innerHTML = "";

    points.forEach(function (point, index) {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = point.name;
        select.appendChild(option);
    });

    if (points.length > 0) {
        select.value = selectedIndex;
    }

    document.getElementById("points-empty").hidden = points.length > 0;
    document.getElementById("distance-tools").hidden = points.length === 0;
}

// draws the line between the selected point and the target and shows the distance
function showDistance() {
    const select = document.getElementById("point-select");
    let target = SCHOOL;
    if (document.getElementById("target-select").value === "home") {
        target = HOME;
    }

    if (distanceLine !== null) {
        distanceLine.remove();
        distanceLine = null;
    }

    if (points.length === 0) {
        return;
    }

    const index = Number(select.value);
    const point = points[index];
    const distance = formatDistance(getDistanceKm(point.lat, point.lng, target.lat, target.lng));

    // line between the two places + popup with the name and the distance
    distanceLine = L.polyline([[point.lat, point.lng], [target.lat, target.lng]], { className: "map-line" })
        .addTo(map);
    pointMarkers[index].bindPopup(point.name + " – " + distance + " od cieľa " + target.name).openPopup();
}

// called after every change of the points
function updateAll(selectedIndex) {
    savePoints();
    drawPoints();
    renderPointList(selectedIndex);
    showDistance();
}

function addPoint(lat, lng) {
    const input = document.getElementById("point-name");
    let name = input.value.trim();

    if (name === "") {
        name = "Bod " + (points.length + 1);
    }

    points.push({ name: name, lat: lat, lng: lng });
    input.value = "";

    // the new point becomes the selected one
    updateAll(points.length - 1);
}

function initMap() {
    const mapElement = document.getElementById("map");

    if (!mapElement) {
        return;
    }

    if (typeof L === "undefined") {
        mapElement.textContent = "Mapu sa nepodarilo načítať. Skontrolujte pripojenie na internet a obnovte stránku.";
        mapElement.classList.add("empty-message");
        return;
    }

    map = L.map("map").setView([SCHOOL.lat, SCHOOL.lng], 14);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([SCHOOL.lat, SCHOOL.lng], { alt: "Škola FEI STU" })
        .addTo(map)
        .bindTooltip("Škola – FEI STU", { permanent: true, direction: "top" });

    L.marker([HOME.lat, HOME.lng], { alt: "Domov – ŠD Mladosť" })
        .addTo(map)
        .bindTooltip("Domov – ŠD Mladosť", { permanent: true, direction: "top" });

    map.on("click", function (event) {
        addPoint(event.latlng.lat, event.latlng.lng);
    });

    // adds a point without the mouse
    document.getElementById("add-center-button").addEventListener("click", function () {
        const center = map.getCenter();
        addPoint(center.lat, center.lng);
    });

    // deletes the point that is selected in the list
    document.getElementById("delete-point-button").addEventListener("click", function () {
        const index = Number(document.getElementById("point-select").value);
        points.splice(index, 1);    // remove
        updateAll(0);
    });

    document.getElementById("point-select").addEventListener("change", showDistance);
    document.getElementById("target-select").addEventListener("change", showDistance);

    loadPoints();
    updateAll(0);
}

initMap();