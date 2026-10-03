'use strict';
// ===================== Менюта и екрани =====================

let storyPage = 0, pendingLevel = 0;

function goTitle() {
  state = 'title'; lv = null; stopMusic();
  $('btnContinue').classList.toggle('hidden', !save.started);
  showScreen('sTitle');
}

// ---------- История ----------
function showStory(i) {
  storyPage = i;
  const p = INTRO_PAGES[i];
  $('storyTitle').textContent = p.title; $('storyText').textContent = p.text;
  $('storyDots').innerHTML = INTRO_PAGES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  $('storyNext').textContent = i === INTRO_PAGES.length - 1 ? 'Избери герой →' : 'Напред →';
  state = 'story'; showScreen('sStory');
}

// ---------- Избор на герой ----------
function buildSelect() {
  const grid = $('heroGrid'); grid.innerHTML = '';
  HEROES.forEach((H, hi) => {
    const b = document.createElement('button'); b.className = 'heroCard'; b.dataset.hi = hi;
    b.style.setProperty('--hc', H.color);
    b.innerHTML = `<canvas width="120" height="110" data-hi="${hi}"></canvas><b>${H.name}</b><small>${H.en}</small>`;
    b.onclick = () => { audioInit(); sfx('pickup'); save.hero = hi; save.skin = 0; writeSave(); refreshSelect(); };
    grid.appendChild(b);
  });
  const dg = $('diffRow'); dg.innerHTML = '';
  DIFFICULTIES.forEach((d, i) => {
    const b = document.createElement('button'); b.textContent = d.name; b.onclick = () => { save.diff = i; writeSave(); refreshSelect(); };
    dg.appendChild(b);
  });
  refreshSelect();
}
function refreshSelect() {
  const H = HEROES[save.hero];
  document.querySelectorAll('.heroCard').forEach(b => b.classList.toggle('sel', +b.dataset.hi === save.hero));
  $('heroInfo').style.setProperty('--hc', H.color);
  $('heroName').textContent = H.name; $('heroEn').textContent = H.en; $('heroDesc').textContent = H.desc;
  $('heroStats').innerHTML = Object.entries(H.stats).map(([k, v]) => `<div class="stat"><span>${k}</span><div class="bar">${'<i></i>'.repeat(v)}${'<i class="off"></i>'.repeat(5 - v)}</div></div>`).join('') +
    `<div class="abil"><b>⚔ ${H.attack.name}</b></div><div class="abil"><b>✦ ${H.ability.name}</b> — ${H.ability.desc}</div>`;
  const sr = $('skinRow'); sr.innerHTML = '';
  H.skins.forEach((sk, si) => {
    const locked = sk.legendary && !save.finished;
    const b = document.createElement('button'); b.className = 'skinBtn' + (si === save.skin ? ' sel' : '') + (locked ? ' locked' : '');
    b.innerHTML = `<canvas width="64" height="64" data-skin="${si}"></canvas><span>${locked ? '🔒 ' : ''}${sk.name}</span>`;
    b.title = locked ? 'Отключва се след като завършиш играта' : sk.name;
    b.onclick = () => { if (locked) { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); return; } save.skin = si; writeSave(); refreshSelect(); };
    sr.appendChild(b);
  });
  [...$('diffRow').children].forEach((b, i) => b.classList.toggle('sel', i === save.diff));
}
function renderPreviews() {
  if (!atlasReady) return;
  document.querySelectorAll('#heroGrid canvas').forEach(c => {
    const hi = +c.dataset.hi, H = HEROES[hi], g = c.getContext('2d'), sel = hi === save.hero;
    g.clearRect(0, 0, c.width, c.height);
    const fr = sel ? H.frames.walk[Math.floor(T * 9) % H.frames.walk.length] : H.frames.idle[0];
    drawHeroFrame(g, hi, sel ? save.skin : 0, fr, 46, 110 + (sel ? 0 : Math.sin(T * 2 + hi) * 1.5), 1.0, false);
  });
  const H = HEROES[save.hero];
  document.querySelectorAll('#skinRow canvas').forEach(c => {
    const si = +c.dataset.skin, g = c.getContext('2d'); g.clearRect(0, 0, 64, 64);
    drawHeroFrame(g, save.hero, si, H.frames.idle[0], 30, 62, 0.5, false);
  });
  const big = $('heroBig'), g = big.getContext('2d'); g.clearRect(0, 0, big.width, big.height);
  const cyc = T % 3.2, F = H.frames;
  const fr = cyc < 2 ? F.walk[Math.floor(T * 9) % F.walk.length] : F.attack[Math.min(2, Math.floor((cyc - 2) / 0.4))];
  drawHeroFrame(g, save.hero, save.skin, fr, 70, 196, 1.45, false);
}

// ---------- Карта на града ----------
function showMap() {
  state = 'map'; lv = null; stopMusic();
  const list = $('mapList'); list.innerHTML = '';
  LEVELS.forEach((L, li) => {
    const cleared = save.cleared[li], locked = li > save.unlocked;
    const b = document.createElement('button');
    b.className = 'loc' + (locked ? ' locked' : cleared ? ' free' : ' current');
    b.style.setProperty('--ac', L.pal.accent);
    b.innerHTML = `<span class="num">${li + 1}</span><span class="ic">${locked ? '🔒' : L.icon}</span><b>${L.name}</b>
      <small>${locked ? 'Заключено' : cleared ? `✅ Освободено · тайни ${cleared.secrets}/${L.notes.length}` : '⚠ Обитавано от чудовища'}</small>`;
    b.onclick = () => { if (locked) return; audioInit(); showLevelIntro(li); };
    list.appendChild(b);
  });
  const freed = Object.keys(save.cleared).length;
  $('mapStatus').textContent = freed >= LEVELS.length ? '🌞 Градът е напълно освободен! Можеш да играеш нивата отново.' : `Освободени места: ${freed}/${LEVELS.length}`;
  $('mapHero').textContent = `${HEROES[save.hero].name} · ${HEROES[save.hero].skins[save.skin].name} · ${DIFFICULTIES[save.diff].name}`;
  showScreen('sMap');
}

function showLevelIntro(li) {
  pendingLevel = li; const L = LEVELS[li];
  state = 'levelIntro';
  $('lvlEyebrow').textContent = `НИВО ${li + 1} ОТ ${LEVELS.length}`;
  $('lvlTitle').textContent = `${L.icon} ${L.name}`;
  $('lvlText').textContent = L.intro;
  $('lvlFacts').innerHTML = `<div><span>Цел</span><b>${L.item.count} × ${L.item.name}</b></div><div><span>Бос</span><b>${L.boss.name}</b></div><div><span>Опасност</span><b>${L.hazard.name}</b></div><div><span>Чудовища</span><b>${L.enemies.map(e => e.name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</b></div>`;
  $('sLevel').style.setProperty('--ac', L.pal.accent);
  showScreen('sLevel');
}

// ---------- Бутони ----------
$('btnNew').onclick = () => { audioInit(); showStory(0); };
$('btnContinue').onclick = () => { audioInit(); showMap(); };
$('btnHelp').onclick = () => { showScreen('sHelp'); };
$('helpBack').onclick = () => { if (state === 'paused') showScreen('sPause'); else goTitle(); };
$('btnReset').onclick = () => {
  if (!confirm('Да изтрия ли целия прогрес?')) return;
  save = Object.assign({}, SAVE_DEFAULT, { mute: save.mute }); writeSave(); goTitle();
};
$('storyNext').onclick = () => { if (storyPage < INTRO_PAGES.length - 1) showStory(storyPage + 1); else { state = 'select'; buildSelect(); showScreen('sSelect'); } };
$('storySkip').onclick = () => { state = 'select'; buildSelect(); showScreen('sSelect'); };
$('selectGo').onclick = () => { save.started = true; writeSave(); showMap(); };
$('selectBack').onclick = () => goTitle();
$('mapHeroBtn').onclick = () => { state = 'select'; buildSelect(); showScreen('sSelect'); };
$('mapBack').onclick = () => goTitle();
$('lvlGo').onclick = () => startLevel(pendingLevel);
$('lvlBack').onclick = () => showMap();
$('noteClose').onclick = () => closeNote();
$('pResume').onclick = () => resumeGame();
$('pRestart').onclick = () => startLevel(lv.li);
$('pMap').onclick = () => showMap();
$('pHelp').onclick = () => showScreen('sHelp');
$('doneNext').onclick = () => { const li = lv.li; if (li === LEVELS.length - 1) startEnding(); else showLevelIntro(li + 1); };
$('doneMap').onclick = () => showMap();
$('overRetry').onclick = () => startLevel(lv.li);
$('overMap').onclick = () => showMap();
$('endMenu').onclick = () => goTitle();
$('endMap').onclick = () => showMap();
document.querySelectorAll('.muteBtn').forEach(b => b.onclick = () => { audioInit(); setMute(!save.mute); });
setMute(save.mute);
goTitle();
