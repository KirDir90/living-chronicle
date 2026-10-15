function updateHUD(state) {
  document.getElementById('hud-hp').textContent = state.hp;
  const hpPct = Math.max(0, Math.min(100, state.hp));
  const bar = document.getElementById('hud-hp-bar');
  bar.style.width = hpPct + '%';
  bar.style.background = hpPct < 30 ? '#c84040' : hpPct < 60 ? '#c8a040' : '#7ed47e';
  document.getElementById('hud-gold').textContent = state.gold;
  const invEl = document.getElementById('hud-inv');
  invEl.textContent = state.inventory.length ? state.inventory.join(', ') : 'пусто';
  invEl.title = state.inventory.join(', ');
  const statePill = document.getElementById('hud-state-pill');
  if (state.statuses && state.statuses.length) {
    document.getElementById('hud-state').textContent = state.statuses.join(', ');
    statePill.style.display = '';
  } else {
    statePill.style.display = 'none';
  }
  document.getElementById('hud-time').textContent = state.dayLabel || 'день 1';
  const vig = document.getElementById('vignette-hp');
  if (hpPct < 30) vig.classList.add('active');
  else vig.classList.remove('active');
}

function clearLog() { document.getElementById('log').innerHTML = ''; }

// ============ Автоскролл: к началу новой части ============
// Запоминаем якорь — элемент, с которого начинается новый блок.
// После рендера скроллим к нему, а не в самый низ.
let _scrollAnchor = null;

function _setScrollAnchor() {
  const log = document.getElementById('log');
  const lastChild = log.lastElementChild;
  _scrollAnchor = lastChild;
}

function scrollToAnchor() {
  if (!_scrollAnchor) {
    const body = document.getElementById('game-body');
    body.scrollTop = body.scrollHeight;
    return;
  }
  const body = document.getElementById('game-body');
  const anchorTop = _scrollAnchor.offsetTop;
  const bodyTop = body.offsetTop;
  // Отнимаем высоту верхней шапки сцены, чтобы новая часть была сразу видна
  const sceneOffset = 8;
  const target = Math.max(0, anchorTop - bodyTop - sceneOffset);
  body.scrollTo({ top: target, behavior: 'smooth' });
  _scrollAnchor = null;
}

function _appendWithAnchor(el) {
  const log = document.getElementById('log');
  if (!_scrollAnchor) _setScrollAnchor();
  log.appendChild(el);
}

function addDivider(text) {
  const el = document.createElement('div');
  el.className = 'log-divider';
  el.textContent = '— ' + text + ' —';
  _appendWithAnchor(el);
}

function addNarrative(text) {
  const el = document.createElement('div');
  el.className = 'log-narrative';
  el.textContent = text;
  _appendWithAnchor(el);
}

function addHeroLine(text) {
  const el = document.createElement('div');
  el.className = 'log-hero';
  el.textContent = '➤ ' + text;
  _appendWithAnchor(el);
}

const _npcLineCache = new Set();

function addNpcLine(name, text, note) {
  const key = (name || '') + '|' + (text || '');
  if (_npcLineCache.has(key)) return;
  _npcLineCache.add(key);
  const el = document.createElement('div');
  el.className = 'log-npc';
  el.innerHTML =
    '<span class="log-npc-name">' + escapeHtml(name) + '</span>' +
    '<span class="log-npc-text">«' + escapeHtml(text) + '»</span>' +
    (note ? '<span class="log-npc-note">— ' + escapeHtml(note) + '</span>' : '');
  _appendWithAnchor(el);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}

function renderEffects(effects) {
  const container = document.getElementById('effects');
  container.innerHTML = '';
  if (!effects || !effects.length) return;
  effects.forEach(function(e) {
    const chip = document.createElement('div');
    const type = e.type || 'item';
    chip.className = 'effect-chip ' + type;
    chip.textContent = (e.icon || '•') + ' ' + e.label;
    container.appendChild(chip);
  });
}

function renderChoices(choices, onPick) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  if (!choices || !choices.length) return;
  choices.forEach(function(text) {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = text;
    btn.onclick = function() { onPick(text); };
    container.appendChild(btn);
  });
}

function lockChoices(locked) {
  document.querySelectorAll('.choice-btn, #btn-send, #custom-input')
    .forEach(function(el) { el.disabled = locked; });
}

function setSceneImage(dataUrl, title) {
  const img = document.getElementById('scene-img');
  const blur = document.getElementById('scene-blur');
  const titleEl = document.getElementById('scene-title');
  const shimmer = document.getElementById('scene-shimmer');
  shimmer.style.display = 'none';
  if (dataUrl) {
    img.src = dataUrl;
    img.style.display = 'block';
    blur.style.backgroundImage = 'url(' + dataUrl + ')';
  }
  if (title) {
    titleEl.textContent = title;
    titleEl.style.display = 'block';
  }
}

function clearSceneImage() {
  const img = document.getElementById('scene-img');
  img.style.display = 'none';
  img.src = '';
  document.getElementById('scene-blur').style.backgroundImage = '';
  document.getElementById('scene-title').style.display = 'none';
  document.getElementById('scene-shimmer').style.display = 'block';
}

const JOKES = [
  'Летописец точит перо...',
  'Кости брошены. Судьба решается...',
  'Дракон просыпается где-то...',
  'Стража проверяет твоё имя...',
  'Ветер несёт вести с востока...',
  'Свеча догорает в башне мага...',
  'Кто-то шепчет твоё имя...',
  'Тени удлиняются...',
  'Золото звенит в чужом кармане...',
  'Клинок покидает ножны...'
];

let loaderTimer = null;
function showLoader(stageText) {
  const loader = document.getElementById('scene-loader');
  const shimmer = document.getElementById('scene-shimmer');
  document.querySelector('.loader-stage').innerHTML = (stageText || 'Пишем сцену') + '<span class="dots"></span>';
  document.getElementById('loader-joke').textContent = JOKES[Math.floor(Math.random() * JOKES.length)];
  loader.style.display = 'flex';
  shimmer.style.display = 'block';
  let jokeIdx = Math.floor(Math.random() * JOKES.length);
  loaderTimer = setInterval(function() {
    jokeIdx = (jokeIdx + 1) % JOKES.length;
    document.getElementById('loader-joke').textContent = JOKES[jokeIdx];
  }, 3500);
}

function hideLoader() {
  document.getElementById('scene-loader').style.display = 'none';
  document.getElementById('scene-shimmer').style.display = 'none';
  if (loaderTimer) { clearInterval(loaderTimer); loaderTimer = null; }
}

function setChapterBadge(text) {
  const el = document.getElementById('chapter-badge');
  if (text) { el.textContent = text; el.style.display = 'block'; }
  else el.style.display = 'none';
}

function showChapterToast(text) {
  const el = document.getElementById('chapter-toast');
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 2600);
}

function showScreen(name) {
  ['start', 'prologue', 'game', 'final'].forEach(function(s) {
    document.getElementById('screen-' + s).style.display = (s === name) ? '' : 'none';
  });
}

function renderJournal(entries) {
  const el = document.getElementById('journal');
  if (!entries || !entries.length) {
    el.innerHTML = '<div class="journal-entry">Пока пусто.</div>';
    return;
  }
  el.innerHTML = entries.map(function(e) {
    return '<div class="journal-entry"><span class="day">' + escapeHtml(e.day) + '</span> — ' + escapeHtml(e.text) + '</div>';
  }).join('');
}

function renderFinal(data) {
  document.getElementById('final-emoji').textContent = data.emoji || '💀';
  document.getElementById('final-title').textContent = data.title || 'Конец пути';
  document.getElementById('final-text').textContent = data.text || '';
  document.querySelector('#final-chronicle .goal-text').textContent = data.chronicle || '';
  const statsRow = document.getElementById('final-stats');
  statsRow.innerHTML = '';
  (data.stats || []).forEach(function(s) {
    const chip = document.createElement('div');
    chip.className = 'stat-chip';
    chip.textContent = s;
    statsRow.appendChild(chip);
  });
}

// ============ Карточка героя (используется в прологе) ============
function buildHeroCardHtml(card) {
  if (!card) return '';

  let pocketsHtml = '';
  if (Array.isArray(card.pockets) && card.pockets.length) {
    pocketsHtml =
      '<div class="hero-card-section">' +
        '<div class="hero-card-label">🎒 В карманах</div>' +
        '<div class="hero-card-pockets">' +
          card.pockets.map(function(p) {
            return '<span class="pocket-chip">' + (p.icon || '•') + ' ' + escapeHtml(p.label || '') + '</span>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  const rows = [
    ['Возраст и телосложение', card.age],
    ['Прошлое', card.origin],
    ['Черта', card.trait],
    ['Тайное умение', card.skill],
    ['Слабость', card.weakness]
  ].filter(function(r) { return r[1]; });

  const rowsHtml = rows.map(function(r) {
    return '<div class="hero-card-row">' +
      '<span class="hero-card-label">' + escapeHtml(r[0]) + '</span>' +
      '<span class="hero-card-value">' + escapeHtml(r[1]) + '</span>' +
    '</div>';
  }).join('');

  return '<div class="hero-card">' +
    '<div class="hero-card-title">📜 ' + escapeHtml(card.name || 'Герой') + '</div>' +
    rowsHtml + pocketsHtml +
  '</div>';
}

function renderHeroCardInPrologue(card) {
  const slot = document.getElementById('prologue-hero-card-slot');
  if (!slot) return;
  slot.innerHTML = buildHeroCardHtml(card);
}

// ============ Лоадер пролога ============
let prologueLoaderTimer = null;
function showPrologueLoader() {
  const loader = document.getElementById('prologue-loader');
  loader.style.display = 'flex';
  document.getElementById('prologue-loader-joke').textContent =
    JOKES[Math.floor(Math.random() * JOKES.length)];
  let idx = Math.floor(Math.random() * JOKES.length);
  prologueLoaderTimer = setInterval(function() {
    idx = (idx + 1) % JOKES.length;
    document.getElementById('prologue-loader-joke').textContent = JOKES[idx];
  }, 3500);
}

function hidePrologueLoader() {
  document.getElementById('prologue-loader').style.display = 'none';
  if (prologueLoaderTimer) { clearInterval(prologueLoaderTimer); prologueLoaderTimer = null; }
}

// ============ Заглушка для картинки ============
// Используется, когда генерация картинки не удалась
// (лимит Cloudflare, сбой сервиса и т.д.)
function showImageFallback(sceneTitle, reason) {
  const viewport = document.querySelector('.scene-viewport');
  if (!viewport) return;

  // Удаляем прежнюю заглушку, если была
  const old = viewport.querySelector('.scene-fallback');
  if (old) old.remove();

  // Прячем картинку и шиммер
  const img = document.getElementById('scene-img');
  const shimmer = document.getElementById('scene-shimmer');
  const blur = document.getElementById('scene-blur');
  if (img) { img.style.display = 'none'; img.src = ''; }
  if (shimmer) shimmer.style.display = 'none';
  if (blur) blur.style.backgroundImage = '';

  // Иконка зависит от причины
  const icons = {
    limit: '🕯️',
    error: '📖',
    default: '🎭'
  };
  const icon = icons[reason] || icons.default;

  // Подпись зависит от причины
  const subtitles = {
    limit: 'Иллюстрация отложена',
    error: 'Иллюстрация не создана',
    default: 'Сцена без иллюстрации'
  };
  const sub = subtitles[reason] || subtitles.default;

  const descriptions = {
    limit: 'Художник сегодня уже не может держать кисть. Слушай голос рассказчика — он не устал.',
    error: 'Кисть дрогнула — образ не сложился. Но история продолжается.',
    default: 'В этой сцене нет иллюстрации, только слова.'
  };
  const desc = descriptions[reason] || descriptions.default;

  const block = document.createElement('div');
  block.className = 'scene-fallback';
  block.innerHTML =
    '<div class="scene-fallback-icon">' + icon + '</div>' +
    '<div class="scene-fallback-title">' + (sceneTitle ? escapeHtml(sceneTitle) : 'Сцена') + '</div>' +
    '<div class="scene-fallback-text">' + escapeHtml(desc) + '</div>' +
    '<div class="scene-fallback-sub">' + escapeHtml(sub) + '</div>';

  viewport.appendChild(block);
}

function clearImageFallback() {
  const viewport = document.querySelector('.scene-viewport');
  if (!viewport) return;
  const old = viewport.querySelector('.scene-fallback');
  if (old) old.remove();
}
