/* ═══════════════════════════════════════════════════════════════════════════
   TideTrack — Tide Loop Learning System
   External JS for tide.html (Chrome MV3 compliant — no inline scripts)
   ═══════════════════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────────────────
let tideData = {
  topics: [],
  momentum: 0,
  streak: 0,
  totalSessions: 0,
  sessionsToday: 0,
  lastSessionDate: null,
  weeklyChart: [0, 0, 0, 0, 0, 0, 0],
  history: []
};

let userName = 'You';

let currentTopic = null;
let currentAnalysis = null;
let currentFixSession = null;
let fixTimerInterval = null;
let fixTimerSeconds = 300;
let isRetry = false;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const screens = {
  feed:     $('screen-feed'),
  explain:  $('screen-explain'),
  feedback: $('screen-feedback'),
  fix:      $('screen-fix'),
  result:   $('screen-result'),
  progress: $('screen-progress')
};

// ── Topic suggestions pool ──────────────────────────────────────────────────
const TOPIC_SUGGESTIONS = [
  'Derivatives', 'Photosynthesis', 'React Hooks', 'Supply & Demand',
  'DNA Replication', 'Newton\'s Laws', 'SQL Joins', 'The French Revolution',
  'Recursion', 'Cell Mitosis', 'Linear Algebra', 'Cognitive Bias',
  'Thermodynamics', 'Binary Search', 'Macroeconomics', 'Organic Reactions',
  'Shakespeare', 'Probability', 'Machine Learning', 'World War II',
];

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadTideData();
  await loadTheme();
  await loadUserName();
  createParticles();
  bindEvents();
  renderFeed();
  renderProgress();
  showScreen('feed');
});

// ── Theme ───────────────────────────────────────────────────────────────────
async function loadTheme() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get('theme', (d) => {
        if (d.theme) document.documentElement.setAttribute('data-theme', d.theme);
        resolve();
      });
    } catch (e) { resolve(); }
  });
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  try { chrome.storage.local.set({ theme: next }); } catch (e) {}
}

// ── Name system ─────────────────────────────────────────────────────────────
async function loadUserName() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get('roomUserName', (d) => {
        if (d.roomUserName) {
          userName = d.roomUserName;
          $('nameBadge').textContent = userName;
          resolve();
        } else {
          showNameModal(resolve);
        }
      });
    } catch (e) {
      const stored = localStorage.getItem('roomUserName');
      if (stored) {
        userName = stored;
        $('nameBadge').textContent = userName;
        resolve();
      } else {
        showNameModal(resolve);
      }
    }
  });
}

function saveUserName(name) {
  userName = name;
  $('nameBadge').textContent = name;
  try { chrome.storage.local.set({ roomUserName: name }); }
  catch (e) { localStorage.setItem('roomUserName', name); }
}

function showNameModal(callback) {
  const modal = $('nameModal');
  const input = $('userNameInput');
  const btn = $('btnSaveName');
  modal.classList.add('active');
  input.value = userName === 'You' ? '' : userName;
  setTimeout(() => input.focus(), 100);

  function save() {
    const name = input.value.trim() || 'You';
    saveUserName(name);
    modal.classList.remove('active');
    btn.removeEventListener('click', save);
    input.removeEventListener('keydown', onKey);
    if (callback) callback();
  }
  function onKey(e) { if (e.key === 'Enter') save(); }
  btn.addEventListener('click', save);
  input.addEventListener('keydown', onKey);
}

// ── Data persistence ─────────────────────────────────────────────────────────
async function loadTideData() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['tideData'], (result) => {
        if (result.tideData) {
          tideData = { ...tideData, ...result.tideData };
        }
        updateStreak();
        resolve();
      });
    } catch (e) {
      // Fallback for non-extension context
      try {
        const stored = localStorage.getItem('tideData');
        if (stored) tideData = { ...tideData, ...JSON.parse(stored) };
      } catch (e2) {}
      updateStreak();
      resolve();
    }
  });
}

function saveTideData() {
  try {
    chrome.storage.local.set({ tideData });
  } catch (e) {
    try { localStorage.setItem('tideData', JSON.stringify(tideData)); } catch (e2) {}
  }
}

function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (tideData.lastSessionDate === today) return;

  if (tideData.lastSessionDate === yesterday) {
    // streak continues
  } else if (tideData.lastSessionDate !== today) {
    tideData.streak = 0;
    tideData.sessionsToday = 0;
  }
}

// ── Screen navigation ────────────────────────────────────────────────────────
function showScreen(name) {
  const hasActive = Object.values(screens).some(s => s.classList.contains('active'));
  const delay = hasActive ? 350 : 0;

  Object.values(screens).forEach((s) => {
    s.classList.remove('visible', 'slide-out');
    if (s.classList.contains('active')) {
      s.classList.add('slide-out');
      setTimeout(() => {
        s.classList.remove('active', 'slide-out');
      }, 350);
    }
  });

  const target = screens[name];
  setTimeout(() => {
    target.classList.add('active');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add('visible');
      });
    });
  }, delay);

  // Update nav
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.screen === name);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Event binding ────────────────────────────────────────────────────────────
function bindEvents() {
  // Theme toggle
  $('themeToggle').addEventListener('click', toggleTheme);

  // Name badge
  $('nameBadge').addEventListener('click', () => {
    showNameModal(() => {
      const greeting = $('feedGreeting');
      if (greeting && userName !== 'You') {
        greeting.textContent = `Hey ${userName}, let's fix one thing in 5 minutes`;
      }
    });
  });

  // Kai chat
  const kaiFab = $('kaiFab');
  const kaiPanel = $('kaiPanel');
  kaiFab.addEventListener('click', () => {
    const isOpen = kaiPanel.classList.toggle('open');
    kaiFab.classList.toggle('has-panel', isOpen);
    if (isOpen) setTimeout(() => $('kaiInput').focus(), 100);
  });
  $('kaiClose').addEventListener('click', () => {
    kaiPanel.classList.remove('open');
    kaiFab.classList.remove('has-panel');
  });
  $('kaiSend').addEventListener('click', sendKaiMessage);
  $('kaiInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendKaiMessage();
  });

  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      showScreen(tab.dataset.screen);
      if (tab.dataset.screen === 'progress') renderProgress();
      if (tab.dataset.screen === 'feed') renderFeed();
    });
  });

  // Feed
  $('startNewBtn').addEventListener('click', () => showScreen('explain'));
  $('fixNowBtn').addEventListener('click', () => {
    const weakest = getWeakestTopic();
    if (weakest) {
      currentTopic = weakest.name;
      currentAnalysis = {
        missing: weakest.gaps || [],
        misconceptions: [],
        confidence: weakest.confidence
      };
      startFixSession();
    }
  });

  // Explain
  $('explainBackBtn').addEventListener('click', () => showScreen('feed'));

  const topicInput = $('topicInput');
  const explanationInput = $('explanationInput');
  const analyzeBtn = $('analyzeBtn');

  function checkExplainReady() {
    analyzeBtn.disabled = !(topicInput.value.trim() && explanationInput.value.trim().length >= 10);
  }
  topicInput.addEventListener('input', checkExplainReady);
  explanationInput.addEventListener('input', checkExplainReady);

  analyzeBtn.addEventListener('click', () => {
    currentTopic = topicInput.value.trim();
    analyzeUnderstanding(currentTopic, explanationInput.value.trim());
  });

  // Feedback
  $('feedbackBackBtn').addEventListener('click', () => showScreen('explain'));
  $('startFixBtn').addEventListener('click', () => startFixSession());

  // Fix session
  $('fixBackBtn').addEventListener('click', () => {
    clearInterval(fixTimerInterval);
    showScreen('feedback');
  });

  const answerInput = $('answerInput');
  const checkAnswerBtn = $('checkAnswerBtn');

  answerInput.addEventListener('input', () => {
    checkAnswerBtn.disabled = !answerInput.value.trim();
  });

  checkAnswerBtn.addEventListener('click', () => {
    checkAnswer(answerInput.value.trim());
  });

  // Allow Enter key on answer input
  answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !checkAnswerBtn.disabled) {
      checkAnswer(answerInput.value.trim());
    }
  });
}

// ── Render: Feed ─────────────────────────────────────────────────────────────
function renderFeed() {
  // Personalized greeting
  const greeting = $('feedGreeting');
  if (greeting && userName && userName !== 'You') {
    greeting.textContent = `Hey ${userName}, let's fix one thing in 5 minutes`;
  }

  const weakest = getWeakestTopic();

  if (weakest) {
    $('weakTopicCard').style.display = '';
    $('feedEmpty').style.display = 'none';
    $('weakTopicName').textContent = weakest.name;
    $('weakTopicScore').innerHTML = weakest.confidence + '<span>%</span>';
    $('weakTopicDetail').textContent = weakest.gaps && weakest.gaps.length > 0
      ? 'Gaps: ' + weakest.gaps.slice(0, 2).join(', ')
      : 'Needs more practice';
  } else {
    $('weakTopicCard').style.display = 'none';
    $('feedEmpty').style.display = '';
  }

  // Momentum ring
  animateRing($('momentumCircle'), tideData.momentum, 50, 120);
  $('momentumValue').textContent = tideData.momentum;

  // Topic suggestions
  renderTopicSuggestions();

  // Recent progress
  const recentTopics = [...tideData.topics]
    .sort((a, b) => new Date(b.lastStudied) - new Date(a.lastStudied))
    .slice(0, 5);

  if (recentTopics.length > 0) {
    $('recentCard').style.display = '';
    const list = $('recentList');
    list.innerHTML = '';
    recentTopics.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'recent-item';
      const scoreClass = t.confidence < 40 ? 'low' : t.confidence < 70 ? 'mid' : 'high';
      li.innerHTML =
        '<span class="recent-topic">' + escapeHtml(t.name) + '</span>' +
        '<span class="recent-score ' + scoreClass + '">' + t.confidence + '%</span>';
      list.appendChild(li);
    });
  } else {
    $('recentCard').style.display = 'none';
  }
}

// ── Topic Suggestions ───────────────────────────────────────────────────────
function renderTopicSuggestions() {
  const container = $('topicSuggestions');
  if (!container) return;
  container.innerHTML = '';

  // Filter out topics user already has
  const existingNames = tideData.topics.map(t => t.name.toLowerCase());
  const available = TOPIC_SUGGESTIONS.filter(s => !existingNames.includes(s.toLowerCase()));

  // Pick 6 random
  const shuffled = available.sort(() => 0.5 - Math.random()).slice(0, 6);

  shuffled.forEach(topic => {
    const chip = document.createElement('button');
    chip.className = 'topic-chip';
    chip.textContent = topic;
    chip.addEventListener('click', () => {
      $('topicInput').value = topic;
      showScreen('explain');
      $('explanationInput').focus();
    });
    container.appendChild(chip);
  });
}

// ── Render: Progress ─────────────────────────────────────────────────────────
function renderProgress() {
  $('progMomentum').textContent = tideData.momentum;
  $('progStreak').textContent = tideData.streak;
  $('progSessions').textContent = tideData.totalSessions;
  $('progToday').textContent = tideData.sessionsToday;

  // Weekly chart
  const chart = $('weeklyChart');
  chart.innerHTML = '';
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxVal = Math.max(...tideData.weeklyChart, 1);

  tideData.weeklyChart.forEach((val, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'chart-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = '0px';
    const label = document.createElement('span');
    label.className = 'chart-day';
    label.textContent = days[i];
    wrap.appendChild(bar);
    wrap.appendChild(label);
    chart.appendChild(wrap);

    // Animate bars
    setTimeout(() => {
      bar.style.height = Math.max(2, (val / maxVal) * 80) + 'px';
    }, 100 + i * 80);
  });

  // Mastered topics
  const mastered = tideData.topics.filter((t) => t.confidence >= 80);
  const weak = tideData.topics.filter((t) => t.confidence < 80);

  if (mastered.length > 0) {
    $('masteredCard').style.display = '';
    const list = $('masteredList');
    list.innerHTML = '';
    mastered.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'mastered-item';
      li.innerHTML =
        '<span class="mastered-name">' + escapeHtml(t.name) + '</span>' +
        '<div class="mastered-bar-bg"><div class="mastered-bar-fill" style="width:' + t.confidence + '%"></div></div>' +
        '<span class="mastered-pct">' + t.confidence + '%</span>';
      list.appendChild(li);
    });
  } else {
    $('masteredCard').style.display = 'none';
  }

  if (weak.length > 0) {
    $('weakCard').style.display = '';
    const list = $('weakList');
    list.innerHTML = '';
    weak.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'weak-item';
      li.innerHTML =
        '<span class="weak-name">' + escapeHtml(t.name) + '</span>' +
        '<div class="weak-bar-bg"><div class="weak-bar-fill" style="width:' + t.confidence + '%"></div></div>' +
        '<span class="weak-pct">' + t.confidence + '%</span>';
      list.appendChild(li);
    });
  } else {
    $('weakCard').style.display = 'none';
  }

  // Study timeline
  renderTimeline();
}

function renderTimeline() {
  const timeline = $('studyTimeline');
  const card = $('timelineCard');
  if (!timeline || !card) return;

  const history = tideData.history || [];
  if (history.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = '';
  timeline.innerHTML = '';

  const entries = history.slice().reverse().slice(0, 15);
  const today = new Date().toISOString().split('T')[0];

  entries.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'timeline-entry' + (i > 4 ? ' old' : '');

    const dateLabel = entry.date === today ? 'Today' : formatDate(entry.date);
    const action = entry.action === 'retried' ? 'Retried' : 'Studied';
    const delta = entry.confidenceAfter - entry.confidenceBefore;
    const deltaClass = delta >= 0 ? 'up' : 'down';
    const deltaText = delta >= 0 ? '+' + delta + '%' : delta + '%';

    div.innerHTML =
      '<div class="timeline-date">' + dateLabel + '</div>' +
      '<div class="timeline-topic">' + escapeHtml(entry.topic) + '</div>' +
      '<div class="timeline-detail">' + action +
        ' &middot; <span class="timeline-delta ' + deltaClass + '">' +
        entry.confidenceBefore + '% &rarr; ' + entry.confidenceAfter + '% (' + deltaText + ')</span></div>';

    timeline.appendChild(div);
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

// ── AI: Analyze Understanding ────────────────────────────────────────────────
async function analyzeUnderstanding(topic, explanation) {
  showScreen('feedback');
  $('feedbackLoading').style.display = '';
  $('feedbackResults').style.display = 'none';
  $('feedbackError').style.display = 'none';

  const systemPrompt =
    'You are an expert educational diagnostician using Bloom\'s Taxonomy. A student explains a concept in their own words. Your job:\n\n' +
    '1. CORRECT: Identify specific claims the student got right. Be precise — paraphrase their accurate statements.\n' +
    '2. MISSING: List foundational ideas they failed to mention, prioritized by importance. Include prerequisite knowledge they may lack.\n' +
    '3. MISCONCEPTIONS: Identify factually wrong or misleadingly oversimplified statements. Briefly explain WHY each is wrong.\n' +
    '4. CONFIDENCE (0-100): 0-25 = major misconceptions, 26-50 = some correct ideas but significant gaps, 51-75 = solid partial understanding, 76-90 = strong with minor gaps, 91-100 = expert-level.\n' +
    '5. SUMMARY: One encouraging sentence capturing their level.\n\n' +
    'Be honest but kind. The goal is to help, not discourage.\n' +
    'Output ONLY valid JSON, no markdown fences.';

  const userMsg =
    'Topic: ' + topic + '\n' +
    'Student\'s Explanation: ' + explanation + '\n\n' +
    'Evaluate thoroughly: Does the student understand the WHY, not just the WHAT? Are they confusing related concepts? Using terminology correctly?\n\n' +
    'Output as JSON: {"summary":"one encouraging sentence","correct":["specific thing they got right"],"missing":["critical gap prioritized by importance"],"misconceptions":["misconception with brief explanation"],"confidence":0-100}';

  try {
    const response = await callAI(systemPrompt, userMsg);
    const parsed = parseAIJson(response);

    currentAnalysis = parsed;
    renderFeedbackResults(parsed);
  } catch (err) {
    $('feedbackLoading').style.display = 'none';
    $('feedbackError').style.display = '';
    $('feedbackError').textContent = 'Analysis failed: ' + err.message;
  }
}

function renderFeedbackResults(data) {
  $('feedbackLoading').style.display = 'none';
  $('feedbackResults').style.display = '';

  // Summary
  const conf = data.confidence || 0;
  let emoji = '';
  let summaryText = data.summary || '';
  if (conf >= 80) {
    emoji = '\u2705';
    if (!summaryText) summaryText = 'You have a strong understanding!';
  } else if (conf >= 50) {
    emoji = '\uD83E\uDD14';
    if (!summaryText) summaryText = 'You partially understand this';
  } else {
    emoji = '\u274C';
    if (!summaryText) summaryText = 'There are significant gaps in your understanding';
  }
  $('feedbackSummary').textContent = emoji + ' ' + summaryText;

  // Confidence bar
  const barClass = conf < 40 ? 'low' : conf < 70 ? 'mid' : 'high';
  const bar = $('confidenceBar');
  bar.className = 'confidence-bar-fill ' + barClass;
  setTimeout(() => { bar.style.width = conf + '%'; }, 100);
  $('confidenceValue').textContent = conf + '%';

  // Correct
  renderGapList($('correctList'), $('correctSection'), data.correct || [], 'correct', '\u2713');
  // Missing
  renderGapList($('missingList'), $('missingSection'), data.missing || [], 'missing', '\u2717');
  // Misconceptions
  renderGapList($('misconceptionsList'), $('misconceptionsSection'), data.misconceptions || [], 'unclear', '!');

  // Save/update topic
  saveTopic(currentTopic, conf, data.missing || []);
}

function renderGapList(listEl, sectionEl, items, iconClass, iconText) {
  listEl.innerHTML = '';
  if (items.length === 0) {
    sectionEl.style.display = 'none';
    return;
  }
  sectionEl.style.display = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'gap-item';
    li.innerHTML =
      '<span class="gap-icon ' + iconClass + '">' + iconText + '</span>' +
      '<span>' + escapeHtml(item) + '</span>';
    listEl.appendChild(li);
  });
}

// ── AI: Fix Session ──────────────────────────────────────────────────────────
async function startFixSession() {
  isRetry = false;
  showScreen('fix');
  $('fixLoading').style.display = '';
  $('fixContent').style.display = 'none';
  $('fixError').style.display = 'none';
  $('answerInput').value = '';
  $('checkAnswerBtn').disabled = true;

  const gaps = (currentAnalysis && currentAnalysis.missing) || [];
  const misconceptions = (currentAnalysis && currentAnalysis.misconceptions) || [];
  const allGaps = [...gaps, ...misconceptions].slice(0, 4);

  fixTimerSeconds = 300;
  renderTimer();

  const confLevel = (currentAnalysis && currentAnalysis.confidence) || 50;
  const systemPrompt =
    'You are a master tutor designing a focused 5-minute micro-learning session. The student has specific gaps. Your goal is to close them.\n\n' +
    '1. MICRO-EXPLANATION (2-3 sentences): Use an analogy or mental model. Connect to something the student likely already knows. Address the specific gaps, not the whole topic.\n' +
    '2. CONCRETE EXAMPLE: One vivid, specific example demonstrating the concept. Use real-world scenarios. Walk through step by step. If math/science, show worked solution with intermediate steps.\n' +
    '3. PRACTICE QUESTION: Specifically tests whether the student has closed their gaps.\n' +
    '   - Target the weakest gap\n' +
    '   - Answerable in 1-2 sentences\n' +
    '   - Require APPLYING the concept, not just recalling a definition\n' +
    '   - Clear, unambiguous correct answer\n\n' +
    'Difficulty: Student confidence is ' + confLevel + '%. If below 40%, keep it foundational. 40-70%, test application. Above 70%, test edge cases.\n' +
    'Output ONLY valid JSON, no markdown fences.';

  const userMsg =
    'Topic: ' + currentTopic + '\n' +
    'Knowledge Gaps: ' + (allGaps.length > 0 ? allGaps.join(', ') : 'General understanding') + '\n' +
    'Confidence Level: ' + confLevel + '%\n\n' +
    'Design a focused micro-lesson addressing these gaps. The explanation should directly tackle the most important gap.\n\n' +
    'Output as JSON: {"explanation":"analogy-driven micro-explanation","example":"concrete worked example with reasoning","question":"application-level question","expectedAnswer":"clear correct answer"}';

  try {
    const response = await callAI(systemPrompt, userMsg);
    currentFixSession = parseAIJson(response);
    renderFixSession();
    startTimer();
  } catch (err) {
    $('fixLoading').style.display = 'none';
    $('fixError').style.display = '';
    $('fixError').textContent = 'Failed to generate fix session: ' + err.message;
  }
}

function renderFixSession() {
  $('fixLoading').style.display = 'none';
  $('fixContent').style.display = '';
  $('fixSessionCard').classList.add('pulsing');

  $('fixExplanation').textContent = currentFixSession.explanation || '';
  $('fixExample').textContent = currentFixSession.example || '';
  $('fixQuestion').textContent = currentFixSession.question || '';
}

// ── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  clearInterval(fixTimerInterval);
  const totalSeconds = fixTimerSeconds;
  const circumference = 2 * Math.PI * 70;
  const circle = $('timerCircle');
  circle.style.strokeDasharray = circumference;

  fixTimerInterval = setInterval(() => {
    fixTimerSeconds--;
    if (fixTimerSeconds <= 0) {
      fixTimerSeconds = 0;
      clearInterval(fixTimerInterval);
      $('fixSessionCard').classList.remove('pulsing');
    }
    renderTimer();

    // Update ring
    const progress = fixTimerSeconds / totalSeconds;
    circle.style.strokeDashoffset = circumference * (1 - progress);
  }, 1000);
}

function renderTimer() {
  const m = Math.floor(fixTimerSeconds / 60);
  const s = fixTimerSeconds % 60;
  $('timerDigits').textContent = m + ':' + (s < 10 ? '0' : '') + s;
}

// ── AI: Check Answer ─────────────────────────────────────────────────────────
async function checkAnswer(answer) {
  clearInterval(fixTimerInterval);
  $('checkAnswerBtn').disabled = true;
  $('checkAnswerBtn').textContent = 'Checking...';

  const systemPrompt =
    'You are grading a student\'s answer. Your goal: determine correctness AND provide pedagogically useful feedback.\n\n' +
    'Grading guidelines:\n' +
    '- Accept answers showing correct understanding even if wording differs from expected\n' +
    '- Accept partially correct answers that show right reasoning with minor errors — mark correct if core concept is understood\n' +
    '- Mark incorrect only if the answer shows a fundamental misunderstanding\n' +
    '- Consider intent and reasoning, not just exact word matching\n\n' +
    'If CORRECT: Give specific, encouraging feedback reinforcing WHY their answer is right. 1-2 sentences.\n' +
    'If INCORRECT: Give a targeted hint using the Socratic method — ask a leading question or point to the key concept. Never reveal the full answer.\n' +
    'Output ONLY valid JSON, no markdown fences.';

  const userMsg =
    'Question: ' + (currentFixSession ? currentFixSession.question : '') + '\n' +
    'Expected Answer: ' + (currentFixSession ? currentFixSession.expectedAnswer : '') + '\n' +
    'Student\'s Answer: ' + answer + '\n\n' +
    'Evaluate semantic correctness — does the answer demonstrate understanding of the core concept, even if worded differently?\n\n' +
    'Output as JSON: {"correct":true_or_false,"feedback":"specific feedback or Socratic hint"}';

  try {
    const response = await callAI(systemPrompt, userMsg);
    const result = parseAIJson(response);
    showResult(result);
  } catch (err) {
    $('checkAnswerBtn').disabled = false;
    $('checkAnswerBtn').textContent = 'Check Answer';
    $('fixError').style.display = '';
    $('fixError').textContent = 'Error checking answer: ' + err.message;
  }
}

// ── Result Screen ────────────────────────────────────────────────────────────
function showResult(result) {
  showScreen('result');

  const icon = $('resultIcon');
  const actions = $('resultActions');
  actions.innerHTML = '';

  if (result.correct) {
    // Success
    icon.className = 'result-icon success';
    icon.textContent = '\u2713';
    $('resultTitle').textContent = 'You got it!';

    // Improve confidence
    const oldConf = currentAnalysis ? currentAnalysis.confidence : 50;
    const boost = isRetry ? 8 : 15;
    const newConf = Math.min(100, oldConf + boost);
    $('resultSub').textContent = 'Understanding improved: ' + oldConf + '% \u2192 ' + newConf + '%';

    // Update topic confidence
    updateTopicConfidence(currentTopic, newConf);
    recordSession(oldConf, newConf);

    if (result.feedback) {
      $('resultFeedback').style.display = '';
      $('resultFeedbackText').textContent = result.feedback;
    } else {
      $('resultFeedback').style.display = 'none';
    }

    // Confetti
    launchConfetti();

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn-primary btn-green';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', () => {
      renderFeed();
      showScreen('feed');
      resetInputs();
    });
    actions.appendChild(doneBtn);

  } else {
    // Incorrect
    icon.className = 'result-icon fail';
    icon.textContent = '\u2717';
    $('resultTitle').textContent = 'Not quite \u2014 try again';
    $('resultSub').textContent = 'Don\'t worry, you\'re getting closer!';

    if (result.feedback) {
      $('resultFeedback').style.display = '';
      $('resultFeedbackText').textContent = 'Hint: ' + result.feedback;
    } else {
      $('resultFeedback').style.display = 'none';
    }

    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn-primary btn-warn';
    retryBtn.textContent = 'Retry (2 min)';
    retryBtn.addEventListener('click', () => {
      isRetry = true;
      fixTimerSeconds = 120;
      showScreen('fix');
      $('fixContent').style.display = '';
      $('fixLoading').style.display = 'none';
      $('answerInput').value = '';
      $('checkAnswerBtn').disabled = true;
      $('checkAnswerBtn').textContent = 'Check Answer';
      $('fixSessionCard').classList.add('pulsing');
      renderTimer();
      startTimer();
    });
    actions.appendChild(retryBtn);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn-secondary';
    skipBtn.textContent = 'Back to Feed';
    skipBtn.addEventListener('click', () => {
      renderFeed();
      showScreen('feed');
      resetInputs();
    });
    actions.appendChild(skipBtn);
  }
}

// ── Topic management ─────────────────────────────────────────────────────────
function saveTopic(name, confidence, gaps) {
  const existing = tideData.topics.find((t) => t.name.toLowerCase() === name.toLowerCase());
  const today = new Date().toISOString().split('T')[0];

  if (existing) {
    existing.confidence = confidence;
    existing.gaps = gaps;
    existing.lastStudied = today;
    existing.sessions++;
    existing.mastered = confidence >= 80;
  } else {
    tideData.topics.push({
      name: name,
      confidence: confidence,
      sessions: 1,
      lastStudied: today,
      gaps: gaps,
      mastered: confidence >= 80
    });
  }
  saveTideData();
}

function updateTopicConfidence(name, newConf) {
  const topic = tideData.topics.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (topic) {
    topic.confidence = newConf;
    topic.mastered = newConf >= 80;
    topic.lastStudied = new Date().toISOString().split('T')[0];

    // Remove fixed gaps if confidence is high enough
    if (newConf >= 70 && topic.gaps.length > 0) {
      topic.gaps = topic.gaps.slice(1); // remove first gap as "fixed"
    }
  }
  saveTideData();
}

function recordSession(oldConf, newConf) {
  const today = new Date().toISOString().split('T')[0];

  if (tideData.lastSessionDate !== today) {
    if (tideData.lastSessionDate === getYesterday()) {
      tideData.streak++;
    } else {
      tideData.streak = 1;
    }
    tideData.sessionsToday = 0;
  }

  tideData.totalSessions++;
  tideData.sessionsToday++;
  tideData.lastSessionDate = today;

  // Update momentum (weighted average of recent activity)
  const topicAvg = tideData.topics.length > 0
    ? Math.round(tideData.topics.reduce((a, t) => a + t.confidence, 0) / tideData.topics.length)
    : 0;
  const streakBonus = Math.min(tideData.streak * 3, 20);
  tideData.momentum = Math.min(100, topicAvg + streakBonus);

  // Update weekly chart (today's day of week)
  const dayIdx = (new Date().getDay() + 6) % 7; // Mon=0
  tideData.weeklyChart[dayIdx] = tideData.sessionsToday;

  // Record history entry
  if (!tideData.history) tideData.history = [];
  tideData.history.push({
    date: today,
    topic: currentTopic || 'Unknown',
    action: isRetry ? 'retried' : 'studied',
    confidenceBefore: oldConf || 0,
    confidenceAfter: newConf || 0
  });
  // Keep last 50 entries
  if (tideData.history.length > 50) {
    tideData.history = tideData.history.slice(-50);
  }

  saveTideData();
}

function getWeakestTopic() {
  if (tideData.topics.length === 0) return null;
  return tideData.topics
    .filter((t) => !t.mastered)
    .sort((a, b) => a.confidence - b.confidence)[0] || null;
}

function getYesterday() {
  return new Date(Date.now() - 86400000).toISOString().split('T')[0];
}

// ── AI helper ────────────────────────────────────────────────────────────────
async function callAI(systemPrompt, userMessage) {
  // Use the background script proxy (askKai) which handles API key
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'askKai',
        systemPrompt: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      },
      (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!response || !response.ok) {
          const errMsg = (response && response.error) || 'AI request failed';
          if (errMsg === 'INVALID_API_KEY') {
            return reject(new Error('Invalid API key. Please check your settings.'));
          }
          if (errMsg === 'NO_CREDITS') {
            return reject(new Error('No API credits remaining.'));
          }
          return reject(new Error(errMsg));
        }
        // Extract text from response
        const data = response.data;
        if (data && data.content && data.content.length > 0) {
          resolve(data.content[0].text);
        } else {
          reject(new Error('Empty response from AI'));
        }
      }
    );
  });
}

function parseAIJson(text) {
  // Strip markdown code fences if present
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    // Try to extract JSON from the text
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse AI response as JSON');
  }
}

// ── Ring animation helper ────────────────────────────────────────────────────
function animateRing(circleEl, value, radius, svgSize) {
  const circumference = 2 * Math.PI * radius;
  circleEl.style.strokeDasharray = circumference;
  const offset = circumference * (1 - value / 100);
  setTimeout(() => {
    circleEl.style.strokeDashoffset = offset;
  }, 100);
}

// ── Particles ────────────────────────────────────────────────────────────────
function createParticles() {
  const container = $('particles');
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = 60 + Math.random() * 40 + '%';
    p.style.setProperty('--dur', (6 + Math.random() * 8) + 's');
    p.style.setProperty('--delay', (Math.random() * 10) + 's');
    p.style.width = (1 + Math.random() * 2) + 'px';
    p.style.height = p.style.width;
    container.appendChild(p);
  }
}

// ── Confetti ─────────────────────────────────────────────────────────────────
function launchConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#5badee', '#34d399', '#f59e0b', '#e57373', '#a78bfa', '#fb923c'];

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty('--fall-dur', (2 + Math.random() * 2) + 's');
    piece.style.setProperty('--fall-delay', Math.random() * 0.5 + 's');
    piece.style.width = (5 + Math.random() * 6) + 'px';
    piece.style.height = (5 + Math.random() * 6) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 4000);
}

// ── Reset ────────────────────────────────────────────────────────────────────
function resetInputs() {
  $('topicInput').value = '';
  $('explanationInput').value = '';
  $('analyzeBtn').disabled = true;
  $('answerInput').value = '';
  $('checkAnswerBtn').disabled = true;
  $('checkAnswerBtn').textContent = 'Check Answer';
  currentTopic = null;
  currentAnalysis = null;
  currentFixSession = null;
  clearInterval(fixTimerInterval);
}

// ── Escape HTML ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Kai Chat Assistant ──────────────────────────────────────────────────────
let kaiHistory = [];

function sendKaiMessage() {
  const input = $('kaiInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendKaiMsg('user', text);
  kaiHistory.push({ role: 'user', content: text });

  // Keep history manageable
  if (kaiHistory.length > 12) kaiHistory = kaiHistory.slice(-10);

  // Show typing indicator
  const typing = document.createElement('div');
  typing.className = 'kai-typing';
  typing.id = 'kaiTyping';
  typing.innerHTML = '<div class="kai-typing-dot"></div><div class="kai-typing-dot"></div><div class="kai-typing-dot"></div>';
  $('kaiMessages').appendChild(typing);
  $('kaiMessages').scrollTop = $('kaiMessages').scrollHeight;

  // Build context about what the student is working on
  const topicContext = currentTopic ? 'The student is currently studying: ' + currentTopic + '. ' : '';
  const weakTopics = tideData.topics.filter(t => !t.mastered).map(t => t.name).slice(0, 3);
  const weakContext = weakTopics.length > 0 ? 'Their weak areas: ' + weakTopics.join(', ') + '. ' : '';

  const systemPrompt =
    'You are Kai, a friendly and encouraging study assistant inside TideTrack. ' +
    topicContext + weakContext +
    'Give short, helpful answers (2-3 sentences max unless they ask for more). ' +
    'If they ask about a concept, explain it simply using analogies. ' +
    'If they seem stuck, encourage them and give a specific next step. ' +
    'If they ask for practice problems, give one with a hint. ' +
    'Keep your tone warm, concise, and motivating. Use plain language.';

  callAI(systemPrompt, kaiHistory.map(m => m.role + ': ' + m.content).join('\n'))
    .then(response => {
      const el = $('kaiTyping');
      if (el) el.remove();
      appendKaiMsg('kai', response);
      kaiHistory.push({ role: 'assistant', content: response });
    })
    .catch(err => {
      const el = $('kaiTyping');
      if (el) el.remove();
      appendKaiMsg('kai', 'Sorry, I had trouble connecting. Try again in a moment.');
    });
}

function appendKaiMsg(type, text) {
  const messages = $('kaiMessages');
  const div = document.createElement('div');
  div.className = 'kai-msg ' + type;

  if (type === 'kai') {
    div.innerHTML = '<div class="kai-msg-label">KAI</div>' + escapeHtml(text);
  } else {
    div.textContent = text;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}
