// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Despesas compartilhadas (DESPESAS-COMPARTILHADAS.md): histórico, formulário, detalhe com pagamentos,
// registrar pagamento, comprovante em PDF e "Compartilhar como imagem". Tradução de ui/screens/SharedExpenses.kt
// do Finan+ Android, com as folhas e os componentes do Finan+ web. As regras ficam em shared.js (testadas).
// Abre a partir de Meu dinheiro e do botão + (Despesa compartilhada). Não mexe no saldo nem nos lançamentos.
//
// Comprovante anexado (nota fiscal, foto ou PDF): no Android ele fica cifrado só no celular. Aqui não dá para
// anexar; uma despesa que veio do Android com comprovante continua com ele (o nome do arquivo é mantido).
import { Money, brDate } from './core.js';
import { Shared, SPLIT, PERSON_STATE, SHARED_STATE } from './shared.js';
import { Text } from './assist.js';
import { Words } from './words.js';
import { MonthCalendar } from './calendar.js';
import { renderSharedPdf } from './sharedpdf.js';
import { sharedImageBlob, shareText } from './sharedimage.js';
import { icon } from './icons.js';
import { esc, attr, openSheet, closeSheet, notice, ask, toast, field, input, moneyInput, select, btn } from './ui.js';
import { ctx, money, hidden, APP_VERSION } from './ctx.js';

/** "Eu" e "Você" são a própria pessoa: o texto fala com "você" (nunca "pago por Eu") */
export const isMe = name => ['eu', 'voce'].includes(Text.fold(String(name ?? '').trim()));
const list = () => ctx.state.shared ?? [];
const find = id => list().find(e => e.id === id) ?? null;
const stateCls = st => st === 'SETTLED' ? 'green' : 'warnTxt';
const paidBy = e => { const p = Shared.payer(e); return p && isMe(p.name) ? 'você pagou' : `pago por ${p?.name ?? '—'}`; };

/** resumo do card em Meu dinheiro */
export function sharedCardSubtitle(s = ctx.state) {
  const all = s.shared ?? [];
  if (!all.length) return 'Divida contas com amigos e família e acompanhe quem já pagou';
  const [pending] = Shared.totals(all);
  const open = all.filter(e => Shared.summary(e).state !== 'SETTLED').length;
  return open === 0 ? `${Words.count(all.length, 'despesa', 'despesas')} · tudo quitado` : `${open} em aberto · a receber ${money(pending)}`;
}

/** atualiza o corpo da folha aberta sem fechá-la (mantém a posição e o foco perto de onde estava) */
function refresh(d, html, bind) {
  const body = d.querySelector('.sheetBody');
  const top = d.scrollTop;
  body.innerHTML = html;
  bind(d);
  d.scrollTop = top;
}
const sheetTitle = (d, title, sub) => {
  d.querySelector('#sheetTitle').textContent = title;
  let p = d.querySelector('.dialogHead .dlgMsg');
  if (sub && !p) { p = document.createElement('p'); p.className = 'dlgMsg'; d.querySelector('#sheetTitle').after(p); }
  if (p) { p.textContent = sub || ''; p.hidden = !sub; }
};

// ------------------------------------------------------------------ histórico
const LF = { query: '', from: '', to: '', person: '', state: null, more: false };

export function sharedListSheet() {
  const d = openSheet({ title: 'Despesas compartilhadas', subtitle: 'Divida uma despesa e acompanhe quem já devolveu a parte dela.', body: listBody(), wide: false });
  bindList(d);
}

function listBody() {
  const all = list(), [pending, received] = Shared.totals(all);
  const pill = (st, label) => `<button type="button" class="chip${LF.state === st ? ' on' : ''}" data-st="${st ?? ''}" aria-pressed="${LF.state === st}">${label}</button>`;
  const filters = all.length ? `
    <div class="searchField sharedSearch">${icon('search', 20)}<input id="shQ" type="search" maxlength="60" placeholder="Nome, observação ou participante" aria-label="Pesquisar despesas compartilhadas" value="${attr(LF.query)}"></div>
    <div class="chips" role="group" aria-label="Situação">${pill(null, 'Todas')}${pill('OPEN', 'Pendentes')}${pill('PARTIAL', 'Parciais')}${pill('SETTLED', 'Quitadas')}
      <button type="button" class="chip${LF.from || LF.to || LF.person ? ' on' : ''}" id="shMore" aria-expanded="${LF.more}" aria-controls="shMoreBox">${icon('tune', 16)} ${LF.more ? 'Menos filtros' : 'Período e pessoa'}</button></div>
    <div id="shMoreBox"${LF.more ? '' : ' hidden'}>
      <div class="row2">${field('De', input('shFrom', LF.from, { type: 'date' }))}${field('Até', input('shTo', LF.to, { type: 'date' }))}</div>
      ${field('Participante', select('shPerson', [['', 'Todos'], ...Shared.peopleNames(all).map(n => [n, n])], LF.person))}</div>` : '';
  return `<div class="sharedTotals glass"><div><small>A receber</small><b class="${pending > 0 ? 'red' : ''}">${money(pending)}</b></div>
      <div><small>Já recebido</small><b class="green">${money(received)}</b></div></div>
    ${btn('Nova despesa compartilhada', { act: 'sh-new', cls: 'primary wide', icon: 'add', iconSize: 18 })}
    ${filters}<div id="shList" class="list sharedList" aria-live="polite">${listRows()}</div>`;
}

function listRows() {
  const all = list();
  if (!all.length) return `<div class="empty glass"><b>Nenhuma despesa compartilhada ainda</b><span>Registre o mercado, o aluguel da casa de praia ou a conta do restaurante, diga quem pagou e o Finan+ calcula quanto cada pessoa deve devolver.</span></div>`;
  const rows = Shared.filter(all, { query: LF.query, from: LF.from || null, to: LF.to || null, person: LF.person, state: LF.state });
  if (!rows.length) return '<p class="muted">Nenhuma despesa encontrada com esses filtros.</p>';
  return rows.map(e => {
    const st = Shared.summary(e);
    return `<button type="button" class="tx sharedRow" data-sh="${attr(e.id)}" aria-label="${attr(`${e.name}, ${money(e.total)}, ${SHARED_STATE[st.state]}`)}">
      <span class="badge" aria-hidden="true">${icon('group', 20)}</span>
      <span class="meta"><b>${esc(e.name)}</b><small>${esc(`${brDate(e.date)} · ${paidBy(e)} · ${e.people.length} pessoas`)}</small>
        <small class="${stateCls(st.state)} txStatus">${esc(SHARED_STATE[st.state] + (st.pending > 0 ? ` · falta ${money(st.pending)}` : ''))}</small></span>
      <span class="amount">${money(e.total)}</span></button>`;
  }).join('');
}

function bindList(d) {
  const upd = () => { d.querySelector('#shList').innerHTML = listRows(); bindRows(d); };
  const bindRows = dd => dd.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => sharedDetail(b.dataset.sh));
  d.querySelector('[data-act="sh-new"]').onclick = () => sharedEditor();
  const q = d.querySelector('#shQ');
  if (q) q.oninput = () => { LF.query = q.value; upd(); };
  d.querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
    LF.state = b.dataset.st || null;
    d.querySelectorAll('[data-st]').forEach(x => { const on = (x.dataset.st || null) === LF.state; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    upd();
  });
  const more = d.querySelector('#shMore');
  if (more) more.onclick = () => { LF.more = !LF.more; d.querySelector('#shMoreBox').hidden = !LF.more; more.setAttribute('aria-expanded', LF.more); more.lastChild.textContent = LF.more ? ' Menos filtros' : ' Período e pessoa'; };
  const f = d.querySelector('[name=shFrom]'), t = d.querySelector('[name=shTo]'), p = d.querySelector('[name=shPerson]');
  const markMore = () => more?.classList.toggle('on', !!(LF.from || LF.to || LF.person));
  if (f) f.onchange = () => { LF.from = f.value; markMore(); upd(); };
  if (t) t.onchange = () => { LF.to = t.value; markMore(); upd(); };
  if (p) p.onchange = () => { LF.person = p.value; markMore(); upd(); };
  bindRows(d);
}

// ------------------------------------------------------------------ formulário
let seq = 0;
export function sharedEditor(id = null) {
  const old = id ? find(id) : null;
  if (id && !old) return notice('Despesa não encontrada', 'Ela pode ter sido excluída.');
  const today = ctx.today;
  const st = {
    split: old?.split ?? SPLIT.EQUAL,
    rows: old ? old.people.map(p => ({ id: p.id, name: p.name, share: Money.input(p.share) })) : [{ id: 'n-me', name: 'Você', share: '' }, { id: 'n-0', name: '', share: '' }],
    payer: old?.payerId ?? 'n-me',
  };
  const body = `<form id="shForm" novalidate>
    <div class="formCard">${field('Nome da despesa', input('name', old?.name ?? '', { placeholder: 'Ex.: Mercado do mês', max: Shared.NAME_MAX }))}
      ${field('Valor total (R$)', moneyInput('total', old ? Money.input(old.total) : ''))}
      ${field('Data', input('date', old?.date ?? today, { type: 'date', required: true }))}</div>
    <div class="formCard"><h4 class="formHead" id="shPeopleHead">Participantes</h4>
      <div class="seg" role="tablist" aria-label="Forma de divisão">
        <button type="button" role="tab" data-split="${SPLIT.EQUAL}">Dividir igualmente</button><button type="button" role="tab" data-split="${SPLIT.CUSTOM}">Valor de cada um</button></div>
      <div id="shRows" role="group" aria-labelledby="shPeopleHead"></div>
      ${btn('Adicionar participante', { id: 'shAdd', cls: 'soft small', icon: 'add', iconSize: 18 })}
      <small class="muted shHint" id="shHint" aria-live="polite"></small>
      ${field('Quem pagou', '<select name="payer" id="shPayer"></select>')}</div>
    <div class="formCard">${field('Observação (opcional)', `<textarea name="note" rows="2" maxlength="${Shared.NOTE_MAX}" placeholder="Ex.: compra do churrasco">${esc(old?.note ?? '')}</textarea>`)}
      <p class="infoBox">${icon('attach-file', 18)}<span>${old?.receipt
        ? 'Esta despesa tem uma nota ou comprovante anexado no Finan+ Android. Ele continua lá; no navegador não dá para abrir nem trocar o anexo.'
        : 'No Finan+ web não dá para anexar a nota fiscal ou o comprovante: o arquivo ficaria fora da criptografia dos dados. Para anexar, use o Finan+ Android.'}</span></p></div>
    <div class="sheetActions">${old ? btn('Excluir despesa', { act: 'sheet-delete', cls: 'danger' }) : ''}${btn(old ? 'Salvar alterações' : 'Salvar despesa', { submit: true, cls: 'primary' })}</div></form>`;
  const d = openSheet({ title: old ? 'Editar despesa' : 'Nova despesa compartilhada', subtitle: 'Quem pagou, quem divide e quanto cada um deve.', body });
  const f = d.querySelector('#shForm'), rowsBox = d.querySelector('#shRows'), payerSel = d.querySelector('#shPayer'), hint = d.querySelector('#shHint');

  const equal = () => { const t = Money.parse(f.total.value); return st.split === SPLIT.EQUAL && t != null && t > 0 ? Shared.equalShares(t, st.rows.length) : []; };
  const renderPayer = () => {
    if (!st.rows.some(r => r.id === st.payer)) st.payer = st.rows[0].id;
    payerSel.innerHTML = st.rows.map((r, i) => `<option value="${attr(r.id)}"${r.id === st.payer ? ' selected' : ''}>${esc(r.name.trim() || `Pessoa ${i + 1}`)}</option>`).join('');
  };
  const renderHint = () => {
    const t = Money.parse(f.total.value), eq = equal();
    hint.classList.remove('green', 'red');
    if (st.split === SPLIT.EQUAL) {
      hint.textContent = eq.length ? `${Words.count(st.rows.length, 'pessoa', 'pessoas')} · cada uma com ${money(eq.at(-1))}${eq[0] !== eq.at(-1) ? ' (os centavos que sobram ficam com a primeira)' : ''}` : '';
      rowsBox.querySelectorAll('[data-eq]').forEach((el, i) => { el.textContent = eq.length ? money(eq[i]) : ''; });
    } else if (t != null && t > 0) {
      const sum = st.rows.reduce((n, r) => { const v = Money.parse(r.share); return n + (v != null && v >= 0 ? v : 0); }, 0), diff = t - sum;
      hint.textContent = diff === 0 ? 'As partes somam o total.' : diff > 0 ? `Soma ${money(sum)} · faltam ${money(diff)}` : `Soma ${money(sum)} · passou ${money(-diff)}`;
      hint.classList.add(diff === 0 ? 'green' : 'red');
    } else hint.textContent = '';
  };
  const renderRows = (focusIdx = -1) => {
    d.querySelectorAll('[data-split]').forEach(b => { const on = b.dataset.split === st.split; b.classList.toggle('selected', on); b.setAttribute('aria-selected', on); });
    rowsBox.innerHTML = st.rows.map((r, i) => `<div class="shRow">
      <label class="field"><span>Pessoa ${i + 1}</span><input data-name="${i}" value="${attr(r.name)}" maxlength="${Shared.PERSON_MAX}" placeholder="Nome" autocomplete="off"></label>
      ${st.split === SPLIT.CUSTOM ? `<label class="field shShare"><span>Valor (R$)</span><input data-share="${i}" value="${attr(r.share)}" inputmode="decimal" maxlength="20" placeholder="0,00" autocomplete="off"></label>`
        : `<b class="shEq" data-eq aria-label="Parte de ${attr(r.name.trim() || `pessoa ${i + 1}`)}"></b>`}
      ${st.rows.length > 2 ? `<button type="button" class="btn icon tiny shDel" data-del="${i}" aria-label="${attr(`Remover ${r.name.trim() || `pessoa ${i + 1}`}`)}">${icon('remove', 20)}</button>` : ''}</div>`).join('');
    rowsBox.querySelectorAll('[data-name]').forEach(el => el.oninput = () => { st.rows[+el.dataset.name].name = el.value; renderPayer(); });
    rowsBox.querySelectorAll('[data-share]').forEach(el => el.oninput = () => { st.rows[+el.dataset.share].share = el.value; renderHint(); });
    rowsBox.querySelectorAll('[data-del]').forEach(el => el.onclick = () => {
      const i = +el.dataset.del;
      st.rows.splice(i, 1);
      renderRows(Math.min(i, st.rows.length - 1));
    });
    renderPayer(); renderHint();
    if (focusIdx >= 0) rowsBox.querySelector(`[data-name="${focusIdx}"]`)?.focus();
  };
  d.querySelectorAll('[data-split]').forEach(b => b.onclick = () => { if (st.split !== b.dataset.split) { st.split = b.dataset.split; renderRows(); } });
  d.querySelector('#shAdd').onclick = () => {
    if (st.rows.length >= Shared.PEOPLE_MAX) return notice('Limite de participantes', `Use no máximo ${Shared.PEOPLE_MAX} pessoas por despesa.`);
    st.rows.push({ id: `n${++seq}`, name: '', share: '' });
    renderRows(st.rows.length - 1);
  };
  payerSel.onchange = () => { st.payer = payerSel.value; };
  f.total.oninput = renderHint;
  renderRows();

  let busy = false;
  f.onsubmit = e => {
    e.preventDefault();
    if (busy) return;
    busy = true; setTimeout(() => { busy = false; }, 250);
    const payerIndex = Math.max(0, st.rows.findIndex(r => r.id === st.payer));
    const before = new Set(list().map(x => x.id));
    const o = Shared.save(ctx.state, old?.id ?? null, { name: f.name.value, total: f.total.value, date: f.date.value, split: st.split,
      people: st.rows.map(r => ({ id: r.id, name: r.name, share: r.share })), payerIndex, note: f.note.value,
      receipt: old?.receipt ?? '', receiptType: old?.receiptType ?? '' });
    if (!o.ok) return notice(o.title, o.message);
    ctx.replace(o.state);
    toast(old ? 'Despesa atualizada' : 'Despesa salva');
    const nid = old?.id ?? (o.state.shared ?? []).find(x => !before.has(x.id))?.id;
    if (nid) sharedDetail(nid); else closeSheet();
  };
  d.querySelector('[data-act="sheet-delete"]')?.addEventListener('click', () => confirmDelete(old));
}

async function confirmDelete(e) {
  if (!await ask('Excluir despesa', `Excluir “${e.name}”, com os pagamentos registrados${e.receipt ? ' e o comprovante anexado no celular' : ''}? Isso não pode ser desfeito.`, { ok: 'Excluir', danger: true })) return;
  const before = ctx.state;
  ctx.replace(Shared.delete(ctx.state, e.id));
  const after = ctx.state;
  closeSheet();
  toast('Despesa excluída', 6000, { action: 'Desfazer', onAction: () => { if (ctx.state === after) { ctx.replace(before); toast('Despesa restaurada'); } else notice('Não foi possível desfazer', 'Os dados mudaram depois da exclusão.'); } });
}

// ------------------------------------------------------------------ detalhe
export function sharedDetail(id) {
  const e = find(id);
  if (!e) return notice('Despesa não encontrada', 'Ela pode ter sido excluída.');
  const d = openSheet({ title: e.name, subtitle: detailSub(e), body: detailBody(e) });
  bindDetail(d, id);
}

function detailSub(e) {
  const when = MonthCalendar.dayTitle(e.date, ctx.today).split(', ').slice(1).join(', ') || brDate(e.date);
  return [when, paidBy(e), e.split === SPLIT.EQUAL ? 'dividida igualmente' : 'valor de cada um'].join(' · ');
}

function detailBody(e) {
  const st = Shared.summary(e);
  const me = st.people.find(x => isMe(x.person.name));
  const debtors = st.people.filter(x => !x.isPayer && x.remaining > 0).length;
  const frac = st.toReceive > 0 ? Math.min(100, st.received * 100 / st.toReceive) : 0;
  const summary = `<section class="glass sharedSum" aria-label="Resumo da despesa">
    <div class="sharedSumTop"><div><small>${st.pending > 0 ? 'Falta receber' : 'Tudo recebido'}</small><b class="big ${st.pending > 0 ? 'warnTxt' : 'green'}">${money(st.pending)}</b></div>
      <div class="right"><small>Total</small><b>${money(e.total)}</b></div></div>
    ${st.toReceive > 0 ? `<div class="bar2 sharedBar${hidden() ? ' sensitive' : ''}" role="progressbar" aria-label="Recebido" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(frac)}"><i style="width:${frac}%"></i></div>` : ''}
    <div class="sharedSumFoot"><small>${esc(me ? `Sua parte · ${money(me.person.share)}` : SHARED_STATE[st.state])}</small><small>${esc(debtors === 0 ? 'Ninguém deve' : Words.count(debtors, 'pessoa deve', 'pessoas devem'))}</small></div></section>`;

  const people = st.people.map(ps => {
    const mine = isMe(ps.person.name);
    const sub = mine ? `Sua parte: ${money(ps.person.share)}` : ps.isPayer ? `Pagou a despesa · parte: ${money(ps.person.share)}` : `Parte: ${money(ps.owed)} · devolveu ${money(ps.paid)}`;
    const [label, cls] = ps.isPayer || ps.state === 'PAID' ? [ps.isPayer ? 'Pagou tudo' : 'Quitado', 'ok'] : ps.remaining > 0 ? [`Deve ${money(ps.remaining)}`, 'warn'] : [PERSON_STATE[ps.state], ''];
    const initial = [...ps.person.name.trim()][0]?.toUpperCase() || '?';
    return `<div class="sharedPerson">
      <div class="sharedPersonTop"><span class="avatar${ps.remaining > 0 ? ' warn' : ''}" aria-hidden="true">${esc(initial)}</span>
        <span class="meta"><b>${esc(mine ? 'Você' : ps.person.name)}</b><small>${esc(sub)}</small></span><span class="statePill ${cls}">${esc(label)}</span></div>
      ${!ps.isPayer && ps.remaining > 0 ? `<div class="sharedPersonActs">${btn('Registrar pagamento', { cls: 'soft', data: { pay: ps.person.id }, label: `Registrar pagamento de ${mine ? 'você' : ps.person.name}` })}
        ${btn('Quitar', { cls: 'primary', icon: 'check', iconSize: 18, data: { settle: ps.person.id }, label: `Quitar a parte de ${mine ? 'você' : ps.person.name}` })}</div>` : ''}</div>`;
  }).join('');

  const pays = [...e.payments].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : a.id > b.id ? -1 : 0).map(p => {
    const who = Shared.person(e, p.personId)?.name ?? 'Participante';
    return `<div class="sharedPay"><span class="meta"><b>${esc(isMe(who) ? 'Você' : who)}</b><small>${brDate(p.date)}</small></span><b class="green">${money(p.value)}</b>
      <button type="button" class="btn icon tiny" data-delpay="${attr(p.id)}" aria-label="${attr(`Excluir pagamento de ${who}`)}">${icon('delete', 20)}</button></div>`;
  }).join('');

  const note = String(e.note ?? '').trim() || e.receipt ? `<section class="glass sharedBox">${String(e.note ?? '').trim() ? `<h4 class="formHead">Observação</h4><p class="pre">${esc(e.note)}</p>` : ''}
    ${e.receipt ? `<p class="infoBox">${icon('attach-file', 18)}<span>Há uma nota ou comprovante anexado a esta despesa no Finan+ Android. O arquivo fica só no celular, criptografado.</span></p>` : ''}</section>` : '';

  return `${summary}
    <h4 class="subhead">Quem participa</h4><section class="glass sharedPeople">${people}</section>
    ${pays ? `<h4 class="subhead">Pagamentos registrados</h4><section class="glass sharedBox">${pays}</section>` : ''}
    ${note}
    <h4 class="subhead">Cobrar</h4><section class="glass sharedBox">
      <p class="muted small">Envie a parte de cada pessoa e o que falta. Os valores aparecem mesmo com “Ocultar valores” ligado.</p>
      <div class="btnGrid">${btn('Compartilhar como imagem', { id: 'shImg', icon: 'share', iconSize: 18 })}${btn('Comprovante em PDF', { id: 'shPdf', icon: 'picture-as-pdf', iconSize: 18 })}</div>
      <small class="muted">Sem a opção de compartilhar do aparelho, o arquivo é baixado na pasta de downloads do navegador.</small></section>
    <div class="sheetActions">${btn('Excluir', { act: 'sheet-delete', cls: 'danger' })}${btn('Editar despesa', { id: 'shEdit', cls: 'primary', icon: 'edit', iconSize: 18 })}</div>
    ${btn('Despesas compartilhadas', { id: 'shBack', cls: 'link back', icon: 'arrow-back', iconSize: 18 })}`;
}

function bindDetail(d, id) {
  const again = () => { const e = find(id); if (!e) { closeSheet(); return; } sheetTitle(d, e.name, detailSub(e)); refresh(d, detailBody(e), dd => bindDetail(dd, id)); };
  const e = find(id);
  d.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => sharedPaySheet(id, b.dataset.pay));
  d.querySelectorAll('[data-settle]').forEach(b => b.onclick = async () => {
    const ps = Shared.summary(find(id)).people.find(x => x.person.id === b.dataset.settle);
    if (!ps || !await ask('Quitar', `Registrar que ${ps.person.name} devolveu ${money(ps.remaining)} hoje?`, { ok: 'Quitar' })) return;
    const o = Shared.settle(ctx.state, id, ps.person.id, ctx.today);
    if (!o.ok) return notice(o.title, o.message);
    ctx.replace(o.state); toast('Pagamento registrado'); again();
  });
  d.querySelectorAll('[data-delpay]').forEach(b => b.onclick = async () => {
    const cur = find(id), pay = cur?.payments.find(p => p.id === b.dataset.delpay);
    if (!pay) return;
    const who = Shared.person(cur, pay.personId)?.name ?? 'Participante';
    if (!await ask('Excluir pagamento', `Excluir o pagamento de ${money(pay.value)} de ${who}? O valor volta a ficar pendente.`, { ok: 'Excluir', danger: true })) return;
    ctx.replace(Shared.deletePayment(ctx.state, id, pay.id)); toast('Pagamento excluído'); again();
  });
  d.querySelector('#shEdit').onclick = () => sharedEditor(id);
  d.querySelector('#shBack').onclick = () => sharedListSheet();
  d.querySelector('[data-act="sheet-delete"]').onclick = () => confirmDelete(find(id) ?? e);
  const busyBtn = (b, fn) => async () => {
    if (b.disabled) return;
    const label = b.querySelector('span').textContent;
    b.disabled = true; b.querySelector('span').textContent = 'Gerando…';
    try { await fn(); } catch (err) { console.error(err); notice('Não foi possível gerar o arquivo', 'Tente de novo em instantes.'); }
    finally { b.disabled = false; b.querySelector('span').textContent = label; }
  };
  const img = d.querySelector('#shImg'), pdf = d.querySelector('#shPdf');
  img.onclick = busyBtn(img, async () => {
    const cur = find(id);
    const blob = await sharedImageBlob(cur);
    await shareOrDownload(blob, Shared.imageName(cur), 'image/png', shareText(cur), 'Compartilhar despesa');
  });
  pdf.onclick = busyBtn(pdf, async () => {
    const cur = find(id);
    const { bytes } = renderSharedPdf(cur, { appVersion: APP_VERSION });
    await shareOrDownload(new Blob([bytes], { type: 'application/pdf' }), Shared.pdfName(cur), 'application/pdf', shareText(cur), 'Enviar comprovante');
  });
}

/** compartilha pelo "Compartilhar" do aparelho (Web Share com arquivo) ou, sem ele, baixa o arquivo */
async function shareOrDownload(blob, name, type, text, title) {
  const file = typeof File === 'function' ? new File([blob], name, { type }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text, title }); return; }
    catch (e) { if (e?.name === 'AbortError') return; /* sem permissão para compartilhar: baixa */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(type === 'application/pdf' ? 'PDF salvo na pasta de downloads' : 'Imagem salva na pasta de downloads');
}

// ------------------------------------------------------------------ registrar pagamento
export function sharedPaySheet(expenseId, personId) {
  const e = find(expenseId), ps = e && Shared.summary(e).people.find(x => x.person.id === personId);
  if (!e || !ps) return notice('Pagamento', 'A despesa ou o participante não existe mais.');
  const body = `<form id="payForm" novalidate>
    <p class="muted small">Falta ${money(ps.remaining)} de ${money(ps.owed)}</p>
    ${field('Valor pago (R$)', moneyInput('value', Money.input(ps.remaining)))}
    ${field('Data do pagamento', input('date', ctx.today, { type: 'date', required: true }), { hint: 'Pode ser parcial: o restante continua pendente.' })}
    <div class="sheetActions">${btn('Voltar', { id: 'payBack', cls: 'soft' })}${btn('Salvar pagamento', { submit: true, cls: 'primary' })}</div></form>`;
  const d = openSheet({ title: 'Registrar pagamento', subtitle: `${ps.person.name} devolvendo a ${Shared.payer(e)?.name ?? 'quem pagou'} · ${e.name}`, body });
  const f = d.querySelector('#payForm');
  d.querySelector('#payBack').onclick = () => sharedDetail(expenseId);
  f.onsubmit = ev => {
    ev.preventDefault();
    const o = Shared.addPayment(ctx.state, expenseId, personId, f.value.value, f.date.value);
    if (!o.ok) return notice(o.title, o.message);
    ctx.replace(o.state); toast('Pagamento registrado');
    sharedDetail(expenseId);
  };
}
