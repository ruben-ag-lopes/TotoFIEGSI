'use strict';

/*
 * Migra os dados do SQLite local (totofiegsi.db) para o Supabase.
 *
 *   node --env-file=.env migrar.js            -> mostra o que vai migrar, sem escrever
 *   node --env-file=.env migrar.js --escrever -> migra a sério
 *
 * Corre só depois de teres criado as tabelas no Supabase (sql/esquema.sql).
 * Pode ser corrido mais do que uma vez: os utilizadores são inseridos com
 * upsert e as apostas são verificadas antes, para não duplicar.
 */

const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const config = require('./lib/config');
const supabase = require('./lib/supabase');

config.validar();

const escrever = process.argv.includes('--escrever');
const SQLITE = path.join(__dirname, 'totofiegsi.db');

(async () => {
  const sqlite = new DatabaseSync(SQLITE);

  const utilizadores = sqlite.prepare(
    'SELECT utilizador, equipa, password FROM utilizadores ORDER BY utilizador'
  ).all();

  const apostas = sqlite.prepare(
    'SELECT utilizador, jornada, chave FROM apostas ORDER BY id'
  ).all();

  sqlite.close();

  console.log('Origem:  ' + SQLITE);
  console.log('Destino: ' + config.SUPABASE_URL);
  console.log('');
  console.log('Utilizadores a migrar: ' + utilizadores.length);
  utilizadores.forEach((u) => console.log('  - ' + u.utilizador + '  (' + u.equipa + ')'));
  console.log('');
  console.log('Apostas a migrar: ' + apostas.length);
  apostas.forEach((a) => console.log('  - ' + a.jornada + '  ' + a.utilizador + '  ' + a.chave));
  console.log('');

  if (!escrever) {
    console.log('(simulação — nada foi escrito. Corre com --escrever para migrar a sério)');
    return;
  }

  // --- utilizadores (upsert: repetir a migração não parte nada) -------------
  if (utilizadores.length) {
    await supabase.inserirOuAtualizar('utilizadores', utilizadores);
    console.log('Utilizadores migrados: ' + utilizadores.length);
  }

  // --- apostas (só as que ainda lá não estão) ------------------------------
  const jaLa = await supabase.selecionar('apostas', { select: 'utilizador,jornada,chave' });
  const existe = new Set(jaLa.map((a) => a.jornada + '|' + a.utilizador + '|' + a.chave));

  const novas = apostas.filter(
    (a) => !existe.has(a.jornada + '|' + a.utilizador + '|' + a.chave)
  );

  if (novas.length) {
    await supabase.inserir('apostas', novas);
    console.log('Apostas migradas: ' + novas.length);
  } else {
    console.log('Apostas migradas: 0 (já lá estavam todas)');
  }

  // --- verificação ---------------------------------------------------------
  const [uFinal, aFinal] = await Promise.all([
    supabase.selecionar('utilizadores', { select: 'utilizador' }),
    supabase.selecionar('apostas', { select: 'id' })
  ]);

  console.log('');
  console.log('No Supabase agora: ' + uFinal.length + ' utilizadores, ' + aFinal.length + ' apostas.');
  console.log('O totofiegsi.db local fica intacto, como cópia de segurança.');
})().catch((err) => {
  console.error('');
  console.error('Falhou: ' + err.message);
  process.exit(1);
});
