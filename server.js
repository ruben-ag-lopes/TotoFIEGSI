'use strict';

/*
 * Servidor local, para desenvolvimento.
 *
 * Em produção (Vercel) não é este ficheiro que corre: os ficheiros de public/
 * são servidos como estáticos pela plataforma e a API vive em api/[...rota].js.
 * Ambos usam a MESMA tabela de rotas (lib/rotas.js), por isso o que testas aqui
 * é o que vai correr lá.
 *
 * Correr:
 *   node --env-file=.env server.js
 */

const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');

const config = require('./lib/config');
const { despachar } = require('./lib/rotas');
const { json } = require('./lib/http');
const { JORNADA } = require('./jornada');

config.validar();

const PORT = Number(process.env.PORT) || 3000;

// Só aceita ligações do próprio computador. Em produção quem trata disto é o
// Vercel; aqui evita que qualquer máquina da rede Wi-Fi chegue à app.
// Para servir a rede local de propósito: HOST=0.0.0.0 node --env-file=.env server.js
const HOST = process.env.HOST || '127.0.0.1';

const PUBLIC_DIR = path.join(__dirname, 'public');

// --- ficheiros estaticos ---------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

async function servirEstatico(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';

  const destino = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^[/\\]+/, ''));
  if (!destino.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Proibido');
    return;
  }

  try {
    const dados = await fsp.readFile(destino);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(dados);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p><a href="/">Voltar ao boletim</a></p>');
  }
}

// --- servidor --------------------------------------------------------------
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  try {
    const tratado = await despachar(req, res, req.method, url.pathname);
    if (tratado) return;

    if (url.pathname.startsWith('/api/')) {
      return json(res, 404, { erro: 'Endpoint desconhecido.' });
    }
    if (req.method !== 'GET') {
      return json(res, 405, { erro: 'Metodo nao permitido.' });
    }
    return await servirEstatico(req, res, url.pathname);
  } catch (err) {
    console.error('[erro]', req.method, url.pathname, err.message);
    if (!res.headersSent) json(res, 500, { erro: 'Erro interno do servidor.' });
  }
});

servidor.listen(PORT, HOST, () => {
  console.log('');
  console.log('  TotoFIEGSI  ' + JORNADA.matchDay + ' | ' + JORNADA.epoca);
  console.log('  ------------------------------------------------');
  console.log('  Servidor:   http://localhost:' + PORT);
  console.log('  A escutar:  ' + HOST + (HOST === '127.0.0.1' ? '  (so este computador)' : '  (toda a rede local)'));
  console.log('  Base dados: Supabase (' + config.SUPABASE_URL + ')');
  console.log('  Limite:     ' + JORNADA.limiteTexto);
  console.log('');
});
