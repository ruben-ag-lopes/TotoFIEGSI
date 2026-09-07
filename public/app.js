/* =========================================================================
   TotoFIEGSI - boletim de apostas (frontend)
   ========================================================================= */
'use strict';

const CHAVE_GRELHA = 'toto_boletim';
const CHAVE_PENDENTE = 'toto_pendente';
const SIMBOLOS = ['1', 'x', '2'];

const estado = {
  jornada: null,
  sessao: { autenticado: false },
  grelha: [],  // grelha[coluna][jogo] = '1' | 'x' | '2' | null
  minhas: null // { apostas, registadas, limite, restantes, valorTotal }
};

const $ = (id) => document.getElementById(id);

/* ---------- utilitarios ---------- */

function euros(valor) {
  return '€ ' + valor.toFixed(2).replace('.', ',');
}

function dataCurta(iso) {
  const [, mes, dia] = iso.split('-');
  return dia + '/' + mes;
}

function toast(titulo, texto, tipo) {
  const div = document.createElement('div');
  div.className = 'toast' + (tipo ? ' ' + tipo : '');
  const t = document.createElement('strong');
  t.textContent = titulo;
  div.appendChild(t);
  if (texto) {
    const s = document.createElement('span');
    s.textContent = texto;
    div.appendChild(s);
  }
  $('toasts').appendChild(div);
  setTimeout(() => div.remove(), 6500);
}

/* ---------- grelha ---------- */

function grelhaVazia() {
  return Array.from({ length: estado.jornada.colunas }, () =>
    new Array(estado.jornada.totalJogos).fill(null)
  );
}

function guardarGrelha() {
  try {
    localStorage.setItem(CHAVE_GRELHA, JSON.stringify(estado.grelha));
  } catch (_) { /* modo privado: ignora */ }
}

function restaurarGrelha() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CHAVE_GRELHA) || 'null');
    if (
      Array.isArray(guardada) &&
      guardada.length === estado.jornada.colunas &&
      guardada.every((c) => Array.isArray(c) && c.length === estado.jornada.totalJogos)
    ) {
      estado.grelha = guardada;
      return;
    }
  } catch (_) { /* ignora */ }
  estado.grelha = grelhaVazia();
}

const colunaCompleta = (col) => col.every((p) => p !== null);
const colunaIniciada = (col) => col.some((p) => p !== null);

function chavesCompletas() {
  return estado.grelha.filter(colunaCompleta).map((col) => col.join(';'));
}

/* ---------- render ---------- */

function renderCabecalho() {
  const j = estado.jornada;
  document.title = 'TotoFIEGSI ' + j.matchDay + ' - Boletim de Apostas';
  $('cab-competicao').textContent = j.competicao + ' · ' + j.epoca;
  $('cab-md').textContent = 'MATCH DAY ' + j.matchDay;
  $('cab-epoca').textContent = j.epoca;
  $('cab-limite').textContent = 'Em jogo até ' + j.limiteTexto;
  $('info-md').textContent = j.matchDay;
  $('info-epoca').textContent = 'Época ' + j.epoca;
  $('info-datas').textContent = j.periodo;
  $('info-limite').textContent = j.limiteTexto;
  $('info-valor').textContent = j.valorAposta.toFixed(2).replace('.', ',') + ' €';
  $('aviso-max').textContent = String(j.maxApostasPorUtilizador);
}

function renderTabela() {
  const j = estado.jornada;

  // cabecalho: colunas de aposta
  const trh = document.createElement('tr');
  const th1 = document.createElement('th');
  th1.className = 'th-jogo';
  th1.colSpan = 3;
  th1.textContent = 'Jogos da jornada ' + j.matchDay;
  trh.appendChild(th1);

  for (let c = 0; c < j.colunas; c++) {
    const th = document.createElement('th');
    th.className = 'th-coluna';
    th.dataset.coluna = String(c);
    th.innerHTML = '<span class="col-num">Aposta ' + (c + 1) +
      '</span><span class="col-estado">&mdash;</span>';
    trh.appendChild(th);
  }
  const head = $('boletim-head');
  head.textContent = '';
  head.appendChild(trh);

  // linhas: um jogo por linha
  const body = $('boletim-body');
  body.textContent = '';
  let dataAnterior = null;

  j.jogos.forEach((jogo, iJogo) => {
    const tr = document.createElement('tr');
    if (dataAnterior && dataAnterior !== jogo.data) tr.classList.add('inicio-bloco');
    dataAnterior = jogo.data;

    const tdNum = document.createElement('td');
    tdNum.className = 'td-num';
    tdNum.textContent = String(jogo.n);
    tr.appendChild(tdNum);

    const tdJogo = document.createElement('td');
    tdJogo.className = 'td-jogo';
    tdJogo.innerHTML = '';
    tdJogo.append(jogo.casa);
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '–';
    tdJogo.appendChild(sep);
    tdJogo.append(jogo.fora);
    tr.appendChild(tdJogo);

    const tdData = document.createElement('td');
    tdData.className = 'td-data';
    tdData.textContent = jogo.dia + ' ' + dataCurta(jogo.data) + ' · ' + jogo.hora;
    tr.appendChild(tdData);

    for (let c = 0; c < j.colunas; c++) {
      const td = document.createElement('td');
      td.className = 'td-picks';
      const tri = document.createElement('div');
      tri.className = 'tri';
      tri.dataset.coluna = String(c);
      tri.dataset.jogo = String(iJogo);

      SIMBOLOS.forEach((simbolo) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pick';
        b.dataset.coluna = String(c);
        b.dataset.jogo = String(iJogo);
        b.dataset.simbolo = simbolo;
        b.textContent = simbolo.toUpperCase();
        b.setAttribute('aria-pressed', 'false');
        b.title = 'Aposta ' + (c + 1) + ' · ' + jogo.casa + '-' + jogo.fora +
          ' · ' + simbolo.toUpperCase();
        tri.appendChild(b);
      });

      td.appendChild(tri);
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
}

function pintarGrelha() {
  document.querySelectorAll('.pick').forEach((b) => {
    const escolhido = estado.grelha[+b.dataset.coluna][+b.dataset.jogo] === b.dataset.simbolo;
    b.classList.toggle('escolhido', escolhido);
    b.setAttribute('aria-pressed', escolhido ? 'true' : 'false');
  });

  document.querySelectorAll('.tri').forEach((tri) => {
    const col = estado.grelha[+tri.dataset.coluna];
    tri.classList.toggle('incompleta', colunaIniciada(col) && !colunaCompleta(col));
  });

  document.querySelectorAll('.th-coluna').forEach((th) => {
    const col = estado.grelha[+th.dataset.coluna];
    const completa = colunaCompleta(col);
    const preenchidos = col.filter((p) => p !== null).length;
    th.classList.toggle('completa', completa);
    th.querySelector('.col-estado').textContent = completa
      ? euros(estado.jornada.valorAposta)
      : (preenchidos ? preenchidos + '/' + col.length : '—');
  });

  atualizarTotais();
}

function atualizarTotais() {
  const completas = chavesCompletas().length;
  const total = completas * estado.jornada.valorAposta;
  $('valor-total').textContent = euros(total);
  $('resumo-total').textContent = euros(total);
  $('resumo-apostas').textContent = completas === 1
    ? '1 aposta preenchida'
    : completas + ' apostas preenchidas';

  avisarLimite(completas);
}

// Aviso (e bloqueio) do limite de apostas por utilizador.
function avisarLimite(completas) {
  const aviso = $('aviso-limite');
  const botao = $('btn-apostar');
  const m = estado.minhas;

  if (estado.jornada.fechada) return; // ja tratado no arranque

  if (!estado.sessao.autenticado || !m) {
    aviso.hidden = true;
    botao.disabled = false;
    return;
  }

  if (m.restantes <= 0) {
    aviso.hidden = false;
    aviso.textContent = 'Atingiste o limite de ' + m.limite +
      ' apostas nesta jornada. Não é possível registar mais.';
    botao.disabled = true;
  } else if (completas > m.restantes) {
    aviso.hidden = false;
    aviso.textContent = 'Tens ' + m.registadas + ' de ' + m.limite +
      ' apostas registadas: só podes submeter mais ' + m.restantes +
      (m.restantes === 1 ? ' aposta' : ' apostas') + ' e preencheste ' + completas +
      ' colunas. Apaga ' + (completas - m.restantes) + ' antes de apostar.';
    botao.disabled = true;
  } else {
    aviso.hidden = true;
    botao.disabled = false;
  }
}

/* ---------- as minhas apostas ---------- */

async function carregarMinhasApostas() {
  if (!estado.sessao.autenticado) {
    estado.minhas = null;
    renderMinhasApostas();
    return;
  }
  try {
    const r = await fetch('/api/minhas-apostas');
    if (!r.ok) throw new Error('sem sessão');
    estado.minhas = await r.json();
  } catch (_) {
    estado.minhas = null;
  }
  renderMinhasApostas();
  atualizarTotais();
}

function renderMinhasApostas() {
  const contador = $('ma-contador');
  const conteudo = $('ma-conteudo');
  contador.textContent = '';
  contador.className = 'ma-contador';
  conteudo.textContent = '';

  if (!estado.sessao.autenticado || !estado.minhas) {
    const p = document.createElement('p');
    p.className = 'ma-vazio';
    p.textContent = 'Inicia sessão para veres as apostas que já registaste nesta jornada.';
    conteudo.appendChild(p);
    return;
  }

  const m = estado.minhas;

  // contador + medidor de apostas usadas
  contador.append(document.createTextNode(''));
  const forte = document.createElement('strong');
  forte.textContent = m.registadas + ' de ' + m.limite;
  contador.append(forte, ' apostas usadas · ' +
    (m.restantes > 0 ? 'restam ' + m.restantes : 'limite atingido') +
    ' · total ' + euros(m.valorTotal));
  if (m.restantes === 0) contador.classList.add('esgotado');

  const medidor = document.createElement('span');
  medidor.className = 'ma-medidor';
  for (let i = 0; i < m.limite; i++) {
    const slot = document.createElement('span');
    slot.className = 'ma-slot' + (i < m.registadas ? ' usado' : '');
    medidor.appendChild(slot);
  }
  contador.appendChild(medidor);

  if (!m.apostas.length) {
    const p = document.createElement('p');
    p.className = 'ma-vazio';
    p.textContent = 'Ainda não registaste nenhuma aposta nesta jornada.';
    conteudo.appendChild(p);
    return;
  }

  const tabela = document.createElement('div');
  tabela.className = 'ma-tabela';

  // legenda com o numero de cada jogo
  const legenda = document.createElement('div');
  legenda.className = 'ma-linha ma-legenda';
  const etqLeg = document.createElement('span');
  etqLeg.className = 'ma-etq';
  etqLeg.textContent = 'Jogo';
  legenda.appendChild(etqLeg);
  estado.jornada.jogos.forEach((jogo) => {
    const n = document.createElement('span');
    n.className = 'ma-num';
    n.textContent = String(jogo.n);
    n.title = jogo.casa + ' – ' + jogo.fora;
    legenda.appendChild(n);
  });
  tabela.appendChild(legenda);

  m.apostas.forEach((aposta, i) => {
    const linha = document.createElement('div');
    linha.className = 'ma-linha';

    const etq = document.createElement('span');
    etq.className = 'ma-etq';
    etq.textContent = 'Aposta #' + (i + 1);
    etq.title = 'Registo nº ' + aposta.id;
    linha.appendChild(etq);

    aposta.prognosticos.forEach((p, iJogo) => {
      const jogo = estado.jornada.jogos[iJogo];
      const chip = document.createElement('span');
      chip.className = 'ma-chip';
      chip.textContent = p.toUpperCase();
      if (jogo) chip.title = jogo.casa + ' – ' + jogo.fora + ': ' + p.toUpperCase();
      linha.appendChild(chip);
    });

    const valor = document.createElement('span');
    valor.className = 'ma-valor';
    valor.textContent = euros(estado.jornada.valorAposta);
    linha.appendChild(valor);

    tabela.appendChild(linha);
  });

  conteudo.appendChild(tabela);
}

function renderSessao() {
  const el = $('estado-sessao');
  const sair = $('btn-sair');
  if (estado.sessao.autenticado) {
    el.innerHTML = '';
    el.append('Sessão: ');
    const s = document.createElement('strong');
    s.textContent = estado.sessao.utilizador;
    el.appendChild(s);
    if (estado.sessao.equipa) el.append(' (' + estado.sessao.equipa + ')');
    sair.hidden = false;
  } else {
    el.textContent = 'Sem sessão iniciada';
    sair.hidden = true;
  }
}

/* ---------- contagem decrescente ate ao limite ---------- */

function atualizarContagem() {
  const alvo = new Date(estado.jornada.limiteISO).getTime();
  const falta = alvo - Date.now();
  const el = $('info-contagem');

  if (falta <= 0) {
    el.textContent = 'Apostas encerradas';
    el.classList.add('urgente');
    $('btn-apostar').disabled = true;
    return;
  }

  const dias = Math.floor(falta / 86400000);
  const horas = Math.floor((falta % 86400000) / 3600000);
  const minutos = Math.floor((falta % 3600000) / 60000);
  const segundos = Math.floor((falta % 60000) / 1000);

  el.textContent = 'Faltam ' + (dias ? dias + 'd ' : '') + horas + 'h ' +
    String(minutos).padStart(2, '0') + 'm ' + String(segundos).padStart(2, '0') + 's';
  el.classList.toggle('urgente', falta < 6 * 3600000);
}

/* ---------- accoes ---------- */

function aoClicarPick(ev) {
  const b = ev.target.closest('.pick');
  if (!b) return;
  const col = +b.dataset.coluna;
  const jogo = +b.dataset.jogo;
  const simbolo = b.dataset.simbolo;

  // um unico prognostico por jogo em cada coluna (clicar de novo desmarca)
  estado.grelha[col][jogo] = estado.grelha[col][jogo] === simbolo ? null : simbolo;

  guardarGrelha();
  pintarGrelha();
}

function limpar() {
  estado.grelha = grelhaVazia();
  guardarGrelha();
  pintarGrelha();
  toast('Boletim limpo', 'Todos os prognósticos foram removidos.', 'aviso');
}

async function submeterChaves(chaves) {
  const resposta = await fetch('/api/apostas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chaves })
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível registar a aposta.');
  return dados;
}

async function apostar() {
  const j = estado.jornada;

  const incompletas = estado.grelha
    .map((col, i) => ({ col, i }))
    .filter(({ col }) => colunaIniciada(col) && !colunaCompleta(col));

  const chaves = chavesCompletas();

  if (!chaves.length) {
    toast('Boletim incompleto',
      'Preenche os ' + j.totalJogos + ' jogos de pelo menos uma coluna para validar a aposta.', 'erro');
    return;
  }
  if (incompletas.length) {
    const nums = incompletas.map(({ i }) => i + 1).join(', ');
    toast('Colunas por terminar',
      'A(s) coluna(s) ' + nums + ' não estão completas e não serão submetidas.', 'aviso');
  }

  // limite de apostas por utilizador (o servidor volta a validar)
  const m = estado.minhas;
  if (estado.sessao.autenticado && m) {
    if (m.restantes <= 0) {
      toast('Limite atingido',
        'Já tens ' + m.registadas + ' de ' + m.limite + ' apostas registadas nesta jornada.', 'erro');
      return;
    }
    if (chaves.length > m.restantes) {
      toast('Demasiadas apostas',
        'Só podes registar mais ' + m.restantes + (m.restantes === 1 ? ' aposta' : ' apostas') +
        ' (limite de ' + m.limite + ' por utilizador) e preencheste ' + chaves.length + ' colunas.', 'erro');
      return;
    }
  }

  // guarda a aposta pendente: e usada apos o login
  sessionStorage.setItem(CHAVE_PENDENTE, JSON.stringify({ chaves }));

  if (!estado.sessao.autenticado) {
    window.location.href = 'login.html';
    return;
  }

  sessionStorage.removeItem(CHAVE_PENDENTE);
  await concluirAposta(chaves);
}

/* ---------- pagamento simulado (MB WAY) ---------- */

// Mostra a janela de pagamento e resolve com 'pago' | 'sair' | 'tempo'.
async function pedirPagamento(chaves) {
  // Os contactos so vem do servidor com sessao iniciada. Se a pagina foi carregada
  // antes do login, recarrega os dados da jornada para os obter.
  if (!estado.jornada.pagamento.contactos.length) {
    try {
      estado.jornada = await fetch('/api/jornada').then((r) => r.json());
    } catch (_) { /* segue com o que ha */ }
  }

  return new Promise((resolve) => {
    const cfg = estado.jornada.pagamento;
    const valorAposta = estado.jornada.valorAposta;
    const total = chaves.length * valorAposta;
    const segundosTotais = cfg.minutos * 60;

    const fundo = $('modal-pagamento');
    const tempoEl = $('pag-tempo');
    const barraEl = $('pag-barra');

    $('pag-metodo').textContent = cfg.metodo;
    $('pag-metodo2').textContent = cfg.metodo;
    $('pag-montante').textContent = euros(total);
    $('pag-detalhe').textContent = chaves.length +
      (chaves.length === 1 ? ' aposta × ' : ' apostas × ') +
      valorAposta.toFixed(2).replace('.', ',') + ' €';

    // contactos para onde enviar o MB WAY
    const lista = $('pag-contactos');
    lista.textContent = '';
    cfg.contactos.forEach((c) => {
      const li = document.createElement('li');

      const nome = document.createElement('span');
      nome.className = 'pag-nome';
      nome.textContent = c.nome;

      const tel = document.createElement('span');
      tel.className = 'pag-tel';
      tel.textContent = c.telemovel;

      const copiar = document.createElement('button');
      copiar.type = 'button';
      copiar.className = 'pag-copiar';
      copiar.textContent = 'Copiar';
      copiar.onclick = async () => {
        try {
          await navigator.clipboard.writeText(c.telemovel.replace(/\s/g, ''));
          copiar.textContent = 'Copiado';
          setTimeout(() => { copiar.textContent = 'Copiar'; }, 1500);
        } catch (_) { /* clipboard indisponivel */ }
      };

      li.append(nome, tel, copiar);
      lista.appendChild(li);
    });

    let restante = segundosTotais;

    function pintarTempo() {
      const m = Math.floor(restante / 60);
      const s = restante % 60;
      tempoEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      barraEl.style.width = (restante / segundosTotais * 100) + '%';
      const urgente = restante <= 60;
      tempoEl.classList.toggle('urgente', urgente);
      barraEl.classList.toggle('urgente', urgente);
    }

    function fechar(resultado) {
      clearInterval(cronometro);
      document.removeEventListener('keydown', aoTeclado);
      fundo.hidden = true;
      resolve(resultado);
    }

    function aoTeclado(ev) {
      if (ev.key === 'Escape') fechar('sair');
    }

    const cronometro = setInterval(() => {
      restante -= 1;
      if (restante <= 0) {
        pintarTempo();
        fechar('tempo');
        return;
      }
      pintarTempo();
    }, 1000);

    pintarTempo();
    fundo.hidden = false;
    document.addEventListener('keydown', aoTeclado);
    $('btn-pag-pago').onclick = () => fechar('pago');
    $('btn-pag-sair').onclick = () => fechar('sair');
    $('btn-pag-pago').focus();
  });
}

// Pagamento -> submissao -> notificacao.
async function concluirAposta(chaves) {
  const resultado = await pedirPagamento(chaves);

  if (resultado === 'sair') {
    toast('Aposta abandonada',
      'Não foi registada nenhuma aposta. O boletim ficou preenchido, podes tentar de novo.', 'aviso');
    return;
  }
  if (resultado === 'tempo') {
    toast('Tempo esgotado',
      'Os ' + estado.jornada.pagamento.minutos +
      ' minutos para confirmar o pagamento terminaram e a aposta não foi registada.', 'erro');
    return;
  }

  try {
    const r = await submeterChaves(chaves);
    await limparAposSubmissao(r);
  } catch (err) {
    toast('Aposta não registada', err.message, 'erro');
    await carregarMinhasApostas();
  }
}

async function limparAposSubmissao(r) {
  estado.grelha = grelhaVazia();
  guardarGrelha();
  pintarGrelha();
  toast('Aposta submetida!',
    r.apostas + (r.apostas === 1 ? ' aposta registada' : ' apostas registadas') +
    ' em nome de ' + r.utilizador + ' · pagamento de ' + euros(r.total) + ' confirmado. ' +
    'Ficas com ' + r.registadas + ' de ' + r.limite + ' apostas nesta jornada.');
  await carregarMinhasApostas();
}

async function sair(ev) {
  ev.preventDefault();
  await fetch('/api/logout', { method: 'POST' });
  estado.sessao = { autenticado: false };
  estado.minhas = null;
  renderSessao();
  renderMinhasApostas();
  atualizarTotais();
  toast('Sessão terminada', 'Até à próxima jornada.', 'aviso');
}

/* ---------- arranque ---------- */

async function iniciar() {
  const [jornada, sessao] = await Promise.all([
    fetch('/api/jornada').then((r) => r.json()),
    fetch('/api/sessao').then((r) => r.json())
  ]);

  estado.jornada = jornada;
  estado.sessao = sessao;

  renderCabecalho();
  renderSessao();
  restaurarGrelha();
  renderTabela();
  pintarGrelha();
  await carregarMinhasApostas();

  atualizarContagem();
  setInterval(atualizarContagem, 1000);

  $('boletim').addEventListener('click', aoClicarPick);
  $('btn-limpar').addEventListener('click', limpar);
  $('btn-apostar').addEventListener('click', apostar);
  $('btn-sair').addEventListener('click', sair);

  if (jornada.fechada) {
    $('btn-apostar').disabled = true;
    toast('Apostas encerradas', 'O prazo terminou em ' + jornada.limiteTexto + '.', 'erro');
  }

  // regresso do login com uma aposta pendente
  const pendente = sessionStorage.getItem(CHAVE_PENDENTE);
  if (pendente && sessao.autenticado) {
    sessionStorage.removeItem(CHAVE_PENDENTE);
    // depois do login: pagamento e so depois o registo da aposta
    // (o boletim fica intacto se o utilizador desistir ou houver erro)
    await concluirAposta(JSON.parse(pendente).chaves);
  }
}

iniciar().catch((err) => {
  console.error(err);
  toast('Erro', 'Não foi possível carregar a jornada: ' + err.message, 'erro');
});
