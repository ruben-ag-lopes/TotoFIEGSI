'use strict';

// Dados da jornada em jogo. Para uma nova jornada basta editar este ficheiro.
const JORNADA = {
  matchDay: 'MD1',
  epoca: '2026/27',
  competicao: 'Liga dos Campeões',
  periodo: '8 a 10 de setembro de 2026',
  valorAposta: 2,          // euros por aposta (coluna)
  colunas: 5,              // colunas do boletim (= limite de apostas por utilizador)
  percentagemPrizePool: 90,
  maxApostasPorUtilizador: 5,   // limite de apostas por utilizador nesta jornada
  minimoApostas: 5,
  // Limite: até às 17H00 do dia do primeiro jogo (hora local)
  limiteISO: '2026-09-08T17:00:00',
  limiteTexto: 'Terça-feira, 08/09/2026 às 17H00',

  // Pagamento (SIMULADO: nada é cobrado nem verificado)
  pagamento: {
    metodo: 'MB WAY',
    minutos: 5,                 // tempo para confirmar o pagamento
    contactos: [                // contactos para onde os jogadores enviam o MB WAY
      { nome: 'Ruben',      telemovel: '925 295 306' },
      { nome: 'Mané',       telemovel: '916 961 489' },
      { nome: 'John Mira',  telemovel: '937 777 252' }
    ]
  },
  jogos: [
    { n:  1, casa: 'Porto',             fora: 'Manchester City',   data: '2026-09-08', hora: '20:00', dia: 'Ter' },
    { n:  2, casa: 'Real Madrid',       fora: 'Inter',             data: '2026-09-08', hora: '20:00', dia: 'Ter' },
    { n:  3, casa: 'Barcelona',         fora: 'Feyenoord',         data: '2026-09-08', hora: '17:45', dia: 'Ter' },
    { n:  4, casa: 'Sporting',          fora: 'Galatasaray',       data: '2026-09-08', hora: '20:00', dia: 'Ter' },
    { n:  5, casa: 'PSG',               fora: 'Slovan Bratislava', data: '2026-09-09', hora: '20:00', dia: 'Qua' },
    { n:  6, casa: 'Liverpool',         fora: 'Atlético Madrid',   data: '2026-09-09', hora: '20:00', dia: 'Qua' },
    { n:  7, casa: 'Borussia Dortmund', fora: 'Villarreal',        data: '2026-09-09', hora: '17:45', dia: 'Qua' },
    { n:  8, casa: 'Lille',             fora: 'Real Betis',        data: '2026-09-09', hora: '20:00', dia: 'Qua' },
    { n:  9, casa: 'Napoli',            fora: 'Arsenal',           data: '2026-09-10', hora: '20:00', dia: 'Qui' },
    { n: 10, casa: 'Bayern Munich',     fora: 'Bodø/Glimt',        data: '2026-09-10', hora: '20:00', dia: 'Qui' }
  ]
};

JORNADA.totalJogos = JORNADA.jogos.length;

module.exports = { JORNADA };
