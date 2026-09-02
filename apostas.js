'use strict';

/*
 * Utilitario de linha de comandos para consultar a base de dados.
 *
 *   node apostas.js              -> utilizadores + apostas
 *   node apostas.js resumo       -> contagem de apostas por utilizador e prize pool
 *   node apostas.js chaves       -> apostas no formato "utilizador chave"
 */

const { DatabaseSync } = require('node:sqlite');
const { JORNADA } = require('./jornada');

const db = new DatabaseSync(require('node:path').join(__dirname, 'totofiegsi.db'));
const comando = (process.argv[2] || 'tudo').toLowerCase();

if (comando === 'chaves') {
  for (const a of db.prepare('SELECT utilizador, chave FROM apostas ORDER BY id').all()) {
    console.log(a.utilizador + ' ' + a.chave);
  }
} else if (comando === 'resumo') {
  const linhas = db.prepare(
    'SELECT utilizador, COUNT(*) AS apostas FROM apostas GROUP BY utilizador ORDER BY apostas DESC'
  ).all();
  console.table(linhas.map((l) => ({
    utilizador: l.utilizador,
    apostas: l.apostas,
    valor: (l.apostas * JORNADA.valorAposta).toFixed(2) + ' EUR'
  })));

  const total = db.prepare('SELECT COUNT(*) AS n FROM apostas').get().n;
  const arrecadado = total * JORNADA.valorAposta;
  const prizePool = arrecadado * (JORNADA.percentagemPrizePool / 100);
  console.log('Total de apostas: ' + total + ' (' + arrecadado.toFixed(2) + ' EUR)');
  console.log('Prize pool (' + JORNADA.percentagemPrizePool + '%): ' + prizePool.toFixed(2) + ' EUR');
  if (total < JORNADA.minimoApostas) {
    console.log('AVISO: minimo de ' + JORNADA.minimoApostas + ' apostas ainda nao atingido - jornada seria cancelada.');
  }
} else {
  console.log('-- utilizadores --');
  console.table(db.prepare('SELECT utilizador, equipa FROM utilizadores ORDER BY utilizador').all());
  console.log('-- apostas --');
  console.table(db.prepare('SELECT id, utilizador, chave FROM apostas ORDER BY id').all());
}
