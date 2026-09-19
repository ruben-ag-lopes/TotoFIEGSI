'use strict';

/*
 * Lê o jogo Fantasy a partir da Google Sheet publicada em CSV.
 *
 * A folha é a fonte da verdade: o site não guarda nada disto, lê sempre de lá.
 * Quem gere a folha atualiza os valores e o site reflete-os (com um pequeno
 * atraso, por causa da cache).
 *
 * A folha tem dois blocos, um a seguir ao outro, ambos a começar por uma linha
 * de cabeçalho "Equipas | Craque | MD1 | ...":
 *   1º bloco — PONTOS por jornada e total
 *   2º bloco — MULTAS por jornada, com Total, Pago e Em Falta
 *
 * Os blocos são encontrados pelo cabeçalho, não por números de linha fixos,
 * para a folha poder crescer sem partir isto.
 */

const { analisar, numero } = require('./csv');

const URL_FOLHA = process.env.FANTASY_CSV_URL || '';

// A folha muda pouco; a cache evita ir à Google a cada visita.
const CACHE_MS = 2 * 60 * 1000;
let cache = { quando: 0, dados: null };

/** Encontra as linhas que são cabeçalho de um bloco. */
function linhasDeCabecalho(linhas) {
  const indices = [];
  linhas.forEach((linha, i) => {
    const temEquipas = linha.some((c) => c.trim().toLowerCase() === 'equipas');
    const temCraque = linha.some((c) => c.trim().toLowerCase() === 'craque');
    if (temEquipas && temCraque) indices.push(i);
  });
  return indices;
}

/** Lê um bloco a partir do seu cabeçalho, até à primeira linha sem equipa. */
function lerBloco(linhas, iCabecalho) {
  const cabecalho = linhas[iCabecalho];

  const colEquipa = cabecalho.findIndex((c) => c.trim().toLowerCase() === 'equipas');
  const colCraque = cabecalho.findIndex((c) => c.trim().toLowerCase() === 'craque');

  // colunas de jornada: tudo entre o Craque e o Total
  const colTotal = cabecalho.findIndex((c) => c.trim().toLowerCase() === 'total');
  const colPago = cabecalho.findIndex((c) => c.trim().toLowerCase() === 'pago');
  const colEmFalta = cabecalho.findIndex((c) => c.trim().toLowerCase() === 'em falta');

  const jornadas = [];
  const fim = colTotal > -1 ? colTotal : cabecalho.length;
  for (let c = colCraque + 1; c < fim; c++) {
    const nome = (cabecalho[c] || '').trim();
    if (nome) jornadas.push({ coluna: c, nome });
  }

  const equipas = [];
  for (let i = iCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    const equipa = (linha[colEquipa] || '').trim();

    if (!equipa) break;                          // linha vazia = fim do bloco
    if (equipa.toLowerCase().startsWith('total')) break;  // linha "Total multas"

    const porJornada = {};
    jornadas.forEach((j) => { porJornada[j.nome] = numero(linha[j.coluna]); });

    equipas.push({
      equipa,
      craque: (linha[colCraque] || '').trim(),
      porJornada,
      total: colTotal > -1 ? numero(linha[colTotal]) : null,
      pago: colPago > -1 ? numero(linha[colPago]) : null,
      emFalta: colEmFalta > -1 ? numero(linha[colEmFalta]) : null
    });
  }

  return { jornadas, equipas, temPagamentos: colPago > -1 };
}

async function obter() {
  if (!URL_FOLHA) {
    throw new Error('Falta a variável de ambiente FANTASY_CSV_URL (o link CSV da Google Sheet).');
  }

  if (cache.dados && Date.now() - cache.quando < CACHE_MS) {
    return { ...cache.dados, daCache: true };
  }

  const resposta = await fetch(URL_FOLHA, { redirect: 'follow' });
  if (!resposta.ok) {
    throw new Error('A Google Sheet respondeu ' + resposta.status);
  }

  const texto = await resposta.text();

  // Se a folha deixar de estar publicada, a Google devolve uma página de login
  // em HTML em vez do CSV — é preciso apanhar isso e dizer o que se passa.
  if (/^\s*<(!doctype|html)/i.test(texto)) {
    throw new Error(
      'A Google Sheet devolveu HTML em vez de CSV — provavelmente deixou de estar ' +
      'publicada. Ficheiro → Partilhar → Publicar na Web, formato CSV.'
    );
  }

  const linhas = analisar(texto);
  const cabecalhos = linhasDeCabecalho(linhas);

  if (!cabecalhos.length) {
    throw new Error('Não encontrei nenhuma tabela com as colunas "Equipas" e "Craque".');
  }

  // 1º bloco = pontos; 2º bloco (se existir) = multas
  const pontos = lerBloco(linhas, cabecalhos[0]);
  const multas = cabecalhos[1] !== undefined ? lerBloco(linhas, cabecalhos[1]) : null;

  const dados = {
    classificacao: pontos.equipas
      .map((e) => ({
        equipa: e.equipa,
        craque: e.craque,
        porJornada: e.porJornada,
        total: e.total ?? 0
      }))
      .sort((a, b) => b.total - a.total),

    jornadasPontos: pontos.jornadas.map((j) => j.nome),

    multas: multas ? {
      jornadas: multas.jornadas.map((j) => j.nome),
      equipas: multas.equipas.map((e) => ({
        equipa: e.equipa,
        craque: e.craque,
        porJornada: e.porJornada,
        total: e.total ?? 0,
        pago: e.pago ?? 0,
        emFalta: e.emFalta ?? 0
      }))
    } : null,

    atualizado: new Date().toISOString(),
    daCache: false
  };

  cache = { quando: Date.now(), dados };
  return dados;
}

module.exports = { obter, _lerBloco: lerBloco, _linhasDeCabecalho: linhasDeCabecalho };
