// ========================================
// ELEMENTOS Y CATÁLOGOS
// ========================================

const $ = (selector) => document.querySelector(selector);

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
    message: "¡Pizza! Este es el mejor día de mi vida."
  }
];

const blanketItem = {
  id: "blanket",
  name: "Mantita de estrellas",
  icon: "🧣",
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

const weatherClasses = [
  "weather-cloudy",
  "weather-rain",
  "weather-snow",
  "weather-fog",
  "weather-storm"
];

const WEATHER_CACHE_TIME = 15 * 60 * 1000;

// ========================================
// ESTADO Y PROGRESO
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
  items: {
    blanket: 0
  },
  blanketEquipped: false,
  last: Date.now()
};

let pet = {
  ...initialPet,
  inventory: {},
  items: { blanket: 0 }
};

try {
  const data = JSON.parse(localStorage.getItem("bruma-v1"));

  if (data && typeof data === "object" && !Array.isArray(data)) {
    Object.assign(pet, data);
  }
} catch {
  // Usar el estado inicial si no hay datos válidos.
}

for (const key of ["food", "joy", "energy", "clean", "coins", "xp"]) {
  if (!Number.isFinite(pet[key])) {
    pet[key] = initialPet[key];
  }
}

pet.coins = Math.max(0, Math.floor(pet.coins));
pet.xp = Math.max(0, Math.floor(pet.xp));

if (typeof pet.name !== "string" || !pet.name.trim()) {
  pet.name = "Milo";
}

pet.name = pet.name.trim().slice(0, 18);
pet.sleep = pet.sleep === true;
pet.night = pet.night === true;

if (!Number.isFinite(pet.last)) {
  pet.last = Date.now();
}

// Recuperar alimentos.
const storedInventory = pet.inventory;

pet.inventory = {};

for (const food of foods) {
  const quantity = storedInventory?.[food.id];

  pet.inventory[food.id] =
    Number.isSafeInteger(quantity) && quantity >= 0
      ? quantity
      : 0;
}

if (!foods.some((food) => food.id === pet.selectedFood)) {
  pet.selectedFood = "strawberry";
}

// Recuperar accesorios.
const savedItems = pet.items;

pet.items = {
  blanket: savedItems?.blanket === 1 ? 1 : 0
};

pet.blanketEquipped =
  pet.items.blanket === 1 && pet.blanketEquipped === true;

// ========================================
// VARIABLES DE LA SESIÓN
// ========================================

let sound = false;
let audio;

let playing = false;
let gameTimer;
let seconds = 15;

let bathing = false;
let bathPointer = null;
let bathProgress = 0;
let bathLastPoint = null;
let bathFoamDistance = 0;

const bath = $("#bath");
const sponge = $("#bath-sponge");

let weatherTemperature = null;
let weatherCity = "buenos-aires";
let weatherLoading = false;
let weatherCache = {};

const clamp = (number) => Math.max(0, Math.min(100, number));

try {
  const savedCity = localStorage.getItem("bruma-weather-city");

  if (Object.hasOwn(weatherCities, savedCity)) {
    weatherCity = savedCity;
  }

  const savedCache = JSON.parse(
    localStorage.getItem("bruma-weather-cache")
  );

  if (
    savedCache &&
    typeof savedCache === "object" &&
    !Array.isArray(savedCache)
  ) {
    weatherCache = savedCache;
  }
} catch {
  // Continuar con la configuración inicial.
}

function selectedFood() {
  return foods.find((food) => food.id === pet.selectedFood);
}

function save() {
  pet.last = Date.now();

  try {
    localStorage.setItem("bruma-v1", JSON.stringify(pet));
  } catch {
    $("#saved").textContent =
      "El guardado no está disponible en este navegador";
  }
}

function say(text) {
  $("#speech").textContent = text;
}

// ========================================
// INTERFAZ
// ========================================

function updateFoodItem() {
  const food = selectedFood();
  const quantity = pet.inventory[food.id];

  $("#feed-icon").textContent = food.icon;
  $("#feed-description").textContent = food.name;
  $("#feed-count").textContent = quantity;

  $("#feed-picker").setAttribute(
    "aria-label",
    `Abrir inventario. Comida seleccionada: ${food.name}`
  );

  $(".feed-use").classList.toggle("out-of-stock", quantity === 0);

  $(".feed-use").setAttribute(
    "aria-label",
    `Alimentar con ${food.name}. Disponibles: ${quantity}`
  );

  const total =
    Object.values(pet.inventory)
      .reduce((sum, quantity) => sum + quantity, 0) +
    pet.items.blanket;

  $("#inventory-count").textContent =
    `${total} ${total === 1 ? "item" : "items"}`;
}

function updateBlanketUI() {
  const ownsBlanket = pet.items.blanket === 1;
  const equipped = ownsBlanket && pet.blanketEquipped;

  const isCold =
    Number.isFinite(weatherTemperature) &&
    weatherTemperature <= 10;

  $("#dragon-blanket").toggleAttribute("hidden", !equipped);
  $("#blanket-action").hidden = !ownsBlanket;

  $("#world").classList.toggle("wearing-blanket", equipped);

  $("#world").classList.toggle(
    "feeling-cold",
    isCold && !equipped && !pet.sleep && !bathing
  );
}

function render() {
  for (const key of ["food", "joy", "energy", "clean"]) {
    pet[key] = clamp(pet[key]);
  }

  $("#petname").textContent = pet.name;
  $("#coins").textContent = pet.coins;
  $("#level").textContent = 1 + Math.floor(pet.xp / 100);

  const stats = [
    ["food", "Saciedad", "🍎"],
    ["joy", "Felicidad", "❤️"],
    ["energy", "Energía", "🌙"],
    ["clean", "Limpieza", "💧"]
  ];

  $("#stats").innerHTML = stats
    .map(([key, label, icon]) => {
      const value = Math.round(pet[key]);

      return `
        <div
          class="need-item"
          role="progressbar"
          aria-label="${label}"
          aria-valuenow="${value}"
          aria-valuemin="0"
          aria-valuemax="100"
          title="${label}"
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
    })
    .join("");

  $("#world").classList.toggle("night", pet.night);
  $("#world").classList.toggle("sleeping", pet.sleep);

  $("#sleep-label").textContent = pet.sleep ? "Despertar" : "Dormir";

  $("#night").textContent = pet.night
    ? "☀ Cambiar a día"
    : "☾ Cambiar a noche";

  let mood = "Feliz de verte";

  if (pet.sleep) {
    mood = "Soñando con aventuras";
  } else if (pet.food < 25) {
    mood = "Con ganas de comer algo";
  } else if (pet.energy < 25) {
    mood = "Un poquito cansado";
  } else if (pet.clean < 25) {
    mood = "Necesita un chapuzón";
  } else if (pet.joy < 30) {
    mood = "Quiere jugar con vos";
  } else if (
    weatherTemperature !== null &&
    weatherTemperature <= 10 &&
    !pet.blanketEquipped
  ) {
    mood = "Con un poquito de frío";
  }

  $("#mood").textContent = mood;

  let color = "#b4d89b";

  if (pet.joy < 30) {
    color = "#b8b4da";
  } else if (pet.food < 25) {
    color = "#d9c58f";
  }

  $("#skin stop").setAttribute("stop-color", color);

  updateFoodItem();
  updateBlanketUI();
  save();
}

// ========================================
// SONIDOS Y EFECTOS
// ========================================

function tone() {
  if (!sound) return;

  try {
    audio ??= new (
      window.AudioContext || window.webkitAudioContext
    )();

    audio.resume();

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
    // El juego sigue funcionando sin audio.
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
  particle.style.left = `${40 + Math.random() * 20}%`;

  $("#particles").append(particle);

  setTimeout(() => particle.remove(), 1500);
}

// ========================================
// CARICIAS, CUIDADOS Y MANTITA
// ========================================

$("#dragon").onclick = () => {
  if (playing || bathing) return;

  if (pet.sleep) {
    say("Zzz… estoy soñando con vos ☾");
    return;
  }

  pet.joy += 3;
  pet.xp += 1;

  effect("♡");

  const messages = [
    "¡Ese es mi lugar favorito!",
    "¡Otra caricia, por favor!",
    "Vos y yo, un gran equipo ♡"
  ];

  say(messages[Math.floor(Math.random() * messages.length)]);
  render();
};

function equipBlanket() {
  if (playing || bathing) return;

  if (pet.items.blanket !== 1) {
    say("¡Una mantita de la tienda me vendría genial! 🧣");
    return;
  }

  // Alternar entre poner y quitar.
  pet.blanketEquipped = !pet.blanketEquipped;

  render();
  effect(pet.blanketEquipped ? "♡" : "🧣");

  if (pet.blanketEquipped) {
    say(
      pet.sleep
        ? "Zzz… qué calentito… ☾"
        : "¡Suavecita y calentita! Gracias por cuidarme 🧣"
    );
  } else {
    say("¡Guardamos la mantita para después! 🧺");
  }
}

function care(action) {
  if (playing) return;

  if (bathing) {
    say("¡Terminemos el baño primero! 🧽");
    return;
  }

  if (action === "blanket") {
    equipBlanket();
    return;
  }

  if (action === "sleep") {
    pet.sleep = !pet.sleep;
    pet.night = pet.sleep;

    say(
      pet.sleep
        ? "Zzz… bajo las estrellas se duerme mejor ☾"
        : "¡Buen día! ¿Qué aventura nos espera?"
    );

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
      say("¡No queda esa comida! Elegí otra en el inventario 🧺");
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

  openGameMenu();
}

  render();
}
// ========================================
// TOCAR O ARRASTRAR
// ========================================

const dragIcons = {
  play: "✦",
  sleep: "🌙",
  wash: "💧",
  blanket: "🧣"
};

function isOverDragon(x, y) {
  const rect = $("#dragon").getBoundingClientRect();

  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

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
      return;
    }

    care(button.dataset.action);
  };

  button.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    if (playing || bathing || gesture) return;

    suppressClick = false;

    gesture = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false
    };

    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;

    const distance = Math.hypot(
      event.clientX - gesture.startX,
      event.clientY - gesture.startY
    );

    if (!gesture.dragging && distance < 10) return;

    if (!gesture.dragging) {
      gesture.dragging = true;
      button.classList.add("is-dragging");

      ghost = document.createElement("div");
      ghost.className = "care-ghost";

      ghost.textContent = button.dataset.action === "feed"
        ? selectedFood().icon
        : dragIcons[button.dataset.action];

      ghost.setAttribute("aria-hidden", "true");

      document.body.append(ghost);
      $("#world").classList.add("awaiting-drop");
    }

    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;

    $("#dragon").classList.toggle(
      "drop-ready",
      isOverDragon(event.clientX, event.clientY)
    );
  });

  function finishDrag(event, cancelled = false) {
    if (!gesture || gesture.id !== event.pointerId) return;

    const wasDragging = gesture.dragging;

    const droppedOnDragon =
      !cancelled &&
      wasDragging &&
      isOverDragon(event.clientX, event.clientY);

    gesture = null;

    ghost?.remove();
    ghost = null;

    button.classList.remove("is-dragging");
    $("#world").classList.remove("awaiting-drop");
    $("#dragon").classList.remove("drop-ready");

    if (button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }

    if (wasDragging || cancelled) {
      suppressClick = true;
    }

    if (droppedOnDragon) {
      care(button.dataset.action);
    } else if (wasDragging && !cancelled) {
      say("¡Arrastrá el objeto hasta mí!");
    }
  }

  button.addEventListener("pointerup", (event) => {
    finishDrag(event);
  });

  button.addEventListener("pointercancel", (event) => {
    finishDrag(event, true);
  });

  button.addEventListener("lostpointercapture", (event) => {
    finishDrag(event, true);
  });
});

// ========================================
// MINIJUEGO
// ========================================

function moveStar() {
  const game = $("#game");
  const star = $("#star");

  const padding = 12;
  const top = 60;

  const availableWidth = Math.max(
    0,
    game.clientWidth - star.offsetWidth - padding * 2
  );

  const availableHeight = Math.max(
    0,
    game.clientHeight - star.offsetHeight - top - padding
  );

  star.style.left = `${padding + Math.random() * availableWidth}px`;
  star.style.top = `${top + Math.random() * availableHeight}px`;
}

function startGame() {
  if (playing || bathing || pet.sleep) return;

  playing = true;
  seconds = 15;

  $("#timer").textContent = seconds;
  $("#game").hidden = false;

  moveStar();
  say("¡Atrapá todas las estrellas que puedas!");

  let caught = 0;

  $("#star").onclick = () => {
    if (!playing) return;

    caught++;
    pet.coins += 2;
    pet.xp += 3;

    tone();
    moveStar();

    $("#coins").textContent = pet.coins;
    save();
  };

  gameTimer = setInterval(() => {
    seconds--;
    $("#timer").textContent = seconds;

    if (seconds <= 0) {
      clearInterval(gameTimer);

      playing = false;
      $("#game").hidden = true;
      $("#star").onclick = null;

      pet.joy += Math.min(30, caught * 4);
      pet.energy -= 12;

      say(
        `¡Atrapaste ${caught} estrellas! ` +
        `+${caught * 2} de polvo mágico ✦`
      );

      effect("✦");
      render();
    }
  }, 1000);
}

// ========================================
// TIENDA
// ========================================

function renderFoodShop() {
  $("#food-balance").textContent = pet.coins;

  $("#food-list").innerHTML = foods
    .map((food) => {
      const canAfford = pet.coins >= food.price;

      const buttonText = playing
        ? "Terminá el juego"
        : canAfford
          ? "Comprar +1"
          : `Faltan ${food.price - pet.coins} ✦`;

      return `
        <article class="food-card">
          <span class="food-emoji" aria-hidden="true">
            ${food.icon}
          </span>

          <div class="food-info">
            <h3>${food.name}</h3>

            <p>
              +${food.food} saciedad · +${food.joy} felicidad
            </p>

            <strong class="food-price">${food.price} ✦</strong>

            <small class="food-owned">
              En inventario: ${pet.inventory[food.id]}
            </small>
          </div>

          <button
            type="button"
            class="food-buy"
            data-food="${food.id}"
            aria-label="Comprar ${food.name}"
            ${!canAfford || playing ? "disabled" : ""}
          >
            ${buttonText}
          </button>
        </article>
      `;
    })
    .join("");

  const owned = pet.items.blanket === 1;
  const canAfford = pet.coins >= blanketItem.price;

  const buttonText = owned
    ? "✓ Comprada"
    : playing
      ? "Terminá el juego"
      : canAfford
        ? "Comprar"
        : `Faltan ${blanketItem.price - pet.coins} ✦`;

  $("#food-list").insertAdjacentHTML("beforeend", `
    <article class="food-card">
      <span class="food-emoji" aria-hidden="true">
        ${blanketItem.icon}
      </span>

      <div class="food-info">
        <h3>${blanketItem.name}</h3>
        <p>Abriga a tu dragón cuando hace frío. No se consume.</p>

        <strong class="food-price">${blanketItem.price} ✦</strong>

        <small class="food-owned">
          ${owned ? "Ya está en tu inventario" : "Accesorio permanente"}
        </small>
      </div>

      <button
        type="button"
        class="food-buy"
        data-buy-item="blanket"
        aria-label="Comprar mantita"
        ${owned || !canAfford || playing ? "disabled" : ""}
      >
        ${buttonText}
      </button>
    </article>
  `);
}

function openFoodShop() {
  if (playing || bathing) {
    say("¡Terminemos lo que estamos haciendo primero!");
    return;
  }

  $("#food-message").textContent =
    "Comprá comida y accesorios para guardarlos en tu inventario.";

  renderFoodShop();

  if (!$("#food-dialog").open) {
    $("#food-dialog").showModal();
  }
}

$("#open-shop").onclick = openFoodShop;

// Un único evento maneja todas las compras.
$("#food-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-food], [data-buy-item]");

  if (!button || button.disabled || playing || bathing) return;

  // Comprar mantita.
  if (button.dataset.buyItem === "blanket") {
    if (pet.items.blanket === 1) return;

    if (pet.coins < blanketItem.price) {
      $("#food-message").textContent =
        "Te faltan estrellas para comprar la mantita.";

      renderFoodShop();
      return;
    }

    pet.coins -= blanketItem.price;
    pet.items.blanket = 1;

    render();
    renderFoodShop();
    tone();

    $("#food-message").textContent =
      "¡Mantita guardada! Equipala desde el inventario " +
      "o arrastrá Abrigar hasta tu dragón.";

    return;
  }

  // Comprar alimento.
  const food = foods.find((item) => item.id === button.dataset.food);

  if (!food) return;

  if (pet.coins < food.price) {
    $("#food-message").textContent =
      "Te falta polvo de estrellas. ¡Ganalo en el minijuego!";

    renderFoodShop();
    return;
  }

  pet.coins -= food.price;
  pet.inventory[food.id]++;
  pet.selectedFood = food.id;

  render();
  renderFoodShop();
  tone();

  $("#food-message").textContent =
    `¡Compraste ${food.name}! ${food.icon} ` +
    `Tenés ${pet.inventory[food.id]}. ` +
    "Ya está seleccionada en Alimentar.";
});

// ========================================
// INVENTARIO
// ========================================

function renderInventory() {
  const availableFoods = foods.filter(
    (food) => pet.inventory[food.id] > 0
  );

  const hasBlanket = pet.items.blanket === 1;

  if (availableFoods.length === 0 && !hasBlanket) {
    $("#inventory-list").innerHTML = `
      <div class="inventory-empty">
        <span aria-hidden="true">🧺</span>
        <p>Tu inventario está vacío.</p>
        <small>Visitá la tienda para comprar provisiones.</small>
      </div>
    `;

    $("#inventory-message").textContent =
      "Ganás polvo de estrellas en el minijuego.";

    return;
  }

  $("#inventory-list").innerHTML = availableFoods
    .map((food) => {
      const selected = pet.selectedFood === food.id;

      return `
        <article class="food-card ${selected ? "inventory-selected" : ""}">
          <span class="food-emoji" aria-hidden="true">
            ${food.icon}
          </span>

          <div class="food-info">
            <h3>${food.name}</h3>
            <p>+${food.food} saciedad · +${food.joy} felicidad</p>

            <small class="food-owned">
              Disponibles: ${pet.inventory[food.id]}
            </small>
          </div>

          <button
            type="button"
            class="food-buy"
            data-select-food="${food.id}"
            aria-label="Seleccionar ${food.name}"
          >
            ${selected ? "✓ Equipada" : "Seleccionar"}
          </button>
        </article>
      `;
    })
    .join("");

  if (hasBlanket) {
    $("#inventory-list").insertAdjacentHTML("beforeend", `
      <article class="food-card ${
        pet.blanketEquipped ? "inventory-selected" : ""
      }">
        <span class="food-emoji" aria-hidden="true">🧣</span>

        <div class="food-info">
          <h3>${blanketItem.name}</h3>
          <p>Accesorio permanente · disponible: 1</p>

          <small class="food-owned">
            ${pet.blanketEquipped ? "Tu dragón está abrigado" : "Lista para usar"}
          </small>
        </div>

        <button
          type="button"
          class="food-buy"
          data-toggle-blanket
        >
          ${pet.blanketEquipped ? "Quitar" : "Abrigar"}
        </button>
      </article>
    `);
  }

  $("#inventory-message").textContent =
    "La comida se consume al alimentar. La mantita se puede reutilizar.";
}

function openInventory() {
  if (playing || bathing) {
    say("¡Terminemos lo que estamos haciendo primero!");
    return;
  }

  renderInventory();

  if (!$("#inventory-dialog").open) {
    $("#inventory-dialog").showModal();
  }
}

// Un único evento maneja la comida y la mantita.
$("#inventory-list").addEventListener("click", (event) => {
  const button = event.target.closest(
    "[data-select-food], [data-toggle-blanket]"
  );

  if (!button || playing || bathing) return;

  if (button.hasAttribute("data-toggle-blanket")) {
    if (pet.items.blanket !== 1) return;

    if (pet.blanketEquipped) {
      pet.blanketEquipped = false;
      render();

      say("¡Guardamos la mantita para después! 🧺");
    } else {
      equipBlanket();
    }

    $("#inventory-dialog").close();
    return;
  }

  const food = foods.find(
    (item) => item.id === button.dataset.selectFood
  );

  if (!food || pet.inventory[food.id] <= 0) {
    renderInventory();
    return;
  }

  pet.selectedFood = food.id;

  render();
  tone();

  $("#inventory-dialog").close();

  say(
    `${food.icon} ${food.name}: lista para comer. ` +
    "¡Arrastrala hasta mí cuando tenga hambre!"
  );
});

// ========================================
// BAÑO CON ESPONJA
// ========================================

function updateBathProgress() {
  $("#bath-fill").style.width = `${bathProgress}%`;

  $("#bath-progress").setAttribute(
    "aria-valuenow",
    Math.round(bathProgress)
  );
}

function moveSponge(event) {
  const rect = bath.getBoundingClientRect();

  sponge.style.left = `${event.clientX - rect.left}px`;
  sponge.style.top = `${event.clientY - rect.top}px`;
}

function startBath() {
  if (bathing || playing || pet.sleep) return;

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

  updateBlanketUI();

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

function addBathFoam(x, y) {
  const rect = bath.getBoundingClientRect();
  const bubble = document.createElement("span");

  bubble.className = "bath-bubble";
  bubble.textContent = Math.random() > 0.5 ? "🫧" : "○";

  bubble.style.left = `${x - rect.left}px`;
  bubble.style.top = `${y - rect.top}px`;
  bubble.style.fontSize = `${20 + Math.random() * 18}px`;

  $("#bath-foam").append(bubble);

  setTimeout(() => bubble.remove(), 900);
}

$("#close-bath").onclick = () => stopBath();

bath.addEventListener("pointerdown", (event) => {
  if (!bathing || !event.isPrimary || event.button !== 0) return;
  if (event.target.closest(".bath-panel")) return;
  if (bathPointer !== null) return;

  event.preventDefault();

  bathPointer = event.pointerId;

  bathLastPoint = {
    x: event.clientX,
    y: event.clientY
  };

  moveSponge(event);
  bath.setPointerCapture(event.pointerId);
});

bath.addEventListener("pointermove", (event) => {
  if (!bathing) return;

  if (event.target.closest(".bath-panel") && bathPointer === null) {
    return;
  }

  moveSponge(event);

  if (bathPointer !== event.pointerId || !bathLastPoint) return;

  event.preventDefault();

  const previous = bathLastPoint;

  bathLastPoint = {
    x: event.clientX,
    y: event.clientY
  };

  if (
    !isOverDragon(previous.x, previous.y) ||
    !isOverDragon(event.clientX, event.clientY)
  ) {
    return;
  }

  const distance = Math.min(
    45,
    Math.hypot(
      event.clientX - previous.x,
      event.clientY - previous.y
    )
  );

  if (distance < 1) return;

  const dragonWidth = $("#dragon").getBoundingClientRect().width;
  const requiredDistance = Math.max(1, dragonWidth * 6);

  bathProgress = Math.min(
    100,
    bathProgress + (distance / requiredDistance) * 100
  );

  updateBathProgress();

  bathFoamDistance += distance;

  if (bathFoamDistance >= 24) {
    bathFoamDistance = 0;
    addBathFoam(event.clientX, event.clientY);
  }

  if (bathProgress >= 100) {
    stopBath(true);
  }
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
// CLIMA: INTERPRETACIÓN Y ESCENARIO
// ========================================

function describeWeather(code) {
  if ([95, 96, 99].includes(code)) {
    return { type: "storm", icon: "⛈️", label: "Tormenta" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { type: "snow", icon: "❄️", label: "Nieve" };
  }

  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  ) {
    return { type: "rain", icon: "🌧️", label: "Lluvia" };
  }

  if ([45, 48].includes(code)) {
    return { type: "fog", icon: "🌫️", label: "Niebla" };
  }

  if ([2, 3].includes(code)) {
    return { type: "cloudy", icon: "☁️", label: "Nublado" };
  }

  if ([0, 1].includes(code)) {
    return { type: "clear", icon: "☀️", label: "Despejado" };
  }

  return {
    type: "clear",
    icon: "🌤️",
    label: "Condiciones variables"
  };
}

function validWeatherRecord(record) {
  return (
    record &&
    Number.isFinite(record.temperature) &&
    Number.isInteger(record.code) &&
    Number.isFinite(record.fetchedAt)
  );
}

function createWeatherParticles(type) {
  const container = $("#weather-particles");

  container.replaceChildren();

  const snow = type === "snow";
  const rain = type === "rain" || type === "storm";

  if (!snow && !rain) return;

  const count = snow ? 22 : 32;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index++) {
    const particle = document.createElement("span");

    particle.className = snow ? "weather-flake" : "weather-drop";
    particle.style.left = `${Math.random() * 115}%`;

    const duration = snow
      ? 5 + Math.random() * 4
      : 0.9 + Math.random() * 0.6;

    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${-Math.random() * duration}s`;

    fragment.append(particle);
  }

  container.append(fragment);
}

function weatherComment(record, type) {
  if (record.temperature <= 10) {
    return pet.blanketEquipped
      ? "¡Hace frío, pero con mi mantita estoy calentito! 🧣"
      : "¡Brrr! Hoy me vendría bien una mantita 🧣";
  }

  if (type === "storm") {
    return "¡Truenos! Me quedo cerquita de vos ⛈️";
  }

  if (type === "snow") {
    return "¡Copitos! ¿Podemos hacer un dragón de nieve? ❄️";
  }

  if (type === "rain") {
    return "¡Está lloviendo! Hoy está para jugar en casita 🌧️";
  }

  if (record.temperature >= 28) {
    return "¡Qué calor! Un bañito con esponja vendría genial 🧽";
  }

  if (type === "fog") {
    return "¡El bosque está lleno de misterio! 🌫️";
  }

  if (type === "cloudy") {
    return "¡Las nubes parecen dragones! ☁️";
  }

  return "¡Qué lindo clima para una aventura! 🌤️";
}

function applyWeather(record, stale = false, announce = false) {
  // Conectar la temperatura con la mantita y el temblor.
  weatherTemperature = record.temperature;

  const info = describeWeather(record.code);
  const city = weatherCities[weatherCity];

  $("#world").classList.remove(...weatherClasses);

  if (info.type !== "clear") {
    $("#world").classList.add(`weather-${info.type}`);
  }

  createWeatherParticles(info.type);

  $("#weather-icon").textContent = info.icon;

  $("#weather-description").textContent =
    `${Math.round(record.temperature)} °C · ${info.label}`;

  const time = new Date(record.fetchedAt).toLocaleTimeString(
    "es-AR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

  $("#weather-details").textContent = stale
    ? `${city.name} · último dato guardado (${time})`
    : `${city.name} · consultado a las ${time}`;

  render();

  if (announce && !playing && !bathing && !pet.sleep) {
    say(weatherComment(record, info.type));
  }
}

function resetWeatherScene() {
  weatherTemperature = null;

  $("#world").classList.remove(...weatherClasses);
  $("#weather-particles").replaceChildren();

  render();
}

// ========================================
// CLIMA: CONEXIÓN CON LA API
// ========================================

async function fetchWeather(city) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: "temperature_2m,weather_code",
    timezone: "auto"
  }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Error del clima: ${response.status}`);
    }

    const data = await response.json();

    const record = {
      temperature: data.current?.temperature_2m,
      code: data.current?.weather_code,
      fetchedAt: Date.now()
    };

    if (!validWeatherRecord(record)) {
      throw new Error("La respuesta del clima no es válida");
    }

    return record;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadWeather(force = false, announce = false) {
  if (weatherLoading) return;

  const cached = weatherCache[weatherCity];

  const cacheAge = validWeatherRecord(cached)
    ? Date.now() - cached.fetchedAt
    : Infinity;

  if (!force && cacheAge >= 0 && cacheAge < WEATHER_CACHE_TIME) {
    applyWeather(cached, false, announce);
    return;
  }

  weatherLoading = true;

  $("#weather-refresh").disabled = true;
  $("#weather-city").disabled = true;

  try {
    if (validWeatherRecord(cached)) {
      applyWeather(cached, true);
    } else {
      resetWeatherScene();

      $("#weather-icon").textContent = "🌤️";
      $("#weather-description").textContent = "Consultando el clima…";
    }

    $("#weather-details").textContent =
      `Conectando con ${weatherCities[weatherCity].name}`;

    const record = await fetchWeather(weatherCities[weatherCity]);

    weatherCache[weatherCity] = record;

    try {
      localStorage.setItem(
        "bruma-weather-cache",
        JSON.stringify(weatherCache)
      );
    } catch {
      // Mantener los datos en memoria si no se pueden guardar.
    }

    applyWeather(record, false, announce);
  } catch {
    if (validWeatherRecord(cached)) {
      applyWeather(cached, true);
    } else {
      // Sin datos, no asumir una temperatura.
      resetWeatherScene();

      $("#weather-icon").textContent = "🌿";
      $("#weather-description").textContent = "Clima no disponible";

      $("#weather-details").textContent =
        "Escenario de respaldo · podés seguir jugando";
    }
  } finally {
    weatherLoading = false;

    $("#weather-refresh").disabled = false;
    $("#weather-city").disabled = false;
  }
}

$("#weather-city").value = weatherCity;

$("#weather-city").addEventListener("change", () => {
  const city = $("#weather-city").value;

  if (!Object.hasOwn(weatherCities, city)) return;

  weatherCity = city;

  try {
    localStorage.setItem("bruma-weather-city", weatherCity);
  } catch {
    // La selección funciona aunque no pueda guardarse.
  }

  loadWeather(false, true);
});

$("#weather-refresh").onclick = () => {
  loadWeather(true, true);
};

// ========================================
// DÍA, NOCHE, SONIDO Y NOMBRE
// ========================================

$("#night").onclick = () => {
  if (bathing) return;

  if (pet.sleep) {
    say("Dejemos la noche mientras duermo ☾");
    return;
  }

  pet.night = !pet.night;
  render();
};

$("#sound").onclick = () => {
  sound = !sound;

  $("#sound").textContent =
    "Sonido: " + (sound ? "encendido" : "apagado");

  tone();
};

$("#rename").onclick = () => {
  if (bathing) return;

  $("#name-input").value = pet.name;
  $("#name-dialog").showModal();
};

$("#name-dialog").addEventListener("close", () => {
  if ($("#name-dialog").returnValue !== "save") return;

  const name = $("#name-input").value.trim();

  if (name) {
    pet.name = name.slice(0, 18);

    say(`¡${pet.name}! Me encanta mi nombre ♡`);
    render();
  }
});

// Las cruces cierran los diálogos con method="dialog" en el HTML.

// ========================================
// INICIO Y PASO DEL TIEMPO
// ========================================

// Aplicar hasta tres horas desde la última visita.
const elapsed = Math.min(
  180,
  Math.max(0, (Date.now() - pet.last) / 60000)
);

pet.food -= elapsed * 0.15;
pet.clean -= elapsed * 0.1;

pet.energy += pet.sleep
  ? elapsed * 0.6
  : -elapsed * 0.08;

if (pet.sleep && pet.energy >= 100) {
  pet.sleep = false;
  pet.night = false;

  say("¡Dormí increíble! ¿Qué hacemos hoy?");
} else if (pet.sleep) {
  pet.night = true;

  say("Zzz… estoy soñando con estrellas ☾");
}

render();

// Primera consulta del clima.
loadWeather(false, true);

// Actualizar necesidades.
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

// Revisar el clima cada quince minutos.
setInterval(() => {
  if (!document.hidden) {
    loadWeather();
  }
}, WEATHER_CACHE_TIME);

// Guardar al salir de la pestaña y revisar el clima al volver.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
  } else {
    loadWeather();
  }
});

window.addEventListener("pagehide", save);

// ========================================
// MENÚ DE JUEGOS
// ========================================

function openGameMenu() {
  if (playing || bathing || pet.sleep) return;

  if (!$("#games-dialog").open) {
    $("#games-dialog").showModal();
  }
}

$("#choose-stars").onclick = () => {
  $("#games-dialog").close();
  startGame();
};

$("#choose-skate").onclick = () => {
  $("#games-dialog").close();
  openSkate();
};

// ========================================
// HONEY SKATE
// ========================================

const skateCanvas = $("#skate-canvas");
const skateContext = skateCanvas.getContext("2d");

const skate = {
  width: 600,
  height: 320,
  ground: 265,

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
    x: 45,
    y: 0,
    width: 62,
    height: 66,
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
  // El minijuego funciona aunque no podamos recuperar el récord.
}

// Dibujar al mismo dragón que aparece en el escenario.
const skateDragon = new Image();
let skateDragonReady = false;

function prepareSkateDragon() {
  skateDragonReady = false;

  const svg = $("#dragon svg").cloneNode(true);

  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", "360");
  svg.setAttribute("height", "330");

  // El SVG exportado no usa el CSS externo de la página.
  svg.querySelectorAll("[hidden]").forEach((element) => {
    element.remove();
  });

  const content = new XMLSerializer().serializeToString(svg);

  skateDragon.onload = () => {
    skateDragonReady = true;

    if (!skate.running) {
      drawSkate();
    }
  };

  skateDragon.onerror = () => {
    skateDragonReady = false;
  };

  skateDragon.src =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(content);
}

function resizeSkate() {
  const rect = skateCanvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  skate.width = Math.max(260, rect.width);
  skate.height = Math.max(220, rect.height);
  skate.ground = skate.height - 48;

  skateCanvas.width = Math.round(skate.width * ratio);
  skateCanvas.height = Math.round(skate.height * ratio);

  skateContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  skate.player.x = Math.min(65, skate.width * 0.14);

  if (skate.player.grounded) {
    skate.player.y = skate.ground - skate.player.height;
  }
}

function updateSkateScore() {
  $("#skate-distance").textContent = Math.floor(skate.distance / 10);
  $("#skate-stars").textContent = skate.stars;
  $("#skate-record").textContent = skate.record;
}

function openSkate() {
  if (playing || bathing || pet.sleep) return;

  $("#skate-dialog").showModal();

  resizeSkate();
  prepareSkateDragon();

  skate.distance = 0;
  skate.stars = 0;
  skate.obstacles = [];
  skate.collectibles = [];

  skate.player.grounded = true;
  skate.player.velocity = 0;
  skate.player.y = skate.ground - skate.player.height;

  $("#skate-message").textContent = "¡A rodar!";
  $("#skate-result").textContent =
    "Tocá la pista para saltar. Esquivá obstáculos y recogé estrellas.";

  $("#skate-start").textContent = "Empezar";
  $("#skate-overlay").hidden = false;

  updateSkateScore();
  drawSkate();
}

function startSkate() {
  if (skate.running || playing || bathing || pet.sleep) return;

  if (pet.energy < 15) {
    $("#skate-result").textContent =
      "Tu dragón necesita descansar antes de otra carrera.";
    return;
  }

  resizeSkate();

  skate.running = true;
  skate.paused = false;
  playing = true;

  skate.lastTime = 0;
  skate.distance = 0;
  skate.stars = 0;
  skate.speed = 220;

  skate.obstacleTimer = 0;
  skate.nextObstacle = 1.5;
  skate.starTimer = 0;

  skate.obstacles = [];
  skate.collectibles = [];

  skate.player.y = skate.ground - skate.player.height;
  skate.player.velocity = 0;
  skate.player.grounded = true;

  $("#skate-overlay").hidden = true;

  updateSkateScore();
  skateCanvas.focus();

  cancelAnimationFrame(skate.frame);
  skate.frame = requestAnimationFrame(skateLoop);
}

function jumpSkate() {
  if (!skate.running || skate.paused || !skate.player.grounded) {
    return;
  }

  skate.player.velocity = -620;
  skate.player.grounded = false;
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function updateSkate(delta) {
  const player = skate.player;

  // Aumentar la velocidad suavemente, con un límite.
  skate.speed = Math.min(360, 220 + skate.distance * 0.018);
  skate.distance += skate.speed * delta;

  // Gravedad y salto.
  player.velocity += 1900 * delta;
  player.y += player.velocity * delta;

  const floor = skate.ground - player.height;

  if (player.y >= floor) {
    player.y = floor;
    player.velocity = 0;
    player.grounded = true;
  }

  // Generar obstáculos.
  skate.obstacleTimer += delta;

  if (skate.obstacleTimer >= skate.nextObstacle) {
    skate.obstacleTimer = 0;
    skate.nextObstacle = 1.3 + Math.random() * 0.65;

    const height = 28 + Math.random() * 17;

    skate.obstacles.push({
      x: skate.width + 35,
      y: skate.ground - height,
      width: 27 + Math.random() * 12,
      height,
      type: Math.random() > 0.5 ? "rock" : "log"
    });
  }

  // Generar estrellas.
  skate.starTimer += delta;

  if (skate.starTimer >= 0.9) {
    skate.starTimer = 0;

    skate.collectibles.push({
      x: skate.width + 25,
      y: skate.ground - (Math.random() > 0.5 ? 110 : 45),
      width: 24,
      height: 24
    });
  }

  for (const obstacle of skate.obstacles) {
    obstacle.x -= skate.speed * delta;
  }

  for (const star of skate.collectibles) {
    star.x -= skate.speed * delta;
  }

  // Una zona de choque algo menor que el dibujo.
  const playerHitbox = {
    x: player.x + 14,
    y: player.y + 12,
    width: player.width - 28,
    height: player.height - 17
  };

  for (const obstacle of skate.obstacles) {
    const obstacleHitbox = {
      x: obstacle.x + 4,
      y: obstacle.y + 5,
      width: obstacle.width - 8,
      height: obstacle.height - 5
    };

    if (intersects(playerHitbox, obstacleHitbox)) {
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

function drawSkate() {
  const ctx = skateContext;
  const width = skate.width;
  const height = skate.height;
  const ground = skate.ground;
  const player = skate.player;

  ctx.clearRect(0, 0, width, height);

  // Cielo.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#dcebdc");
  sky.addColorStop(1, "#f2efd7");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Sol.
  ctx.fillStyle = "#fff6c7";
  ctx.beginPath();
  ctx.arc(width - 65, 55, 32, 0, Math.PI * 2);
  ctx.fill();

  // Colinas.
  ctx.fillStyle = "#bdd0aa";
  ctx.beginPath();
  ctx.ellipse(width * 0.25, ground + 15, width * 0.65, 100, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a9c294";
  ctx.beginPath();
  ctx.ellipse(width * 0.85, ground + 20, width * 0.55, 85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pista.
  ctx.fillStyle = "#cfb99a";
  ctx.fillRect(0, ground, width, height - ground);

  ctx.fillStyle = "#a58b6c";
  ctx.fillRect(0, ground, width, 4);

  // Marcas de movimiento.
  ctx.fillStyle = "#b69b7a";

  const roadOffset = skate.distance % 75;

  for (let x = -75; x < width + 75; x += 75) {
    ctx.fillRect(x - roadOffset, ground + 25, 26, 3);
  }

  // Obstáculos.
  for (const obstacle of skate.obstacles) {
    if (obstacle.type === "log") {
      ctx.fillStyle = "#947050";
      ctx.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height
      );

      ctx.fillStyle = "#b58c65";
      ctx.fillRect(
        obstacle.x + 5,
        obstacle.y + 4,
        5,
        obstacle.height - 4
      );
    } else {
      ctx.fillStyle = "#87958c";
      ctx.beginPath();
      ctx.moveTo(obstacle.x, ground);
      ctx.lineTo(obstacle.x + 5, obstacle.y + 10);
      ctx.lineTo(obstacle.x + obstacle.width * 0.55, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width - 3, obstacle.y + 12);
      ctx.lineTo(obstacle.x + obstacle.width, ground);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Estrellas.
  ctx.font = "27px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#b98b31";

  for (const star of skate.collectibles) {
    ctx.fillText(
      "✦",
      star.x + star.width / 2,
      star.y + star.height / 2
    );
  }

  // Honey.
  if (skateDragonReady) {
    ctx.drawImage(
      skateDragon,
      player.x - 8,
      player.y - 9,
      player.width + 16,
      player.height + 8
    );
  } else {
    ctx.font = "48px sans-serif";
    ctx.fillText(
      "🐉",
      player.x + player.width / 2,
      player.y + player.height / 2
    );
  }

  // Patineta debajo de Honey.
  const boardY = player.y + player.height - 8;

  ctx.strokeStyle = "#8562a2";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(player.x + 3, boardY);
  ctx.lineTo(player.x + player.width - 3, boardY);
  ctx.stroke();

  ctx.fillStyle = "#344b40";

  for (const wheelX of [player.x + 14, player.x + player.width - 14]) {
    ctx.beginPath();
    ctx.arc(wheelX, boardY + 5, 5, 0, Math.PI * 2);
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
  playing = false;

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
      localStorage.setItem("bruma-skate-record", skate.record);
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
  if (skate.paused && skate.running) {
    skate.paused = false;
    skate.lastTime = 0;

    $("#skate-overlay").hidden = true;
    skateCanvas.focus();

    skate.frame = requestAnimationFrame(skateLoop);
    return;
  }

  startSkate();
};

skateCanvas.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary) return;

  event.preventDefault();
  jumpSkate();
});

$("#skate-dialog").addEventListener("keydown", (event) => {
  if (
    skate.running &&
    !skate.paused &&
    (event.code === "Space" || event.code === "ArrowUp")
  ) {
    event.preventDefault();
    jumpSkate();
  }
});

// Cerrar durante una carrera conserva las estrellas recogidas.
$("#skate-dialog").addEventListener("close", () => {
  if (skate.running) {
    finishSkate("¡Carrera guardada!");
  }

  cancelAnimationFrame(skate.frame);
});

// Pausar al cambiar de pestaña.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden || !skate.running || skate.paused) return;

  skate.paused = true;
  cancelAnimationFrame(skate.frame);

  $("#skate-message").textContent = "En pausa";

  $("#skate-result").textContent =
    "Tu carrera te espera. Tocá Continuar para seguir.";

  $("#skate-start").textContent = "Continuar";
  $("#skate-overlay").hidden = false;
});

// Adaptar la pista si cambia el tamaño o la orientación.
window.addEventListener("resize", () => {
  if (!$("#skate-dialog").open) return;

  if (skate.running) {
    finishSkate("¡Cambiamos de pista!");
  }

  resizeSkate();
  drawSkate();
});