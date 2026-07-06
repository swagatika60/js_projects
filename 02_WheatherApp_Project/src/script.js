const apiKey = '7b2c175727d87ec48c78a32805943c48';

const loadingSpinner = document.getElementById('loading-spinner');
const locationUI = document.getElementById('location-ui');
const weatherUI = document.getElementById('weather-ui');
const locationBtn = document.getElementById('location-btn');
const goToSearchBtn = document.getElementById('go-to-search-btn');
const backBtn = document.getElementById('back-btn');
const refreshBtn = document.getElementById('refresh-btn');
const unitToggleBtn = document.getElementById('unit-toggle');
const searchBar = document.getElementById('search-bar');
const searchBtn = document.getElementById('search-btn');
const historyList = document.getElementById('history-list');
const alertBox = document.getElementById('alert-message');
const themeToggleBtn = document.getElementById('theme-toggle');

const cityNameEl = document.getElementById('city-name');
const conditionEl = document.getElementById('condition');
const weatherDescriptionEl = document.getElementById('weather-description');
const weatherIconEl = document.getElementById('weather-icon');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const pressureEl = document.getElementById('pressure');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const localTimeEl = document.getElementById('local-time');
const forecastList = document.getElementById('forecast-list');

let isCelsius = true;
let currentTempC = 0;
let currentFeelsLikeC = 0;
let currentCity = null;

function showUI(element) {
  [loadingSpinner, locationUI, weatherUI].forEach(ui => {
    ui.classList.add('hidden');
    ui.classList.remove('show');
  });

  element.classList.remove('hidden');
  setTimeout(() => element.classList.add('show'), 20);
}

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.style.borderColor = type === 'success' ? 'rgba(138, 255, 187, 0.4)' : 'rgba(255, 255, 255, 0.2)';
  alertBox.style.backgroundColor = type === 'success' ? 'rgba(24, 150, 92, 0.18)' : 'rgba(255, 255, 255, 0.12)';
  alertBox.classList.remove('hidden');
  setTimeout(() => alertBox.classList.add('hidden'), 4300);
}

function updateBackground(conditionMain) {
  const weatherStr = conditionMain.toLowerCase();
  const body = document.body;
  body.className = '';

  if (weatherStr.includes('rain') || weatherStr.includes('drizzle')) body.classList.add('rain-bg');
  else if (weatherStr.includes('cloud')) body.classList.add('clouds-bg');
  else if (weatherStr.includes('clear')) body.classList.add('clear-bg');
  else body.classList.add('default-bg');
}

async function fetchWeather(query, isCoords = false) {
  const base = 'https://api.openweathermap.org/data/2.5/weather';
  const url = isCoords
    ? `${base}?lat=${query.lat}&lon=${query.lon}&units=metric&appid=${apiKey}`
    : `${base}?q=${encodeURIComponent(query)}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Location not found');
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function fetchForecast(query, isCoords = false) {
  const base = 'https://api.openweathermap.org/data/2.5/forecast';
  const url = isCoords
    ? `${base}?lat=${query.lat}&lon=${query.lon}&units=metric&appid=${apiKey}`
    : `${base}?q=${encodeURIComponent(query)}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Forecast not available');
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

function handleHistory(city) {
  localStorage.setItem('lastCity', city);
  let history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
  history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
  history.unshift(city);
  history = history.slice(0, 6);
  localStorage.setItem('weatherHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
  historyList.innerHTML = '';

  if (!history.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No recent searches yet';
    empty.className = 'history-empty';
    historyList.appendChild(empty);
    return;
  }

  history.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.addEventListener('click', () => processSearch(city));
    historyList.appendChild(li);
  });
}

function formatTime(unixTime, timezoneOffset) {
  const date = new Date((unixTime + timezoneOffset) * 1000);
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function getDailyForecast(forecastList) {
  const daily = [];
  const dates = new Set();

  forecastList.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!dates.has(date) && item.dt_txt.includes('12:00:00')) {
      dates.add(date);
      daily.push(item);
    }
  });

  return daily.slice(0, 5);
}

function renderForecast(forecastData) {
  forecastList.innerHTML = '';
  if (!forecastData || !forecastData.list) {
    forecastList.innerHTML = '<li class="forecast-card">Forecast not available</li>';
    return;
  }

  const dailyForecast = getDailyForecast(forecastData.list);
  dailyForecast.forEach(item => {
    const card = document.createElement('li');
    card.className = 'forecast-card';
    const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const icon = item.weather[0].icon;
    card.innerHTML = `
      <strong>${date}</strong>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${item.weather[0].description}" />
      <span>${Math.round(item.main.temp)}°</span>
      <small>${item.weather[0].main}</small>
    `;
    forecastList.appendChild(card);
  });
}

function renderTemperatures() {
  const temperature = isCelsius
    ? `${Math.round(currentTempC)}°C`
    : `${Math.round((currentTempC * 9) / 5 + 32)}°F`;
  const feelsLike = isCelsius
    ? `${Math.round(currentFeelsLikeC)}°C`
    : `${Math.round((currentFeelsLikeC * 9) / 5 + 32)}°F`;

  document.getElementById('temperature').textContent = temperature;
  feelsLikeEl.textContent = feelsLike;
  unitToggleBtn.textContent = isCelsius ? '°F' : '°C';
}

function updateWeatherDOM(data, forecastData) {
  currentCity = data.name;
  cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
  conditionEl.textContent = data.weather[0].description;
  weatherDescriptionEl.textContent = `Current conditions: ${data.weather[0].main}, humidity ${data.main.humidity}% with ${Math.round(data.wind.speed)} km/h winds.`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${data.wind.speed} km/h`;
  pressureEl.textContent = `${data.main.pressure} hPa`;
  localTimeEl.textContent = `Local time: ${formatTime(Math.floor(Date.now() / 1000), data.timezone)}`;
  sunriseEl.textContent = formatTime(data.sys.sunrise, data.timezone);
  sunsetEl.textContent = formatTime(data.sys.sunset, data.timezone);

  currentTempC = data.main.temp;
  currentFeelsLikeC = data.main.feels_like;
  renderTemperatures();

  const iconCode = data.weather[0].icon;
  weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  weatherIconEl.alt = data.weather[0].description;
  weatherIconEl.classList.remove('hidden');

  updateBackground(data.weather[0].main);
  renderForecast(forecastData);
  handleHistory(data.name);
}

async function processSearch(query, isCoords = false) {
  showUI(loadingSpinner);
  alertBox.classList.add('hidden');

  const weatherData = await fetchWeather(query, isCoords);
  if (!weatherData) {
    showAlert('City not found. Please try another name.');
    showUI(locationUI);
    return;
  }

  const forecastData = await fetchForecast(query, isCoords);
  updateWeatherDOM(weatherData, forecastData);
  showUI(weatherUI);
  searchBar.value = '';
}

window.addEventListener('load', () => {
  renderHistory();
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) processSearch(lastCity);
  else showUI(locationUI);
});

locationBtn.addEventListener('click', () => {
  showUI(loadingSpinner);
  if (!navigator.geolocation) {
    showAlert('Geolocation not supported by your browser.');
    showUI(locationUI);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => processSearch({ lat: position.coords.latitude, lon: position.coords.longitude }, true),
    () => {
      showAlert('Location access denied. Search manually instead.');
      showUI(locationUI);
    }
  );
});

goToSearchBtn.addEventListener('click', () => {
  showUI(weatherUI);
});

searchBtn.addEventListener('click', () => {
  const query = searchBar.value.trim();
  if (query) processSearch(query);
});

searchBar.addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    const query = searchBar.value.trim();
    if (query) processSearch(query);
  }
});

unitToggleBtn.addEventListener('click', () => {
  isCelsius = !isCelsius;
  renderTemperatures();
});

refreshBtn.addEventListener('click', () => {
  if (currentCity) processSearch(currentCity);
});

backBtn.addEventListener('click', () => {
  showUI(locationUI);
});

themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  themeToggleBtn.textContent = document.body.classList.contains('light-mode') ? 'Dark' : 'Light';
});
