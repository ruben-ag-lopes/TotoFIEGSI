'use strict';

/*
 * Leitor de CSV mínimo, sem dependências.
 *
 * Tem de respeitar campos entre aspas porque a folha vem em português: os
 * pontos usam vírgula decimal ("3,5") e a vírgula é também o separador de
 * colunas. Um split(',') ingénuo partiria 3,5 em "3" e "5" — e ninguém daria
 * por isso até alguém reclamar da pontuação.
 */

/** Converte texto CSV numa matriz de linhas × colunas. */
function analisar(texto) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }  // aspas escapadas
        else dentroDeAspas = false;
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') { dentroDeAspas = true; continue; }
    if (c === ',') { linha.push(campo); campo = ''; continue; }

    if (c === '\r') continue;
    if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
      continue;
    }

    campo += c;
  }

  if (campo !== '' || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas;
}

/*
 * Converte um valor da folha em número.
 * Trata a vírgula decimal portuguesa e os #N/A das fórmulas por preencher.
 * Devolve null quando não há número nenhum.
 */
function numero(valor) {
  if (valor === undefined || valor === null) return null;

  const texto = String(valor).trim();
  if (!texto || texto.startsWith('#')) return null;   // #N/A, #REF!, #DIV/0!

  const n = Number(texto.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

module.exports = { analisar, numero };
