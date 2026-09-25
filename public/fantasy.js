/* =========================================================================
   TotoFIEGSI - Fantasy: classificacao e multas, lidas da Google Sheet
   ========================================================================= */
'use strict';

const $ = (id) => document.getElementById(id);

const estado = {
  dados: null,
  aba: 'classificacao'
};

/* ---------- utilitarios ---------- */

// A folha usa virgula decimal; mostramos na mesma forma.
function numeroPT(n) {
  if (n === null || n === undefined) return '—';
  return String(n).replace('.', ',');
}

function euros(n) {
  return numeroPT(Number(n || 0).toFixed(2).replace('.', ',')).replace(',,', ',') + ' €';
}

/** Só as jornadas que já têm algum valor lançado. */
function jornadasComDados(jornadas, equipas) {
  return jornadas.filter((j) =>
    equipas.some((e) => e.porJornada[j] !== null && e.porJornada[j] !== undefined)
  );
}

/* ---------- criterios de desempate ---------- */

function caixaDesempate() {
  const div = document.createElement('div');
  div.className = 'nota-resultados nota-desempate';

  const t = document.createElement('strong');
  t.textContent = 'Critérios de desempate';
  div.appendChild(t);

  const ol = document.createElement('ol');
  [
    'Capitão com menos pontos',
    'Jogadores com menos pontos'
  ].forEach((txt) => {
    const li = document.createElement('li');
    li.textContent = txt;
    ol.appendChild(li);
  });
  div.appendChild(ol);

  const p = document.createElement('p');
  p.className = 'desempate-nota';
  p.textContent = 'Nestes casos, mais pontos vence o desempate.';
  div.appendChild(p);

  return div;
}

/* ---------- classificacao ---------- */

function renderClassificacao() {
  const d = estado.dados;
  const alvo = $('conteudo-fantasy');
  alvo.textContent = '';

  const lista = d.classificacao || [];
  if (!lista.length) {
    const p = document.createElement('p');
    p.className = 'ma-vazio';
    p.textContent = 'A folha não tem equipas.';
    alvo.appendChild(p);
    return;
  }

  const colunas = jornadasComDados(d.jornadasPontos, lista);

  const sec = document.createElement('section');
  sec.className = 'jor-classificacao';

  const topo = document.createElement('div');
  topo.className = 'ma-topo';
  const h3 = document.createElement('h3');
  h3.textContent = 'Classificação geral';
  const cont = document.createElement('span');
  cont.className = 'ma-contador';
  cont.textContent = lista.length + ' equipas';
  topo.append(h3, cont);
  sec.appendChild(topo);

  const t = document.createElement('table');
  t.className = 'tabela-classificacao tabela-fantasy';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  ['#', 'Equipa', 'Craque', ...colunas, 'Total'].forEach((txt, i) => {
    const th = document.createElement('th');
    th.textContent = txt;
    if (i >= 3) th.className = 'th-numero';
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  t.appendChild(thead);

  const maximo = lista[0].total;
  const tbody = document.createElement('tbody');

  lista.forEach((e, i) => {
    const tr = document.createElement('tr');
    if (e.total === maximo && maximo > 0) tr.className = 'lidera';

    const tdPos = document.createElement('td');
    tdPos.className = 'td-num';
    tdPos.textContent = String(i + 1);

    const tdEq = document.createElement('td');
    tdEq.className = 'td-jogador';
    tdEq.textContent = e.equipa;

    const tdCr = document.createElement('td');
    tdCr.className = 'td-equipa';
    tdCr.textContent = e.craque || '—';

    tr.append(tdPos, tdEq, tdCr);

    colunas.forEach((j) => {
      const td = document.createElement('td');
      td.className = 'td-numero';
      td.dataset.rotulo = j; // no telemovel nao ha cabecalho: a celula diz a jornada
      td.textContent = numeroPT(e.porJornada[j]);
      tr.appendChild(td);
    });

    const tdTotal = document.createElement('td');
    tdTotal.className = 'td-acertos';
    tdTotal.textContent = numeroPT(e.total);
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  });

  t.appendChild(tbody);

  const wrap = document.createElement('div');
  wrap.className = 'tabela-wrap tabela-wrap-simples';
  wrap.appendChild(t);
  sec.appendChild(wrap);
  sec.appendChild(caixaDesempate());

  alvo.appendChild(sec);
}

/* ---------- multas ---------- */

function renderMultas() {
  const d = estado.dados;
  const alvo = $('conteudo-fantasy');
  alvo.textContent = '';

  if (!d.multas) {
    const p = document.createElement('p');
    p.className = 'ma-vazio';
    p.textContent = 'A folha não tem tabela de multas.';
    alvo.appendChild(p);
    return;
  }

  const equipas = d.multas.equipas;
  const jornadas = jornadasComDados(d.multas.jornadas, equipas);

  // uma tabela por jornada, só com quem foi multado nessa jornada
  const comMultas = jornadas.filter((j) => equipas.some((e) => (e.porJornada[j] || 0) > 0));

  if (!comMultas.length) {
    const p = document.createElement('p');
    p.className = 'ma-vazio';
    p.textContent = 'Ainda não há multas lançadas.';
    alvo.appendChild(p);
    return;
  }

  comMultas.forEach((j) => {
    const multados = equipas
      .filter((e) => (e.porJornada[j] || 0) > 0)
      .sort((a, b) => b.porJornada[j] - a.porJornada[j]);

    const sec = document.createElement('section');
    sec.className = 'jor-classificacao';

    const topo = document.createElement('div');
    topo.className = 'ma-topo';
    const h3 = document.createElement('h3');
    h3.textContent = j;
    topo.appendChild(h3);
    sec.appendChild(topo);

    const t = document.createElement('table');
    t.className = 'tabela-classificacao tabela-multas';

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    ['Equipa', 'Craque', 'Multa', 'Estado'].forEach((txt, i) => {
      const th = document.createElement('th');
      th.textContent = txt;
      if (i >= 2) th.className = 'th-numero';
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    t.appendChild(thead);

    const tbody = document.createElement('tbody');
    multados.forEach((e) => {
      const tr = document.createElement('tr');

      const tdEq = document.createElement('td');
      tdEq.className = 'td-jogador';
      tdEq.textContent = e.equipa;

      const tdCr = document.createElement('td');
      tdCr.className = 'td-equipa';
      tdCr.textContent = e.craque || '—';

      const tdVal = document.createElement('td');
      tdVal.className = 'td-numero';
      tdVal.textContent = euros(e.porJornada[j]);

      const tdEstado = document.createElement('td');
      tdEstado.className = 'td-numero';
      const emDivida = (e.emFalta || 0) > 0;
      const badge = document.createElement('span');
      badge.className = 'etiqueta ' + (emDivida ? 'etiqueta-aviso' : 'etiqueta-ok');
      badge.textContent = emDivida ? 'Em falta' : 'Pago';
      if (emDivida) {
        badge.title = 'Deve ' + euros(e.emFalta) + ' no total de todas as jornadas';
      }
      tdEstado.appendChild(badge);

      tr.append(tdEq, tdCr, tdVal, tdEstado);
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);

    const wrap = document.createElement('div');
    wrap.className = 'tabela-wrap tabela-wrap-simples';
    wrap.appendChild(t);
    sec.appendChild(wrap);
    alvo.appendChild(sec);
  });

  // O estado de pagamento na folha é acumulado, não por jornada — dizê-lo,
  // para ninguém ler a coluna como "esta multa em concreto está paga".
  const nota = document.createElement('p');
  nota.className = 'nota-resultados';
  nota.textContent = 'O estado de pagamento vem das colunas "Pago" e "Em Falta" da folha, ' +
    'que são totais de todas as jornadas — não são por jornada. "Em falta" quer dizer ' +
    'que a equipa tem valores por liquidar no conjunto da época.';
  alvo.appendChild(nota);

  alvo.appendChild(caixaDesempate());
}

/* ---------- abas ---------- */

function renderAba() {
  if (estado.aba === 'multas') renderMultas();
  else renderClassificacao();

  document.querySelectorAll('#abas-fantasy .aba-jornada').forEach((b) => {
    b.classList.toggle('ativa', b.dataset.aba === estado.aba);
  });
}

/* ---------- sessao ---------- */

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

/* ---------- arranque ---------- */

(async () => {
  renderSessao();

  document.querySelectorAll('#abas-fantasy .aba-jornada').forEach((b) => {
    b.addEventListener('click', () => {
      estado.aba = b.dataset.aba;
      renderAba();
    });
  });

  try {
    const r = await fetch('/api/fantasy');
    const dados = await r.json();

    if (!r.ok) throw new Error(dados.erro || 'Não foi possível ler a folha.');

    estado.dados = dados;
    renderAba();
  } catch (err) {
    $('conteudo-fantasy').textContent = '';
    const p = document.createElement('p');
    p.className = 'nota-resultados';
    p.textContent = 'Não foi possível ler a Google Sheet: ' + err.message;
    $('conteudo-fantasy').appendChild(p);
  }
})();
