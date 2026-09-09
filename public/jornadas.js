/* =========================================================================
   TotoFIEGSI - jornadas, jogos, resultados e classificacao
   ========================================================================= */
'use strict';

const $ = (id) => document.getElementById(id);

const estado = {
  jornadas: [],
  selecionada: 0
};

/* ---------- utilitarios ---------- */

function euros(valor) {
  return '€ ' + Number(valor || 0).toFixed(2).replace('.', ',');
}

function dataCurta(iso) {
  const [, mes, dia] = iso.split('-');
  return dia + '/' + mes;
}

const rotulo = { '1': '1', 'x': 'X', '2': '2' };

/* ---------- render ---------- */

function renderAbas() {
  const nav = $('abas-jornadas');
  nav.textContent = '';

  estado.jornadas.forEach((j, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'aba-jornada' + (i === estado.selecionada ? ' ativa' : '');
    b.textContent = j.matchDay;
    if (j.ativa) {
      const p = document.createElement('span');
      p.className = 'ponto-ativa';
      p.title = 'Jornada a decorrer';
      b.appendChild(p);
    }
    b.addEventListener('click', () => {
      estado.selecionada = i;
      renderAbas();
      renderJornada();
    });
    nav.appendChild(b);
  });
}

function renderJornada() {
  const j = estado.jornadas[estado.selecionada];
  const alvo = $('conteudo-jornada');
  alvo.textContent = '';
  if (!j) return;

  alvo.appendChild(cartaoResumo(j));
  alvo.appendChild(tabelaJogos(j));
  alvo.appendChild(blocoClassificacao(j));
}

function cartaoResumo(j) {
  const sec = document.createElement('section');
  sec.className = 'jor-resumo';

  const esq = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = 'Match Day ' + j.matchDay;
  const sub = document.createElement('p');
  sub.className = 'jor-sub';
  sub.textContent = j.competicao + ' · ' + j.epoca + ' · ' + j.periodo;
  esq.append(h2, sub);

  const dir = document.createElement('div');
  dir.className = 'jor-etiquetas';

  const estadoTxt = j.ativa
    ? (j.resultadosConhecidos === j.totalJogos ? 'A aguardar fecho' : 'A decorrer')
    : 'Terminada';
  dir.appendChild(etiqueta(j.ativa ? 'ativa' : 'terminada', estadoTxt));
  dir.appendChild(etiqueta('neutra',
    j.resultadosConhecidos + '/' + j.totalJogos + ' resultados'));

  if (j.ativa && typeof j.totalApostas === 'number') {
    dir.appendChild(etiqueta('neutra', j.totalApostas +
      (j.totalApostas === 1 ? ' aposta' : ' apostas')));
    dir.appendChild(etiqueta(j.premioAtivo ? 'ok' : 'aviso',
      'Prize pool ' + euros(j.prizePool)));
  }

  sec.append(esq, dir);
  return sec;
}

function etiqueta(tipo, texto) {
  const s = document.createElement('span');
  s.className = 'etiqueta etiqueta-' + tipo;
  s.textContent = texto;
  return s;
}

function tabelaJogos(j) {
  const wrap = document.createElement('section');
  wrap.className = 'tabela-wrap';

  const t = document.createElement('table');
  t.className = 'boletim tabela-jogos';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  ['#', 'Jogo', 'Data', 'Resultado'].forEach((txt, i) => {
    const th = document.createElement('th');
    th.textContent = txt;
    if (i === 1) th.className = 'th-jogo';
    if (i === 3) th.className = 'th-resultado';
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  t.appendChild(thead);

  const tbody = document.createElement('tbody');
  let dataAnterior = null;

  j.jogos.forEach((jogo) => {
    const tr = document.createElement('tr');
    if (dataAnterior && dataAnterior !== jogo.data) tr.classList.add('inicio-bloco');
    dataAnterior = jogo.data;

    const tdN = document.createElement('td');
    tdN.className = 'td-num';
    tdN.textContent = String(jogo.n);

    const tdJ = document.createElement('td');
    tdJ.className = 'td-jogo';
    tdJ.append(jogo.casa);
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '–';
    tdJ.appendChild(sep);
    tdJ.append(jogo.fora);

    const tdD = document.createElement('td');
    tdD.className = 'td-data';
    tdD.textContent = jogo.dia + ' ' + dataCurta(jogo.data) + ' · ' + jogo.hora;

    const tdR = document.createElement('td');
    tdR.className = 'td-resultado';
    tdR.appendChild(trioResultado(jogo.resultado));

    tr.append(tdN, tdJ, tdD, tdR);
    tbody.appendChild(tr);
  });

  t.appendChild(tbody);
  wrap.appendChild(t);
  return wrap;
}

// Mostra 1 X 2 com o resultado oficial destacado (ou tudo apagado se ainda nao ha).
function trioResultado(resultado) {
  const tri = document.createElement('div');
  tri.className = 'tri tri-resultado';
  ['1', 'x', '2'].forEach((s) => {
    const b = document.createElement('span');
    b.className = 'pick' + (resultado === s ? ' vencedor' : '');
    b.textContent = rotulo[s];
    tri.appendChild(b);
  });
  if (!resultado) tri.classList.add('por-jogar');
  return tri;
}

function blocoClassificacao(j) {
  const sec = document.createElement('section');
  sec.className = 'jor-classificacao';

  const h3 = document.createElement('h3');
  h3.textContent = 'Classificação';
  sec.appendChild(h3);

  const lista = j.classificacao || [];

  if (!lista.length) {
    const p = document.createElement('p');
    p.className = 'ma-vazio';
    p.textContent = j.ativa
      ? 'Ainda não há apostas registadas nesta jornada.'
      : 'Não ficou classificação arquivada para esta jornada.';
    sec.appendChild(p);
    return sec;
  }

  if (!j.resultadosConhecidos) {
    const p = document.createElement('p');
    p.className = 'nota-resultados';
    p.textContent = 'Os resultados ainda não foram lançados, por isso os acertos ' +
      'estão todos a zero. Aparecem aqui assim que forem preenchidos.';
    sec.appendChild(p);
  }

  // quem lidera (so faz sentido com resultados lancados)
  const maximo = lista.length ? lista[0].acertos : 0;

  const t = document.createElement('table');
  t.className = 'tabela-classificacao';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  ['#', 'Jogador', 'Equipa', 'Chave', 'Acertos'].forEach((txt) => {
    const th = document.createElement('th');
    th.textContent = txt;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  t.appendChild(thead);

  const tbody = document.createElement('tbody');
  lista.forEach((c, i) => {
    const tr = document.createElement('tr');
    const lidera = j.resultadosConhecidos > 0 && c.acertos === maximo && maximo > 0;
    if (lidera) tr.className = 'lidera';

    const tdPos = document.createElement('td');
    tdPos.className = 'td-num';
    tdPos.textContent = String(i + 1);

    const tdU = document.createElement('td');
    tdU.className = 'td-jogador';
    tdU.textContent = c.utilizador;

    const tdE = document.createElement('td');
    tdE.className = 'td-equipa';
    tdE.textContent = c.equipa || '—';

    const tdC = document.createElement('td');
    tdC.className = 'td-chave';
    tdC.appendChild(chaveEmFichas(c.chave, j.jogos));

    const tdA = document.createElement('td');
    tdA.className = 'td-acertos';
    tdA.textContent = c.acertos + '/' + j.totalJogos;

    tr.append(tdPos, tdU, tdE, tdC, tdA);
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);

  const wrap = document.createElement('div');
  wrap.className = 'tabela-wrap tabela-wrap-simples';
  wrap.appendChild(t);
  sec.appendChild(wrap);
  return sec;
}

// A chave do jogador, com cada prognostico marcado como certo ou errado.
function chaveEmFichas(chave, jogos) {
  const cont = document.createElement('span');
  cont.className = 'chave-fichas';

  String(chave).split(';').forEach((p, i) => {
    const jogo = jogos[i];
    const ficha = document.createElement('span');
    ficha.className = 'ficha';
    ficha.textContent = rotulo[p] || p;

    if (jogo && jogo.resultado) {
      ficha.classList.add(jogo.resultado === p ? 'certa' : 'errada');
      ficha.title = jogo.casa + ' – ' + jogo.fora +
        ': apostou ' + (rotulo[p] || p) + ', saiu ' + rotulo[jogo.resultado];
    } else if (jogo) {
      ficha.title = jogo.casa + ' – ' + jogo.fora + ': por jogar';
    }
    cont.appendChild(ficha);
  });
  return cont;
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
  await renderSessao();
  try {
    const dados = await fetch('/api/jornadas').then((r) => r.json());
    estado.jornadas = dados.jornadas || [];
    // abre na jornada ativa
    const iAtiva = estado.jornadas.findIndex((j) => j.ativa);
    estado.selecionada = iAtiva >= 0 ? iAtiva : 0;
    renderAbas();
    renderJornada();
  } catch (err) {
    $('conteudo-jornada').textContent = 'Não foi possível carregar as jornadas: ' + err.message;
  }
})();
