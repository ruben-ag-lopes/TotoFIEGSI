'use strict';

/*
 * Ponto de entrada da API no Vercel.
 *
 * Um único "catch-all": tudo o que chegue a /api/... cai aqui e é despachado
 * pela mesma tabela de rotas que o servidor local usa (lib/rotas.js). Assim
 * não há duas versões da API para manter.
 */

const { despachar } = require('../lib/rotas');
const { json } = require('../lib/http');

module.exports = async (req, res) => {
  const caminho = (req.url || '').split('?')[0];
  const tratado = await despachar(req, res, req.method, caminho);

  if (!tratado) {
    json(res, 404, { erro: 'Endpoint desconhecido.' });
  }
};
