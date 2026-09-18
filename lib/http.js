'use strict';

/*
 * Ajudas de HTTP partilhadas pelas rotas.
 *
 * Escritas contra o req/res simples do Node, para as mesmas rotas correrem
 * tal e qual nos dois sítios: no servidor local (server.js) e nas funções
 * do Vercel (api/[...rota].js).
 */

function json(res, status, corpo, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(corpo));
}

/*
 * Lê o corpo JSON do pedido.
 * No Vercel o corpo já vem lido em req.body; localmente é preciso ler o stream.
 */
function lerCorpo(req, limite = 64 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch {
        return Promise.reject(new Error('JSON invalido'));
      }
    }
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (chunk) => {
      dados += chunk;
      if (dados.length > limite) {
        reject(new Error('Corpo do pedido demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!dados) return resolve({});
      try {
        resolve(JSON.parse(dados));
      } catch {
        reject(new Error('JSON invalido'));
      }
    });
    req.on('error', reject);
  });
}

module.exports = { json, lerCorpo };
