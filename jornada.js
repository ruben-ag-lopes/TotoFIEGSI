'use strict';

/*
 * A jornada que está neste momento a receber apostas.
 *
 * Os dados vivem todos em jornadas.js — este ficheiro existe apenas para dar
 * acesso directo à jornada ativa, que é a que o boletim mostra.
 */

const { jornadaAtiva } = require('./jornadas');

const JORNADA = jornadaAtiva();

module.exports = { JORNADA };
