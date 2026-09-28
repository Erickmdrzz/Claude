"use strict";

const INTERVALO_ACTUALIZACION = 10 * 60 * 1000; // 10 minutos
const MADRID = { nombre: "Madrid", region: "Comunidad de Madrid, España", lat: 40.4168, lon: -3.7038 };

const API_TIEMPO = "https://api.open-meteo.com/v1/forecast";
const API_GEOCODIFICACION = "https://geocoding-api.open-meteo.com/v1/search";
// Geocodificación inversa gratuita y sin clave, solo para poner nombre a tu ubicación.
const API_GEO_INVERSA = "https://api.bigdatacloud.net/data/reverse-geocode-client";

// Códigos WMO que usa Open-Meteo → descripción e iconos (día / noche)
const ESTADOS = {
  0: ["Despejado", "☀️", "🌙"],
  1: ["Mayormente despejado", "🌤️", "🌙"],
  2: ["Parcialmente nublado", "⛅", "☁️"],
  3: ["Nublado", "☁️", "☁️"],
  45: ["Niebla", "🌫️", "🌫️"],
  48: ["Niebla con escarcha", "🌫️", "🌫️"],
  51: ["Llovizna ligera", "🌦️", "🌧️"],
  53: ["Llovizna", "🌦️", "🌧️"],
  55: ["Llovizna intensa", "🌧️", "🌧️"],
  56: ["Llovizna helada", "🌧️", "🌧️"],
  57: ["Llovizna helada intensa", "🌧️", "🌧️"],
  61: ["Lluvia ligera", "🌦️", "🌧️"],
  63: ["Lluvia", "🌧️", "🌧️"],
  65: ["Lluvia intensa", "🌧️", "🌧️"],
  66: ["Lluvia helada", "🌧️", "🌧️"],
  67: ["Lluvia helada intensa", "🌧️", "🌧️"],
  71: ["Nevada ligera", "🌨️", "🌨️"],
  73: ["Nevada", "🌨️", "🌨️"],
  75: ["Nevada intensa", "❄️", "❄️"],
  77: ["Granizo fino", "🌨️", "🌨️"],
  80: ["Chubascos ligeros", "🌦️", "🌧️"],
  81: ["Chubascos", "🌧️", "🌧️"],
  82: ["Chubascos fuertes", "⛈️", "⛈️"],
  85: ["Chubascos de nieve", "🌨️", "🌨️"],
  86: ["Chubascos de nieve fuertes", "❄️", "❄️"],
  95: ["Tormenta", "⛈️", "⛈️"],
  96: ["Tormenta con granizo", "⛈️", "⛈️"],
  99: ["Tormenta con granizo fuerte", "⛈️", "⛈️"],
};

const $ = (id) => document.getElementById(id);
const el = {
  ciudad: $("ciudad"),
  region: $("region"),
  icono: $("icono"),
  temperatura: $("temperatura"),
  descripcion: $("descripcion"),
  sensacion: $("sensacion"),
  humedad: $("humedad"),
  viento: $("viento"),
  horas: $("horas"),
  actualizado: $("actualizado"),
  mensaje: $("mensaje"),
  buscador: $("buscador"),
  busqueda: $("busqueda"),
  sugerencias: $("sugerencias"),
  btnUbicacion: $("btn-ubicacion"),
  btnActualizar: $("btn-actualizar"),
};

let lugarActual = null;
let temporizador = null;
let ultimaActualizacion = 0;

/* ---------- Utilidades ---------- */

function estado(codigo, esDia) {
  const [texto, iconoDia, iconoNoche] = ESTADOS[codigo] || ["Desconocido", "🌡️", "🌡️"];
  return { texto, icono: esDia ? iconoDia : iconoNoche };
}

function direccionViento(grados) {
  const puntos = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return puntos[Math.round(grados / 45) % 8];
}

function mostrarMensaje(texto, tipo = "info") {
  el.mensaje.textContent = texto;
  el.mensaje.dataset.tipo = tipo;
  el.mensaje.hidden = !texto;
}

async function pedirJSON(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
  return respuesta.json();
}

/* ---------- Datos del tiempo ---------- */

async function cargarTiempo() {
  if (!lugarActual) return;
  const lugar = lugarActual;

  const params = new URLSearchParams({
    latitude: lugar.lat,
    longitude: lugar.lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day",
    hourly: "temperature_2m,weather_code,is_day,precipitation_probability",
    timezone: "auto",
    forecast_days: "2",
    wind_speed_unit: "kmh",
  });

  document.body.classList.add("cargando");
  try {
    const datos = await pedirJSON(`${API_TIEMPO}?${params}`);
    if (lugar !== lugarActual) return; // el usuario cambió de ciudad mientras cargaba
    pintarActual(lugar, datos.current);
    pintarHoras(datos.current.time, datos.hourly);
    ultimaActualizacion = Date.now();
    el.actualizado.textContent = "Última actualización: " +
      new Date(ultimaActualizacion).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (el.mensaje.dataset.tipo === "error") mostrarMensaje("");
  } catch (error) {
    console.error(error);
    mostrarMensaje("No se han podido obtener los datos del tiempo. Se volverá a intentar en la próxima actualización.", "error");
  } finally {
    document.body.classList.remove("cargando");
  }
}

function pintarActual(lugar, actual) {
  const esDia = actual.is_day === 1;
  const { texto, icono } = estado(actual.weather_code, esDia);

  el.ciudad.textContent = lugar.nombre;
  el.region.textContent = lugar.region || "";
  el.icono.textContent = icono;
  el.icono.setAttribute("aria-label", texto);
  el.temperatura.textContent = Math.round(actual.temperature_2m);
  el.descripcion.textContent = texto;
  el.sensacion.textContent = `${Math.round(actual.apparent_temperature)} °C`;
  el.humedad.textContent = `${actual.relative_humidity_2m} %`;
  el.viento.textContent = `${Math.round(actual.wind_speed_10m)} km/h ${direccionViento(actual.wind_direction_10m)}`;

  // Fondo según sea de día o de noche (y un tono gris si el cielo está cubierto o llueve)
  document.body.classList.toggle("dia", esDia);
  document.body.classList.toggle("noche", !esDia);
  document.body.classList.toggle("nublado", actual.weather_code >= 3);
  document.querySelector('meta[name="theme-color"]')
    .setAttribute("content", esDia ? "#1e3a8a" : "#0f172a");
  document.title = `${Math.round(actual.temperature_2m)}° ${lugar.nombre} · El Tiempo`;
}

function pintarHoras(horaActual, horario) {
  // Las horas vienen en la zona horaria local de la ciudad ("2026-09-28T14:00"),
  // así que comparamos por texto hasta la hora para empezar en la hora en curso.
  const prefijoAhora = horaActual.slice(0, 13);
  let inicio = horario.time.findIndex((t) => t.slice(0, 13) >= prefijoAhora);
  if (inicio < 0) inicio = 0;

  const fragmento = document.createDocumentFragment();
  for (let i = inicio; i < Math.min(inicio + 24, horario.time.length); i++) {
    const { texto, icono } = estado(horario.weather_code[i], horario.is_day[i] === 1);
    const lluvia = horario.precipitation_probability?.[i];

    const li = document.createElement("li");
    if (i === inicio) li.className = "ahora";
    li.innerHTML = `
      <div class="hora"></div>
      <div class="icono" role="img"></div>
      <div class="temp"></div>
      <div class="lluvia"></div>`;
    li.querySelector(".hora").textContent = i === inicio ? "Ahora" : `${horario.time[i].slice(11, 13)}:00`;
    li.querySelector(".icono").textContent = icono;
    li.querySelector(".icono").setAttribute("aria-label", texto);
    li.querySelector(".temp").textContent = `${Math.round(horario.temperature_2m[i])}°`;
    li.querySelector(".lluvia").textContent = lluvia ? `💧 ${lluvia}%` : "";
    li.title = texto;
    fragmento.appendChild(li);
  }
  el.horas.replaceChildren(fragmento);
  el.horas.scrollLeft = 0;
}

/* ---------- Actualización automática ---------- */

function cambiarLugar(lugar) {
  lugarActual = lugar;
  cargarTiempo();
  clearInterval(temporizador);
  temporizador = setInterval(cargarTiempo, INTERVALO_ACTUALIZACION);
}

// Si la pestaña estuvo en segundo plano más de 10 minutos, actualiza al volver.
document.addEventListener("visibilitychange", () => {
  if (lugarActual && document.visibilityState === "visible" && Date.now() - ultimaActualizacion >= INTERVALO_ACTUALIZACION) {
    cambiarLugar(lugarActual);
  }
});

el.btnActualizar.addEventListener("click", () => cambiarLugar(lugarActual));

/* ---------- Geolocalización ---------- */

async function nombreDeUbicacion(lat, lon) {
  try {
    const params = new URLSearchParams({ latitude: lat, longitude: lon, localityLanguage: "es" });
    const datos = await pedirJSON(`${API_GEO_INVERSA}?${params}`);
    return {
      nombre: datos.city || datos.locality || "Tu ubicación",
      region: [datos.principalSubdivision, datos.countryName].filter(Boolean).join(", "),
    };
  } catch {
    return { nombre: "Tu ubicación", region: "" };
  }
}

function usarMiUbicacion() {
  if (!("geolocation" in navigator)) {
    mostrarMensaje("Tu navegador no permite la geolocalización. Mostrando el tiempo de Madrid.");
    cambiarLugar(MADRID);
    return;
  }

  el.ciudad.textContent = "Buscando tu ubicación…";
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const lat = Number(coords.latitude.toFixed(4));
      const lon = Number(coords.longitude.toFixed(4));
      const lugar = { nombre: "Tu ubicación", region: "", lat, lon };
      mostrarMensaje("");
      cambiarLugar(lugar);
      // Ponemos el nombre de la ciudad en cuanto lo sepamos.
      const { nombre, region } = await nombreDeUbicacion(lat, lon);
      if (lugarActual === lugar) {
        lugar.nombre = nombre;
        lugar.region = region;
        el.ciudad.textContent = nombre;
        el.region.textContent = region;
      }
    },
    (error) => {
      const motivo = error.code === error.PERMISSION_DENIED
        ? "No has dado permiso para usar tu ubicación"
        : "No se ha podido obtener tu ubicación";
      mostrarMensaje(`${motivo}. Mostrando el tiempo de Madrid.`);
      if (!lugarActual) cambiarLugar(MADRID);
      else el.ciudad.textContent = lugarActual.nombre;
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 }
  );
}

el.btnUbicacion.addEventListener("click", usarMiUbicacion);

/* ---------- Buscador de ciudades ---------- */

let resultados = [];
let seleccionado = -1;
let esperaBusqueda = null;
let consultaEnCurso = 0;

async function buscarCiudades(texto) {
  const params = new URLSearchParams({ name: texto, count: "6", language: "es", format: "json" });
  const datos = await pedirJSON(`${API_GEOCODIFICACION}?${params}`);
  return (datos.results || []).map((r) => ({
    nombre: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

function pintarSugerencias() {
  el.sugerencias.replaceChildren(
    ...resultados.map((r, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === seleccionado));
      li.append(r.nombre);
      if (r.region) {
        const small = document.createElement("small");
        small.textContent = ` · ${r.region}`;
        li.append(small);
      }
      li.addEventListener("mousedown", (e) => {
        e.preventDefault(); // evita perder el foco antes del clic
        elegir(i);
      });
      return li;
    })
  );
  el.sugerencias.hidden = resultados.length === 0;
}

function cerrarSugerencias() {
  resultados = [];
  seleccionado = -1;
  pintarSugerencias();
}

function elegir(i) {
  const lugar = resultados[i];
  if (!lugar) return;
  el.busqueda.value = "";
  el.busqueda.blur();
  cerrarSugerencias();
  mostrarMensaje("");
  cambiarLugar(lugar);
}

async function actualizarSugerencias(texto) {
  const id = ++consultaEnCurso;
  if (texto.length < 2) {
    cerrarSugerencias();
    return [];
  }
  try {
    const encontrados = await buscarCiudades(texto);
    if (id !== consultaEnCurso) return resultados; // respuesta antigua
    resultados = encontrados;
    seleccionado = -1;
    pintarSugerencias();
    return encontrados;
  } catch (error) {
    console.error(error);
    return [];
  }
}

el.busqueda.addEventListener("input", () => {
  clearTimeout(esperaBusqueda);
  esperaBusqueda = setTimeout(() => actualizarSugerencias(el.busqueda.value.trim()), 300);
});

el.busqueda.addEventListener("keydown", (e) => {
  if (!resultados.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    seleccionado = (seleccionado + 1) % resultados.length;
    pintarSugerencias();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    seleccionado = (seleccionado - 1 + resultados.length) % resultados.length;
    pintarSugerencias();
  } else if (e.key === "Escape") {
    cerrarSugerencias();
  }
});

el.busqueda.addEventListener("blur", () => setTimeout(cerrarSugerencias, 150));

el.buscador.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearTimeout(esperaBusqueda);
  if (seleccionado >= 0) {
    elegir(seleccionado);
    return;
  }
  const texto = el.busqueda.value.trim();
  if (!texto) return;
  const encontrados = await actualizarSugerencias(texto);
  if (encontrados.length) {
    elegir(0);
  } else if (texto.length >= 2) {
    mostrarMensaje(`No se ha encontrado ninguna ciudad llamada «${texto}».`);
  }
});

/* ---------- Inicio ---------- */

usarMiUbicacion();
