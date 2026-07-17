const unitSwitch = document.getElementById('records-unit-switch');
const appEl = document.querySelector('.app');
const meterListContainer = document.getElementById('records-meter-list');
const yardListContainer = document.getElementById('records-yard-list');

const distances = [60, 100, 200, 400, 800, 1000];
let currentUnit = 'meter';

//format how the stopwatch looks
function formatTime(ms) {
  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad = (num, len = 2) => String(num).padStart(len, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function formatRecordDate(ts) {
  const date = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const timeStr = date
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toLowerCase();

  if (date.toDateString() === now.toDateString()) return `Today, ${timeStr}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;

  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${dateStr}, ${timeStr}`;
}

//if distance label > 1000 then apply german number string add a dot(1.000) else return the nmber as is
function formatDistanceNumber(num) {
  return num >= 1000 ? num.toLocaleString('de-DE') : String(num);
}

async function initDashboard() {
  try {
    const res = await fetch('/api/counts');
    const counts = await res.json();

    buildList(meterListContainer, 'meter', counts.meter);
    buildList(yardListContainer, 'yard', counts.yard);
  } catch (err) {
    console.error("Could not load database counts:", err);
  }
}

function buildList(container, unit, countData) {
  container.innerHTML = '';

  distances.forEach(dist => {
    const recordsCount = countData ? (countData[dist] || 0) : 0;
    const hasData = recordsCount > 0;

    const row = document.createElement('div');
    row.className = `result-row ${hasData ? 'has-data' : 'no-data'}`;
    row.dataset.meters = dist;

    row.innerHTML = `
      <span class="result-label">
        <span class="calc-icon"><i class="fa-solid fa-calculator"></i></span>
        Avg ${formatDistanceNumber(dist)}
      </span>
      <span class="result-right">
        ${hasData
          ? `<i class="fa-solid fa-chevron-down" style="font-size: 1.4rem; color: #888;"></i>`
          : `<span class="result-time" data-recorded="false" style="color: #9a9a9a; font-size: 1.6rem; font-weight: 800;">NT</span>`
        }
      </span>
    `;

    container.appendChild(row);

    if (hasData) {
      row.addEventListener('click', () => toggleRecordsDropdown(row, unit));
    }
  });
}

async function toggleRecordsDropdown(row, unit) {
  const meters = row.dataset.meters;
  const icon = row.querySelector('.result-right i');

  const existingDropdown = row.nextElementSibling;
  if (existingDropdown && existingDropdown.classList.contains('records-dropdown')) {
    existingDropdown.remove();
    row.classList.remove('expanded');
    if (icon) icon.style.transform = 'rotate(0deg)';
    return;
  }

  closeAllDropdowns();

  row.classList.add('expanded');
  if (icon) icon.style.transform = 'rotate(180deg)';

  const dropdown = document.createElement('div');
  dropdown.className = 'records-dropdown';
  dropdown.innerHTML = '<div class="records-loading">Loading...</div>';
  row.parentNode.insertBefore(dropdown, row.nextSibling);

  try {
    const res = await fetch(`/api/records?unit=${unit}&distance=${meters}`);
    const records = await res.json();

    if (!records.length) {
      dropdown.innerHTML = '<div class="records-empty">No records yet</div>';
      return;
    }

    dropdown.innerHTML = records.map(r => `
      <div class="record-entry">
        <span class="record-date">${formatRecordDate(r.date_time)}</span>
        <span class="record-time">${formatTime(r.logged_time)}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Could not load details:', err);
    dropdown.innerHTML = '<div class="records-empty">Error loading data.</div>';
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.records-dropdown').forEach(d => d.remove());
  document.querySelectorAll('.result-row').forEach(row => {
    row.classList.remove('expanded');
    const icon = row.querySelector('.result-right i');
    if (icon) icon.style.transform = 'rotate(0deg)';
  });
}

function handleUnitToggle() {
  closeAllDropdowns();
  currentUnit = currentUnit === 'meter' ? 'yard' : 'meter';

  unitSwitch.dataset.unit = currentUnit;
  unitSwitch.setAttribute('aria-pressed', currentUnit === 'yard');
  appEl.dataset.unit = currentUnit;

  meterListContainer.style.display = (currentUnit === 'meter') ? 'flex' : 'none';
  yardListContainer.style.display = (currentUnit === 'yard') ? 'flex' : 'none';
}

unitSwitch.addEventListener('click', handleUnitToggle);

initDashboard();
