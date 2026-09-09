'use strict';

/*
 * Todas as jornadas do TotoFIEGSI, presentes e passadas.
 *
 * Para abrir uma nova jornada:
 *   1. poe  ativa: false  na jornada atual e preenche os resultados
 *   2. acrescenta a nova ao fim do array, com  ativa: true
 *   3. reinicia o servidor
 *
 * O resultado de cada jogo e '1' (casa), 'x' (empate), '2' (fora) ou null
 * enquanto nao se souber. Ver o README, seccao 3.
 */

// --- definicoes comuns a todas as jornadas ---------------------------------
const CONFIG = {
  epoca: '2026/27',
  competicao: 'Liga dos Campeões',
  valorAposta: 2,                // euros por aposta (valor fixo)
  colunas: 1,                    // colunas do boletim
  maxApostasPorUtilizador: 1,    // uma unica aposta por jogador em cada jornada
  percentagemPrizePool: 90,
  minimoApostas: 5,              // minimo para o premio ser ativado

  // Pagamento (SIMULADO: nada e cobrado nem verificado)
  pagamento: {
    metodo: 'MB WAY',
    minutos: 5,
    contactos: [
      { nome: 'Ruben',      telemovel: '925 295 306' },
      { nome: 'Mané',       telemovel: '916 961 489' },
      { nome: 'John Mira',  telemovel: '937 777 252' }
    ]
  }
};

// --- jornadas --------------------------------------------------------------
const JORNADAS = [
  {
    matchDay: 'MD1',
    ativa: true,
    periodo: '8 a 10 de setembro de 2026',
    limiteISO: '2026-09-08T17:30:00',
    limiteTexto: 'Terça-feira, 08/09/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Porto',             fora: 'Manchester City',   data: '2026-09-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Real Madrid',       fora: 'Inter',             data: '2026-09-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Barcelona',         fora: 'Feyenoord',         data: '2026-09-08', hora: '17:45', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Sporting',          fora: 'Galatasaray',       data: '2026-09-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'PSG',               fora: 'Slovan Bratislava', data: '2026-09-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  6, casa: 'Liverpool',         fora: 'Atlético Madrid',   data: '2026-09-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'Borussia Dortmund', fora: 'Villarreal',        data: '2026-09-09', hora: '17:45', dia: 'Qua', resultado: null },
      { n:  8, casa: 'Lille',             fora: 'Real Betis',        data: '2026-09-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'Napoli',            fora: 'Arsenal',           data: '2026-09-10', hora: '20:00', dia: 'Qui', resultado: null },
      { n: 10, casa: 'Bayern Munich',     fora: 'Bodø/Glimt',        data: '2026-09-10', hora: '20:00', dia: 'Qui', resultado: null }
    ],
    // Preenchido com "node arquivar.js" quando a jornada fecha, para a
    // classificacao ficar guardada depois de as apostas saírem da BD.
    classificacao: null
  }
];

// --- helpers ---------------------------------------------------------------

// Junta as definicoes comuns a uma jornada e calcula os campos derivados.
function comConfig(jornada) {
  return {
    ...CONFIG,
    ...jornada,
    totalJogos: jornada.jogos.length,
    resultadosConhecidos: jornada.jogos.filter((j) => j.resultado).length
  };
}

function jornadaAtiva() {
  const ativa = JORNADAS.find((j) => j.ativa);
  if (!ativa) throw new Error('Nenhuma jornada marcada com ativa: true em jornadas.js');
  return comConfig(ativa);
}

function todasAsJornadas() {
  return JORNADAS.map(comConfig);
}

function jornadaPorMatchDay(matchDay) {
  const j = JORNADAS.find((x) => x.matchDay.toLowerCase() === String(matchDay).toLowerCase());
  return j ? comConfig(j) : null;
}

// Conta quantos prognosticos de uma chave acertaram nos resultados conhecidos.
function contarAcertos(chave, jogos) {
  const prognosticos = String(chave).split(';');
  let acertos = 0;
  jogos.forEach((jogo, i) => {
    if (jogo.resultado && prognosticos[i] === jogo.resultado) acertos += 1;
  });
  return acertos;
}

module.exports = {
  CONFIG,
  JORNADAS,
  comConfig,
  jornadaAtiva,
  todasAsJornadas,
  jornadaPorMatchDay,
  contarAcertos
};
