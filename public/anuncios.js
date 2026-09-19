/* =========================================================================
   TotoFIEGSI - Anuncios (placeholder por agora)
   ========================================================================= */
'use strict';

const $ = (id) => document.getElementById(id);

async function renderSessao() {
  const el = $('estado-sessao');
  const sair = $('btn-sair');
  try {
    const s = await fetch('/api/sessao').then((r) => r.json());
    if (s.autenticado) {
      el.textContent = '';
      el.append('Sessão: ');
      const f = document.createElement('strong');
      f.textContent = s.utilizador;
      el.appendChild(f);
      sair.hidden = false;
      sair.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await fetch('/api/logout', { method: 'POST' });
        window.location.reload();
      });
    } else {
      el.textContent = 'Sem sessão iniciada';
      sair.hidden = true;
    }
  } catch (_) { /* ignora */ }
}

renderSessao();
