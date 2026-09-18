'use strict';

/*
 * Acesso à base de dados (Supabase / Postgres).
 *
 * As funções são as mesmas que existiam na versão SQLite, mas agora são
 * ASSÍNCRONAS — cada uma faz um pedido HTTP à API do Supabase. Quem as chama
 * tem de usar await.
 *
 * Tabelas (ver sql/esquema.sql):
 *   utilizadores      utilizador (PK), equipa, password
 *   apostas           id, utilizador, jornada, chave
 *   tentativas_login  ip (PK), contagem, inicio        (limite anti força bruta)
 */

const supabase = require('./supabase');
const password = require('./password');

// --- utilizadores ----------------------------------------------------------

async function obterUtilizador(utilizador) {
  const linhas = await supabase.selecionar('utilizadores', {
    utilizador: 'eq.' + utilizador,
    limit: 1
  });
  return linhas[0] || null;
}

/*
 * Todos os utilizadores de uma vez.
 * Usado pela página de jornadas: buscar o utilizador de cada aposta à parte
 * dava dezenas de idas e voltas à API. Assim são dois pedidos ao todo.
 */
async function todosOsUtilizadores() {
  return supabase.selecionar('utilizadores', { order: 'utilizador.asc' });
}

async function criarUtilizador(utilizador, equipa, pass) {
  const linhas = await supabase.inserir('utilizadores', {
    utilizador,
    equipa,
    password: password.criarHash(pass)
  });
  const criado = linhas[0];
  return { utilizador: criado.utilizador, equipa: criado.equipa };
}

const verificarPassword = password.verificar;

// --- apostas ---------------------------------------------------------------
// Todas trabalham sobre uma jornada (matchDay), para o histórico de jornadas
// passadas ficar sempre na base de dados.

async function inserirApostas(utilizador, jornada, chaves) {
  const linhas = chaves.map((chave) => ({ utilizador, jornada, chave }));
  await supabase.inserir('apostas', linhas);
  return chaves.length;
}

async function apostasDoUtilizador(utilizador, jornada) {
  return supabase.selecionar('apostas', {
    utilizador: 'eq.' + utilizador,
    jornada: 'eq.' + jornada,
    order: 'id.asc'
  });
}

/** Sem `jornada`, devolve as apostas de todas as jornadas. */
async function todasAsApostas(jornada) {
  const filtros = { order: 'id.asc' };
  if (jornada) filtros.jornada = 'eq.' + jornada;
  return supabase.selecionar('apostas', filtros);
}

async function contarApostasDoUtilizador(utilizador, jornada) {
  const linhas = await apostasDoUtilizador(utilizador, jornada);
  return linhas.length;
}

/** Sem `jornada`, conta as apostas de todas as jornadas. */
async function totalApostas(jornada) {
  const linhas = await todasAsApostas(jornada);
  return linhas.length;
}

module.exports = {
  obterUtilizador,
  todosOsUtilizadores,
  criarUtilizador,
  verificarPassword,
  inserirApostas,
  apostasDoUtilizador,
  todasAsApostas,
  contarApostasDoUtilizador,
  totalApostas
};
