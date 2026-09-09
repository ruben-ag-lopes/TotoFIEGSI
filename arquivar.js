'use strict';

/*
 * Arquiva a classificação da jornada ativa.
 *
 *   node arquivar.js            -> mostra a classificação, sem gravar nada
 *   node arquivar.js --gravar   -> escreve-a em jornadas.js
 *
 * Serve para a classificação ficar guardada antes de se apagarem as apostas
 * da base de dados para a jornada seguinte. Sem isto, o histórico perde-se,
 * porque a tabela `apostas` não guarda a que jornada pertence cada aposta.
 *
 * Correr só depois de preencher todos os resultados em jornadas.js.
 */

const fs = require('node:fs');
const path = require('node:path');

const { jornadaAtiva, contarAcertos } = require('./jornadas');
const db = require('./db');

const FICHEIRO = path.join(__dirname, 'jornadas.js');
const gravar = process.argv.includes('--gravar');

const jornada = jornadaAtiva();
const apostas = db.todasAsApostas();

if (!apostas.length) {
  console.error('Não há apostas na base de dados para arquivar.');
  process.exit(1);
}

if (jornada.resultadosConhecidos < jornada.totalJogos) {
  console.log('AVISO: só ' + jornada.resultadosConhecidos + ' de ' + jornada.totalJogos +
              ' resultados estão preenchidos em jornadas.js.');
  console.log('       A classificação vai ficar incompleta.\n');
}

// --- classificacao ---------------------------------------------------------
const classificacao = apostas
  .map((a) => {
    const u = db.obterUtilizador(a.utilizador);
    return {
      utilizador: a.utilizador,
      equipa: u ? u.equipa : null,
      chave: a.chave,
      acertos: contarAcertos(a.chave, jornada.jogos)
    };
  })
  .sort((x, y) => y.acertos - x.acertos || x.utilizador.localeCompare(y.utilizador));

// --- premio ----------------------------------------------------------------
const arrecadado = apostas.length * jornada.valorAposta;
const prizePool = arrecadado * (jornada.percentagemPrizePool / 100);
const premioAtivo = apostas.length >= jornada.minimoApostas;
const maximo = classificacao.length ? classificacao[0].acertos : 0;
const vencedores = classificacao.filter((c) => c.acertos === maximo);

console.log('Jornada ' + jornada.matchDay + ' — ' + apostas.length + ' apostas');
console.log('Arrecadado: ' + arrecadado.toFixed(2) + ' EUR | Prize pool (' +
            jornada.percentagemPrizePool + '%): ' + prizePool.toFixed(2) + ' EUR');
console.log('');

classificacao.forEach((c, i) => {
  console.log(String(i + 1).padStart(2) + '. ' + c.utilizador.padEnd(16) +
              c.chave + '  ' + c.acertos + '/' + jornada.totalJogos);
});

console.log('');
if (!premioAtivo) {
  console.log('Menos de ' + jornada.minimoApostas + ' apostas: pelo regulamento, a jornada' +
              ' é cancelada e os valores devolvidos.');
} else if (vencedores.length === 1) {
  console.log('Vencedor: ' + vencedores[0].utilizador + ' com ' + maximo +
              ' acertos — recebe ' + prizePool.toFixed(2) + ' EUR');
} else {
  console.log('Empate a ' + maximo + ' acertos entre ' +
              vencedores.map((v) => v.utilizador).join(', '));
  console.log('Cada um recebe ' + (prizePool / vencedores.length).toFixed(2) + ' EUR');
}

// --- gravar em jornadas.js -------------------------------------------------
if (!gravar) {
  console.log('\n(nada foi gravado — usa "node arquivar.js --gravar" para guardar em jornadas.js)');
  process.exit(0);
}

const original = fs.readFileSync(FICHEIRO, 'utf8');

// Substitui o "classificacao: null" da jornada ativa. Como só a jornada ativa
// fica por arquivar, é sempre o primeiro null que aparece a seguir ao matchDay.
const marcador = "matchDay: '" + jornada.matchDay + "'";
const posMatchDay = original.indexOf(marcador);
if (posMatchDay === -1) {
  console.error('\nNão encontrei a jornada ' + jornada.matchDay + ' em jornadas.js.');
  process.exit(1);
}

const posCampo = original.indexOf('classificacao: null', posMatchDay);
if (posCampo === -1) {
  console.error('\nA jornada ' + jornada.matchDay + ' já tem classificação arquivada.');
  console.error('Apaga-a à mão em jornadas.js se quiseres voltar a arquivar.');
  process.exit(1);
}

const linhas = classificacao.map((c) =>
  '      { utilizador: ' + JSON.stringify(c.utilizador) +
  ', equipa: ' + JSON.stringify(c.equipa) +
  ', chave: ' + JSON.stringify(c.chave) +
  ', acertos: ' + c.acertos + ' }'
).join(',\n');

const substituicao = 'classificacao: [\n' + linhas + '\n    ]';

fs.copyFileSync(FICHEIRO, FICHEIRO + '.bak');
const novo = original.slice(0, posCampo) + substituicao +
             original.slice(posCampo + 'classificacao: null'.length);
fs.writeFileSync(FICHEIRO, novo, 'utf8');

console.log('\nClassificação gravada em jornadas.js (cópia do original em jornadas.js.bak).');
console.log('Passos seguintes: põe ativa: false nesta jornada, acrescenta a próxima,');
console.log('e limpa as apostas da base de dados.');
