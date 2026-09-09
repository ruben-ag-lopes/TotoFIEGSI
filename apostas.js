'use strict';

/*
 * Utilitario de linha de comandos para consultar a base de dados.
 *
 *   node apostas.js                 -> utilizadores + apostas de todas as jornadas
 *   node apostas.js resumo [MD]     -> apostas e prize pool da jornada (por omissao, a ativa)
 *   node apostas.js chaves [MD]     -> "utilizador chave" da jornada (por omissao, a ativa)
 */

const { DatabaseSync } = require('node:sqlite');
const { JORNADA } = require('./jornada');
const { jornadaPorMatchDay } = require('./jornadas');

// usa o mesmo ficheiro que o servidor (respeita a variavel TOTO_DB)
const db = new DatabaseSync(require('./db').DB_PATH);
const comando = (process.argv[2] || 'tudo').toLowerCase();
const matchDayPedido = process.argv[3];

function resolverJornada(matchDay) {
  if (!matchDay) return JORNADA;
  const j = jornadaPorMatchDay(matchDay);
  if (!j) {
    console.error('Jornada "' + matchDay + '" não existe em jornadas.js.');
    process.exit(1);
  }
  return j;
}

if (comando === 'chaves') {
  const j = resolverJornada(matchDayPedido);
  for (const a of db.prepare('SELECT utilizador, chave FROM apostas WHERE jornada = ? ORDER BY id').all(j.matchDay)) {
    console.log(a.utilizador + ' ' + a.chave);
  }
} else if (comando === 'resumo') {
  const j = resolverJornada(matchDayPedido);
  const linhas = db.prepare(
    'SELECT utilizador, COUNT(*) AS apostas FROM apostas WHERE jornada = ? GROUP BY utilizador ORDER BY apostas DESC'
  ).all(j.matchDay);

  console.log('-- ' + j.matchDay + ' --');
  console.table(linhas.map((l) => ({
    utilizador: l.utilizador,
    apostas: l.apostas,
    valor: (l.apostas * j.valorAposta).toFixed(2) + ' EUR'
  })));

  const total = db.prepare('SELECT COUNT(*) AS n FROM apostas WHERE jornada = ?').get(j.matchDay).n;
  const arrecadado = total * j.valorAposta;
  const prizePool = arrecadado * (j.percentagemPrizePool / 100);
  console.log('Total de apostas: ' + total + ' (' + arrecadado.toFixed(2) + ' EUR)');
  console.log('Prize pool (' + j.percentagemPrizePool + '%): ' + prizePool.toFixed(2) + ' EUR');
  if (total < j.minimoApostas) {
    console.log('AVISO: minimo de ' + j.minimoApostas + ' apostas ainda nao atingido - jornada seria cancelada.');
  }
} else {
  console.log('-- utilizadores --');
  console.table(db.prepare('SELECT utilizador, equipa FROM utilizadores ORDER BY utilizador').all());
  console.log('-- apostas (todas as jornadas) --');
  console.table(db.prepare('SELECT id, utilizador, jornada, chave FROM apostas ORDER BY jornada, id').all());
}
