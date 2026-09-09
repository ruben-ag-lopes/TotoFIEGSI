'use strict';

const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const { JORNADA } = require('./jornada');
const { todasAsJornadas, contarAcertos } = require('./jornadas');
const db = require('./db');

const PORT = Number(process.env.PORT) || 3000;

// Por omissao a app so aceita ligacoes do proprio computador. Os tuneis
// (Cloudflare, Tailscale) correm aqui e ligam-se a 127.0.0.1, por isso continuam a
// funcionar; o que deixa de acontecer e qualquer maquina da rede Wi-Fi chegar
// directamente a app. Para servir a rede local: HOST=0.0.0.0 node server.js
const HOST = process.env.HOST || '127.0.0.1';

const PUBLIC_DIR = path.join(__dirname, 'public');

// --- sessoes em memoria (chega para a v1 local) ----------------------------
const sessoes = new Map(); // token -> { utilizador, criado }
const DURACAO_SESSAO = 1000 * 60 * 60 * 8; // 8h

function criarSessao(utilizador) {
  const token = crypto.randomBytes(24).toString('hex');
  sessoes.set(token, { utilizador, criado: Date.now() });
  return token;
}

// O cookie so leva a flag Secure quando o pedido chegou por HTTPS, detetado pelo
// cabecalho X-Forwarded-Proto que qualquer proxy/tunel coloca. Em localhost, sem
// HTTPS, a flag ficaria a impedir o browser de guardar o cookie e o login deixaria
// de funcionar.
function porHttps(req) {
  return (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function cookieSessao(req, token) {
  const partes = [
    'sid=' + token,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=' + DURACAO_SESSAO / 1000
  ];
  if (porHttps(req)) partes.push('Secure');
  return partes.join('; ');
}

function cookieVazio(req) {
  const partes = ['sid=', 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (porHttps(req)) partes.push('Secure');
  return partes.join('; ');
}

// --- limite de tentativas de login (anti forca bruta) ----------------------
const MAX_TENTATIVAS = 5;          // tentativas falhadas permitidas...
const JANELA_TENTATIVAS = 60000;   // ...por minuto, para cada IP
const tentativas = new Map();      // ip -> { contagem, inicio }

function ipDoPedido(req) {
  // atras de um tunel ou proxy, o IP real do visitante vem no X-Forwarded-For
  const encaminhado = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return encaminhado || req.socket.remoteAddress || 'desconhecido';
}

// Devolve null se pode tentar, ou os segundos que falta esperar.
function esperaObrigatoria(ip) {
  const registo = tentativas.get(ip);
  if (!registo) return null;

  if (Date.now() - registo.inicio > JANELA_TENTATIVAS) {
    tentativas.delete(ip);
    return null;
  }
  if (registo.contagem < MAX_TENTATIVAS) return null;

  return Math.ceil((JANELA_TENTATIVAS - (Date.now() - registo.inicio)) / 1000);
}

function registarFalha(ip) {
  const registo = tentativas.get(ip);
  if (!registo || Date.now() - registo.inicio > JANELA_TENTATIVAS) {
    tentativas.set(ip, { contagem: 1, inicio: Date.now() });
  } else {
    registo.contagem += 1;
  }
}

const limparFalhas = (ip) => tentativas.delete(ip);

// evita que o Map cresca indefinidamente
setInterval(() => {
  const agora = Date.now();
  for (const [ip, r] of tentativas) {
    if (agora - r.inicio > JANELA_TENTATIVAS) tentativas.delete(ip);
  }
}, JANELA_TENTATIVAS).unref();

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
    const autenticado = sessaoDoPedido(req) !== null;

    // Os numeros de telemovel para o MB WAY sao dados pessoais: so vao para quem
    // tem sessao iniciada. Sem login, a lista de contactos vai vazia - o resto da
    // jornada (jogos, datas, limite, valor) e publico.
    const pagamento = autenticado
      ? JORNADA.pagamento
      : { ...JORNADA.pagamento, contactos: [] };

    json(res, 200, {
      ...JORNADA,
      pagamento,
      fechada: apostasFechadas(),
      totalApostasJornada: db.totalApostas(JORNADA.matchDay)
    });
  },

  // Historico de jornadas: jogos, resultados e classificacao. As apostas de
  // todas as jornadas (presentes e passadas) ficam na base de dados, marcadas
  // com o matchDay a que pertencem - por isso a classificacao de qualquer
  // jornada, mesmo ja fechada, e calculada aqui ao vivo a partir da BD.
  'GET /api/jornadas': async (req, res) => {
    const jornadas = todasAsJornadas().map((j) => {
      const apostas = db.todasAsApostas(j.matchDay);

      const classificacao = apostas
        .map((a) => {
          const u = db.obterUtilizador(a.utilizador);
          return {
            utilizador: a.utilizador,
            equipa: u ? u.equipa : null,
            chave: a.chave,
            acertos: contarAcertos(a.chave, j.jogos)
          };
        })
        .sort((x, y) => y.acertos - x.acertos || x.utilizador.localeCompare(y.utilizador));

      const totalApostas = apostas.length;
      const arrecadado = totalApostas * j.valorAposta;

      return {
        matchDay: j.matchDay,
        epoca: j.epoca,
        competicao: j.competicao,
        ativa: !!j.ativa,
        periodo: j.periodo,
        limiteTexto: j.limiteTexto,
        limiteISO: j.limiteISO,
        valorAposta: j.valorAposta,
        percentagemPrizePool: j.percentagemPrizePool,
        minimoApostas: j.minimoApostas,
        totalJogos: j.totalJogos,
        resultadosConhecidos: j.resultadosConhecidos,
        jogos: j.jogos,
        classificacao,
        totalApostas,
        arrecadado,
        prizePool: arrecadado * (j.percentagemPrizePool / 100),
        premioAtivo: totalApostas >= j.minimoApostas
      };
    });

    json(res, 200, { jornadas });
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
    const ip = ipDoPedido(req);
    const espera = esperaObrigatoria(ip);
    if (espera !== null) {
      return json(res, 429, {
        erro: 'Demasiadas tentativas. Aguarda ' + espera + ' segundos e tenta de novo.'
      }, { 'Retry-After': String(espera) });
    }

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
    if (pass.length < 8) {
      return json(res, 400, { erro: 'A password precisa de pelo menos 8 caracteres.' });
    }
    if (db.obterUtilizador(nome)) {
      return json(res, 409, { erro: 'Esse nome de utilizador ja existe.' });
    }

    db.criarUtilizador(nome, nomeEquipa, pass);
    const token = criarSessao(nome);
    json(res, 201, { utilizador: nome, equipa: nomeEquipa }, {
      'Set-Cookie': cookieSessao(req, token)
    });
  },

  'POST /api/login': async (req, res) => {
    const ip = ipDoPedido(req);
    const espera = esperaObrigatoria(ip);
    if (espera !== null) {
      return json(res, 429, {
        erro: 'Demasiadas tentativas falhadas. Aguarda ' + espera + ' segundos e tenta de novo.'
      }, { 'Retry-After': String(espera) });
    }

    const { utilizador, password } = await lerCorpo(req);
    const nome = String(utilizador || '').trim();
    const registo = db.obterUtilizador(nome);

    if (!registo || !db.verificarPassword(String(password || ''), registo.password)) {
      registarFalha(ip);
      // a mesma mensagem nos dois casos: nao revela se o utilizador existe
      return json(res, 401, { erro: 'Utilizador ou password incorretos.' });
    }
    limparFalhas(ip);
    const token = criarSessao(nome);
    json(res, 200, { utilizador: nome, equipa: registo.equipa }, {
      'Set-Cookie': cookieSessao(req, token)
    });
  },

  'POST /api/logout': async (req, res) => {
    const sessao = sessaoDoPedido(req);
    if (sessao) sessoes.delete(sessao.token);
    json(res, 200, { ok: true }, { 'Set-Cookie': cookieVazio(req) });
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
      return json(res, 400, {
        erro: JORNADA.colunas === 1
          ? 'So e permitida uma aposta por boletim.'
          : 'Maximo de ' + JORNADA.colunas + ' apostas por boletim.'
      });
    }

    // limite de apostas por utilizador nesta jornada
    const jaRegistadas = db.contarApostasDoUtilizador(sessao.utilizador, JORNADA.matchDay);
    const restantes = JORNADA.maxApostasPorUtilizador - jaRegistadas;
    if (restantes <= 0) {
      return json(res, 409, {
        erro: JORNADA.maxApostasPorUtilizador === 1
          ? 'Ja tens a tua aposta registada nesta jornada. So e permitida uma por jogador.'
          : 'Ja atingiste o limite de ' + JORNADA.maxApostasPorUtilizador +
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

    db.inserirApostas(sessao.utilizador, JORNADA.matchDay, validas);
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
    const apostas = db.apostasDoUtilizador(sessao.utilizador, JORNADA.matchDay);
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

servidor.listen(PORT, HOST, () => {
  console.log('');
  console.log('  TotoFIEGSI  ' + JORNADA.matchDay + ' | ' + JORNADA.epoca);
  console.log('  ------------------------------------------------');
  console.log('  Servidor:   http://localhost:' + PORT);
  console.log('  A escutar:  ' + HOST + (HOST === '127.0.0.1' ? '  (so este computador)' : '  (toda a rede local)'));
  console.log('  Base dados: ' + db.DB_PATH);
  console.log('  Limite:     ' + JORNADA.limiteTexto);
  console.log('');
});
