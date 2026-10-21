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
 *   1. acrescenta a nova ao fim do array (com os 10 ou mais jogos e resultado: null)
 *   2. preenche os resultados da jornada atual
 *   3. quando todos os resultados estiverem lancados, a seguinte fica ativa sozinha
 *   4. reinicia o servidor
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
    periodo: '8 a 10 de setembro de 2026',
    limiteISO: '2026-09-08T17:30:00',
    limiteTexto: 'Terça-feira, 08/09/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Porto',             fora: 'Manchester City',   data: '2026-09-08', hora: '20:00', dia: 'Ter', resultado: '2' },
      { n:  2, casa: 'Real Madrid',       fora: 'Inter',             data: '2026-09-08', hora: '20:00', dia: 'Ter', resultado: '1' },
      { n:  3, casa: 'Barcelona',         fora: 'Feyenoord',         data: '2026-09-08', hora: '17:45', dia: 'Ter', resultado: '1' },
      { n:  4, casa: 'Sporting',          fora: 'Galatasaray',       data: '2026-09-08', hora: '20:00', dia: 'Ter', resultado: '1' },
      { n:  5, casa: 'PSG',               fora: 'Slovan Bratislava', data: '2026-09-09', hora: '20:00', dia: 'Qua', resultado: '1' },
      { n:  6, casa: 'Liverpool',         fora: 'Atlético Madrid',   data: '2026-09-09', hora: '20:00', dia: 'Qua', resultado: '1' },
      { n:  7, casa: 'Borussia Dortmund', fora: 'Villarreal',        data: '2026-09-09', hora: '17:45', dia: 'Qua', resultado: '1' },
      { n:  8, casa: 'Lille',             fora: 'Real Betis',        data: '2026-09-09', hora: '20:00', dia: 'Qua', resultado: '2' },
      { n:  9, casa: 'Napoli',            fora: 'Arsenal',           data: '2026-09-10', hora: '20:00', dia: 'Qui', resultado: '2' },
      { n: 10, casa: 'Bayern Munich',     fora: 'Bodø/Glimt',        data: '2026-09-10', hora: '20:00', dia: 'Qui', resultado: null }
    ]
  },
  {
    matchDay: 'MD2',
    periodo: '13 e 14 de outubro de 2026',
    limiteISO: '2026-10-13T17:30:00',
    limiteTexto: 'Terça-feira, 13/10/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Lens',              fora: 'Sporting',          data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: '2' },
      { n:  2, casa: 'Roma',              fora: 'Real Madrid',       data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: '2' },
      { n:  3, casa: 'Galatasaray',       fora: 'Barcelona',         data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: '2' },
      { n:  4, casa: 'Manchester City',   fora: 'PSG',               data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: '2' },
      { n:  5, casa: 'Real Betis',        fora: 'Porto',             data: '2026-10-13', hora: '20:00', dia: 'Ter', resultado: '1' },
      { n:  6, casa: 'Arsenal',           fora: 'Lille',             data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: '1' },
      { n:  7, casa: 'Atlético Madrid',   fora: 'Manchester United', data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: '1' },
      { n:  8, casa: 'Inter',             fora: 'Club Brugge',       data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: '2' },
      { n:  9, casa: 'Leipzig',           fora: 'PSV Eindhoven',     data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: '1' },
      { n: 10, casa: 'Villarreal',        fora: 'Napoli',            data: '2026-10-14', hora: '20:00', dia: 'Qua', resultado: '1' }
    ]
  },
  {
    matchDay: 'MD3',
    periodo: '20 e 21 de outubro de 2026',
    limiteISO: '2026-10-20T17:30:00',
    limiteTexto: 'Terça-feira, 20/10/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Porto',             fora: 'PSV Eindhoven',     data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: '2' },
      { n:  2, casa: 'PSG',               fora: 'Barcelona',         data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: '1' },
      { n:  3, casa: 'Liverpool',         fora: 'Villarreal',        data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: '1' },
      { n:  4, casa: 'Manchester City',   fora: 'AEK Athens',        data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: '1' },
      { n:  5, casa: 'Napoli',            fora: 'Bodø/Glimt',        data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: '1' },
      { n:  6, casa: 'Stuttgart',         fora: 'Atlético Madrid',   data: '2026-10-20', hora: '20:00', dia: 'Ter', resultado: 'x' },
      { n:  7, casa: 'Real Madrid',       fora: 'Leipzig',           data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: '1' },
      { n:  8, casa: 'Sporting',          fora: 'LASK',              data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: '2' },
      { n:  9, casa: 'Bayern Munich',     fora: 'Arsenal',           data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: 'x' },
      { n: 10, casa: 'Aston Villa',       fora: 'Viking',            data: '2026-10-21', hora: '20:00', dia: 'Qua', resultado: '1' }
    ]
  },
  {
    matchDay: 'MD4',
    periodo: '3 e 4 de novembro de 2026',
    limiteISO: '2026-11-03T17:30:00',
    limiteTexto: 'Terça-feira, 03/11/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Shakhtar Donetsk',  fora: 'Sporting',          data: '2026-11-03', hora: '17:45', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Galatasaray',       fora: 'Stuttgart',         data: '2026-11-03', hora: '17:45', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Atlético Madrid',   fora: 'Bayern Munich',     data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Barcelona',         fora: 'Aston Villa',       data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Feyenoord',         fora: 'Inter',             data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Bodø/Glimt',        fora: 'Lille',             data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  7, casa: 'LASK',              fora: 'Slovan Bratislava', data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  8, casa: 'Manchester United', fora: 'Roma',              data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  9, casa: 'Villarreal',        fora: 'Paris Saint-Germain', data: '2026-11-03', hora: '20:00', dia: 'Ter', resultado: null },
      { n: 10, casa: 'Fenerbahçe',        fora: 'Liverpool',         data: '2026-11-04', hora: '17:45', dia: 'Qua', resultado: null },
      { n: 11, casa: 'Borussia Dortmund', fora: 'Real Betis',        data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 12, casa: 'Porto',             fora: 'Napoli',            data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 13, casa: 'PSV Eindhoven',     fora: 'Club Brugge',       data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 14, casa: 'Lens',              fora: 'Como',              data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 15, casa: 'Viking',            fora: 'Sabah',             data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 16, casa: 'Leipzig',           fora: 'Manchester City',   data: '2026-11-04', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD5',
    periodo: '24 e 25 de novembro de 2026',
    limiteISO: '2026-11-24T17:30:00',
    limiteTexto: 'Terça-feira, 24/11/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Galatasaray',       fora: 'Aston Villa',       data: '2026-11-24', hora: '17:45', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Bodø/Glimt',        fora: 'LASK',              data: '2026-11-24', hora: '17:45', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Feyenoord',         fora: 'Porto',             data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Leipzig',           fora: 'Lens',              data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Manchester City',   fora: 'Napoli',            data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Arsenal',           fora: 'Borussia Dortmund', data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  7, casa: 'Como',              fora: 'AEK Athens',        data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  8, casa: 'Real Madrid',       fora: 'PSV Eindhoven',     data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  9, casa: 'Slovan Bratislava', fora: 'Real Betis',        data: '2026-11-24', hora: '20:00', dia: 'Ter', resultado: null },
      { n: 10, casa: 'Slavia Praha',      fora: 'Villarreal',        data: '2026-11-25', hora: '17:45', dia: 'Qua', resultado: null },
      { n: 11, casa: 'Sporting',          fora: 'Manchester United', data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 12, casa: 'Inter',             fora: 'Stuttgart',         data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 13, casa: 'Shakhtar Donetsk',  fora: 'Fenerbahçe',        data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 14, casa: 'Lille',             fora: 'Bayern Munich',     data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 15, casa: 'Paris Saint-Germain', fora: 'Roma',              data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 16, casa: 'Club Brugge',       fora: 'Liverpool',         data: '2026-11-25', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD6',
    periodo: '8 e 9 de dezembro de 2026',
    limiteISO: '2026-12-08T17:30:00',
    limiteTexto: 'Terça-feira, 08/12/2026 às 17H30',
    jogos: [
      { n:  1, casa: 'Viking',            fora: 'Feyenoord',         data: '2026-12-08', hora: '17:45', dia: 'Ter', resultado: null },
      { n:  2, casa: 'AEK Athens',        fora: 'Galatasaray',       data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  3, casa: 'Roma',              fora: 'Sporting',          data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Barcelona',         fora: 'Manchester City',   data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Manchester United', fora: 'Leipzig',           data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Napoli',            fora: 'Club Brugge',       data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  7, casa: 'Aston Villa',       fora: 'Paris Saint-Germain', data: '2026-12-08', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  8, casa: 'Real Betis',        fora: 'Como',              data: '2026-12-09', hora: '17:45', dia: 'Qua', resultado: null },
      { n:  9, casa: 'Slovan Bratislava', fora: 'Shakhtar Donetsk',  data: '2026-12-09', hora: '17:45', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Arsenal',           fora: 'Real Madrid',       data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 11, casa: 'Borussia Dortmund', fora: 'Inter',             data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 12, casa: 'Liverpool',         fora: 'Porto',             data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 13, casa: 'Lens',              fora: 'Bodø/Glimt',        data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 14, casa: 'PSV Eindhoven',     fora: 'Atlético Madrid',   data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 15, casa: 'Stuttgart',         fora: 'Lille',             data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 16, casa: 'LASK',              fora: 'Fenerbahçe',        data: '2026-12-09', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD7',
    periodo: '19 e 20 de janeiro de 2027',
    limiteISO: '2027-01-19T17:30:00',
    limiteTexto: 'Terça-feira, 19/01/2027 às 17H30',
    jogos: [
      { n:  1, casa: 'Bodø/Glimt',        fora: 'Atlético Madrid',   data: '2027-01-19', hora: '17:45', dia: 'Ter', resultado: null },
      { n:  2, casa: 'Galatasaray',       fora: 'Feyenoord',         data: '2027-01-19', hora: '17:45', dia: 'Ter', resultado: null },
      { n:  3, casa: 'AEK Athens',        fora: 'Roma',              data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  4, casa: 'Aston Villa',       fora: 'Borussia Dortmund', data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  5, casa: 'Inter',             fora: 'Liverpool',         data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  6, casa: 'Porto',             fora: 'Slavia Praha',      data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  7, casa: 'Stuttgart',         fora: 'Club Brugge',       data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  8, casa: 'Lille',             fora: 'Slovan Bratislava', data: '2027-01-19', hora: '20:00', dia: 'Ter', resultado: null },
      { n:  9, casa: 'Fenerbahçe',        fora: 'Villarreal',        data: '2027-01-20', hora: '17:45', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Como',              fora: 'Paris Saint-Germain', data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 11, casa: 'Manchester United', fora: 'Bayern Munich',     data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 12, casa: 'Leipzig',           fora: 'Shakhtar Donetsk',  data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 13, casa: 'Lens',              fora: 'Manchester City',   data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 14, casa: 'Real Betis',        fora: 'Arsenal',           data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 15, casa: 'Sporting',          fora: 'Barcelona',         data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 16, casa: 'Viking',            fora: 'PSV Eindhoven',     data: '2027-01-20', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  },
  {
    matchDay: 'MD8',
    periodo: '27 de janeiro de 2027',
    limiteISO: '2027-01-27T17:30:00',
    limiteTexto: 'Quarta-feira, 27/01/2027 às 17H30',
    jogos: [
      { n:  1, casa: 'Roma',              fora: 'Lille',             data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  2, casa: 'Atlético Madrid',   fora: 'Fenerbahçe',        data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  3, casa: 'Borussia Dortmund', fora: 'AEK Athens',        data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  4, casa: 'Club Brugge',       fora: 'Bodø/Glimt',        data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  5, casa: 'Bayern Munich',     fora: 'Real Betis',        data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  6, casa: 'Barcelona',         fora: 'Como',              data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  7, casa: 'Feyenoord',         fora: 'Leipzig',           data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  8, casa: 'LASK',              fora: 'Porto',             data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n:  9, casa: 'Liverpool',         fora: 'Lens',              data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 10, casa: 'Manchester City',   fora: 'Sporting',          data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 11, casa: 'Paris Saint-Germain', fora: 'Galatasaray',       data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 12, casa: 'PSV Eindhoven',     fora: 'Stuttgart',         data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 13, casa: 'Slavia Praha',      fora: 'Aston Villa',       data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 14, casa: 'Villarreal',        fora: 'Manchester United', data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 15, casa: 'Napoli',            fora: 'Viking',            data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null },
      { n: 16, casa: 'Shakhtar Donetsk',  fora: 'Real Madrid',       data: '2027-01-27', hora: '20:00', dia: 'Qua', resultado: null }
    ]
  }
];

// --- helpers ---------------------------------------------------------------

// Junta as definicoes comuns a uma jornada e calcula os campos derivados.
function comConfig(jornada) {
  return {
    ...CONFIG,
    ...jornada,
    ativa: jornada.matchDay === matchDayAtivo(),
    totalJogos: jornada.jogos.length,
    resultadosConhecidos: jornada.jogos.filter((j) => j.resultado).length
  };
}

// A jornada ativa e a primeira cujo prazo de apostas ainda nao passou, mas so
// avanca para ela quando a anterior tiver todos os resultados lancados. Enquanto
// a anterior estiver por fechar, mostra-se a anterior (com apostas encerradas).
// Assim a jornada seguinte abre sozinha, sem editar nada.
function matchDayAtivo(agora = Date.now()) {
  for (let i = 0; i < JORNADAS.length; i++) {
    const j = JORNADAS[i];
    if (!apostasFechadas(j, agora)) {
      const anterior = JORNADAS[i - 1];
      const anteriorFechada = !anterior || anterior.jogos.every((g) => g.resultado);
      return anteriorFechada ? j.matchDay : anterior.matchDay;
    }
  }
  return JORNADAS[JORNADAS.length - 1].matchDay;
}

function jornadaAtiva() {
  return comConfig(JORNADAS.find((j) => j.matchDay === matchDayAtivo()));
}

function todasAsJornadas() {
  return JORNADAS.map(comConfig);
}

function jornadaPorMatchDay(matchDay) {
  const j = JORNADAS.find((x) => x.matchDay.toLowerCase() === String(matchDay).toLowerCase());
  return j ? comConfig(j) : null;
}

/*
 * O limiteISO esta escrito em hora de Lisboa e sem fuso ('2026-10-13T17:30:00').
 * O new Date() le-o na hora do servidor - e o Vercel corre em UTC, o que dava
 * uma hora de atraso no verao. Aqui converte-se sempre como hora de Lisboa.
 */
function instanteEmLisboa(iso) {
  const [data, hora] = iso.split('T');
  const [ano, mes, dia] = data.split('-').map(Number);
  const [h, min, s = 0] = hora.split(':').map(Number);
  const comoUTC = Date.UTC(ano, mes - 1, dia, h, min, s);

  // que horas marca o relogio de Lisboa nesse instante? a diferenca e o fuso
  const p = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
  }).formatToParts(new Date(comoUTC)).forEach((x) => { p[x.type] = Number(x.value); });
  const relogioLisboa = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);

  return comoUTC - (relogioLisboa - comoUTC);
}

// Passou a data limite de apostas desta jornada?
function apostasFechadas(jornada, agora = Date.now()) {
  return agora > instanteEmLisboa(jornada.limiteISO);
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
  instanteEmLisboa,
  apostasFechadas,
  contarAcertos
};
