// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ponto de entrada do Finan+ web: abre os dados, bloqueio por PIN, navegação, layout
// (celular × computador), atalhos de teclado, temas, avisos de vencimento e virada do dia.
import { Finance, Ops, todayStr, themeOf, ymOf, ymFirst, ymLast, addDays, Money, newState, parseBackup } from './core.js';
import { Period } from './calendar.js';
import { Dictionary } from './assist.js';
import { DICT_TEXT, LICENSES } from './embedded-data.js';
import * as Core from './core.js';
import * as StoreMod from './store.js';
import { Store, ConflictError, loadDevice, saveDevice, wipeDevice, verifyPin, hashPin, Throttle } from './store.js';
import { icon } from './icons.js';
import { $, $$, esc, toast, notice, ask, closeDialogs, dialogOpen, closeSheet, setDialogGuard } from './ui.js';
import { ctx, money, APP_VERSION } from './ctx.js';
import * as S from './screens.js';
import * as E from './editors.js';
import { isRemote, RemoteStore, pairFlow, getToken, setToken, applyPalette } from './remote.js';

const env = { encrypted: false, remote: false };
/** aberto pelo endereço do celular (Finan+ Android › Acesso pela rede): os dados ficam no celular */
const REMOTE = isRemote();
const VIEWS = { home: 'inicio', moves: 'lancamentos', reports: 'relatorios', assist: 'assistente', prefs: 'ajustes' };
const HASH_TO_VIEW = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [v, k]));
let channel = null;

// ================================================================== estado
ctx.replace = (state, o = {}) => {
  ctx.state = state;
  if (!o.noSave) persist();
  render();
};
ctx.commit = (outcome) => { if (!outcome.ok) { notice(outcome.title, outcome.message); return false; } ctx.replace(outcome.state); return true; };
/** grava configurações deste aparelho relendo o que está salvo (outra aba pode ter mudado o PIN, por exemplo) */
function updateDevice(patch) {
  const fresh = loadDevice();
  ctx.device = typeof patch === 'function' ? patch(fresh) : { ...fresh, ...patch };
  saveDevice(ctx.device);
  return ctx.device;
}
ctx.setDevice = (patch) => { updateDevice(patch); render(); };
setDialogGuard(() => ctx.locked); // na tela de problema os diálogos dela precisam abrir; o resto do app está inerte

// outra aba mudou as configurações do aparelho: atualiza e, se o PIN mudou, bloqueia
window.addEventListener('storage', e => {
  if (e.key !== 'finanplus_device' || !ctx.device) return;
  const before = ctx.device.pinHash;
  ctx.device = loadDevice();
  if (ctx.device.pinHash && ctx.device.pinHash !== before && !ctx.locked && !ctx.problem) lockNow();
  else render();
});

async function persist() {
  try {
    await ctx.store.save(ctx.state);
    channel?.postMessage({ type: 'saved' });
  } catch (e) {
    if (e instanceof ConflictError) {
      // outra aba (ou o celular, no modo remoto) gravou antes: mostra os dados dela, sem gravar por cima
      try { ctx.state = await ctx.store.reload(); render(); } catch (e2) { console.error(e2); }
      notice('Alteração não salva', REMOTE
        ? 'Os dados foram alterados no celular (ou em outro navegador) ao mesmo tempo. A tela foi atualizada com a versão mais recente; refaça a última alteração.'
        : 'Os dados foram alterados em outra aba ou janela do Finan+ ao mesmo tempo. A tela foi atualizada com a versão mais recente; refaça a última alteração.');
      return;
    }
    console.error(e);
    if (REMOTE) {
      if (e?.status === 401) return; // a tela de conexão já está aparecendo
      notice('Não foi possível salvar no celular', (e?.message || e) + '\nA alteração aparece aqui, mas não foi gravada. Ao reconectar, a tela volta aos dados do celular.');
      return;
    }
    notice('Não foi possível salvar', 'Verifique o espaço livre do aparelho e tente de novo. Faça um backup JSON para não perder dados.\n(' + (e?.message || e) + ')');
  }
}

// ================================================================== tema
const THEME_COLORS = { light: '#d9e5ff', dark: '#0f1524', materialBlue: '#dbe7ff', oledGray: '#181a1f', tokyo: '#1a1b26', nord: '#2e3440' };
const darkMq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme(theme) {
  const t = themeOf(theme);
  let eff = t === 'auto' ? (darkMq.matches ? (REMOTE ? 'oledGray' : 'dark') : 'light') : t;
  if (REMOTE) {
    const base = applyPalette(document.documentElement, t === 'materialBlue' ? ctx.store?.palette : null, darkMq.matches);
    if (base) eff = base;
  }
  document.documentElement.dataset.theme = eff;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', THEME_COLORS[eff] || '#d9e5ff');
  if (ctx.device && ctx.device.themeCache !== theme) updateDevice({ themeCache: theme });
}
darkMq.addEventListener?.('change', () => ctx.state && applyTheme(ctx.state.theme));

// ================================================================== layout
const mq2 = matchMedia('(min-width: 900px)'), mq3 = matchMedia('(min-width: 1360px)');
function colsFor(view) {
  if (!mq2.matches) return 1;
  if (view === 'home' && mq3.matches) return 3;
  return 2;
}
mq2.addEventListener?.('change', () => render());
mq3.addEventListener?.('change', () => render());

// ================================================================== navegação
ctx.go = (view, o = {}) => {
  if (!VIEWS[view]) view = 'home';
  if (o.fold) S.openFolds.add(o.fold);
  const h = '#' + VIEWS[view];
  if (location.hash !== h) { history.pushState(null, '', view === 'home' ? location.pathname + location.search : h); }
  showView(view, o);
};
function viewFromHash() { return HASH_TO_VIEW[location.hash.slice(1)] || 'home'; }
window.addEventListener('popstate', () => { closeSheet(); showView(viewFromHash()); });

function showView(view, o = {}) {
  const changed = ctx.view !== view;
  ctx.view = view;
  render();
  if (changed) window.scrollTo({ top: 0 });
  if (o.fold) $(`#fold-${o.fold}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  if (o.focus === 'ask') $('#askInput')?.focus();
  if (o.focus === 'search') $('#q')?.focus();
  if (changed && !o.focus) $('#main')?.focus({ preventScroll: true });
}

ctx.openMoves = (q = '', from = '', to = '', kind = '', st = '') => {
  Object.assign(ctx.moves, { q: q || '', from: from || null, to: to || null, kind: kind || '', st: st || '', limit: 300, all: !from && !to });
  ctx.go('moves');
};

// ================================================================== desenho
function render() {
  if (!ctx.state || ctx.locked || ctx.problem) return;
  applyTheme(ctx.state.theme);
  ctx.cols = colsFor(ctx.view);
  const act = document.activeElement;
  const keep = act && act.dataset ? { act: act.dataset.act, id: act.dataset.id, view: act.dataset.view, el: act.id } : null;
  document.body.classList.toggle('privacy', !!ctx.state.privacy);
  document.body.dataset.view = ctx.view;
  $('#sideNav').innerHTML = S.sideNavHtml();
  $('#sideFoot').innerHTML = S.sideFootHtml();
  $('#topbar').innerHTML = S.topbarHtml();
  $('#appHeader').innerHTML = S.mobileHeaderHtml();
  $('#appHeader').hidden = ctx.view !== 'home';
  $('#bottomNav').innerHTML = S.bottomNavHtml();
  for (const v of Object.keys(VIEWS)) {
    const el = $(`#${v}View`);
    el.classList.toggle('activeView', v === ctx.view);
    if (v !== ctx.view) { el.innerHTML = ''; continue; }
    el.innerHTML = v === 'home' ? S.homeView() : v === 'moves' ? S.movesView() : v === 'reports' ? S.reportsView() : v === 'assist' ? S.assistView() : S.prefsView(env);
  }
  bindView();
  if (keep && (keep.act || keep.el)) {
    const sel = keep.el && !keep.act ? `#${CSS.escape(keep.el)}` : `[data-act="${keep.act}"]${keep.id ? `[data-id="${CSS.escape(keep.id)}"]` : ''}${keep.view ? `[data-view="${keep.view}"]` : ''}`;
    const el = document.querySelector(sel);
    if (el && el !== document.activeElement && !(dialogOpen())) el.focus({ preventScroll: true });
  }
}
ctx.render = render;

function renderMovesData() {
  const d = S.movesData();
  $('#movesTotals') && ($('#movesTotals').innerHTML = d.totals);
  $('#periodTransactions') && ($('#periodTransactions').innerHTML = d.list);
  $('#periodCount') && ($('#periodCount').textContent = d.count);
}

function bindView() {
  if (ctx.view === 'moves' && $('#q')) {
    renderMovesData();
    const f = ctx.moves;
    const upd = () => { f.limit = 300; renderMovesData(); };
    // período, tipo e situação mudam por botões (data-act moves-*) e pela folha "Período e filtros"
    $('#q').oninput = e => { f.q = e.target.value; upd(); };
  }
  if (ctx.view === 'assist') {
    const form = $('#askForm');
    if (form) form.onsubmit = e => { e.preventDefault(); askQuestion($('#askInput').value); };
  }
  if (ctx.view === 'prefs') {
    $$('#prefsView input[type=checkbox][role=switch]').forEach(i => i.onchange = () => onSwitch(i));
    const al = $('#autoLockSel');
    if (al) al.onchange = () => ctx.replace({ ...ctx.state, autoLock: parseInt(al.value, 10) || 0 });
    const cf = $('#catForm');
    if (cf) cf.onsubmit = e => {
      e.preventDefault();
      ctx.catKind = $('#newCatKind').value;
      const r = OpsAddCategory(ctx.catKind, $('#newCat').value);
      if (r) { $('#newCat')?.focus(); toast('Categoria adicionada'); }
    };
    $$('details.license').forEach(d => d.addEventListener('toggle', async () => {
      const pre = d.querySelector('pre');
      if (!d.open || pre.dataset.loaded) return;
      pre.textContent = LICENSES[d.dataset.src] || ('O texto está no arquivo ' + d.dataset.src + '.'); pre.dataset.loaded = '1';
    }));
  }
}

function OpsAddCategory(kind, name) {
  const o = Ops.addCategory(ctx.state, kind, name);
  if (!o.ok) { notice(o.title, o.message); return false; }
  ctx.replace(o.state);
  return true;
}

function askQuestion(q) {
  q = String(q || '').trim();
  ctx.lastQuestion = q;
  const box = $('#askAnswer');
  if (box) box.innerHTML = q ? S.answerHtml(q) : '';
}

async function onSwitch(i) {
  const v = i.checked;
  switch (i.name) {
    case 'privacy': ctx.replace({ ...ctx.state, privacy: v }); break;
    case 'assistCategory': case 'assistTips': case 'assistAsk': ctx.setDevice({ [i.name]: v }); break;
    case 'notifications': {
      if (!v) { ctx.setDevice({ notifications: false }); break; }
      if (typeof Notification === 'undefined') { i.checked = false; return notice('Avisos', 'Este navegador não oferece notificações.'); }
      let p = Notification.permission;
      if (p === 'default') p = await Notification.requestPermission();
      if (p !== 'granted') { i.checked = false; ctx.setDevice({ notifications: false }); return notice('Notificações desativadas', 'Para receber avisos de vencimento, permita as notificações do Finan+ nas configurações do navegador.'); }
      ctx.setDevice({ notifications: true, lastNotified: '' });
      checkNotifications();
      break;
    }
  }
}

// ================================================================== ações (data-act)
const ACTIONS = {
  'new-tx': el => E.txEditor(el.dataset.kind || 'expense', null, el.dataset.date || null),
  'edit-tx': el => E.txEditor('expense', el.dataset.id),
  'toggle-paid': el => { ctx.replace(Ops.togglePaid(ctx.state, el.dataset.id)); },
  'new-goal': () => E.goalEditor(), 'edit-goal': el => E.goalEditor(el.dataset.id),
  'new-account': () => E.accountEditor(), 'edit-account': el => E.accountEditor(el.dataset.id),
  'new-card': () => E.cardEditor(), 'edit-card': el => E.cardEditor(el.dataset.id),
  'pay-invoice': el => E.payInvoiceEditor(el.dataset.id),
  'new-recurring': () => E.recurringEditor(), 'edit-recurring': el => E.recurringEditor(el.dataset.id),
  'new-limit': () => E.limitEditor(), 'edit-limit': el => E.limitEditor(el.dataset.cat),
  go: el => ctx.go(el.dataset.view, { fold: el.dataset.fold, focus: el.dataset.focus }),
  'open-moves': el => ctx.openMoves(el.dataset.q, el.dataset.from, el.dataset.to, el.dataset.kind, el.dataset.st),
  'moves-preset': el => {
    const p = el.dataset.p, f = ctx.moves, ym = ymOf(ctx.today);
    if (p === 'month') { f.from = ymFirst(ym); f.to = ymLast(ym); f.all = false; }
    else if (p === '30') { f.to = ctx.today; f.from = addDays(ctx.today, -29); f.all = false; }
    else { const ds = ctx.state.txs.map(t => t.date).sort(); f.from = ds[0] ?? null; f.to = ds.at(-1) ?? null; f.all = true; }
    f.limit = 300; render();
  },
  'moves-more': () => { ctx.moves.limit += 300; renderMovesData(); },
  // Lançamentos: Lista | Calendário, setas do mês, período e filtros, filtros de um toque
  'moves-view': el => { ctx.movesView = el.dataset.v === 'calendar' ? 'calendar' : 'list'; render(); },
  'moves-shift': el => { const f = ctx.moves; [f.from, f.to] = Period.shift(f.from, f.to, +el.dataset.d, ctx.today); f.all = false; f.limit = 300; render(); },
  'moves-filters': () => E.movesFiltersSheet(),
  'moves-chip': el => {
    const f = ctx.moves, c = el.dataset.c;
    if (c === 'all') { f.kind = ''; f.st = ''; }
    else if (c === 'pending') f.st = f.st === 'pending' ? '' : 'pending';
    else f.kind = f.kind === c ? '' : c;
    f.limit = 300; render();
  },
  // calendário: 1º toque escolhe o dia; tocar de novo no dia escolhido abre um lançamento novo nessa data
  'cal-day': el => {
    if (suppressCalClick) { suppressCalClick = false; return; }
    const d = el.dataset.date;
    if (ctx.cal.day === d) { E.txEditor('expense', null, d); return; }
    ctx.cal.day = d; render();
  },
  'cal-shift': el => calShift(+el.dataset.d),
  'cal-today': () => { ctx.cal.ym = ymOf(ctx.today); ctx.cal.day = ctx.today; render(); },
  'dismiss-tip': el => ctx.setDevice({ dismissedTips: [...ctx.device.dismissedTips, el.dataset.id] }),
  'restore-tip': el => ctx.setDevice({ dismissedTips: ctx.device.dismissedTips.filter(x => x !== el.dataset.id) }),
  'restore-all-tips': () => ctx.setDevice({ dismissedTips: [] }),
  'ask-example': el => { const i = $('#askInput'); if (i) i.value = el.dataset.q; askQuestion(el.dataset.q); },
  'toggle-privacy': () => { ctx.replace({ ...ctx.state, privacy: !ctx.state.privacy }); toast(ctx.state.privacy ? 'Valores ocultos' : 'Valores visíveis'); },
  lock: () => lockNow(),
  'remote-logout': async () => {
    if (!await ask('Desconectar do celular', 'Este navegador deixa de acessar os dados do celular. Para voltar, digite um novo código.', { ok: 'Desconectar' })) return;
    await ctx.store.logout();
    location.reload();
  },
  pdf: () => E.pdfDialog(), csv: () => E.exportCsv(), backup: () => E.exportBackup(), restore: () => E.restoreBackup(),
  wipe: () => wipeAll(),
  theme: el => ctx.replace({ ...ctx.state, theme: el.dataset.id }),
  'pin-set': () => E.setPin(), 'pin-remove': () => E.removePin(),
  'notify-now': () => checkNotifications(true),
  'rename-cat': el => E.renameCategory(el.dataset.kind, el.dataset.cat),
  'delete-cat': el => E.deleteCategory(el.dataset.kind, el.dataset.cat),
  fold: el => {
    const id = el.dataset.id;
    if (S.openFolds.has(id)) S.openFolds.delete(id); else S.openFolds.add(id);
    const sec = $(`#fold-${id}`), open = S.openFolds.has(id);
    sec.classList.toggle('open', open);
    el.setAttribute('aria-expanded', open);
    sec.querySelector('.foldBody').hidden = !open;
    sec.querySelector('.foldBtn').innerHTML = icon(open ? 'remove' : 'add', 20);
  },
  search: () => ctx.go('moves', { focus: 'search' }),
  menu: () => { const m = $('#menu'); m.hidden = !m.hidden; if (!m.hidden) m.querySelector('button')?.focus(); },
  shortcuts: () => E.shortcutsDialog(),
  whatsnew: () => E.whatsNew(),
  about: () => ctx.go('prefs', { fold: 'sobre' }),
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  const menu = $('#menu');
  if (menu && !menu.hidden && !e.target.closest('.menuWrap')) menu.hidden = true;
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.closest('#menu')) menu.hidden = true;
  e.preventDefault();
  fn(el);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.tx[role=button]')) { e.preventDefault(); ACTIONS['edit-tx'](e.target); }
  if (e.key === 'Escape') { const m = $('#menu'); if (m && !m.hidden) { m.hidden = true; $('#menuBtn')?.focus(); } }
});

// ================================================================== calendário e gestos
function calShift(delta) {
  const ym = (ctx.cal.ym ?? ymOf(ctx.today)) + delta;
  ctx.cal.ym = ym;
  ctx.cal.day = ym === ymOf(ctx.today) ? ctx.today : null; // no mês atual, o dia escolhido volta a ser hoje
  render();
}

// tocar e segurar um dia do calendário: lançamento novo nessa data (em qualquer dia)
let calHold = null, suppressCalClick = false;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest?.('.calDay');
  clearTimeout(calHold); calHold = null;
  if (!el || e.button > 0) return;
  calHold = setTimeout(() => {
    calHold = null; suppressCalClick = true;
    ctx.cal.day = el.dataset.date; render();
    E.txEditor('expense', null, el.dataset.date);
    setTimeout(() => { suppressCalClick = false; }, 800);
  }, 550);
}, { passive: true });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(calHold); calHold = null; }, { passive: true }));
document.addEventListener('pointermove', e => { if (calHold && (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4)) { clearTimeout(calHold); calHold = null; } }, { passive: true });
document.addEventListener('contextmenu', e => { if (e.target.closest?.('.calDay')) e.preventDefault(); }); // sem o menu do navegador ao segurar

/*
 * Deslizar para o lado (celular): sobre o calendário troca de mês; no resto da tela, troca de aba
 * na ordem Início › Lançamentos › Relatórios › Ajustes. Os botões da barra continuam funcionando.
 * Fica de fora: campos de texto, fileiras que rolam para o lado, folhas e diálogos abertos.
 */
const SWIPE_TABS = ['home', 'moves', 'reports', 'prefs'];
let swipe = null;
document.addEventListener('touchstart', e => {
  swipe = null;
  if (ctx.cols !== 1 || e.touches.length !== 1 || ctx.locked || ctx.problem || dialogOpen()) return;
  const t = e.target;
  if (!t.closest?.('#main') || t.closest('input, select, textarea, .hscroll, details')) return;
  swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, at: Date.now(), cal: !!t.closest('.calCard') };
}, { passive: true });
document.addEventListener('touchend', e => {
  const s = swipe; swipe = null;
  if (!s || dialogOpen()) return;
  const p = e.changedTouches[0], dx = p.clientX - s.x, dy = p.clientY - s.y;
  if (Date.now() - s.at > 700 || Math.abs(dx) < 70 || Math.abs(dx) < 1.6 * Math.abs(dy)) return;
  clearTimeout(calHold); calHold = null;
  if (s.cal) { calShift(dx < 0 ? 1 : -1); return; }
  const i = SWIPE_TABS.indexOf(ctx.view);
  if (i < 0) return;
  const next = SWIPE_TABS[i + (dx < 0 ? 1 : -1)];
  if (next) ctx.go(next);
}, { passive: true });

// "Liquid Glass": brilho no ponto do toque
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('button,.tx,.chk');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--tap-x', `${e.clientX - r.left}px`);
  el.style.setProperty('--tap-y', `${e.clientY - r.top}px`);
  el.classList.remove('tapFx'); void el.offsetWidth; el.classList.add('tapFx');
  setTimeout(() => el.classList.remove('tapFx'), 360);
}, { passive: true });

// ================================================================== atalhos de teclado
// Teclas simples (fora de campos de texto) funcionam em qualquer navegador; com Ctrl/⌘ também,
// mas em uma aba comum alguns (Ctrl+N, Ctrl+1…) são do próprio navegador: no app instalado, todos funcionam.
const SIMPLE = { n: 'n', r: 'N', m: 'm', '/': 'f', k: 'k', h: 'h', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '?': '/' };
document.addEventListener('keydown', e => {
  if (ctx.locked || ctx.problem || !ctx.state) return;
  if (dialogOpen()) return; // com uma janela aberta, os atalhos esperam
  const mod = e.ctrlKey || e.metaKey;
  if (e.altKey) return;
  if (!mod) {
    const typing = e.target.closest?.('input, select, textarea, [contenteditable]');
    const sk = SIMPLE[e.key];
    if (typing || !sk || e.repeat) return;
    e.preventDefault();
    if (sk === 'N') return E.txEditor('income');
    return runShortcut(sk, false, e);
  }
  runShortcut(e.key.toLowerCase(), e.shiftKey, e);
});
function runShortcut(k, shift, e) {
  const map = {
    n: () => E.txEditor(shift ? 'income' : 'expense'), m: () => E.goalEditor(), f: () => ctx.go('moves', { focus: 'search' }),
    k: () => ctx.go('assist', { focus: 'ask' }), h: () => ACTIONS['toggle-privacy'](), l: () => ctx.device.pinHash && lockNow(),
    p: () => E.pdfDialog(), e: () => E.exportCsv(), s: () => E.exportBackup(), o: () => E.restoreBackup(),
    '1': () => ctx.go('home'), '2': () => ctx.go('moves'), '3': () => ctx.go('reports'), '4': () => ctx.go('assist'), '5': () => ctx.go('prefs'),
    ',': () => ctx.go('prefs'), '/': () => E.shortcutsDialog(), '?': () => E.shortcutsDialog(),
  };
  const fn = map[k];
  if (!fn) return;
  if (k === 'l' && !ctx.device.pinHash) return; // sem PIN, Ctrl+L continua sendo do navegador
  e.preventDefault();
  fn();
}

// ================================================================== bloqueio por PIN
let lastActivity = Date.now();
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true, capture: true }));

function lockNow() {
  if (!ctx.device.pinHash) return;
  closeDialogs();
  ctx.locked = true;
  showLock();
}
ctx.lockNow = lockNow;

function showLock() {
  const el = $('#lock');
  $('#shell').inert = true;
  el.hidden = false;
  el.innerHTML = `<div class="lockBox glass" role="dialog" aria-modal="true" aria-labelledby="lockTitle">
    <img src="icons/icon-192.png" alt="" width="64" height="64">
    <h2 id="lockTitle">Finan+</h2><p class="muted">Digite seu PIN para entrar.</p>
    <form id="lockForm" novalidate><input id="pinIn" type="password" inputmode="none" autocomplete="off" maxlength="8" aria-label="PIN" placeholder="PIN">
    <div class="pinDots" aria-hidden="true">${'<i></i>'.repeat(8)}</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join('')}
      <button type="button" data-k="back" aria-label="Apagar">${icon('backspace', 22)}</button><button type="button" data-k="0">0</button>
      <button type="submit" class="ok" aria-label="Entrar">${icon('lock-open', 22)}</button></div></form>
    <small id="pinErr" class="pinErr" role="alert"></small></div>`;
  const inp = $('#pinIn'), err = $('#pinErr');
  const dots = () => $$('.pinDots i').forEach((d, i) => d.classList.toggle('on', i < inp.value.length));
  inp.oninput = () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 8); dots(); };
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    if (b.dataset.k === 'back') inp.value = inp.value.slice(0, -1); else if (inp.value.length < 8) inp.value += b.dataset.k;
    dots(); inp.focus();
  });
  let busy = false;
  $('#lockForm').onsubmit = async e => {
    e.preventDefault();
    if (busy) return;
    const dev = loadDevice(); // sempre o salvo: outra aba pode ter trocado o PIN ou somado erros
    const wait = Throttle.waitSeconds(dev);
    if (wait > 0) { err.textContent = `Muitas tentativas. Aguarde ${wait} s.`; return; }
    if (!inp.value) return;
    busy = true; err.textContent = 'Verificando…';
    const r = await verifyPin(inp.value, dev.pinHash);
    busy = false;
    if (r.ok) {
      let newHash = null;
      if (r.upgrade) { try { newHash = await hashPin(inp.value); } catch { /* mantém o antigo */ } }
      updateDevice(d => ({ ...Throttle.reset(d), ...(newHash ? { pinHash: newHash } : {}) }));
      ctx.locked = false; el.hidden = true; el.innerHTML = ''; $('#shell').inert = false;
      lastActivity = Date.now();
      render();
      launchParams();
      flushPending();
      checkNotifications();
      return;
    }
    updateDevice(d => Throttle.fail(d));
    inp.value = ''; dots();
    const w = Throttle.waitSeconds(ctx.device);
    err.textContent = w > 0 ? `PIN incorreto. Aguarde ${w} s para tentar de novo.` : 'PIN incorreto.';
    el.querySelector('.lockBox').classList.remove('shake'); void el.offsetWidth; el.querySelector('.lockBox').classList.add('shake');
    inp.focus();
  };
  // teclado físico: números, Backspace e Enter funcionam mesmo com o foco num botão do teclado numérico
  el.onkeydown = e => {
    if (e.target === inp) return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); if (inp.value.length < 8) inp.value += e.key; dots(); inp.focus(); }
    else if (e.key === 'Backspace') { e.preventDefault(); inp.value = inp.value.slice(0, -1); dots(); inp.focus(); }
    else if (e.key === 'Enter' && e.target.type !== 'submit') { e.preventDefault(); $('#lockForm').requestSubmit(); }
  };
  inp.focus();
}

function autoLockCheck() {
  const m = ctx.state?.autoLock || 0;
  if (!m || !ctx.device?.pinHash || ctx.locked || ctx.problem) return;
  if (Date.now() - lastActivity >= m * 60000) lockNow();
}

// ================================================================== tela de problema (dados que não abriram)
function showProblem(message) {
  ctx.problem = true;
  $('#shell').inert = true;
  const el = $('#problem');
  el.hidden = false;
  el.innerHTML = `<div class="lockBox glass wideBox" role="alertdialog" aria-modal="true" aria-labelledby="pbTitle">
    ${icon('warning', 40, 'red')}<h2 id="pbTitle">Não foi possível abrir seus dados</h2>
    <p>${esc(message)}</p><p class="muted small">Nada foi apagado nem sobrescrito. Isso pode acontecer se os dados do site foram limpos parcialmente pelo navegador.</p>
    <div class="btnCol"><button type="button" class="btn soft" id="pbSave">${icon('download', 18)}<span>Guardar os dados ilegíveis (arquivo)</span></button>
    <button type="button" class="btn soft" id="pbRestore">${icon('upload', 18)}<span>Restaurar um backup JSON</span></button>
    <button type="button" class="btn danger" id="pbFresh">${icon('delete', 18)}<span>Começar do zero</span></button></div></div>`;
  $('#pbSave').onclick = async () => { const t = await ctx.store.unreadableExport(); if (t) E.download(`finan-plus-dados-ilegiveis-${todayStr()}.json`, t, 'application/json'); else notice('Nada para guardar', 'Não há dados salvos.'); };
  const fresh = async (state) => {
    await ctx.store.startOver();
    env.encrypted = ctx.store.encrypted;
    ctx.problem = false; el.hidden = true; el.innerHTML = ''; $('#shell').inert = false;
    afterOpen({ status: 'new', state });
    persist();
  };
  const askHere = (title, msg, ok) => ask(title, msg, { ok, danger: true });
  $('#pbFresh').onclick = async () => { if (await askHere('Começar do zero', ctx.store.noDb ? 'O Finan+ vai funcionar sem criptografia neste navegador, guardando os dados no armazenamento simples do site. Continuar?' : 'Os dados ilegíveis ficam guardados à parte neste navegador (até “Apagar tudo”), e o Finan+ recomeça vazio. Continuar?', 'Começar do zero')) fresh(newState()); };
  $('#pbRestore').onclick = async () => {
    const file = await E.pickFile('application/json,.json');
    if (!file) return;
    let n;
    try { n = parseBackup(await file.text()); } catch { notice('Não foi possível restaurar', 'Arquivo de backup inválido ou danificado.'); return; }
    await fresh(n.state); toast('Backup restaurado');
  };
}

// ================================================================== apagar tudo
async function wipeAll() {
  if (REMOTE) return notice('Apagar tudo', 'Pelo navegador não é possível apagar os dados do celular. Se quiser mesmo apagar, use Ajustes › Dados › Apagar tudo no próprio celular.');
  if (!await ask('Apagar todos os dados', 'Apagar TODOS os dados deste aparelho, inclusive o PIN? Faça um backup antes.', { ok: 'Apagar tudo', danger: true })) return;
  await ctx.store.wipe();
  wipeDevice();
  ctx.device = loadDevice();
  S.openFolds.clear();
  ctx.state = newState();
  await persist();
  ctx.go('home');
  toast('Dados apagados');
}

// ================================================================== avisos de vencimento
async function checkNotifications(force = false) {
  const d = ctx.device;
  if (!ctx.state || ctx.locked || ctx.problem) return;
  if (REMOTE && !force) return; // no modo remoto, os avisos são do celular
  const today = ctx.today, list = Finance.reminders(ctx.state, today, 2);
  if (force) {
    if (!list.length) return notice('Nenhum vencimento', 'Nada vence nos próximos 2 dias, e não há contas em atraso.');
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return notice('Vencimentos', list.map(remText).join('\n'));
  } else {
    if (!d.notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (new Date().getHours() < 9 || d.lastNotified === today) return;
    ctx.setDevice({ lastNotified: today });
    if (!list.length) return;
  }
  const title = list.length === 1 ? 'Finan+ · 1 vencimento' : `Finan+ · ${list.length} vencimentos`;
  const body = list.slice(0, 5).map(remText).join('\n') + (list.length > 5 ? `\ne mais ${list.length - 5}` : '');
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) await reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'finan-vencimentos', data: { url: './#lancamentos' } });
    else new Notification(title, { body, icon: 'icons/icon-192.png', tag: 'finan-vencimentos' });
  } catch (e) { console.warn(e); notice('Vencimentos', body); }
}
function remText(r) {
  const v = ctx.state.privacy ? 'R$ ••••' : Money.format(r.amount);
  const when = r.date === ctx.today ? 'hoje' : r.date < ctx.today ? 'em atraso' : r.date === addDays(ctx.today, 1) ? 'amanhã' : r.date.slice(8, 10) + '/' + r.date.slice(5, 7);
  return r.type === 'INCOME_DUE' ? `A receber: ${r.title} (${v}) · ${when}` : `${r.title} (${v}) · ${when}`;
}

// ================================================================== virada do dia
function dayTick() {
  const t = todayStr();
  if (t === ctx.today || !ctx.state) return;
  // calendário parado em "hoje" (ontem): acompanha a virada do dia e do mês
  if (ctx.cal.day === ctx.today && ctx.cal.ym === ymOf(ctx.today)) { ctx.cal.day = t; ctx.cal.ym = ymOf(t); }
  // Lista parada no mês inteiro de ontem: acompanha a virada do mês
  if (Period.fullMonth(ctx.moves.from, ctx.moves.to) === ymOf(ctx.today) && ymOf(t) !== ymOf(ctx.today)) { ctx.moves.from = ymFirst(ymOf(t)); ctx.moves.to = ymLast(ymOf(t)); }
  ctx.today = t;
  const [s, n] = Finance.generateRecurring(ctx.state, t);
  if (n > 0) ctx.replace(s); else render();
  checkNotifications();
}

// ================================================================== início
async function boot() {
  ctx.device = loadDevice();
  ctx.remote = env.remote = REMOTE;
  if (ctx.device.themeCache) applyTheme(ctx.device.themeCache);
  if (REMOTE) {
    // modo remoto: nada de cache/service worker (os arquivos e os dados vêm sempre do celular)
    navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  } else if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
  try { ctx.dict = Dictionary.parse(DICT_TEXT); } catch { ctx.dict = null; }

  let r;
  if (REMOTE) {
    ctx.store = new RemoteStore();
    ctx.store.onUnauthorized = () => reconnect('A conexão com o celular expirou (o servidor foi reiniciado ou este navegador foi desconectado). Digite o novo código.');
    $('#shell').classList.add('ready');
    r = await openRemote();
  } else {
    ctx.store = new Store();
    r = await ctx.store.open();
  }
  env.encrypted = ctx.store.encrypted;
  $('#shell').classList.add('ready');
  if (r.status === 'problem') { showProblem(r.message); return; }
  afterOpen(r);
}

/** depois de abrir os dados (na inicialização ou ao sair da tela de problema) */
let started = false;
function afterOpen(r) {
  if (r.legacyPin && !loadDevice().pinHash) updateDevice({ pinHash: r.legacyPin });
  const [g, n] = Finance.generateRecurring(r.state, ctx.today);
  ctx.state = g;
  if (n > 0 || r.status === 'new' || r.migrated) persist();
  ctx.view = viewFromHash();
  if (ctx.device.pinHash) { ctx.locked = true; applyTheme(ctx.state.theme); showLock(); }
  else { render(); launchParams(); }
  if (r.migrated && r.migrated !== 'finanplus_plain') pending.push(['Bem-vindo ao Finan+', 'Seus dados do “Minhas Finanças” foram trazidos para o Finan+' + (env.encrypted ? ' e agora ficam criptografados neste aparelho.' : '.') + (r.dropped ? `\n${r.dropped} item(ns) inválido(s) foram ignorados.` : '')]);
  else if (r.dropped) pending.push(['Itens ignorados', `${r.dropped} item(ns) inválido(s) nos dados salvos foram ignorados ao abrir. Se notar algo faltando, restaure um backup JSON recente (Ajustes › Dados).`]);
  if (!env.encrypted) toast('Este navegador não permite criptografar os dados. Eles ficam só neste aparelho.', 5000);
  flushPending();
  checkNotifications();
  if (started) return;
  started = true;
  if (!REMOTE) Store.persist();
  try { channel = new BroadcastChannel('finan-plus'); channel.onmessage = onPeer; } catch { channel = null; }
  setInterval(() => { dayTick(); autoLockCheck(); }, 15000);
  if (REMOTE) setInterval(pollRemote, 4000);
  setInterval(() => checkNotifications(), 5 * 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { dayTick(); autoLockCheck(); checkNotifications(); } });
}

// ================================================================== modo remoto (dados no celular)
/** conecta (código + Permitir no celular, se preciso) e lê os dados do celular */
async function openRemote(message = '') {
  for (;;) {
    if (!getToken()) await pairFlow($('#lock'), message);
    try { return await ctx.store.open(); } catch (e) {
      if (e?.status === 401) { setToken(null); message = 'Digite o novo código mostrado no celular.'; continue; }
      if (e?.status === 0) { await pairFlowRetry(e.message); continue; }
      throw e;
    }
  }
}
/** sem conexão ao abrir: mostra o erro e tenta de novo quando o usuário pedir */
function pairFlowRetry(msg) {
  return new Promise(res => {
    const el = $('#lock'); el.hidden = false;
    el.innerHTML = `<div class="lockBox glass pairBox" role="alertdialog" aria-modal="true" aria-labelledby="offTitle">${icon('warning', 40, 'red')}
      <h2 id="offTitle">Sem conexão com o celular</h2><p class="muted">${esc(msg)}</p>
      <button type="button" class="btn primary" id="retryBtn">Tentar de novo</button></div>`;
    $('#retryBtn').onclick = () => { el.hidden = true; el.innerHTML = ''; res(); };
    $('#retryBtn').focus();
  });
}

let reconnecting = false;
/** token perdido no meio do uso: pede o código de novo e recarrega os dados do celular */
async function reconnect(message) {
  if (reconnecting) return;
  reconnecting = true;
  closeDialogs(); closeSheet();
  setToken(null);
  try {
    await pairFlow($('#lock'), message);
    ctx.state = await ctx.store.reload();
    render(); toast('Conectado de novo ao celular. Confira se a última alteração aparece na lista.', 5000);
  } catch (e) { console.warn(e); }
  finally { reconnecting = false; }
}

let offline = false, polling = false;
/** a cada 4 s (aba visível): mudou algo no celular? Então mostra os dados novos. Nunca duas consultas ao mesmo tempo. */
async function pollRemote() {
  if (polling || document.hidden || ctx.locked || ctx.problem || reconnecting || !ctx.state) return;
  polling = true;
  try {
    const changed = await ctx.store.changed();
    if (offline) { offline = false; toast('Conexão com o celular restabelecida'); }
    if (!changed) return;
    ctx.state = await ctx.store.reload(); // uma folha aberta continua aberta: ao salvar, a versão é conferida
    render();
  } catch (e) {
    if (e?.status === 0 && !offline) { offline = true; toast('Sem conexão com o celular. As alterações não serão salvas até reconectar.', 6000); }
    else if (e?.status !== 0 && e?.status !== 401) console.warn('poll', e?.status);
  } finally { polling = false; }
}

/** avisos que esperam o desbloqueio (um diálogo não pode aparecer por cima da tela do PIN) */
const pending = [];
function flushPending() { if (ctx.locked || ctx.problem) return; while (pending.length) notice(...pending.shift()); }

/** atalhos do ícone instalado: ./?novo=despesa | receita */
function launchParams() {
  const p = new URLSearchParams(location.search), n = p.get('novo');
  if (!n) return;
  history.replaceState(null, '', location.pathname + location.hash);
  E.txEditor(n === 'receita' ? 'income' : 'expense');
}

/** outra aba gravou: recarrega os dados para não sobrescrever o que ela salvou */
async function onPeer(m) {
  if (m.data?.type !== 'saved' || ctx.problem || !ctx.store) return;
  try {
    ctx.state = await ctx.store.reload(); // uma folha aberta continua aberta: ao salvar, ela usa os dados atualizados
    if (!ctx.locked) { render(); toast('Dados atualizados em outra aba'); }
  } catch (e) { console.warn('reload', e); }
}

// para ferramentas de desenvolvimento e testes (dados de demonstração, capturas de tela)
globalThis.FinanPlus = { ctx, core: Core, store: StoreMod, editors: E };

boot().catch(e => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<div class="fatal">Não foi possível iniciar o Finan+: ${esc(e?.message || e)}. Seus dados não foram alterados.</div>`);
});

export { APP_VERSION, money };
