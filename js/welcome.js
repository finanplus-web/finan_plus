// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Boas-vindas: o que o Finan+ faz, em 4 páginas (tradução de ui/screens/WelcomeScreen.kt do Finan+ Android).
// Aparece na primeira abertura, quando ainda não há lançamentos, e pode ser revista em Ajustes › Sobre ›
// Ver apresentação. Só apresenta: não pede dados nem permissões. Pular, Continuar, Começar e
// "Já tenho um backup" (abre Ajustes › Dados para restaurar). Setas do teclado e deslizar trocam de página.
import { icon } from './icons.js';
import { esc } from './ui.js';

export const PAGES = [
  { icon: 'account-balance-wallet', eyebrow: 'Bem-vindo', title: 'Seu dinheiro, sem complicação.',
    lead: 'O Finan+ mostra quanto você tem, quanto vai pagar e quanto vai sobrar no mês.',
    points: [['add', 'Registre receitas e despesas em poucos toques'], ['bar-chart', 'Veja o saldo de hoje e o previsto até o fim do mês'],
      ['calendar-month', 'Acompanhe vencimentos na lista ou no calendário'], ['tune', 'Veja cada mês isolado ou com o saldo acumulado dos meses anteriores']] },
  { icon: 'credit-card', eyebrow: 'Contas e cartões', title: 'Tudo num lugar só.',
    lead: 'Contas, dinheiro e cartões de crédito juntos, com as faturas organizadas.',
    points: [['account-balance', 'Várias contas, cada uma com seu saldo'], ['credit-card', 'Cartões com fatura, limite, parcelas e vencimento'],
      ['receipt-long', 'Leia uma fatura ou boleto em PDF para preencher o lançamento'], ['repeat', 'Salário, aluguel e assinaturas como recorrências']] },
  { icon: 'flag', eyebrow: 'Planejamento', title: 'Saiba para onde vai o dinheiro.',
    lead: 'Resumos claros e ferramentas para decidir com calma.',
    points: [['pie-chart', 'Resumo do mês por categoria, com relatório em PDF'], ['track-changes', 'Limites por categoria, com aviso antes de passar'],
      ['flag', 'Metas para guardar dinheiro com prazo'], ['group', 'Despesas compartilhadas: divida com amigos e família e veja quem já pagou'],
      ['auto-awesome', 'Assistente e simulador "E se…?", sem enviar nada para fora']] },
  { icon: 'shield', eyebrow: 'Privacidade', title: 'Seus dados ficam com você.',
    lead: 'Sem cadastro, sem anúncios e sem servidor. Código aberto (GPL-3.0).',
    points: [['shield', 'Tudo criptografado neste navegador'], ['lock', 'Bloqueio com PIN e "Ocultar valores"'],
      ['palette', 'Temas claros e escuros, com efeito vidro opcional'], ['sync', 'Backup automático criptografado numa pasta sua (no Chrome e no Edge do computador)'],
      ['download', 'Backup em arquivo, que também abre no Finan+ Android e no Linux']] },
];

/** a apresentação aparece sozinha? Só na primeira abertura, sem lançamentos (quem já usa não vê) */
export const shouldShowWelcome = (device, state, remote = false) => !remote && !device.welcomeSeen && state.txs.length === 0;

/**
 * Mostra a apresentação em [host] (um elemento vazio, de tela cheia). onDone(restore): restore = true em
 * "Já tenho um backup". Devolve uma função que fecha sem chamar onDone.
 */
export function showWelcome(host, onDone) {
  let page = 0, startX = null;
  const last = () => page === PAGES.length - 1;
  host.hidden = false;
  host.className = 'welcome';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-labelledby', 'wTitle');
  const draw = (focus) => {
    const pg = PAGES[page];
    host.innerHTML = `<div class="welcomeBox">
      <div class="welcomeTop"><b class="welcomeBrand">Finan+</b>${last() ? '' : '<button type="button" class="btn link" data-w="skip">Pular</button>'}</div>
      <div class="welcomePage" aria-live="polite">
        <span class="welcomeTile" aria-hidden="true">${icon(pg.icon, 36)}</span>
        <small class="eyebrow welcomeEyebrow">${esc(pg.eyebrow)}</small>
        <h2 id="wTitle" tabindex="-1">${esc(pg.title)}</h2>
        <p class="welcomeLead">${esc(pg.lead)}</p>
        <ul class="welcomePoints glass">${pg.points.map(([ic, t]) => `<li><span class="tile" aria-hidden="true">${icon(ic, 19)}</span><span>${esc(t)}</span></li>`).join('')}</ul>
        ${last() ? '<p class="muted small center">Desenvolvido de forma independente por Juscelino Be.</p>' : ''}
      </div>
      <div class="welcomeDots" aria-hidden="true">${PAGES.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</div>
      <div class="welcomeActs">${last()
        ? '<button type="button" class="btn primary wide" data-w="done">Começar</button><button type="button" class="btn link wide" data-w="restore">Já tenho um backup</button>'
        : `<button type="button" class="btn primary wide" data-w="next" aria-label="Continuar, página ${page + 1} de ${PAGES.length}">Continuar</button>`}
        ${page > 0 ? '<button type="button" class="btn link wide" data-w="prev">Voltar</button>' : ''}</div></div>`;
    if (focus) (host.querySelector(`[data-w="${focus}"]`) || host.querySelector('#wTitle'))?.focus();
  };
  const go = (to, focus) => { if (to < 0 || to >= PAGES.length || to === page) return; page = to; draw(focus ?? (last() ? 'done' : 'next')); };
  const close = (restore) => { cleanup(); onDone(restore); };
  host.onclick = e => {
    const a = e.target.closest('[data-w]')?.dataset.w;
    if (a === 'next') go(page + 1); else if (a === 'prev') go(page - 1, page - 1 === 0 ? 'next' : 'prev');
    else if (a === 'skip' || a === 'done') close(false); else if (a === 'restore') close(true);
  };
  host.onkeydown = e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(page + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(page - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); close(false); }
    else if (e.key === 'Tab') { // o foco não sai da apresentação
      const f = [...host.querySelectorAll('button')]; if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  host.ontouchstart = e => { startX = e.touches.length === 1 ? e.touches[0].clientX : null; };
  host.ontouchend = e => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX; startX = null;
    if (Math.abs(dx) > 60) go(page + (dx < 0 ? 1 : -1));
  };
  function cleanup() { host.hidden = true; host.innerHTML = ''; host.onclick = host.onkeydown = host.ontouchstart = host.ontouchend = null; }
  draw('next');
  return cleanup;
}
