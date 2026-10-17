"use strict";

// ========================================
// UTILIDADES Y CATÁLOGOS
// ========================================

const $ = (selector) => document.querySelector(selector);
const clamp = (value) => Math.max(0, Math.min(100, value));
const random = (min, max) => min + Math.random() * (max - min);

const foods = [
  {
    id: "strawberry",
    name: "Fresa",
    icon: "🍓",
    price: 3,
    food: 12,
    joy: 3,
    message: "¡Mis fresas favoritas! Ñam."
  },
  {
    id: "apple",
    name: "Manzana",
    icon: "🍎",
    price: 4,
    food: 15,
    joy: 2,
    message: "¡Crujiente y deliciosa!"
  },
  {
    id: "banana",
    name: "Banana",
    icon: "🍌",
    price: 6,
    food: 22,
    joy: 3,
    message: "¡Una banana para seguir la aventura!"
  },
  {
    id: "fries",
    name: "Papas fritas",
    icon: "🍟",
    price: 10,
    food: 30,
    joy: 5,
    message: "¡Estas papitas están increíbles!"
  },
  {
    id: "burger",
    name: "Hamburguesa",
    icon: "🍔",
    price: 16,
    food: 45,
    joy: 8,
    message: "¡Una hamburguesa tamaño dragón!"
  },
  {
    id: "pizza",
    name: "Pizza",
    icon: "🍕",
    price: 22,
    food: 60,
    joy: 10,
    message: "¡Pizza! Este es el mejor día."
  }
];

const blanketItem = {
  name: "Mantita de estrellas",
  price: 15
};

const weatherCities = {
  "buenos-aires": {
    name: "Buenos Aires",
    latitude: -34.6037,
    longitude: -58.3816
  },
  cordoba: {
    name: "Córdoba",
    latitude: -31.4201,
    longitude: -64.1888
  },
  rosario: {
    name: "Rosario",
    latitude: -32.9442,
    longitude: -60.6505
  },
  mendoza: {
    name: "Mendoza",
    latitude: -32.8895,
    longitude: -68.8458
  },
  bariloche: {
    name: "Bariloche",
    latitude: -41.1335,
    longitude: -71.3103
  },
  madrid: {
    name: "Madrid",
    latitude: 40.4168,
    longitude: -3.7038
  },
  mexico: {
    name: "Ciudad de México",
    latitude: 19.4326,
    longitude: -99.1332
  }
};

const WEATHER_CACHE_TIME = 15 * 60 * 1000;

const weatherClasses = [
  "weather-cloudy",
  "weather-rain",
  "weather-snow",
  "weather-fog",
  "weather-storm"
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ========================================
// RECUPERAR PROGRESO
// ========================================

const initialPet = {
  name: "Milo",
  food: 78,
  joy: 88,
  energy: 65,
  clean: 92,
  coins: 0,
  xp: 0,
  sleep: false,
  night: false,
  selectedFood: "strawberry",
  inventory: {},
  items: { blanket: 0 },
  blanketEquipped: false,
  last: Date.now()
};

const savedPet = readStorage("bruma-v1", {});

const pet = {
  ...initialPet,
  ...(savedPet && typeof savedPet === "object" && !Array.isArray(savedPet)
    ? savedPet
    : {})
};

for (const key of ["food", "joy", "energy", "clean", "coins", "xp"]) {
  if (!Number.isFinite(pet[key])) {
    pet[key] = initialPet[key];
  }
}

pet.coins = Math.max(0, Math.floor(pet.coins));
pet.xp = Math.max(0, Math.floor(pet.xp));

pet.name = typeof pet.name === "string" && pet.name.trim()
  ? pet.name.trim().slice(0, 18)
  : "Milo";

pet.sleep = pet.sleep === true;
pet.night = pet.night === true;

if (!Number.isFinite(pet.last)) {
  pet.last = Date.now();
}

const oldInventory = pet.inventory;

pet.inventory = {};

for (const food of foods) {
  const quantity = oldInventory?.[food.id];

  pet.inventory[food.id] =
    Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : 0;
}

if (!foods.some((food) => food.id === pet.selectedFood)) {
  pet.selectedFood = "strawberry";
}

pet.items = {
  blanket: pet.items?.blanket === 1 ? 1 : 0
};

pet.blanketEquipped =
  pet.items.blanket === 1 && pet.blanketEquipped === true;

// ========================================
// VARIABLES DE SESIÓN
// ========================================

let sound = false;
let audio = null;
let playing = null;
let starTimer = null;
let previousLevel = null;
let levelUpTimer = null;

let bathing = false;
let bathPointer = null;
let bathProgress = 0;
let bathLastPoint = null;
let bathFoamDistance = 0;

let weatherTemperature = null;
let weatherLoading = false;
let weatherCity = "buenos-aires";
let weatherCache = readStorage("bruma-weather-cache", {});

if (!weatherCache || typeof weatherCache !== "object" || Array.isArray(weatherCache)) {
  weatherCache = {};
}

try {
  const storedCity = localStorage.getItem("bruma-weather-city");

  if (Object.hasOwn(weatherCities, storedCity)) {
    weatherCity = storedCity;
  }
} catch {
  // El clima funciona aunque no haya almacenamiento disponible.
}

const bath = $("#bath");
const sponge = $("#bath-sponge");
const canvas = $("#skate-canvas");
const ctx = canvas.getContext("2d");

const skate = {
  width: 600,
  height: 320,
  ground: 272,
  running: false,
  paused: false,
  frame: 0,
  lastTime: 0,
  distance: 0,
  stars: 0,
  record: 0,
  speed: 220,
  obstacleTimer: 0,
  nextObstacle: 1.5,
  starTimer: 0,
  obstacles: [],
  collectibles: [],
  player: {
    x: 60,
    y: 0,
    width: 72,
    height: 72,
    velocity: 0,
    grounded: true
  }
};

try {
  const record = Number(localStorage.getItem("bruma-skate-record"));

  if (Number.isFinite(record) && record >= 0) {
    skate.record = Math.floor(record);
  }
} catch {
  // Conservar el récord de esta sesión.
}

const skateDragon = new Image();
let skateDragonReady = false;

// ========================================
// GUARDADO, SONIDO Y EFECTOS
// ========================================

function save() {
  pet.last = Date.now();

  const saved = writeStorage("bruma-v1", pet);

  $("#saved").textContent = saved
    ? "✓ Tu aventura se guarda automáticamente"
    : "El guardado no está disponible en este navegador";
}

function say(message) {
  $("#speech").textContent = message;
}

function selectedFood() {
  return foods.find((food) => food.id === pet.selectedFood);
}

function tone() {
  if (!sound) return;

  try {
    const Audio = window.AudioContext || window.webkitAudioContext;

    if (!Audio) return;

    audio ??= new Audio();
    audio.resume().catch(() => {});

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.frequency.setValueAtTime(560, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      900,
      audio.currentTime + 0.13
    );

    gain.gain.setValueAtTime(0.04, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + 0.25
    );

    oscillator.start();
    oscillator.stop(audio.currentTime + 0.25);
  } catch {
    // Continuar sin sonido.
  }
}

function effect(symbol) {
  tone();

  const dragon = $("#dragon");

  dragon.classList.remove("bounce");
  void dragon.offsetWidth;
  dragon.classList.add("bounce");

  const particle = document.createElement("span");

  particle.className = "particle";
  particle.textContent = symbol;
  particle.style.left = `${random(40, 60)}%`;

  $("#particles").append(particle);

  setTimeout(() => particle.remove(), 1500);
}

$("#dragon").addEventListener("animationend", (event) => {
  if (event.animationName === "honey-happy") {
    $("#dragon").classList.remove("bounce");
  }
});

// ========================================
// EXPERIENCIA E INTERFAZ
// ========================================

function updateExperience() {
  const level = 1 + Math.floor(pet.xp / 100);
  const progress = pet.xp % 100;

  $("#level").textContent = level;
  $("#xp-text").textContent = `${progress} / 100 XP`;
  $("#xp-next").textContent = `Nivel ${level + 1}`;
  $("#xp-fill").style.width = `${progress}%`;

  $("#xp-track").setAttribute("aria-valuenow", progress);
  $("#xp-track").setAttribute(
    "aria-valuetext",
    `Nivel ${level}. ${progress} de 100 XP.`
  );

  if (previousLevel !== null && level > previousLevel) {
    celebrateLevelUp(level);
  }

  previousLevel = level;
}

function celebrateLevelUp(level) {
  clearTimeout(levelUpTimer);

  const toast = $("#level-toast");
  const host = $("#skate-dialog").open
    ? $(".skate-stage")
    : $("#world");

  host.append(toast);
  $("#level-toast-title").textContent = `¡Nivel ${level}!`;
  toast.hidden = false;
  tone();

  levelUpTimer = setTimeout(() => {
    toast.hidden = true;
    $("#world").append(toast);
  }, 3000);
}

function render() {
  for (const key of ["food", "joy", "energy", "clean"]) {
    pet[key] = clamp(pet[key]);
  }

  $("#petname").textContent = pet.name;
  $("#coins").textContent = pet.coins;

  updateExperience();

  const needs = [
    ["food", "Saciedad", "🍎"],
    ["joy", "Felicidad", "❤️"],
    ["energy", "Energía", "🌙"],
    ["clean", "Limpieza", "💧"]
  ];

  $("#stats").innerHTML = needs.map(([key, label, icon]) => {
    const value = Math.round(pet[key]);

    return `
      <div
        class="need-item"
        role="progressbar"
        aria-label="${label}"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="${value}"
        title="${label}: ${value}%"
      >
        <div class="need-icon" aria-hidden="true">
          <span class="icon-empty">${icon}</span>
          <span
            class="icon-filled"
            style="clip-path: inset(${100 - value}% 0 0 0)"
          >${icon}</span>
        </div>
      </div>
    `;
  }).join("");

  const world = $("#world");

  world.classList.toggle("night", pet.night);
  world.classList.toggle("sleeping", pet.sleep);

  $("#sleep-label").textContent = pet.sleep ? "Despertar" : "Dormir";
  $("#night").textContent = pet.night
    ? "☀ Cambiar a día"
    : "☾ Cambiar a noche";

  const equipped = pet.items.blanket === 1 && pet.blanketEquipped;
  const cold = Number.isFinite(weatherTemperature) && weatherTemperature <= 10;

  $("#blanket-action").hidden = pet.items.blanket !== 1;
  $("#blanket-action").setAttribute("aria-pressed", String(equipped));
  $("#blanket-action b").textContent = equipped ? "Quitar mantita" : "Abrigar";
  $("#blanket-status").hidden = !equipped;

  world.classList.toggle("wearing-blanket", equipped);
  world.classList.toggle("feeling-cold", cold && !equipped);

  let mood = "Feliz de verte";

  if (pet.sleep) mood = "Soñando con aventuras";
  else if (pet.food < 25) mood = "Con ganas de comer algo";
  else if (pet.energy < 25) mood = "Un poquito cansado";
  else if (pet.clean < 25) mood = "Necesita un chapuzón";
  else if (pet.joy < 30) mood = "Quiere jugar con vos";
  else if (cold && !equipped) mood = "Con un poquito de frío";

  $("#mood").textContent = mood;

  const food = selectedFood();
  const quantity = pet.inventory[food.id];

  $("#feed-icon").textContent = food.icon;
  $("#feed-description").textContent = food.name;
  $("#feed-count").textContent = quantity;

  $("#feed-picker").setAttribute(
    "aria-label",
    `Abrir inventario. Seleccionado: ${food.name}`
  );

  $(".feed-use").classList.toggle("out-of-stock", quantity === 0);
  $(".feed-use").setAttribute(
    "aria-label",
    `Alimentar con ${food.name}. Disponibles: ${quantity}`
  );

  const total = Object.values(pet.inventory).reduce(
    (sum, count) => sum + count,
    pet.items.blanket
  );

  $("#inventory-count").textContent =
    `${total} ${total === 1 ? "item" : "items"}`;

  save();
}

// ========================================
// CUIDADOS
// ========================================

function equipBlanket() {
  if (playing || bathing) return;

  if (pet.items.blanket !== 1) {
    say("¡Una mantita de la tienda me vendría genial! 🧣");
    return;
  }

  pet.blanketEquipped = !pet.blanketEquipped;

  say(pet.blanketEquipped
    ? "¡Con mi mantita estoy calentito! 🧣"
    : "¡Guardamos la mantita para después!");

  effect("🧣");
  render();
}

function care(action) {
  if (playing) return;

  if (bathing) {
    say("¡Terminemos el baño primero!");
    return;
  }

  if (action === "blanket") {
    equipBlanket();
    return;
  }

  if (action === "sleep") {
    pet.sleep = !pet.sleep;
    pet.night = pet.sleep;

    say(pet.sleep
      ? "Zzz… bajo las estrellas se duerme mejor ☾"
      : "¡Buen día! ¿Qué aventura nos espera?");

    effect(pet.sleep ? "☾" : "☀");
    render();
    return;
  }

  if (pet.sleep) {
    say("Despertame primero para seguir jugando ☾");
    return;
  }

  if (action === "feed") {
    const food = selectedFood();

    if (pet.inventory[food.id] <= 0) {
      say("¡No queda esa comida! Elegí otra en el inventario.");
      return;
    }

    if (pet.food >= 100) {
      say("¡Estoy llenito! Guardemos la comida para después.");
      return;
    }

    pet.inventory[food.id]--;
    pet.food += food.food;
    pet.joy += food.joy;
    pet.xp += 5;

    say(food.message);
    effect(food.icon);
    render();
    return;
  }

  if (action === "wash") {
    startBath();
    return;
  }

  if (action === "play") {
    if (pet.energy < 15) {
      say("Necesito dormir un ratito antes de jugar.");
      return;
    }

    if (!$("#games-dialog").open) {
      $("#games-dialog").showModal();
    }
  }
}

$("#dragon").onclick = () => {
  if (playing || bathing) return;

  if (pet.sleep) {
    say("Zzz… estoy soñando con vos ☾");
    return;
  }

  pet.joy += 3;
  pet.xp++;

  const messages = [
    "¡Ese es mi lugar favorito!",
    "¡Otra caricia, por favor!",
    "Vos y yo, un gran equipo ♡"
  ];

  say(messages[Math.floor(Math.random() * messages.length)]);
  effect("♡");
  render();
};

// ========================================
// ARRASTRAR OBJETOS
// ========================================

function isOverDragon(x, y) {
  const rect = $("#dragon").getBoundingClientRect();

  return x >= rect.left && x <= rect.right &&
    y >= rect.top && y <= rect.bottom;
}

const dragIcons = {
  play: "✦",
  sleep: "🌙",
  wash: "🧽",
  blanket: "🧣"
};

document.querySelectorAll("[data-action]").forEach((button) => {
  let gesture = null;
  let ghost = null;
  let suppressClick = false;

  button.onclick = (event) => {
    if (suppressClick && event.detail !== 0) {
      suppressClick = false;
      return;
    }

    if (button.id === "feed-picker") {
      openInventory();
    } else {
      care(button.dataset.action);
    }
  };

  button.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    if (playing || bathing || gesture) return;

    suppressClick = false;

    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dragging: false
    };

    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;

    const distance = Math.hypot(
      event.clientX - gesture.x,
      event.clientY - gesture.y
    );

    if (!gesture.dragging && distance < 10) return;

    if (!gesture.dragging) {
      gesture.dragging = true;
      button.classList.add("is-dragging");

      ghost = document.createElement("div");
      ghost.className = "care-ghost";
      ghost.setAttribute("aria-hidden", "true");

      ghost.textContent = button.dataset.action === "feed"
        ? selectedFood().icon
        : dragIcons[button.dataset.action];

      document.body.append(ghost);
    }

    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;

    $("#dragon").classList.toggle(
      "drop-ready",
      isOverDragon(event.clientX, event.clientY)
    );
  });

  function finish(event, cancelled = false) {
    if (!gesture || gesture.id !== event.pointerId) return;

    const dragging = gesture.dragging;
    const dropped = dragging && !cancelled &&
      isOverDragon(event.clientX, event.clientY);

    gesture = null;
    ghost?.remove();
    ghost = null;

    button.classList.remove("is-dragging");
    $("#dragon").classList.remove("drop-ready");

    if (button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }

    suppressClick = dragging || cancelled;

    if (dropped) care(button.dataset.action);
    else if (dragging && !cancelled) say("¡Arrastrá el objeto hasta mí!");
  }

  button.addEventListener("pointerup", (event) => finish(event));
  button.addEventListener("pointercancel", (event) => finish(event, true));
  button.addEventListener("lostpointercapture", (event) => finish(event, true));
});

// ========================================
// TIENDA E INVENTARIO
// ========================================

function renderFoodShop() {
  $("#food-balance").textContent = pet.coins;

  $("#food-list").innerHTML = foods.map((food) => {
    const affordable = pet.coins >= food.price;

    return `
      <article class="food-card">
        <span class="food-emoji" aria-hidden="true">${food.icon}</span>
        <div class="food-info">
          <h3>${food.name}</h3>
          <p>+${food.food} saciedad · +${food.joy} felicidad</p>
          <strong class="food-price">${food.price} ✦</strong>
          <small class="food-owned">
            En inventario: ${pet.inventory[food.id]}
          </small>
        </div>
        <button
          type="button"
          class="food-buy"
          data-food="${food.id}"
          ${affordable ? "" : "disabled"}
        >
          ${affordable ? "Comprar +1" : `Faltan ${food.price - pet.coins} ✦`}
        </button>
      </article>
    `;
  }).join("");

  const owned = pet.items.blanket === 1;
  const affordable = pet.coins >= blanketItem.price;

  $("#food-list").insertAdjacentHTML("beforeend", `
    <article class="food-card">
      <span class="food-emoji" aria-hidden="true">🧣</span>
      <div class="food-info">
        <h3>${blanketItem.name}</h3>
        <p>Accesorio permanente. Se puede poner y quitar.</p>
        <strong class="food-price">${blanketItem.price} ✦</strong>
        <small class="food-owned">
          ${owned ? "Ya está en tu inventario" : "Abriga cuando hace frío"}
        </small>
      </div>
      <button
        type="button"
        class="food-buy"
        data-buy-blanket
        ${owned || !affordable ? "disabled" : ""}
      >
        ${owned ? "✓ Comprada" : affordable
          ? "Comprar"
          : `Faltan ${blanketItem.price - pet.coins} ✦`}
      </button>
    </article>
  `);
}

$("#open-shop").onclick = () => {
  if (playing || bathing) {
    say("¡Terminemos lo que estamos haciendo primero!");
    return;
  }

  renderFoodShop();
  $("#food-message").textContent =
    "Las compras se guardan en tu inventario.";

  if (!$("#food-dialog").open) $("#food-dialog").showModal();
};

$("#food-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-food], [data-buy-blanket]");

  if (!button || button.disabled || playing || bathing) return;

  let message;

  if (button.hasAttribute("data-buy-blanket")) {
    if (pet.items.blanket || pet.coins < blanketItem.price) return;

    pet.coins -= blanketItem.price;
    pet.items.blanket = 1;

    message = "¡Mantita guardada! Podés equiparla desde Abrigar.";
  } else {
    const food = foods.find((item) => item.id === button.dataset.food);

    if (!food || pet.coins < food.price) return;

    pet.coins -= food.price;
    pet.inventory[food.id]++;
    pet.selectedFood = food.id;

    message = `¡Compraste ${food.name}! Ya está seleccionada para alimentar.`;
  }

  render();
  renderFoodShop();
  tone();
  $("#food-message").textContent = message;
});

function renderInventory() {
  const available = foods.filter((food) => pet.inventory[food.id] > 0);

  $("#inventory-list").innerHTML = available.map((food) => `
    <article class="food-card ${
      pet.selectedFood === food.id ? "inventory-selected" : ""
    }">
      <span class="food-emoji" aria-hidden="true">${food.icon}</span>
      <div class="food-info">
        <h3>${food.name}</h3>
        <p>+${food.food} saciedad · +${food.joy} felicidad</p>
        <small class="food-owned">Disponibles: ${pet.inventory[food.id]}</small>
      </div>
      <button
        type="button"
        class="food-buy"
        data-select-food="${food.id}"
      >
        ${pet.selectedFood === food.id ? "✓ Equipada" : "Seleccionar"}
      </button>
    </article>
  `).join("");

  if (pet.items.blanket) {
    $("#inventory-list").insertAdjacentHTML("beforeend", `
      <article class="food-card ${pet.blanketEquipped ? "inventory-selected" : ""}">
        <span class="food-emoji" aria-hidden="true">🧣</span>
        <div class="food-info">
          <h3>${blanketItem.name}</h3>
          <p>Accesorio permanente · disponible: 1</p>
        </div>
        <button type="button" class="food-buy" data-toggle-blanket>
          ${pet.blanketEquipped ? "Quitar" : "Abrigar"}
        </button>
      </article>
    `);
  }

  if (!available.length && !pet.items.blanket) {
    $("#inventory-list").innerHTML = `
      <div class="inventory-empty">
        🧺
        <p>Tu inventario está vacío.</p>
        <small>Visitá la tienda para comprar provisiones.</small>
      </div>
    `;
  }

  $("#inventory-message").textContent =
    "La comida se consume al alimentar. La mantita se reutiliza.";
}

function openInventory() {
  if (playing || bathing) {
    say("¡Terminemos lo que estamos haciendo primero!");
    return;
  }

  renderInventory();

  if (!$("#inventory-dialog").open) $("#inventory-dialog").showModal();
}

$("#inventory-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-food], [data-toggle-blanket]");

  if (!button || playing || bathing) return;

  if (button.hasAttribute("data-toggle-blanket")) {
    equipBlanket();
  } else {
    const food = foods.find((item) => item.id === button.dataset.selectFood);

    if (!food || pet.inventory[food.id] <= 0) return;

    pet.selectedFood = food.id;
    render();
    tone();
    say(`${food.icon} ${food.name}: lista para comer.`);
  }

  $("#inventory-dialog").close();
});

// ========================================
// BAÑO
// ========================================

function updateBathProgress() {
  $("#bath-fill").style.width = `${bathProgress}%`;
  $("#bath-progress").setAttribute("aria-valuenow", Math.round(bathProgress));
}

function moveSponge(event) {
  const rect = bath.getBoundingClientRect();

  sponge.style.left = `${event.clientX - rect.left}px`;
  sponge.style.top = `${event.clientY - rect.top}px`;
}

function startBath() {
  if (playing || bathing || pet.sleep) return;

  bathing = true;
  bathPointer = null;
  bathLastPoint = null;
  bathProgress = 0;
  bathFoamDistance = 0;

  $("#bath-foam").replaceChildren();
  updateBathProgress();

  bath.hidden = false;
  $("#world").classList.add("bathing");

  sponge.style.left = "70%";
  sponge.style.top = "65%";

  say("¡Frotame con la esponjita! 🧽");
  $("#close-bath").focus();
}

function stopBath(completed = false) {
  if (!bathing) return;

  bathing = false;
  const pointer = bathPointer;

  bathPointer = null;
  bathLastPoint = null;

  if (pointer !== null && bath.hasPointerCapture(pointer)) {
    bath.releasePointerCapture(pointer);
  }

  bath.hidden = true;
  $("#world").classList.remove("bathing");
  $("#bath-foam").replaceChildren();

  if (completed) {
    pet.clean = 100;
    pet.joy += 8;
    pet.xp += 10;

    say("¡Ahora sí! Limpito y listo para otra aventura 🫧");
    effect("✨");
  } else {
    say("¡Seguimos el baño cuando quieras!");
  }

  render();
  $('[data-action="wash"]').focus();
}

$("#close-bath").onclick = () => stopBath();

bath.addEventListener("pointerdown", (event) => {
  if (!bathing || !event.isPrimary || event.button !== 0) return;
  if (event.target.closest(".bath-panel") || bathPointer !== null) return;

  event.preventDefault();
  bathPointer = event.pointerId;
  bathLastPoint = { x: event.clientX, y: event.clientY };

  moveSponge(event);
  bath.setPointerCapture(event.pointerId);
});

bath.addEventListener("pointermove", (event) => {
  if (!bathing) return;
  if (event.target.closest(".bath-panel") && bathPointer === null) return;

  moveSponge(event);

  if (bathPointer !== event.pointerId || !bathLastPoint) return;

  event.preventDefault();

  const previous = bathLastPoint;
  bathLastPoint = { x: event.clientX, y: event.clientY };

  if (!isOverDragon(previous.x, previous.y) ||
      !isOverDragon(event.clientX, event.clientY)) return;

  const distance = Math.min(45, Math.hypot(
    event.clientX - previous.x,
    event.clientY - previous.y
  ));

  const requiredDistance = Math.max(
    1,
    $("#dragon").getBoundingClientRect().width * 6
  );

  bathProgress = Math.min(100, bathProgress + distance / requiredDistance * 100);
  bathFoamDistance += distance;
  updateBathProgress();

  if (bathFoamDistance >= 24) {
    bathFoamDistance = 0;

    const rect = bath.getBoundingClientRect();
    const bubble = document.createElement("span");

    bubble.className = "bath-bubble";
    bubble.textContent = "🫧";
    bubble.style.left = `${event.clientX - rect.left}px`;
    bubble.style.top = `${event.clientY - rect.top}px`;

    $("#bath-foam").append(bubble);
    setTimeout(() => bubble.remove(), 900);
  }

  if (bathProgress >= 100) stopBath(true);
});

function releaseBathPointer(event) {
  if (bathPointer !== event.pointerId) return;

  bathPointer = null;
  bathLastPoint = null;

  if (bath.hasPointerCapture(event.pointerId)) {
    bath.releasePointerCapture(event.pointerId);
  }
}

bath.addEventListener("pointerup", releaseBathPointer);
bath.addEventListener("pointercancel", releaseBathPointer);
bath.addEventListener("lostpointercapture", releaseBathPointer);

document.addEventListener("keydown", (event) => {
  if (bathing && event.key === "Escape") {
    event.preventDefault();
    stopBath();
  }
});

// ========================================
// ATRAPAR ESTRELLAS
// ========================================

function moveStar() {
  const game = $("#game");
  const star = $("#star");

  const width = Math.max(0, game.clientWidth - star.offsetWidth - 24);
  const height = Math.max(0, game.clientHeight - star.offsetHeight - 72);

  star.style.left = `${12 + Math.random() * width}px`;
  star.style.top = `${60 + Math.random() * height}px`;
}

function startGame() {
  if (playing || bathing || pet.sleep) return;

  if (pet.energy < 15) {
    say("Necesito descansar antes de jugar.");
    return;
  }

  playing = "stars";
  let seconds = 15;
  let caught = 0;

  $("#game").hidden = false;
  $("#timer").textContent = seconds;
  moveStar();

  say("¡Atrapá todas las estrellas que puedas!");

  $("#star").onclick = () => {
    if (playing !== "stars") return;

    caught++;
    pet.coins += 2;
    pet.xp += 3;

    tone();
    moveStar();
    render();
  };

  clearInterval(starTimer);

  starTimer = setInterval(() => {
    seconds--;
    $("#timer").textContent = seconds;

    if (seconds > 0) return;

    clearInterval(starTimer);
    starTimer = null;
    playing = null;

    $("#game").hidden = true;
    $("#star").onclick = null;

    pet.joy += Math.min(30, caught * 4);
    pet.energy -= 12;

    say(`¡Atrapaste ${caught} estrellas! Ganaste ${caught * 2} ✦`);
    effect("✦");
    render();
  }, 1000);
}

$("#choose-stars").onclick = () => {
  $("#games-dialog").close();
  startGame();
};

// ========================================
// SKATE: IMAGEN Y PREPARACIÓN
// ========================================
function prepareSkateDragon() {
  skateDragonReady = false;

  const original = document.querySelector("#dragon svg");
  if (!original) return;

  const copy = original.cloneNode(true);

  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", "360");
  copy.setAttribute("height", "330");

  // En el skate aparece despierto.
  const eyes = copy.querySelector(".eyes");

  if (eyes) {
    eyes.style.display = "inline";
    eyes.style.animation = "none";
    eyes.style.transform = "none";
  }

  copy.querySelector(".original-sleep-eyes")?.remove();

  // Conserva la mantita si está equipada.
  const blanket = copy.querySelector("#dragon-blanket");

  if (blanket) {
    blanket.style.display =
      pet.items.blanket === 1 && pet.blanketEquipped
        ? "inline"
        : "none";
  }

  const svgText = new XMLSerializer().serializeToString(copy);

  skateDragon.onload = () => {
    skateDragonReady = true;

    if (!skate.running) {
      drawSkate();
    }
  };

  skateDragon.onerror = () => {
    skateDragonReady = false;

    document.querySelector("#skate-result").textContent =
      "No se pudo preparar el dragón para el skate.";
  };

  skateDragon.src =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
}
// ========================================
// SKATE: FÍSICA
// ========================================

function updateSkate(delta) {
  const player = skate.player;

  skate.speed = Math.min(360, 220 + skate.distance * 0.018);
  skate.distance += skate.speed * delta;

  player.velocity += 1900 * delta;
  player.y += player.velocity * delta;

  const floor = skate.ground - player.height;

  if (player.y >= floor) {
    player.y = floor;
    player.velocity = 0;
    player.grounded = true;
  }

  skate.obstacleTimer += delta;
  skate.starTimer += delta;

  if (skate.obstacleTimer >= skate.nextObstacle) {
    skate.obstacleTimer = 0;
    skate.nextObstacle = random(1.3, 1.95);

    const height = random(28, 45);

    skate.obstacles.push({
      x: skate.width + 35,
      y: skate.ground - height,
      width: random(27, 39),
      height,
      type: Math.random() > 0.5 ? "rock" : "log"
    });
  }

  if (skate.starTimer >= 0.9) {
    skate.starTimer = 0;

    skate.collectibles.push({
      x: skate.width + 25,
      y: skate.ground - (Math.random() > 0.5 ? 110 : 45),
      width: 24,
      height: 24
    });
  }

  for (const item of [...skate.obstacles, ...skate.collectibles]) {
    item.x -= skate.speed * delta;
  }

  const hitbox = {
    x: player.x + 16,
    y: player.y + 14,
    width: player.width - 32,
    height: player.height - 19
  };

  for (const obstacle of skate.obstacles) {
    const obstacleBox = {
      x: obstacle.x + 4,
      y: obstacle.y + 5,
      width: obstacle.width - 8,
      height: obstacle.height - 5
    };

    if (intersects(hitbox, obstacleBox)) {
      finishSkate("¡Ups! Un obstáculo.");
      return;
    }
  }

  skate.collectibles = skate.collectibles.filter((star) => {
    if (intersects(player, star)) {
      skate.stars++;
      tone();
      return false;
    }

    return star.x + star.width > -10;
  });

  skate.obstacles = skate.obstacles.filter(
    (obstacle) => obstacle.x + obstacle.width > -10
  );

  updateSkateScore();
}

// ========================================
// SKATE: DIBUJO
// ========================================

function drawSkate() {
  const { width, height, ground, player } = skate;

  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, pet.night ? "#344464" : "#c9e5e5");
  sky.addColorStop(1, pet.night ? "#647777" : "#eef0ce");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#fff0bc";
  ctx.beginPath();
  ctx.arc(width - 65, 55, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pet.night ? "#69718b" : "#bbb2d2";
  ctx.beginPath();
  ctx.moveTo(0, ground);
  ctx.lineTo(0, ground - 65);
  ctx.lineTo(width * 0.2, ground - 135);
  ctx.lineTo(width * 0.45, ground - 55);
  ctx.lineTo(width * 0.72, ground - 125);
  ctx.lineTo(width, ground - 70);
  ctx.lineTo(width, ground);
  ctx.fill();

  ctx.fillStyle = pet.night ? "#597061" : "#a5c58d";
  ctx.beginPath();
  ctx.ellipse(width * 0.3, ground + 25, width * 0.7, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#cdb896";
  ctx.fillRect(0, ground, width, height - ground);

  ctx.fillStyle = "#839668";
  ctx.fillRect(0, ground, width, 5);

  ctx.fillStyle = "#ae9274";

  for (let x = -75; x < width + 75; x += 75) {
    ctx.fillRect(x - skate.distance % 75, ground + 25, 26, 3);
  }

  for (const obstacle of skate.obstacles) {
    if (obstacle.type === "log") {
      ctx.fillStyle = "#947050";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      ctx.fillStyle = "#bc976d";
      ctx.fillRect(obstacle.x + 4, obstacle.y + 4, 5, obstacle.height - 4);
    } else {
      ctx.fillStyle = "#87958c";
      ctx.beginPath();
      ctx.moveTo(obstacle.x, ground);
      ctx.lineTo(obstacle.x + 4, obstacle.y + 10);
      ctx.lineTo(obstacle.x + obstacle.width * 0.55, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width - 3, obstacle.y + 10);
      ctx.lineTo(obstacle.x + obstacle.width, ground);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.font = "27px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#bc8b38";

  for (const star of skate.collectibles) {
    ctx.fillText("✦", star.x + 12, star.y + 12);
  }

  if (skateDragonReady && skateDragon.naturalWidth > 0) {
    const scale = Math.min(
      (player.width + 16) / skateDragon.naturalWidth,
      (player.height + 8) / skateDragon.naturalHeight
    );

    const drawWidth = skateDragon.naturalWidth * scale;
    const drawHeight = skateDragon.naturalHeight * scale;

    ctx.imageSmoothingEnabled = true;

    ctx.drawImage(
      skateDragon,
      player.x + player.width / 2 - drawWidth / 2,
      player.y + player.height - 1 - drawHeight,
      drawWidth,
      drawHeight
    );
  } else {
    ctx.font = "44px sans-serif";
    ctx.fillText("🐉", player.x + player.width / 2, player.y + player.height / 2);
  }

  const boardY = player.y + player.height - 1;

  ctx.strokeStyle = "#8562a2";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(player.x + 3, boardY);
  ctx.lineTo(player.x + player.width - 3, boardY);
  ctx.stroke();

  ctx.fillStyle = "#344b40";

  for (const wheel of [player.x + 14, player.x + player.width - 14]) {
    ctx.beginPath();
    ctx.arc(wheel, boardY + 5, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function skateLoop(time) {
  if (!skate.running || skate.paused) return;

  const delta = skate.lastTime
    ? Math.min((time - skate.lastTime) / 1000, 0.035)
    : 0;

  skate.lastTime = time;

  updateSkate(delta);
  drawSkate();

  if (skate.running && !skate.paused) {
    skate.frame = requestAnimationFrame(skateLoop);
  }
}

function finishSkate(message = "¡Buen recorrido!") {
  if (!skate.running) return;

  skate.running = false;
  skate.paused = false;
  playing = null;

  cancelAnimationFrame(skate.frame);

  const meters = Math.floor(skate.distance / 10);
  const reward = skate.stars * 2;

  pet.coins += reward;
  pet.xp += skate.stars * 3;
  pet.joy += Math.min(15, skate.stars * 2);
  pet.energy -= 8;

  if (meters > skate.record) {
    skate.record = meters;

    try {
      localStorage.setItem("bruma-skate-record", String(meters));
    } catch {
      // Conservar el récord durante esta sesión.
    }
  }

  render();
  updateSkateScore();

  $("#skate-message").textContent = message;
  $("#skate-result").textContent =
    `Recorriste ${meters} m y recogiste ${skate.stars} estrellas. ` +
    `¡Ganaste ${reward} ✦!`;

  $("#skate-start").textContent = "Otra carrera";
  $("#skate-overlay").hidden = false;

  say(`¡Qué paseo! Ganamos ${reward} de polvo de estrellas 🛹`);
}

$("#skate-start").onclick = () => {
  if (skate.running && skate.paused) {
    skate.paused = false;
    skate.lastTime = 0;
    $("#skate-overlay").hidden = true;
    canvas.focus();
    skate.frame = requestAnimationFrame(skateLoop);
  } else {
    startSkate();
  }
};

canvas.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary) return;

  event.preventDefault();
  jumpSkate();
});

$("#skate-dialog").addEventListener("keydown", (event) => {
  if (skate.running && !skate.paused &&
      ["Space", "ArrowUp"].includes(event.code)) {
    event.preventDefault();
    jumpSkate();
  }
});

$("#skate-dialog").addEventListener("close", () => {
  if (skate.running) finishSkate("¡Carrera guardada!");
  cancelAnimationFrame(skate.frame);
});

window.addEventListener("resize", () => {
  if (playing === "stars") moveStar();
  if (!$("#skate-dialog").open) return;

  if (skate.running) finishSkate("¡Cambiamos de pista!");

  resizeSkate();
  drawSkate();
});

// ========================================
// CLIMA
// ========================================

function describeWeather(code) {
  if ([95, 96, 99].includes(code)) {
    return { type: "storm", icon: "⛈️", label: "Tormenta" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { type: "snow", icon: "❄️", label: "Nieve" };
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { type: "rain", icon: "🌧️", label: "Lluvia" };
  }

  if ([45, 48].includes(code)) {
    return { type: "fog", icon: "🌫️", label: "Niebla" };
  }

  if ([2, 3].includes(code)) {
    return { type: "cloudy", icon: "☁️", label: "Nublado" };
  }

  return { type: "clear", icon: "☀️", label: "Despejado" };
}

function validWeather(record) {
  return record &&
    Number.isFinite(record.temperature) &&
    Number.isInteger(record.code) &&
    Number.isFinite(record.fetchedAt);
}

function weatherParticles(type) {
  const container = $("#weather-particles");

  container.replaceChildren();

  const snow = type === "snow";
  if (!snow && type !== "rain" && type !== "storm") return;

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < (snow ? 22 : 32); i++) {
    const particle = document.createElement("span");
    const duration = snow ? random(5, 9) : random(0.9, 1.5);

    particle.className = snow ? "weather-flake" : "weather-drop";
    particle.style.left = `${random(0, 115)}%`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${-Math.random() * duration}s`;

    fragment.append(particle);
  }

  container.append(fragment);
}

function applyWeather(record, stale = false, announce = false) {
  weatherTemperature = record.temperature;

  const info = describeWeather(record.code);

  $("#world").classList.remove(...weatherClasses);

  if (info.type !== "clear") {
    $("#world").classList.add(`weather-${info.type}`);
  }

  weatherParticles(info.type);

  $("#weather-icon").textContent = info.icon;
  $("#weather-description").textContent =
    `${Math.round(record.temperature)} °C · ${info.label}`;

  const time = new Date(record.fetchedAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  $("#weather-details").textContent =
    `${weatherCities[weatherCity].name} · ` +
    `${stale ? "último dato guardado" : "consultado"} a las ${time}`;

  render();

  if (!announce || playing || bathing || pet.sleep) return;

  if (record.temperature <= 10) {
    say(pet.blanketEquipped
      ? "¡Hace frío, pero con mi mantita estoy calentito! 🧣"
      : "¡Brrr! Hoy me vendría bien una mantita 🧣");
  } else if (record.temperature >= 28) {
    say("¡Qué calor! Un bañito vendría genial 🧽");
  } else {
    const messages = {
      clear: "¡Qué lindo clima para una aventura! 🌤️",
      cloudy: "¡Las nubes parecen dragones! ☁️",
      rain: "¡Está lloviendo! Nos quedamos cerquita 🌧️",
      storm: "¡Truenos! Me quedo cerquita de vos ⛈️",
      snow: "¡Podemos hacer un dragón de nieve! ❄️",
      fog: "¡El bosque está lleno de misterio! 🌫️"
    };

    say(messages[info.type]);
  }
}

async function loadWeather(force = false, announce = false) {
  if (weatherLoading) return;

  const cached = weatherCache[weatherCity];
  const age = validWeather(cached) ? Date.now() - cached.fetchedAt : Infinity;

  if (!force && age >= 0 && age < WEATHER_CACHE_TIME) {
    applyWeather(cached, false, announce);
    return;
  }

  weatherLoading = true;
  $("#weather-city").disabled = true;
  $("#weather-refresh").disabled = true;

  if (validWeather(cached)) {
    applyWeather(cached, true);
  } else {
    weatherTemperature = null;
    $("#world").classList.remove(...weatherClasses);
    $("#weather-particles").replaceChildren();
    $("#weather-description").textContent = "Consultando el clima…";
    render();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const city = weatherCities[weatherCity];
    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.search = new URLSearchParams({
      latitude: city.latitude,
      longitude: city.longitude,
      current: "temperature_2m,weather_code",
      timezone: "auto"
    }).toString();

    $("#weather-details").textContent = `Conectando con ${city.name}`;

    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) throw new Error("No se pudo consultar el clima.");

    const data = await response.json();

    const record = {
      temperature: data.current?.temperature_2m,
      code: data.current?.weather_code,
      fetchedAt: Date.now()
    };

    if (!validWeather(record)) throw new Error("Respuesta no válida.");

    weatherCache[weatherCity] = record;
    writeStorage("bruma-weather-cache", weatherCache);
    applyWeather(record, false, announce);
  } catch {
    if (validWeather(cached)) {
      applyWeather(cached, true);
    } else {
      weatherTemperature = null;
      $("#weather-icon").textContent = "🌿";
      $("#weather-description").textContent = "Clima no disponible";
      $("#weather-details").textContent = "Podés seguir jugando";
      render();
    }
  } finally {
    clearTimeout(timeout);
    weatherLoading = false;
    $("#weather-city").disabled = false;
    $("#weather-refresh").disabled = false;
  }
}

$("#weather-city").value = weatherCity;

$("#weather-city").onchange = () => {
  const city = $("#weather-city").value;

  if (!Object.hasOwn(weatherCities, city)) return;

  weatherCity = city;

  try {
    localStorage.setItem("bruma-weather-city", city);
  } catch {
    // Mantener la selección durante esta sesión.
  }

  loadWeather(false, true);
};

$("#weather-refresh").onclick = () => loadWeather(true, true);

// ========================================
// NOMBRE, DÍA Y SONIDO
// ========================================

$("#night").onclick = () => {
  if (bathing || playing) return;

  if (pet.sleep) {
    say("Dejemos la noche mientras duermo ☾");
    return;
  }

  pet.night = !pet.night;
  render();
};

$("#sound").onclick = () => {
  sound = !sound;

  $("#sound").setAttribute("aria-pressed", String(sound));
  $("#sound").setAttribute(
    "aria-label",
    sound ? "Desactivar sonido" : "Activar sonido"
  );

  $("#sound").title = sound ? "Desactivar sonido" : "Activar sonido";
  tone();
};

$("#rename").onclick = () => {
  if (bathing || playing) return;

  $("#name-input").value = pet.name;

  if (!$("#name-dialog").open) $("#name-dialog").showModal();
};

$("#name-dialog").addEventListener("close", () => {
  if ($("#name-dialog").returnValue !== "save") return;

  const name = $("#name-input").value.trim();

  if (!name) return;

  pet.name = name.slice(0, 18);
  say(`¡${pet.name}! Me encanta mi nombre ♡`);
  render();
});


// ========================================
// INICIO Y PASO DEL TIEMPO
// ========================================

const elapsed = Math.min(
  180,
  Math.max(0, (Date.now() - pet.last) / 60000)
);

pet.food -= elapsed * 0.15;
pet.clean -= elapsed * 0.1;
pet.energy += pet.sleep ? elapsed * 0.6 : -elapsed * 0.08;

if (pet.sleep && pet.energy >= 100) {
  pet.sleep = false;
  pet.night = false;
  say("¡Dormí increíble! ¿Qué hacemos hoy?");
} else if (pet.sleep) {
  pet.night = true;
}

render();
loadWeather(false, true);

setInterval(() => {
  pet.food -= 0.25;
  pet.clean -= 0.15;

  if (pet.sleep) {
    pet.energy += 3;
    pet.joy += 0.1;

    if (pet.energy >= 100) {
      pet.sleep = false;
      pet.night = false;
      say("¡Dormí increíble! ¿Qué hacemos hoy?");
    }
  } else {
    pet.energy -= 0.18;
    pet.joy -= 0.12;
  }

  render();
}, 10000);

setInterval(() => {
  if (!document.hidden) loadWeather();
}, WEATHER_CACHE_TIME);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();

    if (skate.running && !skate.paused) {
      skate.paused = true;
      cancelAnimationFrame(skate.frame);

      $("#skate-message").textContent = "En pausa";
      $("#skate-result").textContent = "Tu carrera te espera.";
      $("#skate-start").textContent = "Continuar";
      $("#skate-overlay").hidden = false;
    }
  } else {
    loadWeather();
  }
});

window.addEventListener("pagehide", save);

// ========================================
// COLORES DE LA MASCOTA
// ========================================

(() => {
  const dragonSvg = document.querySelector("#dragon svg");
  const dialog = document.querySelector("#appearance-dialog");
  const openButton = document.querySelector("#open-appearance");
  const options = document.querySelector("#appearance-colors");
  const current = document.querySelector("#appearance-current");

  if (!dragonSvg || !dialog || !openButton || !options || !current) {
    return;
  }

  // Cada posición corresponde a un color del SVG original.
  const originalColors = [
    "#b4d89b", // Piel clara
    "#70aa7b", // Piel oscura
    "#75a67b", // Cola
    "#92b39c", // Interior de las alas
    "#537f6c", // Bordes de las alas
    "#c5d6b1", // Líneas de las alas
    "#e4e6bc", // Pancita
    "#78a97d", // Patitas
    "#69936d", // Cresta
    "#5d906b", // Brazos
    "#527d57"  // Nariz
  ];

  const palettes = {
    forest: {
      name: "Bosque",
      colors: [...originalColors]
    },

    lavender: {
      name: "Lavanda",
      colors: [
        "#cfb8eb", "#987bb8", "#987caf",
        "#b5a0c9", "#79618f", "#e1d2ed",
        "#eee1c3", "#a086ba", "#806295",
        "#876a9d", "#765987"
      ]
    },

    sky: {
      name: "Cielo",
      colors: [
        "#b0dce9", "#72a9c5", "#78a9bd",
        "#9ac5d3", "#567f98", "#d4e8df",
        "#e9ebcc", "#7baec4", "#60869f",
        "#608fa9", "#52768d"
      ]
    },

    peach: {
      name: "Durazno",
      colors: [
        "#f2c79f", "#d39378", "#cb947b",
        "#dfb99a", "#a77763", "#f2ddbb",
        "#f5e8c7", "#d69b7e", "#b77d65",
        "#b98269", "#9d6c58"
      ]
    },

    rose: {
      name: "Rosa",
      colors: [
        "#efbdd0", "#c786a4", "#be87a2",
        "#d6a6bd", "#9c6984", "#efd7e1",
        "#f3e5cd", "#cb91ac", "#a86c89",
        "#aa718d", "#925b76"
      ]
    },

    mint: {
      name: "Menta",
      colors: [
        "#b5e7cf", "#73b9a5", "#78ad9b",
        "#9bcebb", "#568d7c", "#d7ecce",
        "#edf0ce", "#80baa4", "#629c88",
        "#609b85", "#50816f"
      ]
    }
  };

  /*
   * Recordamos qué partes usan cada color.
   * Así podemos cambiar de paleta varias veces sin perder
   * la referencia de los colores originales.
   */
  const colorTargets = [];

  dragonSvg
    .querySelectorAll("[fill], [stroke], [stop-color]")
    .forEach((element) => {
      for (const attribute of ["fill", "stroke", "stop-color"]) {
        const value = element.getAttribute(attribute)?.toLowerCase();
        const colorIndex = originalColors.indexOf(value);

        if (colorIndex !== -1) {
          colorTargets.push({
            element,
            attribute,
            colorIndex
          });
        }
      }
    });

  // Las partidas anteriores empiezan con el verde original.
  if (!Object.hasOwn(palettes, pet.appearanceColor)) {
    pet.appearanceColor = "forest";
  }

  function applyAppearance() {
    const palette = palettes[pet.appearanceColor];

    for (const target of colorTargets) {
      target.element.setAttribute(
        target.attribute,
        palette.colors[target.colorIndex]
      );
    }

    dragonSvg.setAttribute(
      "aria-label",
      `Dragoncito con alas y cuernos. Color ${palette.name}.`
    );

    options.querySelectorAll("[data-pet-color]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.petColor === pet.appearanceColor)
      );
    });

    current.textContent = `Color actual: ${palette.name}`;
  }

  // Creamos las opciones una sola vez para conservar el foco.
  for (const [id, palette] of Object.entries(palettes)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "appearance-option";
    button.dataset.petColor = id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Color ${palette.name}`);

    const swatch = document.createElement("span");
    swatch.className = "appearance-swatch";
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.setProperty("--color-light", palette.colors[0]);
    swatch.style.setProperty("--color-dark", palette.colors[1]);

    const label = document.createElement("span");
    label.textContent = palette.name;

    button.append(swatch, label);
    options.append(button);
  }

  openButton.addEventListener("click", () => {
    if (playing || bathing) {
      say("¡Terminemos esta actividad y elegimos un color!");
      return;
    }

    applyAppearance();

    if (!dialog.open) {
      dialog.showModal();
    }
  });

  options.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pet-color]");
    if (!button) return;

    const color = button.dataset.petColor;

    if (!Object.hasOwn(palettes, color)) return;

    pet.appearanceColor = color;
    applyAppearance();
    save();
  });

  applyAppearance();
  save();
})();

// ========================================
// SKATE: CONTROLES Y PREPARACIÓN DE LA PISTA
// ========================================

function resizeSkate() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  skate.width = Math.max(200, rect.width);
  skate.height = Math.max(220, rect.height);
  skate.ground = skate.height - 48;

  canvas.width = Math.round(skate.width * ratio);
  canvas.height = Math.round(skate.height * ratio);

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = true;

  skate.player.x = Math.min(65, skate.width * 0.14);

  if (skate.player.grounded) {
    skate.player.y = skate.ground - skate.player.height;
  }
}

function resetSkate() {
  cancelAnimationFrame(skate.frame);

  skate.running = false;
  skate.paused = false;
  skate.frame = 0;
  skate.lastTime = 0;

  skate.distance = 0;
  skate.stars = 0;
  skate.speed = 220;

  skate.obstacleTimer = 0;
  skate.nextObstacle = 1.5;
  skate.starTimer = 0;

  skate.obstacles = [];
  skate.collectibles = [];

  skate.player.velocity = 0;
  skate.player.grounded = true;
  skate.player.y = skate.ground - skate.player.height;
}

function updateSkateScore() {
  $("#skate-distance").textContent = Math.floor(skate.distance / 10);
  $("#skate-stars").textContent = skate.stars;
  $("#skate-record").textContent = skate.record;
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Elegir skate desde el menú de minijuegos.
$("#choose-skate").onclick = () => {
  if (playing || bathing || pet.sleep) return;

  $("#games-dialog").close();

  const dialog = $("#skate-dialog");

  if (!dialog.open) {
    dialog.showModal();
  }

  resizeSkate();
  resetSkate();

  $("#skate-message").textContent = "¡A rodar!";
  $("#skate-result").textContent =
    "Tocá la pista para saltar. Esquivá obstáculos y recogé estrellas.";
  $("#skate-start").textContent = "Empezar";
  $("#skate-overlay").hidden = false;

  updateSkateScore();
  drawSkate();

  // Copia el dragón con el color que hayas elegido.
  prepareSkateDragon();
};

function startSkate() {
  if (playing || bathing || pet.sleep || skate.running) return;

  if (pet.energy < 15) {
    $("#skate-result").textContent =
      "Tu dragón necesita descansar antes de jugar.";
    return;
  }

  resizeSkate();
  resetSkate();

  skate.running = true;
  skate.paused = false;
  playing = "skate";

  $("#skate-overlay").hidden = true;

  updateSkateScore();
  canvas.focus();

  skate.frame = requestAnimationFrame(skateLoop);
}

function jumpSkate() {
  if (
    !skate.running ||
    skate.paused ||
    !skate.player.grounded
  ) {
    return;
  }

  skate.player.velocity = -620;
  skate.player.grounded = false;
}