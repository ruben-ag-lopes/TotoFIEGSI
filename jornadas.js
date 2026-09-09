'use strict';

/*
 * Todas as jornadas do TotoFIEGSI, presentes e passadas.
 *
 * As apostas de cada jornada ficam sempre na base de dados (tabela `apostas`,
 * coluna `jornada`), por isso a classificacao de qualquer match day - mesmo
 * ja fechado - e calculada ao vivo a partir da BD. Nao ha nada para arquivar
 * nem para apagar.
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
    ativa: false,
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
    ]
  },
  {
    matchDay: 'MD2',
    ativa: true,
    periodo: '13 e 14 de outubro de 2026',
    limiteISO: '2026-10-13T17:30:00',
    limiteTexto: 'Terça-feira, 13/10/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Lens',              fora: 'Sporting',          data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Roma',              fora: 'Real Madrid',       data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Galatasaray',       fora: 'Barcelona',         data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Manchester City',   fora: 'PSG',               data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Real Betis',        fora: 'Porto',             data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Arsenal',           fora: 'Lille',             data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'Atlético Madrid',   fora: 'Manchester United', data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  8, casa: 'Inter',             fora: 'Club Brugge',       data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'Leipzig',           fora: 'PSV Eindhoven',     data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Villarreal',        fora: 'Napoli',            data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD3',
    ativa: false,
    periodo: '20 e 21 de outubro de 2026',
    limiteISO: '2026-10-20T17:30:00',
    limiteTexto: 'Terça-feira, 20/10/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Porto',             fora: 'PSV Eindhoven',     data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Real Madrid',       fora: 'Leipzig',           data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  3, casa: 'PSG',               fora: 'Barcelona',         data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Sporting',          fora: 'LASK',              data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Liverpool',         fora: 'Villarreal',        data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Manchester City',   fora: 'AEK Athens',        data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'Napoli',            fora: 'Bodø/Glimt',        data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  8, casa: 'Stuttgart',         fora: 'Atlético Madrid',   data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'Bayern Munich',     fora: 'Arsenal',           data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Aston Villa',       fora: 'Viking',            data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD4',
    ativa: false,
    periodo: '3 e 4 de novembro de 2026',
    limiteISO: '2026-11-03T17:30:00',
    limiteTexto: 'Terça-feira, 03/11/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Shakhtar Donetsk',  fora: 'Sporting',          data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  2, casa: 'AEK Athens',        fora: 'Real Madrid',       data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Barcelona',         fora: 'Aston Villa',       data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Villarreal',        fora: 'PSG',               data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Porto',             fora: 'Napoli',            data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Feyenoord',         fora: 'Inter',             data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'Atlético Madrid',   fora: 'Bayern Munich',     data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  8, casa: 'Borussia Dortmund', fora: 'Real Betis',        data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'PSV Eindhoven',     fora: 'Club Brugge',       data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Leipzig',           fora: 'Manchester City',   data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD5',
    ativa: false,
    periodo: '24 e 25 de novembro de 2026',
    limiteISO: '2026-11-24T17:30:00',
    limiteTexto: 'Terça-feira, 24/11/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Feyenoord',         fora: 'Porto',             data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Real Madrid',       fora: 'PSV Eindhoven',     data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Sabah',             fora: 'Barcelona',         data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Sporting',          fora: 'Manchester United', data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'PSG',               fora: 'Roma',              data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Manchester City',   fora: 'Napoli',            data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'Arsenal',           fora: 'Borussia Dortmund', data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  8, casa: 'Galatasaray',       fora: 'Aston Villa',       data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'Lille',             fora: 'Bayern Munich',     data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Atlético Madrid',   fora: 'Viking',            data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD6',
    ativa: false,
    periodo: '8 e 9 de dezembro de 2026',
    limiteISO: '2026-12-08T17:30:00',
    limiteTexto: 'Terça-feira, 08/12/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Liverpool',         fora: 'Porto',             data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Arsenal',           fora: 'Real Madrid',       data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Barcelona',         fora: 'Manchester City',   data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Roma',              fora: 'Sporting',          data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Aston Villa',       fora: 'PSG',               data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Borussia Dortmund', fora: 'Inter',             data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'Bayern Munich',     fora: 'Slavia Praha',      data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  8, casa: 'PSV Eindhoven',     fora: 'Atlético Madrid',   data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'Napoli',            fora: 'Club Brugge',       data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Stuttgart',         fora: 'Lille',             data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD7',
    ativa: false,
    periodo: '19 e 20 de janeiro de 2027',
    limiteISO: '2027-01-19T17:30:00',
    limiteTexto: 'Terça-feira, 19/01/2027 às 17H30',
    jogos: [
      { n:  1, casa: 'Porto',             fora: 'Slavia Praha',      data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Real Madrid',       fora: 'LASK',              data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Sporting',          fora: 'Barcelona',         data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Como',              fora: 'PSG',               data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Inter',             fora: 'Liverpool',         data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Galatasaray',       fora: 'Feyenoord',         data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'AEK Athens',        fora: 'Roma',              data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  8, casa: 'Aston Villa',       fora: 'Borussia Dortmund', data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'Real Betis',        fora: 'Arsenal',           data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Leipzig',           fora: 'Shakhtar Donetsk',  data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD8',
    ativa: false,
    periodo: '27 de janeiro de 2027',
    limiteISO: '2027-01-27T17:30:00',
    limiteTexto: 'Quarta-feira, 27/01/2027 às 17H30',
    jogos: [
      { n:  1, casa: 'LASK',              fora: 'Porto',             data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  2, casa: 'Shakhtar Donetsk',  fora: 'Real Madrid',       data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  3, casa: 'Barcelona',         fora: 'Como',              data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  4, casa: 'Manchester City',   fora: 'Sporting',          data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  5, casa: 'PSG',               fora: 'Galatasaray',       data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  6, casa: 'Bayern Munich',     fora: 'Real Betis',        data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'Arsenal',           fora: 'Sabah',             data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  8, casa: 'Roma',              fora: 'Lille',             data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'PSV Eindhoven',     fora: 'Stuttgart',         data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Napoli',            fora: 'Viking',            data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null }
    ]
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
