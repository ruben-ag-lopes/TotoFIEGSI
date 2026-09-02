/* =========================================================================
   TotoFIEGSI - login / registo
   ========================================================================= */
'use strict';

const CHAVE_PENDENTE = 'toto_pendente';
const $ = (id) => document.getElementById(id);

function mostrarErro(msg) {
  const el = $('erro');
  el.textContent = msg;
  el.hidden = !msg;
}

function trocarAba(destino) {
  const entrar = destino === 'entrar';
  $('aba-entrar').classList.toggle('ativa', entrar);
  $('aba-registo').classList.toggle('ativa', !entrar);
  $('form-entrar').hidden = !entrar;
  $('form-registo').hidden = entrar;
  document.querySelector('.cartao-login h1').textContent = entrar ? 'Entrar' : 'Criar conta';
  mostrarErro('');
}

function apostaPendente() {
  try {
    const bruto = sessionStorage.getItem(CHAVE_PENDENTE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    return Array.isArray(dados.chaves) && dados.chaves.length ? dados.chaves : null;
  } catch (_) {
    return null;
  }
}

async function mostrarPendente() {
  const chaves = apostaPendente();
  if (!chaves) return;

  let valor = 2;
  let md = '';
  try {
    const j = await fetch('/api/jornada').then((r) => r.json());
    valor = j.valorAposta;
    md = ' (' + j.matchDay + ')';
  } catch (_) { /* usa o valor por omissao */ }

  const total = (chaves.length * valor).toFixed(2).replace('.', ',');
  const el = $('pendente');
  el.textContent = 'Boletim por submeter' + md + ': ' + chaves.length +
    (chaves.length === 1 ? ' aposta' : ' apostas') + ' × ' +
    valor.toFixed(2).replace('.', ',') + ' € = ' + total + ' €. ' +
    'Depois do login confirmas o pagamento e a aposta fica registada.';
  el.hidden = false;
}

async function enviar(url, corpo) {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Ocorreu um erro. Tenta novamente.');
  return dados;
}

$('aba-entrar').addEventListener('click', () => trocarAba('entrar'));
$('aba-registo').addEventListener('click', () => trocarAba('registo'));

$('form-entrar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  mostrarErro('');
  try {
    await enviar('/api/login', {
      utilizador: $('l-utilizador').value,
      password: $('l-password').value
    });
    window.location.href = 'index.html';
  } catch (err) {
    mostrarErro(err.message);
  }
});

$('form-registo').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  mostrarErro('');
  try {
    await enviar('/api/registo', {
      utilizador: $('r-utilizador').value,
      equipa: $('r-equipa').value,
      password: $('r-password').value
    });
    window.location.href = 'index.html';
  } catch (err) {
    mostrarErro(err.message);
  }
});

// se ja existir sessao iniciada, volta directamente ao boletim
fetch('/api/sessao')
  .then((r) => r.json())
  .then((s) => {
    if (s.autenticado && apostaPendente()) window.location.href = 'index.html';
  })
  .catch(() => {});

mostrarPendente();
