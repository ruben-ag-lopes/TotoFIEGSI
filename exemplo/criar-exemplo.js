'use strict';

/*
 * Gera a base de dados de exemplo (exemplo/totofiegsi.exemplo.db) com utilizadores
 * e apostas ficticios, para os colegas verem a app com dados sem precisarem de
 * registar tudo a mao.
 *
 *   node exemplo/criar-exemplo.js
 *
 * A password de todas as contas de exemplo e "1234".
 */

const fs = require('node:fs');
const path = require('node:path');

const DESTINO = path.join(__dirname, 'totofiegsi.exemplo.db');

// db.js le esta variavel para saber onde criar a base de dados
process.env.TOTO_DB = DESTINO;

if (fs.existsSync(DESTINO)) fs.unlinkSync(DESTINO);

const db = require('../db');
const { JORNADA } = require('../jornada');

const UTILIZADORES = [
  { utilizador: 'ruben',    equipa: 'Os Bytes FC' },
  { utilizador: 'mane',     equipa: 'Sporting das Redes' },
  { utilizador: 'johnmira', equipa: 'Atletico Kernel' },
  { utilizador: 'ana',      equipa: 'GestINF United' },
  { utilizador: 'tiago',    equipa: 'Deportivo Debug' }
];

const APOSTAS = {
  ruben:    ['1;2;x;1;1;2;2;x;x;1', '1;1;1;1;1;2;2;x;2;1', 'x;2;1;1;1;1;2;x;x;1'],
  mane:     ['2;x;1;1;1;2;1;x;2;1', '1;2;1;x;1;2;2;1;x;1'],
  johnmira: ['1;1;x;2;1;2;2;x;1;1'],
  ana:      ['x;x;1;1;2;1;2;2;x;1', '1;2;x;1;1;2;2;x;x;2', '2;1;1;1;1;1;1;x;x;1', '1;x;x;1;2;2;2;1;x;1'],
  tiago:    ['1;2;2;1;1;2;x;x;1;1', '2;2;x;1;1;1;2;x;x;1']
};

for (const u of UTILIZADORES) {
  db.criarUtilizador(u.utilizador, u.equipa, '1234');
  db.inserirApostas(u.utilizador, APOSTAS[u.utilizador]);
}

const total = db.totalApostas();
console.log('Base de dados de exemplo criada em: ' + DESTINO);
console.log('Utilizadores: ' + UTILIZADORES.length + ' (password de todos: 1234)');
console.log('Apostas: ' + total + ' = ' + (total * JORNADA.valorAposta).toFixed(2) + ' EUR arrecadados');
console.log('Prize pool (' + JORNADA.percentagemPrizePool + '%): ' +
  (total * JORNADA.valorAposta * JORNADA.percentagemPrizePool / 100).toFixed(2) + ' EUR');
