/* timer.js — Floating 2-hour quiz timer.
   Include with <script src="timer.js"></script> on EVERY page (index + all quiz pages). */
(function () {
  'use strict';

  var TOTAL_SECONDS = 2 * 60 * 60;            // 2 hours
  var STORAGE_KEY   = 'quizTimerStateV1';

  var state = { remainingSeconds: TOTAL_SECONDS, running: false, endTimestamp: null };
  var intervalId = null;

  var container, bodyEl, displayEl, startBtn, pauseBtn, resetBtn, toggleBtn;
  var minimized = false;

  /* ---------------- state persistence ---------------- */

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (typeof s.remainingSeconds !== 'number') return;

      if (s.running && typeof s.endTimestamp === 'number') {
        // Recompute from the real clock (this is what makes it survive navigation)
        var diff = Math.round((s.endTimestamp - Date.now()) / 1000);
        state.remainingSeconds = Math.max(0, diff);
        state.running = state.remainingSeconds > 0;
        state.endTimestamp = state.running ? s.endTimestamp : null;
      } else {
        state.remainingSeconds = Math.max(0, Math.min(TOTAL_SECONDS, s.remainingSeconds));
        state.running = false;
        state.endTimestamp = null;
      }
    } catch (e) { /* ignore corrupt storage */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        remainingSeconds: state.remainingSeconds,
        running: state.running,
        endTimestamp: state.endTimestamp
      }));
    } catch (e) {}
  }

  /* ---------------- helpers ---------------- */

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatTime(sec) {
    sec = Math.max(0, sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  function ensureInterval() {
    if (!intervalId) intervalId = setInterval(tick, 250);
  }

  function stopInterval() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  }

  /* ---------------- timer logic ---------------- */

  function tick() {
    if (!state.running) return;

    state.remainingSeconds = Math.max(0, Math.round((state.endTimestamp - Date.now()) / 1000));
    render();

    if (state.remainingSeconds <= 0) {
      state.running = false;
      state.endTimestamp = null;
      stopInterval();
      updateButtons();
      saveState();
      alert("⏰ Time's up! Your 2-hour quiz timer has finished.");
    }
  }

  function start() {
    if (state.running) return;
    if (state.remainingSeconds <= 0) state.remainingSeconds = TOTAL_SECONDS;
    state.running = true;
    state.endTimestamp = Date.now() + state.remainingSeconds * 1000;
    ensureInterval();
    render(); updateButtons(); saveState();
  }

  function pause() {
    if (!state.running) return;
    state.remainingSeconds = Math.max(0, Math.round((state.endTimestamp - Date.now()) / 1000));
    state.running = false;
    state.endTimestamp = null;
    stopInterval();
    render(); updateButtons(); saveState();
  }

  function reset() {
    state.running = false;
    state.endTimestamp = null;
    state.remainingSeconds = TOTAL_SECONDS;
    stopInterval();
    render(); updateButtons(); saveState();
  }

  /* ---------------- UI ---------------- */

  function makeButton(label, bg) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText =
      'flex:1 1 0;padding:7px 0;margin:0 3px;border:none;border-radius:6px;' +
      'font-size:13px;font-family:inherit;font-weight:600;cursor:pointer;' +
      'color:#fff;background:' + bg + ';transition:opacity .15s;';
    return b;
  }

  function buildUI() {
    container = document.createElement('div');
    container.id = 'quiz-timer-widget';
    container.style.cssText = [
      'position:fixed', 'top:16px', 'right:16px', 'z-index:2147483647',
      'font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif',
      'background:#fff', 'border:1px solid #ddd', 'border-radius:10px',
      'box-shadow:0 4px 16px rgba(0,0,0,.18)', 'padding:10px 12px 12px',
      'width:196px', 'box-sizing:border-box', 'text-align:center',
      'user-select:none'
    ].join(';');

    // header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
      'font-size:11px;font-weight:700;color:#555;letter-spacing:.5px;margin-bottom:2px;';

    var title = document.createElement('span');
    title.textContent = '⏱ QUIZ TIMER';

    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.textContent = '–';
    toggleBtn.title = 'Minimize / restore';
    toggleBtn.style.cssText = 'border:none;background:#eee;color:#444;border-radius:4px;' +
      'width:20px;height:20px;line-height:1;font-size:14px;font-weight:700;' +
      'cursor:pointer;padding:0;';

    header.appendChild(title);
    header.appendChild(toggleBtn);

    // countdown
    displayEl = document.createElement('div');
    displayEl.style.cssText = 'font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;' +
      'letter-spacing:1.5px;color:#0b5ed7;margin:4px 0 10px;';

    // controls
    bodyEl = document.createElement('div');

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;';

    startBtn = makeButton('Start', '#0b5ed7');
    pauseBtn = makeButton('Pause', '#6c757d');
    resetBtn = makeButton('Reset', '#adb5bd');

    row.appendChild(startBtn);
    row.appendChild(pauseBtn);
    row.appendChild(resetBtn);

    var note = document.createElement('div');
    note.textContent = 'Keeps running across pages';
    note.style.cssText = 'font-size:10px;color:#888;margin-top:8px;';

    bodyEl.appendChild(row);
    bodyEl.appendChild(note);

    container.appendChild(header);
    container.appendChild(displayEl);
    container.appendChild(bodyEl);
    document.body.appendChild(container);

    startBtn.addEventListener('click', start);
    pauseBtn.addEventListener('click', pause);
    resetBtn.addEventListener('click', reset);
    toggleBtn.addEventListener('click', toggleMinimize);
  }

  function toggleMinimize() {
    minimized = !minimized;
    bodyEl.style.display = minimized ? 'none' : '';
    displayEl.style.margin = minimized ? '4px 0 2px' : '4px 0 10px';
    toggleBtn.textContent = minimized ? '+' : '–';
  }

  function render() {
    displayEl.textContent = formatTime(state.remainingSeconds);
    displayEl.style.color =
      state.remainingSeconds <= 300 ? '#b02a37' : '#0b5ed7';   // red in last 5 min
    displayEl.title = state.running ? 'Running' : 'Paused';
  }

  function updateButtons() {
    startBtn.disabled = state.running;
    pauseBtn.disabled = !state.running;
    startBtn.style.opacity = startBtn.disabled ? 0.45 : 1;
    pauseBtn.style.opacity = pauseBtn.disabled ? 0.45 : 1;
    startBtn.style.cursor = startBtn.disabled ? 'not-allowed' : 'pointer';
    pauseBtn.style.cursor = pauseBtn.disabled ? 'not-allowed' : 'pointer';
  }

  /* ---------------- cross-tab sync ---------------- */

  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    loadState();
    if (state.running) ensureInterval(); else stopInterval();
    render(); updateButtons();
  });

  // Re-sync as soon as the tab becomes visible (fixes drift after sleep/background)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && state.running) tick();
  });

  /* ---------------- init ---------------- */

  function init() {
    loadState();
    buildUI();
    render();
    updateButtons();
    if (state.running) ensureInterval();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
