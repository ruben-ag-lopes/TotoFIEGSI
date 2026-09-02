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
//   apostas      -> utilizador + chave da aposta separada por ';'  (ex: 1;2;x;1;1;2;2;x;x;1)
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
    chave      TEXT NOT NULL
  );
`);

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

// --- apostas ---------------------------------------------------------------
function inserirApostas(utilizador, chaves) {
  const stmt = db.prepare('INSERT INTO apostas (utilizador, chave) VALUES (?, ?)');
  db.exec('BEGIN');
  try {
    for (const chave of chaves) stmt.run(utilizador, chave);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return chaves.length;
}

function apostasDoUtilizador(utilizador) {
  return db.prepare('SELECT id, chave FROM apostas WHERE utilizador = ? ORDER BY id').all(utilizador);
}

function contarApostasDoUtilizador(utilizador) {
  return db.prepare('SELECT COUNT(*) AS n FROM apostas WHERE utilizador = ?').get(utilizador).n;
}

function totalApostas() {
  return db.prepare('SELECT COUNT(*) AS n FROM apostas').get().n;
}

module.exports = {
  DB_PATH,
  obterUtilizador,
  criarUtilizador,
  verificarPassword,
  inserirApostas,
  apostasDoUtilizador,
  contarApostasDoUtilizador,
  totalApostas
};
