const unitSwitch = document.getElementById('records-unit-switch');
const appEl = document.querySelector('.app');

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

// rows already exist in the HTML — this just fills in badge/chevron state
function updateList(unit, countData) {
  const list = document.querySelector(`.results-list[data-unit-list="${unit}"]`);
  if (!list) return;

  list.querySelectorAll('.result-row').forEach(row => {
    const meters = row.dataset.meters;
    const count = countData ? (countData[meters] || 0) : 0;
    const hasData = count > 0;

    const timeEl = row.querySelector('.result-time');
    const chevron = row.querySelector('.result-right i');

    row.classList.toggle('has-data', hasData);
    row.classList.toggle('no-data', !hasData);

    if (hasData) {
      timeEl.style.display = 'none';
      chevron.style.display = 'inline-block';
    } else {
      timeEl.style.display = 'inline';
      chevron.style.display = 'none';
    }
  });
}

async function initDashboard() {
  try {
    const res = await fetch('/api/counts');
    const counts = await res.json();

    updateList('meter', counts.meter);
    updateList('yard', counts.yard);
  } catch (err) {
    console.error("Could not load database counts:", err);
  }
}

async function toggleRecordsDropdown(row) {
  if (!row.classList.contains('has-data')) return;

  const meters = row.dataset.meters;
  const unit = row.closest('.results-list').dataset.unitList;
  const chevron = row.querySelector('.result-right i');

  const existingDropdown = row.nextElementSibling;
  if (existingDropdown && existingDropdown.classList.contains('records-dropdown')) {
    existingDropdown.remove();
    row.classList.remove('expanded');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
    return;
  }

  closeAllDropdowns();

  row.classList.add('expanded');
  if (chevron) chevron.style.transform = 'rotate(180deg)';

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
    const chevron = row.querySelector('.result-right i');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  });
}

function handleUnitToggle() {
  closeAllDropdowns();
  currentUnit = currentUnit === 'meter' ? 'yard' : 'meter';

  unitSwitch.dataset.unit = currentUnit;
  unitSwitch.setAttribute('aria-pressed', currentUnit === 'yard');
  appEl.dataset.unit = currentUnit;

  document.querySelectorAll('.results-list').forEach(list => {
    list.style.display = (list.dataset.unitList === currentUnit) ? 'flex' : 'none';
  });
}

unitSwitch.addEventListener('click', handleUnitToggle);

// click listeners attached once, upfront — toggleRecordsDropdown checks has-data at click time
document.querySelectorAll('.result-row').forEach(row => {
  row.addEventListener('click', () => toggleRecordsDropdown(row));
});

initDashboard();
