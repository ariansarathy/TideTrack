/* ── Generate stars ─────────────────────────────────────────────────── */
(function() {
  const field = document.getElementById('starsField');
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 55 + '%';
    s.style.setProperty('--dur', (2 + Math.random() * 4) + 's');
    s.style.setProperty('--peak', (0.3 + Math.random() * 0.7).toFixed(2));
    s.style.animationDelay = (Math.random() * 4) + 's';
    if (Math.random() > 0.7) { s.style.width = '3px'; s.style.height = '3px'; }
    field.appendChild(s);
  }
})();

/* ── Generate foam particles ────────────────────────────────────────── */
(function() {
  const container = document.getElementById('foamParticles');
  for (let i = 0; i < 20; i++) {
    const f = document.createElement('div');
    f.className = 'foam-dot';
    f.style.left = Math.random() * 100 + '%';
    f.style.setProperty('--size', (2 + Math.random() * 4) + 'px');
    f.style.setProperty('--y', Math.random() * 80 + 'px');
    f.style.setProperty('--dur', (3 + Math.random() * 5) + 's');
    f.style.setProperty('--delay', (Math.random() * 6) + 's');
    f.style.setProperty('--dx', (-30 + Math.random() * 60) + 'px');
    container.appendChild(f);
  }
})();

/* ── Heatmap placeholder ────────────────────────────────────────────── */
(function() {
  const row = document.getElementById('heatmapRow');
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;
  days.forEach(function(d, i) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-day' + (i <= todayIdx ? '' : ' low');
    if (i === todayIdx) cell.classList.add('today');
    const hrs = i <= todayIdx ? (Math.random() * 4).toFixed(1) : '0.0';
    const op = i <= todayIdx ? (0.15 + parseFloat(hrs) / 4 * 0.85) : 0.08;
    cell.style.opacity = op.toFixed(2);
    if (op < 0.25) cell.classList.add('low');
    cell.innerHTML = '<span class="heatmap-day-label">' + d + '</span><span class="heatmap-day-hours">' + hrs + 'h</span>';
    row.appendChild(cell);
  });
})();

/* ── Scroll reveal ──────────────────────────────────────────────────── */
(function() {
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });
})();

/* ── Theme toggle ───────────────────────────────────────────────────── */
(function() {
  const toggle = document.getElementById('themeToggle');
  const label  = document.getElementById('themeLabel');
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    label.textContent = t === 'dark' ? 'Dark' : 'Light';
    toggle.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
  }
  toggle.addEventListener('click', function() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
  document.getElementById('lightBtn').addEventListener('click', function() { setTheme('light'); });
  document.getElementById('darkBtn').addEventListener('click', function() { setTheme('dark'); });
})();

/* ── Whitelist demo ─────────────────────────────────────────────────── */
(function() {
  var items = ['docs.google.com', 'notion.so', 'canvas.instructure.com'];
  var list = document.getElementById('whitelistItems');
  var input = document.getElementById('whitelistUrl');

  function render() {
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<p class="wl-empty">No study domains added yet.</p>';
      return;
    }
    items.forEach(function(d, i) {
      var el = document.createElement('div');
      el.className = 'wl-item';
      el.innerHTML = '<span class="wl-domain">' + d + '</span><button class="wl-remove" data-i="' + i + '">Remove</button>';
      list.appendChild(el);
    });
    list.querySelectorAll('.wl-remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        items.splice(parseInt(this.dataset.i), 1);
        render();
      });
    });
  }
  render();

  document.getElementById('addWhitelist').addEventListener('click', function() {
    var v = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (v && items.indexOf(v) === -1) { items.push(v); input.value = ''; render(); }
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('addWhitelist').click();
  });
})();

/* ── Demo history rows ──────────────────────────────────────────────── */
(function() {
  var tbody = document.getElementById('reportContent');
  var data = [
    { date: 'Today',     study: '2h 14m', dist: '38m', pct: 78, segs: 5 },
    { date: 'Yesterday', study: '3h 02m', dist: '22m', pct: 89, segs: 7 },
    { date: 'Mar 29',    study: '1h 45m', dist: '51m', pct: 67, segs: 4 },
    { date: 'Mar 28',    study: '4h 10m', dist: '15m', pct: 94, segs: 9 },
  ];
  data.forEach(function(d) {
    var pctColor = d.pct >= 80 ? 'var(--accent)' : d.pct >= 60 ? 'var(--amber)' : 'var(--warn)';
    var tr = document.createElement('tr');
    tr.className = 'summary-row';
    tr.innerHTML =
      '<td class="date-cell"><span class="expand-icon">&#9654;</span>' + d.date + '</td>' +
      '<td class="dur-study">' + d.study + '</td>' +
      '<td class="dur-dist">' + d.dist + '</td>' +
      '<td><div class="pct-wrap"><div class="pct-bar-bg"><div class="pct-bar-fill" style="width:' + d.pct + '%;background:' + pctColor + '"></div></div><span class="pct-label">' + d.pct + '%</span></div></td>' +
      '<td>' + d.segs + '</td>';
    tbody.appendChild(tr);
  });
})();