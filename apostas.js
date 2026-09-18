'use strict';

/*
 * Utilitario de linha de comandos para consultar a base de dados (Supabase).
 *
 *   node --env-file=.env apostas.js              -> utilizadores + apostas de todas as jornadas
 *   node --env-file=.env apostas.js resumo [MD]  -> apostas e prize pool da jornada (por omissao, a ativa)
 *   node --env-file=.env apostas.js chaves [MD]  -> "utilizador chave" da jornada (por omissao, a ativa)
 *
 * Atalho: npm run apostas -- resumo MD1
 */

const config = require('./lib/config');
const db = require('./lib/db');
const { JORNADA } = require('./jornada');
const { jornadaPorMatchDay } = require('./jornadas');

config.validar();

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

(async () => {
  if (comando === 'chaves') {
    const j = resolverJornada(matchDayPedido);
    for (const a of await db.todasAsApostas(j.matchDay)) {
      console.log(a.utilizador + ' ' + a.chave);
    }
    return;
  }

  if (comando === 'resumo') {
    const j = resolverJornada(matchDayPedido);
    const apostas = await db.todasAsApostas(j.matchDay);

    const porUtilizador = new Map();
    for (const a of apostas) {
      porUtilizador.set(a.utilizador, (porUtilizador.get(a.utilizador) || 0) + 1);
    }

    console.log('-- ' + j.matchDay + ' --');
    console.table(
      [...porUtilizador.entries()]
        .sort((x, y) => y[1] - x[1])
        .map(([utilizador, n]) => ({
          utilizador,
          apostas: n,
          valor: (n * j.valorAposta).toFixed(2) + ' EUR'
        }))
    );

    const total = apostas.length;
    const arrecadado = total * j.valorAposta;
    const prizePool = arrecadado * (j.percentagemPrizePool / 100);
    console.log('Total de apostas: ' + total + ' (' + arrecadado.toFixed(2) + ' EUR)');
    console.log('Prize pool (' + j.percentagemPrizePool + '%): ' + prizePool.toFixed(2) + ' EUR');
    if (total < j.minimoApostas) {
      console.log('AVISO: minimo de ' + j.minimoApostas + ' apostas ainda nao atingido - jornada seria cancelada.');
    }
    return;
  }

  const [utilizadores, apostas] = await Promise.all([
    db.todosOsUtilizadores(),
    db.todasAsApostas()
  ]);

  console.log('-- utilizadores --');
  console.table(utilizadores.map((u) => ({ utilizador: u.utilizador, equipa: u.equipa })));
  console.log('-- apostas (todas as jornadas) --');
  console.table(apostas.map((a) => ({
    id: a.id,
    utilizador: a.utilizador,
    jornada: a.jornada,
    chave: a.chave
  })));
})().catch((err) => {
  console.error('Falhou: ' + err.message);
  process.exit(1);
});
