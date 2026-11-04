/* =========================================================================
   TotoFIEGSI - Anuncios
   ========================================================================= */
'use strict';

const $ = (id) => document.getElementById(id);

// Dias que faltam para a grande final (5 de junho de 2027).
function renderContagem() {
  const el = $('cartaz-contagem');
  if (!el) return;

  const hoje = new Date();
  const meiaNoite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const final = new Date(2027, 5, 5);
  const dias = Math.round((final - meiaNoite) / 86400000);

  if (dias < 0) return; // ja passou: o cartaz fica sem contagem
  el.textContent = dias === 0 ? 'É hoje!'
    : dias === 1 ? 'É amanhã!'
    : 'Faltam ' + dias + ' dias';
  el.hidden = false;
}

renderSessao();
renderContagem();
