/* ════════════════════════════════════════════════════════════════════
   TideTrack — Focus Rooms (rooms.js)
   All logic for room list, active room, chat, timer, and summary.
   No inline scripts — Manifest V3 compliant.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────
  const AVATAR_COLORS = [
    '#5badee', '#e57373', '#f59e0b', '#52b788',
    '#a78bfa', '#f472b6', '#38bdf8', '#fb923c',
  ];

  const FIRST_NAMES = [
    'Alex', 'Jordan', 'Sam', 'Riley', 'Priya',
    'Kai', 'Morgan', 'Taylor', 'Jamie', 'Avery',
    'Mina', 'Leo', 'Dani', 'Rowan', 'Sage',
    'Quinn', 'Ellis', 'Nico', 'Zara', 'Dev',
  ];

  const TOPICS = [
    'Derivatives', 'Binary Trees', 'Thesis intro', 'Organic Chem',
    'Essay outline', 'Physics problems', 'Spanish vocab',
    'Data Structures', 'Art History', 'Statistics HW',
    'Econ midterm', 'Python project', 'Lab report',
  ];

  const KAI_SUGGESTIONS = [
    'Review integration techniques — you missed a few last session.',
    'Practice Big-O analysis problems to strengthen your weak spots.',
    'Try outlining your argument before writing the full essay.',
    'Focus on thermodynamics — your quiz scores were lower there.',
    'Review recursion examples before moving to dynamic programming.',
    'Revisit the French Revolution timeline — you flagged it earlier.',
    'Work through the practice problems in Chapter 7.',
    'Try summarizing each paragraph in your own words.',
  ];

  // ── Demo Rooms ─────────────────────────────────────────────────────
  function generateDemoRooms() {
    return [
      {
        id: 'room-1',
        name: 'Calculus Sprint',
        type: 'sprint',
        duration: 5,
        subject: 'Math',
        tags: ['Calculus', 'Derivatives'],
        participants: generateParticipants(4),
        maxParticipants: 10,
      },
      {
        id: 'room-2',
        name: 'CS Study Hall',
        type: 'focus',
        duration: 25,
        subject: 'Computer Science',
        tags: ['Algorithms', 'Data Structures'],
        participants: generateParticipants(7),
        maxParticipants: 15,
      },
      {
        id: 'room-3',
        name: 'Essay Writing',
        type: 'free',
        duration: 0,
        subject: 'English',
        tags: ['Writing', 'Research'],
        participants: generateParticipants(3),
        maxParticipants: 8,
      },
      {
        id: 'room-4',
        name: 'Organic Chem Grind',
        type: 'focus',
        duration: 50,
        subject: 'Chemistry',
        tags: ['Orgo', 'Reactions'],
        participants: generateParticipants(6),
        maxParticipants: 12,
      },
      {
        id: 'room-5',
        name: 'Physics Blitz',
        type: 'sprint',
        duration: 15,
        subject: 'Physics',
        tags: ['Mechanics', 'Problems'],
        participants: generateParticipants(5),
        maxParticipants: 10,
      },
    ];
  }

  function generateParticipants(count) {
    var shuffled = FIRST_NAMES.slice().sort(function () {
      return 0.5 - Math.random();
    });
    var result = [];
    for (var i = 0; i < count; i++) {
      result.push({
        name: shuffled[i] || 'Student',
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        status: Math.random() > 0.25 ? 'active' : 'idle',
        topic: TOPICS[Math.floor(Math.random() * TOPICS.length)],
        focusTime: Math.floor(Math.random() * 20) + 3,
        cameraOn: Math.random() > 0.35,
      });
    }
    return result;
  }

  // ── State ──────────────────────────────────────────────────────────
  var rooms = generateDemoRooms();
  var currentFilter = 'all';
  var activeRoom = null;
  var timerInterval = null;
  var timerSeconds = 0;
  var timerTotal = 0;
  var distractionCount = 0;
  var userName = 'You';

  // Video / media state
  var localStream = null;
  var cameraOn = true;
  var micOn = true;

  // Audio analysis for voice waves
  var audioContext = null;
  var analyser = null;
  var audioDataArray = null;
  var voiceAnimFrame = null;

  // ── DOM refs ───────────────────────────────────────────────────────
  var screenList = document.getElementById('screenList');
  var screenRoom = document.getElementById('screenRoom');
  var screenSummary = document.getElementById('screenSummary');
  var roomsGrid = document.getElementById('roomsGrid');
  var globalCount = document.getElementById('globalCount');
  var createModal = document.getElementById('createModal');

  // Create modal inputs
  var roomNameInput = document.getElementById('roomNameInput');
  var roomSubjectInput = document.getElementById('roomSubjectInput');
  var durationOptions = document.getElementById('durationOptions');
  var typeOptions = document.getElementById('typeOptions');
  var maxPartSlider = document.getElementById('maxPartSlider');
  var maxPartVal = document.getElementById('maxPartVal');

  // Active room
  var activeRoomName = document.getElementById('activeRoomName');
  var activeRoomType = document.getElementById('activeRoomType');
  var participantsList = document.getElementById('participantsList');
  var timerCircle = document.getElementById('timerCircle');
  var timerDigits = document.getElementById('timerDigits');
  var yourTopic = document.getElementById('yourTopic');
  var kaiText = document.getElementById('kaiText');
  var chatMessages = document.getElementById('chatMessages');
  var chatInput = document.getElementById('chatInput');
  var videoGrid = document.getElementById('videoGrid');
  var participantCount = document.getElementById('participantCount');

  // Summary
  var summaryFocus = document.getElementById('summaryFocus');
  var summaryDistractions = document.getElementById('summaryDistractions');
  var summaryDuration = document.getElementById('summaryDuration');
  var summaryParticipants = document.getElementById('summaryParticipants');
  var leaderboardItems = document.getElementById('leaderboardItems');

  // ── Name system ────────────────────────────────────────────────────
  var nameModal = document.getElementById('nameModal');
  var userNameInput = document.getElementById('userNameInput');
  var btnSaveName = document.getElementById('btnSaveName');
  var nameBadge = document.getElementById('nameBadge');

  function loadUserName(callback) {
    try {
      chrome.storage.local.get('roomUserName', function (d) {
        if (d.roomUserName) {
          userName = d.roomUserName;
          nameBadge.textContent = userName;
          if (callback) callback();
        } else {
          showNameModal(callback);
        }
      });
    } catch (e) {
      var stored = localStorage.getItem('roomUserName');
      if (stored) {
        userName = stored;
        nameBadge.textContent = userName;
        if (callback) callback();
      } else {
        showNameModal(callback);
      }
    }
  }

  function saveUserName(name) {
    userName = name;
    nameBadge.textContent = name;
    try {
      chrome.storage.local.set({ roomUserName: name });
    } catch (e) {
      localStorage.setItem('roomUserName', name);
    }
  }

  function showNameModal(callback) {
    nameModal.classList.add('active');
    userNameInput.value = userName === 'You' ? '' : userName;
    userNameInput.focus();

    function save() {
      var name = userNameInput.value.trim() || 'You';
      saveUserName(name);
      nameModal.classList.remove('active');
      btnSaveName.removeEventListener('click', save);
      userNameInput.removeEventListener('keydown', onKey);
      if (callback) callback();
    }
    function onKey(e) {
      if (e.key === 'Enter') save();
    }

    btnSaveName.addEventListener('click', save);
    userNameInput.addEventListener('keydown', onKey);
  }

  // Clicking the name badge reopens the modal
  nameBadge.addEventListener('click', function () {
    showNameModal(function () {
      // Update active room participant name if in a room
      if (activeRoom) {
        var you = activeRoom.participants.find(function (p) { return p.isYou; });
        if (you) you.name = userName;
        renderParticipants();
        renderVideoGrid();
      }
    });
  });

  // ── Theme toggle ───────────────────────────────────────────────────
  document.getElementById('themeToggle').addEventListener('click', function () {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    try {
      chrome.storage.local.set({ theme: html.getAttribute('data-theme') });
    } catch (e) { /* not in extension context */ }
  });

  // Load saved theme
  try {
    chrome.storage.local.get('theme', function (d) {
      if (d.theme) document.documentElement.setAttribute('data-theme', d.theme);
    });
  } catch (e) { /* not in extension context */ }

  // ── Helpers ────────────────────────────────────────────────────────
  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function typeLabel(type) {
    if (type === 'sprint') return '5-min Sprint';
    if (type === 'focus') return '25-min Focus';
    return 'Free Study';
  }

  function typeBadgeClass(type) {
    if (type === 'sprint') return 'badge-sprint';
    if (type === 'focus') return 'badge-focus';
    return 'badge-free';
  }

  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Render Room Cards ──────────────────────────────────────────────
  function renderRooms() {
    roomsGrid.innerHTML = '';

    var totalStudents = 0;
    rooms.forEach(function (r) { totalStudents += r.participants.length; });
    animateCounter(totalStudents);

    var filtered = rooms.filter(function (r) {
      if (currentFilter === 'all') return true;
      return r.type === currentFilter;
    });

    filtered.forEach(function (room) {
      var card = document.createElement('div');
      card.className = 'room-card fade-in';

      // Avatars HTML (show up to 4)
      var avatarsHTML = '';
      var shown = Math.min(room.participants.length, 4);
      for (var i = 0; i < shown; i++) {
        var p = room.participants[i];
        avatarsHTML += '<div class="avatar-circle" style="background:' + p.color + '">' +
          p.name.charAt(0) + '</div>';
      }

      // Tags
      var tagsHTML = '';
      room.tags.forEach(function (t) {
        tagsHTML += '<span class="tag">' + t + '</span>';
      });

      var durationText = room.duration > 0 ? room.duration + ' min' : 'Unlimited';

      card.innerHTML =
        '<div class="room-card-header">' +
          '<span class="room-name">' + room.name + '</span>' +
          '<span class="room-type-badge ' + typeBadgeClass(room.type) + '">' + typeLabel(room.type) + '</span>' +
        '</div>' +
        '<div class="room-meta">' +
          '<div class="participant-avatars">' + avatarsHTML + '</div>' +
          '<span>' + room.participants.length + '/' + room.maxParticipants + ' students</span>' +
          '<span>&middot;</span>' +
          '<span>' + durationText + '</span>' +
        '</div>' +
        '<div class="room-tags">' + tagsHTML + '</div>' +
        '<button class="btn-join" data-room="' + room.id + '">Join Room</button>';

      roomsGrid.appendChild(card);
    });

    // Attach join buttons
    roomsGrid.querySelectorAll('.btn-join').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var roomId = this.getAttribute('data-room');
        joinRoom(roomId);
      });
    });
  }

  // Animate counter
  var counterTarget = 0;
  var counterCurrent = 0;
  var counterTimer = null;
  function animateCounter(target) {
    counterTarget = target;
    if (counterTimer) clearInterval(counterTimer);
    counterTimer = setInterval(function () {
      if (counterCurrent < counterTarget) {
        counterCurrent++;
      } else if (counterCurrent > counterTarget) {
        counterCurrent--;
      } else {
        clearInterval(counterTimer);
        counterTimer = null;
        return;
      }
      globalCount.textContent = counterCurrent + ' students studying now';
    }, 60);
  }

  // ── Filters ────────────────────────────────────────────────────────
  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter');
      if (currentFilter === 'free') currentFilter = 'free';
      renderRooms();
    });
  });

  // ── Create Room Modal ──────────────────────────────────────────────
  document.getElementById('btnCreateRoom').addEventListener('click', function () {
    createModal.classList.add('active');
  });

  document.getElementById('btnCancelCreate').addEventListener('click', function () {
    createModal.classList.remove('active');
  });

  createModal.addEventListener('click', function (e) {
    if (e.target === createModal) createModal.classList.remove('active');
  });

  // Duration option buttons
  durationOptions.querySelectorAll('.option-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      durationOptions.querySelectorAll('.option-btn').forEach(function (b) {
        b.classList.remove('selected');
      });
      this.classList.add('selected');
    });
  });

  // Type option buttons
  typeOptions.querySelectorAll('.option-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      typeOptions.querySelectorAll('.option-btn').forEach(function (b) {
        b.classList.remove('selected');
      });
      this.classList.add('selected');
    });
  });

  // Max participants slider
  maxPartSlider.addEventListener('input', function () {
    maxPartVal.textContent = this.value;
  });

  // Create & Start
  document.getElementById('btnCreateStart').addEventListener('click', function () {
    var name = roomNameInput.value.trim() || 'My Study Room';
    var subject = roomSubjectInput.value.trim() || 'General';
    var durBtn = durationOptions.querySelector('.option-btn.selected');
    var duration = durBtn ? parseInt(durBtn.getAttribute('data-dur'), 10) : 25;
    var typeBtn = typeOptions.querySelector('.option-btn.selected');
    var type = typeBtn ? typeBtn.getAttribute('data-type') : 'focus';
    var maxPart = parseInt(maxPartSlider.value, 10);

    var newRoom = {
      id: 'room-' + Date.now(),
      name: name,
      type: type,
      duration: duration,
      subject: subject,
      tags: subject.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      participants: generateParticipants(Math.floor(Math.random() * 3) + 1),
      maxParticipants: maxPart,
    };

    rooms.unshift(newRoom);
    createModal.classList.remove('active');
    roomNameInput.value = '';
    roomSubjectInput.value = '';
    renderRooms();
    joinRoom(newRoom.id);
  });

  // ── Join Room ──────────────────────────────────────────────────────
  function joinRoom(roomId) {
    var room = rooms.find(function (r) { return r.id === roomId; });
    if (!room) return;

    activeRoom = room;
    distractionCount = Math.floor(Math.random() * 4);

    // Add "You" as a participant
    var youParticipant = {
      name: userName,
      color: '#5badee',
      status: 'active',
      topic: room.subject || 'General',
      focusTime: 0,
      isYou: true,
      cameraOn: true,
    };
    activeRoom.participants = [youParticipant].concat(activeRoom.participants);

    switchScreen('room');
    setupActiveRoom();
    saveRoomHistory(room);
  }

  function setupActiveRoom() {
    var room = activeRoom;
    activeRoomName.textContent = room.name;
    activeRoomType.textContent = typeLabel(room.type) + (room.duration > 0 ? ' \u00B7 ' + room.duration + ' min' : '');

    yourTopic.textContent = room.subject || 'General';
    participantCount.textContent = room.participants.length + ' participants';

    // Kai suggestion
    kaiText.textContent = randomPick(KAI_SUGGESTIONS);

    // Timer setup
    if (room.duration > 0) {
      timerTotal = room.duration * 60;
      timerSeconds = timerTotal;
    } else {
      timerTotal = 0;
      timerSeconds = 0;
    }
    updateTimerDisplay();
    startTimer();

    // Reset camera/mic state
    cameraOn = true;
    micOn = true;
    updateToggleBtn(document.getElementById('btnToggleCam'), true);
    updateToggleBtn(document.getElementById('btnToggleMic'), true);

    // Start local camera
    startLocalCamera();

    // Render participants & video tiles
    renderParticipants();
    renderVideoGrid();

    // Load demo chat
    loadDemoChat();

    // Init sidebar tabs
    initSidebarTabs();
  }

  // ── Local Camera (WebRTC) ─────────────────────────────────────────
  function startLocalCamera() {
    stopLocalCamera();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(function (stream) {
        localStream = stream;
        var localVideo = document.getElementById('localVideo');
        if (localVideo) {
          localVideo.srcObject = stream;
        }
        // Set up audio analyser for voice waves
        setupAudioAnalyser(stream);
      })
      .catch(function (err) {
        console.warn('Camera access denied or unavailable:', err.message);
        cameraOn = false;
        micOn = false;
        updateToggleBtn(document.getElementById('btnToggleCam'), false);
        updateToggleBtn(document.getElementById('btnToggleMic'), false);
        renderVideoGrid();
      });
  }

  function stopLocalCamera() {
    if (localStream) {
      localStream.getTracks().forEach(function (track) { track.stop(); });
      localStream = null;
    }
    stopAudioAnalyser();
  }

  // ── Audio Analyser & Voice Waves ──────────────────────────────────
  function setupAudioAnalyser(stream) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      var source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioDataArray = new Uint8Array(analyser.frequencyBinCount);
      startVoiceWaveLoop();
    } catch (e) {
      console.warn('AudioContext not available:', e.message);
    }
  }

  function stopAudioAnalyser() {
    if (voiceAnimFrame) {
      cancelAnimationFrame(voiceAnimFrame);
      voiceAnimFrame = null;
    }
    if (audioContext) {
      audioContext.close().catch(function () {});
      audioContext = null;
      analyser = null;
      audioDataArray = null;
    }
  }

  function getVoiceLevel() {
    if (!analyser || !audioDataArray) return 0;
    analyser.getByteFrequencyData(audioDataArray);
    var sum = 0;
    // Focus on voice frequency range (roughly bins 2-40 for speech)
    var count = Math.min(40, audioDataArray.length);
    for (var i = 2; i < count; i++) {
      sum += audioDataArray[i];
    }
    var avg = sum / (count - 2);
    return Math.min(1, avg / 140); // normalize 0-1
  }

  function startVoiceWaveLoop() {
    var wavePaths = [
      document.getElementById('voiceWave1'),
      document.getElementById('voiceWave2'),
      document.getElementById('voiceWave3'),
    ];
    var waveContainer = document.getElementById('voiceWaves');
    var youTile = null;

    var phase = 0;

    function animate() {
      voiceAnimFrame = requestAnimationFrame(animate);

      if (!micOn || !analyser) {
        if (waveContainer) waveContainer.classList.remove('active');
        if (youTile) {
          youTile.classList.remove('voice-active', 'voice-loud');
        }
        return;
      }

      var level = getVoiceLevel();
      phase += 0.08 + level * 0.12;

      // Refresh DOM references if missing (after re-render)
      if (!waveContainer || !waveContainer.parentNode) {
        waveContainer = document.getElementById('voiceWaves');
        wavePaths = [
          document.getElementById('voiceWave1'),
          document.getElementById('voiceWave2'),
          document.getElementById('voiceWave3'),
        ];
      }
      if (!youTile || !youTile.parentNode) {
        youTile = videoGrid ? videoGrid.querySelector('.you-tile') : null;
      }

      // Threshold: only show waves when actually speaking
      var isSpeaking = level > 0.06;

      if (waveContainer) {
        waveContainer.classList.toggle('active', isSpeaking);
      }

      if (youTile) {
        youTile.classList.toggle('voice-active', isSpeaking && level <= 0.4);
        youTile.classList.toggle('voice-loud', isSpeaking && level > 0.4);
        if (!isSpeaking) {
          youTile.classList.remove('voice-active', 'voice-loud');
        }
      }

      if (isSpeaking && wavePaths[0]) {
        // Generate organic wave paths that react to volume
        var amp1 = 4 + level * 14;
        var amp2 = 3 + level * 10;
        var amp3 = 2 + level * 7;

        wavePaths[0].setAttribute('d', buildWavePath(phase, amp1, 0, 32));
        wavePaths[1].setAttribute('d', buildWavePath(phase * 0.8 + 1.2, amp2, 2, 32));
        wavePaths[2].setAttribute('d', buildWavePath(phase * 0.6 + 2.5, amp3, 4, 32));
      }
    }

    animate();
  }

  function buildWavePath(phase, amplitude, yOffset, height) {
    var mid = height / 2 + yOffset;
    var points = [];
    var segments = 8;
    var width = 400; // SVG viewBox width
    for (var i = 0; i <= segments; i++) {
      var x = (i / segments) * width;
      var y = mid + Math.sin(phase + i * 0.9) * amplitude +
              Math.sin(phase * 1.7 + i * 1.4) * (amplitude * 0.3);
      points.push((i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1));
    }
    return points.join(' ');
  }

  // ── Video Grid Rendering ──────────────────────────────────────────
  function renderVideoGrid() {
    if (!videoGrid || !activeRoom) return;
    videoGrid.innerHTML = '';

    activeRoom.participants.forEach(function (p) {
      var tile = document.createElement('div');
      var isCamOn = p.isYou ? cameraOn : !!p.cameraOn;
      tile.className = 'video-tile ' + (isCamOn ? 'video-cam-on' : 'video-cam-off');
      if (p.isYou) tile.classList.add('you-tile');

      // Speaking indicator for some active participants
      if (!p.isYou && p.status === 'active' && p.name.charCodeAt(0) % 4 === 0) {
        tile.classList.add('speaking');
      }

      var avatarHtml = '<div class="video-tile-avatar" style="background:' + p.color + '">' +
        p.name.charAt(0) + '</div>';

      var isMuted = p.isYou ? !micOn : (p.name.charCodeAt(0) % 3 === 0);
      var mutedHtml = isMuted
        ? '<div class="video-tile-muted"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></div>'
        : '';

      var statusClass = p.status === 'active' ? 'status-active' : 'status-idle';
      var youLabel = p.isYou ? '<span class="you-label">YOU</span>' : '';

      var infoHtml = '<div class="video-tile-info">' +
        '<span class="video-tile-name"><span class="status-indicator ' + statusClass + '"></span>' +
        escapeHtml(p.name) + youLabel + '</span>' +
        '<span class="video-tile-topic">' + escapeHtml(p.topic) + '</span>' +
        '</div>';

      // Voice wave overlay (only on your tile)
      var waveHtml = '';
      if (p.isYou) {
        waveHtml = '<div class="voice-waves" id="voiceWaves">' +
          '<svg viewBox="0 0 400 32" preserveAspectRatio="none">' +
            '<path class="voice-wave-path voice-wave-1" id="voiceWave1" d="M0,16 L400,16"/>' +
            '<path class="voice-wave-path voice-wave-2" id="voiceWave2" d="M0,18 L400,18"/>' +
            '<path class="voice-wave-path voice-wave-3" id="voiceWave3" d="M0,20 L400,20"/>' +
          '</svg>' +
        '</div>';
      }

      tile.innerHTML = avatarHtml + mutedHtml + waveHtml + infoHtml;

      // For local user, insert a <video> element
      if (p.isYou && cameraOn) {
        var videoEl = document.createElement('video');
        videoEl.id = 'localVideo';
        videoEl.autoplay = true;
        videoEl.muted = true; // mute local playback to avoid echo
        videoEl.playsInline = true;
        if (localStream) {
          videoEl.srcObject = localStream;
        }
        tile.insertBefore(videoEl, tile.firstChild);
      }

      videoGrid.appendChild(tile);
    });
  }

  // ── Toggle Buttons ────────────────────────────────────────────────
  function updateToggleBtn(btn, isOn) {
    if (!btn) return;
    btn.classList.remove('ctrl-btn-on', 'ctrl-btn-off');
    btn.classList.add(isOn ? 'ctrl-btn-on' : 'ctrl-btn-off');
  }

  document.getElementById('btnToggleCam').addEventListener('click', function () {
    cameraOn = !cameraOn;
    updateToggleBtn(this, cameraOn);

    if (localStream) {
      localStream.getVideoTracks().forEach(function (track) {
        track.enabled = cameraOn;
      });
    }
    renderVideoGrid();
  });

  document.getElementById('btnToggleMic').addEventListener('click', function () {
    micOn = !micOn;
    updateToggleBtn(this, micOn);

    if (localStream) {
      localStream.getAudioTracks().forEach(function (track) {
        track.enabled = micOn;
      });
    }
    renderVideoGrid();
  });

  // Leave button in controls bar
  document.getElementById('btnLeaveControls').addEventListener('click', function () {
    endSession();
  });

  // ── Sidebar Tabs ──────────────────────────────────────────────────
  function initSidebarTabs() {
    var tabs = document.querySelectorAll('.sidebar-tab');
    var panelParticipants = document.getElementById('sidebarParticipants');
    var panelChat = document.getElementById('sidebarChat');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        var target = this.getAttribute('data-tab');
        if (target === 'participants') {
          panelParticipants.style.display = 'block';
          panelChat.style.display = 'none';
        } else {
          panelParticipants.style.display = 'none';
          panelChat.style.display = 'flex';
        }
      });
    });
  }

  // ── Participants ───────────────────────────────────────────────────
  function renderParticipants() {
    participantsList.innerHTML = '';
    activeRoom.participants.forEach(function (p) {
      var item = document.createElement('div');
      item.className = 'participant-item';

      var statusClass = p.status === 'active' ? 'status-active' : 'status-idle';
      var youTag = p.isYou ? ' (You)' : '';

      item.innerHTML =
        '<div class="participant-avatar" style="background:' + p.color + '">' +
          p.name.charAt(0) + '</div>' +
        '<div class="participant-info">' +
          '<div class="participant-name">' + p.name + youTag +
            ' <span class="status-indicator ' + statusClass + '"></span></div>' +
          '<div class="participant-topic">' + p.topic + '</div>' +
        '</div>' +
        '<span class="participant-time">' + p.focusTime + 'm</span>';

      participantsList.appendChild(item);
    });
  }

  // Periodically update participant focus times
  setInterval(function () {
    if (!activeRoom) return;
    activeRoom.participants.forEach(function (p) {
      if (!p.isYou) {
        p.focusTime += 1;
        // Occasionally toggle status
        if (Math.random() < 0.05) {
          p.status = p.status === 'active' ? 'idle' : 'active';
        }
      }
    });
    renderParticipants();
  }, 60000); // every minute

  // ── Timer ──────────────────────────────────────────────────────────
  var TIMER_RADIUS = 18;
  var TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerCircle.style.strokeDasharray = TIMER_CIRCUMFERENCE;

    timerInterval = setInterval(function () {
      if (timerTotal > 0) {
        timerSeconds--;
        if (timerSeconds <= 0) {
          timerSeconds = 0;
          clearInterval(timerInterval);
          timerInterval = null;
          endSession();
          return;
        }
        var progress = timerSeconds / timerTotal;
        timerCircle.style.strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - progress);
      } else {
        timerSeconds++;
        timerCircle.style.strokeDashoffset = 0;
      }
      updateTimerDisplay();

      // Update your focus time
      var you = activeRoom.participants.find(function (p) { return p.isYou; });
      if (you) you.focusTime = Math.floor((timerTotal > 0 ? timerTotal - timerSeconds : timerSeconds) / 60);
    }, 1000);
  }

  function updateTimerDisplay() {
    timerDigits.textContent = formatTime(timerSeconds);

    if (timerTotal > 0) {
      var progress = timerSeconds / timerTotal;
      timerCircle.style.strokeDasharray = TIMER_CIRCUMFERENCE;
      timerCircle.style.strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - progress);
    }
  }

  // ── Chat ───────────────────────────────────────────────────────────
  var demoChatMessages = [
    { author: 'Kai (AI)', text: 'Welcome! I\'m Kai, your study assistant. If you get stuck or need help, just ask me in the chat.', time: '3 min ago' },
    { author: 'Priya', text: 'Working on derivatives today. This room is great motivation!', time: '1 min ago' },
    { author: 'Sam', text: 'Just finished a problem set. Feeling productive.', time: 'Just now' },
  ];

  function loadDemoChat() {
    chatMessages.innerHTML = '';
    demoChatMessages.forEach(function (msg) {
      appendChatMessage(msg.author, msg.text, msg.time);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendChatMessage(author, text, time) {
    var div = document.createElement('div');
    var isKai = author === 'Kai' || author === 'Kai (AI)';
    div.className = 'chat-msg' + (isKai ? ' chat-msg-kai' : '');
    div.innerHTML =
      '<div class="chat-msg-author">' + (isKai ? '&#129302; ' : '') + escapeHtml(author) + '</div>' +
      '<div class="chat-msg-text">' + escapeHtml(text) + '</div>' +
      '<div class="chat-msg-time">' + escapeHtml(time) + '</div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById('btnSend').addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendChatMessage();
  });

  // ── Kai AI Chat Monitor ────────────────────────────────────────────
  var KAI_HELP_TRIGGERS = [
    /\bhelp\b/i, /\bstuck\b/i, /\bconfus/i, /\bdon'?t (understand|get|know)\b/i,
    /\bhow (do|does|to|can)\b/i, /\bwhat (is|are|does)\b/i, /\bexplain\b/i,
    /\bkai\b/i, /\bstruggl/i, /\bhard\b/i, /\bdifficult/i, /\bcan'?t figure/i,
    /\bwhy (is|does|do|won'?t|can'?t)\b/i, /\btip(s)?\b/i, /\badvice\b/i,
    /\bany(one|body) know\b/i, /\bquestion\b/i,
  ];

  var KAI_RESPONSES = {
    math: [
      'Try breaking the problem into smaller steps. What\'s the first operation you need to do?',
      'Draw it out! Visualizing the function or equation can reveal patterns you might miss.',
      'Check if you can simplify before solving. Factor out common terms first.',
      'Remember: when in doubt, go back to the definition. What does the formula actually mean?',
      'Try plugging in simple numbers (like 0, 1, 2) to build intuition before solving generally.',
    ],
    cs: [
      'Trace through your code line by line with a small input. Where does it behave unexpectedly?',
      'Think about edge cases: empty input, single element, very large input.',
      'Break the problem into sub-problems. Can you solve a simpler version first?',
      'Draw out the data structure. Seeing it visually helps with algorithms.',
      'Check your loop bounds and off-by-one errors. These are the most common bugs.',
    ],
    writing: [
      'Start with your thesis statement. What\'s the ONE thing you want the reader to take away?',
      'Try the "explain it to a friend" approach. Write it conversationally first, then formalize.',
      'Outline before you write. Bullet points for each paragraph helps structure your argument.',
      'Read your draft aloud. If it sounds awkward when spoken, it reads awkward too.',
      'Focus on one paragraph at a time. Don\'t try to perfect the whole essay at once.',
    ],
    science: [
      'Go back to first principles. What are the fundamental laws or definitions at play here?',
      'Try connecting this concept to something you already understand well.',
      'Draw a diagram or flowchart of the process. Visual models are powerful for science.',
      'Check your units! Dimensional analysis catches a lot of errors.',
      'Look for patterns in the data. What changes when you change one variable?',
    ],
    general: [
      'Take a 2-minute break to reset, then re-read the problem with fresh eyes.',
      'Try explaining what you DO understand so far. Often the gap becomes clear.',
      'Break it down: what specifically is confusing? The concept, the notation, or the application?',
      'Sometimes switching to a different problem and coming back later helps.',
      'Don\'t be afraid to start over with a different approach. The first attempt is rarely the best.',
      'Try the Feynman technique: explain it simply, identify gaps, then fill them.',
      'What\'s the smallest possible version of this problem you can solve?',
    ],
  };

  function detectSubject() {
    if (!activeRoom) return 'general';
    var subj = (activeRoom.subject || '').toLowerCase();
    if (/math|calc|algebra|geometry|statistics|trig/.test(subj)) return 'math';
    if (/comput|cs|code|program|algorithm|data struct|python|java/.test(subj)) return 'cs';
    if (/english|writing|essay|literature|rhetoric/.test(subj)) return 'writing';
    if (/physics|chem|bio|science|anatomy|organic/.test(subj)) return 'science';
    return 'general';
  }

  function shouldKaiRespond(text) {
    for (var i = 0; i < KAI_HELP_TRIGGERS.length; i++) {
      if (KAI_HELP_TRIGGERS[i].test(text)) return true;
    }
    return false;
  }

  function getKaiResponse(text) {
    // If they mention Kai directly, always give a friendly opener
    if (/\bkai\b/i.test(text)) {
      var subject = detectSubject();
      var tip = randomPick(KAI_RESPONSES[subject] || KAI_RESPONSES.general);
      return 'Hey! I\'m here to help. ' + tip;
    }

    var subject = detectSubject();
    var pool = KAI_RESPONSES[subject] || KAI_RESPONSES.general;
    return randomPick(pool);
  }

  function sendChatMessage() {
    var text = chatInput.value.trim();
    if (!text) return;
    appendChatMessage(userName, text, 'Just now');
    chatInput.value = '';

    // Check if Kai should respond (help/question detected)
    if (shouldKaiRespond(text)) {
      setTimeout(function () {
        var response = getKaiResponse(text);
        appendChatMessage('Kai (AI)', response, 'Just now');
      }, 1200 + Math.random() * 1500);
    } else {
      // Normal participant reply
      setTimeout(function () {
        var replies = [
          'Nice, keep it up!',
          'Same here, grinding away.',
          'Almost done with my section!',
          'This room is so productive.',
          'Let\'s go! We got this.',
          'Great focus energy today.',
        ];
        var responder = randomPick(FIRST_NAMES.slice(0, 8));
        appendChatMessage(responder, randomPick(replies), 'Just now');
      }, 2000 + Math.random() * 3000);
    }
  }

  // ── Leave Room ─────────────────────────────────────────────────────
  document.getElementById('btnLeave').addEventListener('click', function () {
    endSession();
  });

  function endSession() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    stopLocalCamera();

    var elapsed = timerTotal > 0 ? timerTotal - timerSeconds : timerSeconds;

    // Build summary data
    summaryFocus.textContent = formatTime(elapsed);
    summaryDistractions.textContent = distractionCount;
    summaryDuration.textContent = timerTotal > 0 ? Math.floor(timerTotal / 60) + ' min' : formatTime(elapsed);
    summaryParticipants.textContent = activeRoom.participants.length;

    // Build leaderboard
    var sorted = activeRoom.participants.slice().sort(function (a, b) {
      return b.focusTime - a.focusTime;
    });

    leaderboardItems.innerHTML = '';
    sorted.forEach(function (p, i) {
      var item = document.createElement('div');
      item.className = 'leaderboard-item';
      var rankClass = i === 0 ? 'gold' : '';
      var youBadge = p.isYou ? '<span class="you-badge">(you)</span>' : '';

      item.innerHTML =
        '<span class="leaderboard-rank ' + rankClass + '">' + (i + 1) + '</span>' +
        '<div class="leaderboard-avatar" style="background:' + p.color + '">' +
          p.name.charAt(0) + '</div>' +
        '<span class="leaderboard-name">' + p.name + youBadge + '</span>' +
        '<span class="leaderboard-time">' + p.focusTime + ' min</span>';

      leaderboardItems.appendChild(item);
    });

    // Remove "You" from the room participants for future joins
    if (activeRoom) {
      activeRoom.participants = activeRoom.participants.filter(function (p) {
        return !p.isYou;
      });
    }

    switchScreen('summary');
  }

  // ── Summary actions ────────────────────────────────────────────────
  document.getElementById('btnStudyAgain').addEventListener('click', function () {
    if (activeRoom) {
      joinRoom(activeRoom.id);
    } else {
      switchScreen('list');
      renderRooms();
    }
  });

  document.getElementById('btnLeaveSummary').addEventListener('click', function () {
    activeRoom = null;
    switchScreen('list');
    renderRooms();
  });

  // ── Screen Switching ───────────────────────────────────────────────
  function switchScreen(name) {
    screenList.classList.remove('active');
    screenRoom.classList.remove('active');
    screenSummary.classList.remove('active');

    if (name === 'list') screenList.classList.add('active');
    else if (name === 'room') screenRoom.classList.add('active');
    else if (name === 'summary') screenSummary.classList.add('active');
  }

  // ── Storage ────────────────────────────────────────────────────────
  function saveRoomHistory(room) {
    try {
      chrome.storage.local.get('roomData', function (d) {
        var history = d.roomData || { sessions: [] };
        history.sessions.push({
          roomName: room.name,
          type: room.type,
          subject: room.subject,
          joinedAt: new Date().toISOString(),
          duration: room.duration,
        });
        // Keep last 50 entries
        if (history.sessions.length > 50) {
          history.sessions = history.sessions.slice(-50);
        }
        chrome.storage.local.set({ roomData: history });
      });
    } catch (e) {
      // Not in extension context — use localStorage fallback
      try {
        var history = JSON.parse(localStorage.getItem('roomData') || '{"sessions":[]}');
        history.sessions.push({
          roomName: room.name,
          type: room.type,
          subject: room.subject,
          joinedAt: new Date().toISOString(),
          duration: room.duration,
        });
        if (history.sessions.length > 50) {
          history.sessions = history.sessions.slice(-50);
        }
        localStorage.setItem('roomData', JSON.stringify(history));
      } catch (e2) { /* silent */ }
    }
  }

  // Load tideData for Kai suggestions
  function loadTideDataForKai() {
    try {
      chrome.storage.local.get('tideData', function (d) {
        if (d.tideData && d.tideData.weakTopics && d.tideData.weakTopics.length > 0) {
          kaiText.textContent = 'Work on ' + d.tideData.weakTopics[0] +
            ' — your recent sessions suggest it needs attention.';
        }
      });
    } catch (e) { /* not in extension context */ }
  }

  // ── Initialize ─────────────────────────────────────────────────────
  loadUserName(function () {
    renderRooms();
    loadTideDataForKai();
  });

  // Simulate participant count fluctuation
  setInterval(function () {
    if (activeRoom) return; // don't update while in a room
    rooms.forEach(function (room) {
      if (Math.random() < 0.3) {
        if (Math.random() < 0.5 && room.participants.length < room.maxParticipants) {
          room.participants.push(generateParticipants(1)[0]);
        } else if (room.participants.length > 1) {
          room.participants.pop();
        }
      }
    });
    renderRooms();
  }, 8000);

})();
