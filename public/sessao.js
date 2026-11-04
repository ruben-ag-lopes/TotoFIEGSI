/* =========================================================================
   TotoFIEGSI - estado da sessao no cabecalho (partilhado pelas paginas)
   ========================================================================= */
'use strict';

// Pinta o cabecalho a partir de { autenticado, utilizador, equipa }.
function pintarSessao(s) {
  const el = document.getElementById('estado-sessao');
  const sair = document.getElementById('btn-sair');
  if (!el || !sair) return;

  el.textContent = '';
  if (s.autenticado) {
    el.append('Sessão: ');
    const f = document.createElement('strong');
    f.textContent = s.utilizador;
    el.appendChild(f);
    if (s.equipa) el.append(' (' + s.equipa + ')');
    sair.hidden = false;
  } else {
    el.textContent = 'Sem sessão iniciada';
    sair.hidden = true;
  }
}

// Vai buscar a sessao e pinta o cabecalho; o botao Sair termina-a e recarrega.
async function renderSessao() {
  let s = { autenticado: false };
  try {
    s = await fetch('/api/sessao').then((r) => r.json());
  } catch (_) { /* sem rede: fica como sem sessao */ }
  pintarSessao(s);

  const sair = document.getElementById('btn-sair');
  if (sair && !sair.dataset.ligado) {
    sair.dataset.ligado = '1';
    sair.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await fetch('/api/logout', { method: 'POST' });
      window.location.reload();
    });
  }
}
