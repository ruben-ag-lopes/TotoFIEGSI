'use strict';

/*
 * Cliente mínimo da API REST do Supabase (PostgREST), feito só com o `fetch`
 * que já vem no Node — mantém o projeto sem uma única dependência npm.
 *
 * Usa a chave service_role, que ignora as políticas RLS. Isto só é seguro
 * porque este ficheiro nunca corre no browser: é chamado apenas pelas funções
 * de servidor. As tabelas têm RLS ligado e sem políticas, por isso a chave
 * anónima (pública) não consegue ler nem escrever nada.
 */

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('./config');

function cabecalhos(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(SUPABASE_URL + '/rest/v1' + caminho, opcoes);

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    // A mensagem do PostgREST vem em JSON; damos o que der para diagnosticar,
    // sem nunca incluir a chave.
    throw new Error(
      'Supabase respondeu ' + resposta.status + ' em ' + caminho +
      (corpo ? ': ' + corpo.slice(0, 300) : '')
    );
  }

  if (resposta.status === 204) return null;
  return resposta.json();
}

// Constrói a query string do PostgREST: { utilizador: 'eq.ruben' } -> ?utilizador=eq.ruben
function query(filtros = {}) {
  const partes = Object.entries(filtros)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v));
  return partes.length ? '?' + partes.join('&') : '';
}

/** Lê linhas de uma tabela. filtros: { coluna: 'eq.valor', select: '*', order: 'id.asc' } */
function selecionar(tabela, filtros = {}) {
  return pedir('/' + tabela + query({ select: '*', ...filtros }), {
    method: 'GET',
    headers: cabecalhos()
  });
}

/** Insere uma ou várias linhas e devolve-as. */
function inserir(tabela, linhas) {
  return pedir('/' + tabela, {
    method: 'POST',
    headers: cabecalhos({ Prefer: 'return=representation' }),
    body: JSON.stringify(Array.isArray(linhas) ? linhas : [linhas])
  });
}

/** Insere ou atualiza (upsert) pela chave primária. */
function inserirOuAtualizar(tabela, linhas) {
  return pedir('/' + tabela, {
    method: 'POST',
    headers: cabecalhos({
      Prefer: 'resolution=merge-duplicates,return=representation'
    }),
    body: JSON.stringify(Array.isArray(linhas) ? linhas : [linhas])
  });
}

/** Atualiza as linhas que correspondem aos filtros. */
function atualizar(tabela, filtros, valores) {
  return pedir('/' + tabela + query(filtros), {
    method: 'PATCH',
    headers: cabecalhos({ Prefer: 'return=representation' }),
    body: JSON.stringify(valores)
  });
}

/** Apaga as linhas que correspondem aos filtros. */
function apagar(tabela, filtros) {
  return pedir('/' + tabela + query(filtros), {
    method: 'DELETE',
    headers: cabecalhos()
  });
}

module.exports = {
  selecionar,
  inserir,
  inserirOuAtualizar,
  atualizar,
  apagar,
  // exportados para os testes poderem verificar a construção dos pedidos
  _query: query,
  _cabecalhos: cabecalhos
};
