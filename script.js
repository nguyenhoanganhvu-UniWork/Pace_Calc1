const stopwatchDisplay = document.getElementById('stopwatch-display');
const unitSwitch = document.getElementById('unit-switch');
const appEl = document.querySelector('.app');

const distanceButtons = document.querySelectorAll('.distance-btn');
const resultsLists = document.querySelectorAll('.results-list');

const notif = document.getElementById('notif');

let isRunning = false;
let activeMeters = null;
let startTime = null;
let timerInterval = null;

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
  //adds a rule so  that all displayed numbers will alawys have double digits
  const pad = (num, len = 2) => String(num).padStart(len, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function startTimerLoop() {
  //telling the browser to check for diff ever 10miliseconds
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    stopwatchDisplay.textContent = formatTime(elapsed);
  }, 10);
}

function stopTimerLoop() {
  clearInterval(timerInterval);
  timerInterval = null;
}
//3 checks when pressing the distance buttons: 
// 1.if is NOT running then start with the current distance unit 
// 2.if pressed button is the same then stop 
// 3. else stop current run and run a new run based on the button
function handleDistanceClick(button) {
  const meters = button.dataset.meters;

  if (!isRunning) {
    startRun(meters, button);
  } else if (activeMeters === meters) {
    stopRun();
  } else {
    stopRun();
    startRun(meters, button);
  }
}
//change the attributes for needed extra checks during use
function startRun(meters, button) {
  isRunning = true;
  activeMeters = meters;
  startTime = Date.now();
  //changing the active attribute of all others buttons while making the current one active for later checks
  distanceButtons.forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  startTimerLoop();
}
//grab the time diff, stop the timer, go to record func then change the attributes of the current button because it is stopped
function stopRun() {
  const elapsed = Date.now() - startTime;
  stopTimerLoop();

  recordResult(activeMeters, elapsed);

  const activeBtn = document.querySelector(`.distance-btn[data-meters="${activeMeters}"]`);
  if (activeBtn) activeBtn.classList.remove('active');

  isRunning = false;
  activeMeters = null;
  startTime = null;
}
//take(distace unit,time diff) then update the data of the coressponding result row 
async function recordResult(meters, elapsedMs) {
  const row = document.querySelector(
    `.results-list[data-unit-list="${currentUnit}"] .result-row[data-meters="${meters}"]`
  );
  if (!row) return;

  const timeEl = row.querySelector('.result-time');
  timeEl.textContent = formatTime(elapsedMs);
  timeEl.dataset.recorded = 'true';

  const doc = {
    distance: meters,
    logged_time: elapsedMs,
    date_time: Date.now()
  };

  const payload = currentUnit === 'meter'
    ? { meter: [doc], yard: [] }
    : { meter: [], yard: [doc] };

  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showNotification("Saved!");
      fetchCounts(); // refresh badge counts so the new record shows up immediately
    } else {
      showNotification("Save Failed!");
    }
  } catch (err) {
    console.error("Unable to send Data!", err);
    showNotification("Save Failed!");
  }
}

//if distance label > 1000 then apply german number string add a dot(1.000) else return the nmber as is
function formatDistanceNumber(num) {
  return num >= 1000
    ? num.toLocaleString('de-DE')
    : String(num);
}

function updateDistanceLabels() {
  //making sure the button distance are numbers and follow the german number display rule
  distanceButtons.forEach(button => {
    const meters = Number(button.dataset.meters);
    button.textContent = formatDistanceNumber(meters);
  });
  //starts 2 loop: one for lists and one for within the unit lists
  // mainly to make sure that the distance number will always be displayed according to the german string display(1.000)
  resultsLists.forEach(list => {
    list.querySelectorAll('.result-row').forEach(row => {
      const meters = Number(row.dataset.meters);
      const label = row.querySelector('.result-label');
      //making sure no error can be displayed by enforcing the result label span to always follow below's format everyitme the func is fired
      label.innerHTML = `<span class="calc-icon"><i class="fa-solid fa-calculator"></i></span>Avg ${formatDistanceNumber(meters)}`;
    });
  });
}

function handleUnitToggle() {
  //check if the current meter is active then switch to yard if yard then to meter
  currentUnit = currentUnit === 'meter' ? 'yard' : 'meter';
  //upate 
  unitSwitch.dataset.unit = currentUnit;
  unitSwitch.setAttribute('aria-pressed', currentUnit === 'yard');

  appEl.dataset.unit = currentUnit;

  //go down all the vailable lists then does as an if check(===) is the list.dataset.unitList == current unit ? yes then change display to flex if not then none
  //example: current unit: meter, press toggle, current unit: yard
  // check meter(list) == yard(current unit): false change display to none
  // check yard(list) == yard(current unit): true change to flex
  resultsLists.forEach(list => {
    list.style.display = (list.dataset.unitList === currentUnit) ? 'flex' : 'none';
  });
  //update the labels to match the current unit list
  updateDistanceLabels();
}
// stop timer if it's running, remove active attribute for current active button, change the stop watch to 00



function showNotification(message) {
  notif.textContent = message;
  notif.style.display = 'flex';
  setTimeout(() => {
    notif.textContent = "Nothing yet!";
    notif.style.display = 'none';
  }, 5000);
}

// ---- counts / badges ----

async function fetchCounts() {
  try {
    const res = await fetch('/api/counts');
    const counts = await res.json();
    updateBadges(counts);
  } catch (err) {
    console.error("Unable to fetch counts", err);
  }
}

function updateBadges(counts) {
  ['meter', 'yard'].forEach(unit => {
    const list = document.querySelector(`.results-list[data-unit-list="${unit}"]`);
    if (!list) return;
    list.querySelectorAll('.result-row').forEach(row => {
      const meters = row.dataset.meters;
      const count = (counts[unit] && counts[unit][meters]) || 0;
      const badge = row.querySelector('.record-badge');
      const timeEl = row.querySelector('.result-time');
      
      if (count > 0) {
        // Show the database record count badge
        badge.textContent = count;
        badge.style.display = 'flex';
        
        // Hide "NT" if the stopwatch hasn't been run this session, but database records exist
        if (timeEl && timeEl.textContent === 'NT') {
          timeEl.style.display = 'none';
        }
      } else {
        // No records in database
        badge.style.display = 'none';
        
        // Make sure "NT" is visible if there is indeed no time recorded
        if (timeEl && timeEl.textContent === 'NT') {
          timeEl.style.display = 'inline';
        }
      }
    });
  });
}

// ---- records view ----

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

// Inline dropdown for records under a result row
async function toggleRecordsDropdown(row) {
  const meters = row.dataset.meters;
  const badge = row.querySelector('.record-badge');
  if (!badge || badge.style.display === 'none') return; // no records to show

  // if dropdown already exists, remove it
  const existing = row.nextElementSibling;
  if (existing && existing.classList && existing.classList.contains('records-dropdown')) {
    existing.remove();
    return;
  }

  // close any other open dropdowns
  closeAllDropdowns();

  const dropdown = document.createElement('div');
  dropdown.className = 'records-dropdown';
  dropdown.innerHTML = '<div class="records-loading">Loading...</div>';
  row.parentNode.insertBefore(dropdown, row.nextSibling);

  try {
    const res = await fetch(`/api/records?unit=${currentUnit}&distance=${meters}`);
    const records = await res.json();

    if (!records.length) {
      dropdown.innerHTML = '<div class="records-empty">No records yet</div>';
      return;
    }

    const bestMs = Math.min(...records.map(r => r.logged_time));

    const bestTimeHtml = ` 
    <div class="best-time-row">
      <span class="best-time-label">Best Time:</span>
      <span class="best-time-value">${formatTime(bestMs)}</span>
    </div>
    `;

    const entriesHtml = records.map(r => `
      <div class="record-entry">
        <span class="record-date">${formatRecordDate(r.date_time)}</span>
        <span class="record-time">${formatTime(r.logged_time)}</span>
      </div>
    `).join('');

    dropdown.innerHTML = bestTimeHtml + entriesHtml;
  

  } catch (err) {
    console.error('Unable to fetch records:', err);
    dropdown.innerHTML = '<div class="records-empty">Failed to load data.</div>';
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.records-dropdown').forEach(d => d.remove());
}



//add event listener to each buttons
distanceButtons.forEach(button => {
  button.addEventListener('click', () => handleDistanceClick(button));
});
unitSwitch.addEventListener('click', handleUnitToggle);

document.querySelectorAll('.result-row').forEach(row => {
  row.addEventListener('click', () => toggleRecordsDropdown(row));
});

updateDistanceLabels();
fetchCounts();
