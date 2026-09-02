'use strict';

const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const { JORNADA } = require('./jornada');
const db = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- sessoes em memoria (chega para a v1 local) ----------------------------
const sessoes = new Map(); // token -> { utilizador, criado }
const DURACAO_SESSAO = 1000 * 60 * 60 * 8; // 8h

function criarSessao(utilizador) {
  const token = crypto.randomBytes(24).toString('hex');
  sessoes.set(token, { utilizador, criado: Date.now() });
  return token;
}

function sessaoDoPedido(req) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const i = c.indexOf('=');
        return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
      })
  );
  const token = cookies.sid;
  if (!token) return null;
  const sessao = sessoes.get(token);
  if (!sessao) return null;
  if (Date.now() - sessao.criado > DURACAO_SESSAO) {
    sessoes.delete(token);
    return null;
  }
  return { token, ...sessao };
}

// --- helpers ---------------------------------------------------------------
function json(res, status, corpo, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req, limite = 64 * 1024) {
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

function apostasFechadas() {
  return Date.now() > new Date(JORNADA.limiteISO).getTime();
}

// Valida uma chave: 10 prognosticos separados por ';', cada um 1 | x | 2.
function validarChave(chave) {
  if (typeof chave !== 'string') return null;
  const partes = chave.trim().toLowerCase().split(';').map((p) => p.trim());
  if (partes.length !== JORNADA.totalJogos) return null;
  for (const p of partes) {
    // um so prognostico por jogo: nada de multiplas
    if (p !== '1' && p !== 'x' && p !== '2') return null;
  }
  return partes.join(';');
}

// --- API -------------------------------------------------------------------
const rotas = {
  'GET /api/jornada': async (req, res) => {
    json(res, 200, {
      ...JORNADA,
      fechada: apostasFechadas(),
      totalApostasJornada: db.totalApostas()
    });
  },

  'GET /api/sessao': async (req, res) => {
    const sessao = sessaoDoPedido(req);
    if (!sessao) return json(res, 200, { autenticado: false });
    const u = db.obterUtilizador(sessao.utilizador);
    json(res, 200, {
      autenticado: true,
      utilizador: sessao.utilizador,
      equipa: u ? u.equipa : null
    });
  },

  'POST /api/registo': async (req, res) => {
    const { utilizador, equipa, password } = await lerCorpo(req);
    const nome = String(utilizador || '').trim();
    const nomeEquipa = String(equipa || '').trim();
    const pass = String(password || '');

    if (nome.length < 3) {
      return json(res, 400, { erro: 'O nome de utilizador precisa de pelo menos 3 caracteres.' });
    }
    if (!/^[\w.-]+$/.test(nome)) {
      return json(res, 400, { erro: 'O nome de utilizador so pode ter letras, numeros, ponto, hifen ou underscore.' });
    }
    if (nomeEquipa.length < 2) {
      return json(res, 400, { erro: 'Indica o nome da equipa.' });
    }
    if (pass.length < 4) {
      return json(res, 400, { erro: 'A password precisa de pelo menos 4 caracteres.' });
    }
    if (db.obterUtilizador(nome)) {
      return json(res, 409, { erro: 'Esse nome de utilizador ja existe.' });
    }

    db.criarUtilizador(nome, nomeEquipa, pass);
    const token = criarSessao(nome);
    json(res, 201, { utilizador: nome, equipa: nomeEquipa }, {
      'Set-Cookie': 'sid=' + token + '; HttpOnly; Path=/; SameSite=Lax; Max-Age=' + DURACAO_SESSAO / 1000
    });
  },

  'POST /api/login': async (req, res) => {
    const { utilizador, password } = await lerCorpo(req);
    const nome = String(utilizador || '').trim();
    const registo = db.obterUtilizador(nome);

    if (!registo || !db.verificarPassword(String(password || ''), registo.password)) {
      return json(res, 401, { erro: 'Utilizador ou password incorretos.' });
    }
    const token = criarSessao(nome);
    json(res, 200, { utilizador: nome, equipa: registo.equipa }, {
      'Set-Cookie': 'sid=' + token + '; HttpOnly; Path=/; SameSite=Lax; Max-Age=' + DURACAO_SESSAO / 1000
    });
  },

  'POST /api/logout': async (req, res) => {
    const sessao = sessaoDoPedido(req);
    if (sessao) sessoes.delete(sessao.token);
    json(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0' });
  },

  'POST /api/apostas': async (req, res) => {
    const sessao = sessaoDoPedido(req);
    if (!sessao) return json(res, 401, { erro: 'Precisas de iniciar sessao para apostar.' });
    if (apostasFechadas()) return json(res, 409, { erro: 'As apostas fecharam (' + JORNADA.limiteTexto + ').' });

    const { chaves } = await lerCorpo(req);
    if (!Array.isArray(chaves) || chaves.length === 0) {
      return json(res, 400, { erro: 'Nao recebi nenhuma aposta.' });
    }
    if (chaves.length > JORNADA.colunas) {
      return json(res, 400, { erro: 'Maximo de ' + JORNADA.colunas + ' apostas por boletim.' });
    }

    // limite de apostas por utilizador nesta jornada
    const jaRegistadas = db.contarApostasDoUtilizador(sessao.utilizador);
    const restantes = JORNADA.maxApostasPorUtilizador - jaRegistadas;
    if (restantes <= 0) {
      return json(res, 409, {
        erro: 'Ja atingiste o limite de ' + JORNADA.maxApostasPorUtilizador +
              ' apostas nesta jornada.',
        registadas: jaRegistadas,
        restantes: 0
      });
    }
    if (chaves.length > restantes) {
      return json(res, 409, {
        erro: 'So podes registar mais ' + restantes +
              (restantes === 1 ? ' aposta' : ' apostas') + ' nesta jornada (limite de ' +
              JORNADA.maxApostasPorUtilizador + ' por utilizador). Tens ' + jaRegistadas +
              ' ja registada(s) e tentaste submeter ' + chaves.length + '.',
        registadas: jaRegistadas,
        restantes
      });
    }

    const validas = [];
    for (const chave of chaves) {
      const ok = validarChave(chave);
      if (!ok) {
        return json(res, 400, {
          erro: 'Aposta invalida: cada aposta tem de ter ' + JORNADA.totalJogos +
                ' prognosticos (1, X ou 2), um unico por jogo.'
        });
      }
      validas.push(ok);
    }

    db.inserirApostas(sessao.utilizador, validas);
    json(res, 201, {
      ok: true,
      utilizador: sessao.utilizador,
      apostas: validas.length,
      total: validas.length * JORNADA.valorAposta,
      chaves: validas,
      registadas: jaRegistadas + validas.length,
      restantes: restantes - validas.length,
      limite: JORNADA.maxApostasPorUtilizador
    });
  },

  'GET /api/minhas-apostas': async (req, res) => {
    const sessao = sessaoDoPedido(req);
    if (!sessao) return json(res, 401, { erro: 'Sem sessao iniciada.' });
    const apostas = db.apostasDoUtilizador(sessao.utilizador);
    json(res, 200, {
      utilizador: sessao.utilizador,
      apostas: apostas.map((a) => ({ id: a.id, chave: a.chave, prognosticos: a.chave.split(';') })),
      registadas: apostas.length,
      limite: JORNADA.maxApostasPorUtilizador,
      restantes: Math.max(0, JORNADA.maxApostasPorUtilizador - apostas.length),
      valorTotal: apostas.length * JORNADA.valorAposta
    });
  }
};

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
  const chaveRota = req.method + ' ' + url.pathname;

  try {
    if (rotas[chaveRota]) return await rotas[chaveRota](req, res);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { erro: 'Endpoint desconhecido.' });
    if (req.method !== 'GET') return json(res, 405, { erro: 'Metodo nao permitido.' });
    return await servirEstatico(req, res, url.pathname);
  } catch (err) {
    console.error('[erro]', chaveRota, err.message);
    json(res, 500, { erro: err.message || 'Erro interno do servidor.' });
  }
});

servidor.listen(PORT, () => {
  console.log('');
  console.log('  TotoFIEGSI  ' + JORNADA.matchDay + ' | ' + JORNADA.epoca);
  console.log('  ------------------------------------------------');
  console.log('  Servidor:   http://localhost:' + PORT);
  console.log('  Base dados: ' + db.DB_PATH);
  console.log('  Limite:     ' + JORNADA.limiteTexto);
  console.log('');
});
