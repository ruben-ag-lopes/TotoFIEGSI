'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

// Por omissao usa totofiegsi.db ao lado do codigo.
// TOTO_DB permite apontar para outro ficheiro (ex.: a base de dados de exemplo).
const DB_PATH = process.env.TOTO_DB
  ? path.resolve(process.env.TOTO_DB)
  : path.join(__dirname, 'totofiegsi.db');
const db = new DatabaseSync(DB_PATH);

// ---------------------------------------------------------------------------
// Esquema: apenas 2 tabelas
//   utilizadores -> utilizador (nome de utilizador), equipa (só no registo), password
//   apostas      -> utilizador + jornada (matchDay) + chave da aposta separada
//                   por ';'  (ex: 1;2;x;1;1;2;2;x;x;1)
//
// As apostas de todas as jornadas ficam sempre na tabela: a coluna `jornada`
// e' o que as distingue. Nunca e' preciso apagar apostas para abrir a jornada
// seguinte - basta que o boletim passe a apontar para outro matchDay.
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS utilizadores (
    utilizador TEXT PRIMARY KEY,
    equipa     TEXT NOT NULL,
    password   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS apostas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    utilizador TEXT NOT NULL REFERENCES utilizadores(utilizador),
    jornada    TEXT NOT NULL,
    chave      TEXT NOT NULL
  );
`);

// Migracao: bases de dados criadas antes de existir a coluna `jornada` nao a
// tem. Todas as apostas que ja existissem nessa altura eram da MD1 (a unica
// jornada que a app teve ate aqui), por isso e' o valor correto a atribuir-lhes.
const temColunaJornada = db.prepare("PRAGMA table_info(apostas)").all()
  .some((coluna) => coluna.name === 'jornada');

if (!temColunaJornada) {
  db.exec("ALTER TABLE apostas ADD COLUMN jornada TEXT NOT NULL DEFAULT 'MD1'");
}

// --- passwords (scrypt) ----------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verificarPassword(password, guardada) {
  const partes = String(guardada || '').split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const salt = Buffer.from(partes[1], 'hex');
  const esperado = Buffer.from(partes[2], 'hex');
  const obtido = crypto.scryptSync(password, salt, esperado.length);
  return crypto.timingSafeEqual(esperado, obtido);
}

// --- utilizadores ----------------------------------------------------------
function obterUtilizador(utilizador) {
  return db.prepare('SELECT * FROM utilizadores WHERE utilizador = ?').get(utilizador);
}

function criarUtilizador(utilizador, equipa, password) {
  db.prepare('INSERT INTO utilizadores (utilizador, equipa, password) VALUES (?, ?, ?)')
    .run(utilizador, equipa, hashPassword(password));
  return { utilizador, equipa };
}

// --- apostas -----------------------------------------------------------
// Todas as funcoes de apostas trabalham sobre uma jornada (matchDay). Isto
// permite que o historico de jornadas passadas fique sempre na base de dados.
function inserirApostas(utilizador, jornada, chaves) {
  const stmt = db.prepare('INSERT INTO apostas (utilizador, jornada, chave) VALUES (?, ?, ?)');
  db.exec('BEGIN');
  try {
    for (const chave of chaves) stmt.run(utilizador, jornada, chave);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return chaves.length;
}

function apostasDoUtilizador(utilizador, jornada) {
  return db.prepare(
    'SELECT id, chave FROM apostas WHERE utilizador = ? AND jornada = ? ORDER BY id'
  ).all(utilizador, jornada);
}

// Sem `jornada`, devolve as apostas de todas as jornadas.
function todasAsApostas(jornada) {
  if (jornada) {
    return db.prepare(
      'SELECT id, utilizador, jornada, chave FROM apostas WHERE jornada = ? ORDER BY id'
    ).all(jornada);
  }
  return db.prepare('SELECT id, utilizador, jornada, chave FROM apostas ORDER BY id').all();
}

function contarApostasDoUtilizador(utilizador, jornada) {
  return db.prepare(
    'SELECT COUNT(*) AS n FROM apostas WHERE utilizador = ? AND jornada = ?'
  ).get(utilizador, jornada).n;
}

// Sem `jornada`, conta as apostas de todas as jornadas.
function totalApostas(jornada) {
  if (jornada) {
    return db.prepare('SELECT COUNT(*) AS n FROM apostas WHERE jornada = ?').get(jornada).n;
  }
  return db.prepare('SELECT COUNT(*) AS n FROM apostas').get().n;
}

module.exports = {
  DB_PATH,
  obterUtilizador,
  criarUtilizador,
  verificarPassword,
  inserirApostas,
  apostasDoUtilizador,
  todasAsApostas,
  contarApostasDoUtilizador,
  totalApostas
};
