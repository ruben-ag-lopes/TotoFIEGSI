'use strict';

/*
 * Mantem o totofiegsi.duckdns.org a apontar para o IP publico desta ligacao.
 * O IP domestico muda de tempos a tempos, por isso este script deve correr
 * periodicamente (ver README, seccao do dominio).
 *
 *   node duckdns.js            -> atualiza e mostra o resultado
 *   node duckdns.js --ver      -> so mostra o IP publico atual, sem atualizar
 *
 * O token do DuckDNS e lido, por esta ordem:
 *   1. variavel de ambiente DUCKDNS_TOKEN
 *   2. ficheiro duckdns.token (uma linha, so o token) - ignorado pelo git
 */

const fs = require('node:fs');
const path = require('node:path');

const SUBDOMINIO = 'totofiegsi';
const FICHEIRO_TOKEN = path.join(__dirname, 'duckdns.token');

function lerToken() {
  if (process.env.DUCKDNS_TOKEN) return process.env.DUCKDNS_TOKEN.trim();
  if (fs.existsSync(FICHEIRO_TOKEN)) return fs.readFileSync(FICHEIRO_TOKEN, 'utf8').trim();
  return null;
}

async function ipPublico() {
  const r = await fetch('https://api.ipify.org');
  return (await r.text()).trim();
}

(async () => {
  const ip = await ipPublico();

  if (process.argv.includes('--ver')) {
    console.log('IP publico atual: ' + ip);
    return;
  }

  const token = lerToken();
  if (!token) {
    console.error('Falta o token do DuckDNS.');
    console.error('Cria o ficheiro duckdns.token com o token da tua conta,');
    console.error('ou define a variavel de ambiente DUCKDNS_TOKEN.');
    process.exit(1);
  }

  // ip vazio = o DuckDNS deteta o IP de origem sozinho; enviamos o nosso por seguranca
  const url = 'https://www.duckdns.org/update?domains=' + SUBDOMINIO +
              '&token=' + encodeURIComponent(token) + '&ip=' + ip;

  const resposta = await fetch(url);
  const corpo = (await resposta.text()).trim();

  const quando = new Date().toLocaleString('pt-PT');
  if (corpo === 'OK') {
    console.log('[' + quando + '] ' + SUBDOMINIO + '.duckdns.org -> ' + ip + ' (OK)');
  } else {
    console.error('[' + quando + '] DuckDNS respondeu "' + corpo + '" - verifica o subdominio e o token.');
    process.exit(1);
  }
})().catch((err) => {
  console.error('Erro ao atualizar o DuckDNS: ' + err.message);
  process.exit(1);
});
