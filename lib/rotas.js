'use strict';

/*
 * A API do TotoFIEGSI — uma única tabela de rotas, usada nos dois sítios:
 *   - server.js              (servidor local, para desenvolvimento)
 *   - api/[...rota].js       (função serverless do Vercel)
 *
 * As rotas usam só o req/res simples do Node, por isso correm igual nos dois.
 */

const { JORNADA } = require('../jornada');
const { todasAsJornadas, contarAcertos } = require('../jornadas');
const db = require('./db');
const sessoes = require('./sessao');
const limite = require('./limite');
const { json, lerCorpo } = require('./http');

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

const rotas = {
  /*
   * Diagnóstico. Não toca na base de dados, por isso responde mesmo quando a
   * configuração está errada — é o primeiro sítio a visitar quando o site
   * falha depois de uma publicação.
   *
   * Diz se as variáveis de ambiente chegaram e que tipo de chave está em uso,
   * SEM nunca revelar o valor das chaves.
   */
  'GET /api/saude': async (req, res) => {
    const url = process.env.SUPABASE_URL || '';
    const chave = process.env.SUPABASE_SERVICE_KEY || '';
    const segredo = process.env.SESSAO_SEGREDO || '';

    const tipoDeChave = !chave ? 'em falta'
      : chave.startsWith('sb_secret_') ? 'secreta (sb_secret_) — correta'
      : chave.startsWith('sb_publishable_') ? 'PUBLICA (sb_publishable_) — ERRADA, o RLS vai bloquear'
      : chave.startsWith('eyJ') ? 'legada JWT — ver se o role é service_role'
      : 'formato desconhecido';

    const tudoOk = !!url && !!chave && segredo.length >= 32;

    json(res, tudoOk ? 200 : 503, {
      ok: tudoOk,
      jornadaAtiva: JORNADA.matchDay,
      node: process.version,
      configuracao: {
        SUPABASE_URL: url ? url : 'EM FALTA',
        SUPABASE_SERVICE_KEY: tipoDeChave,
        SESSAO_SEGREDO: !segredo ? 'EM FALTA'
          : segredo.length < 32 ? 'demasiado curto (' + segredo.length + ' caracteres)'
          : 'definido (' + segredo.length + ' caracteres)'
      },
      ...(tudoOk ? {} : {
        comoResolver: 'Vercel → o teu projeto → Settings → Environment Variables. ' +
                      'Depois de as acrescentares é preciso voltar a publicar (Deployments → Redeploy).'
      })
    });
  },

  'GET /api/jornada': async (req, res) => {
    const autenticado = sessoes.sessaoDoPedido(req) !== null;

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
      totalApostasJornada: await db.totalApostas(JORNADA.matchDay)
    });
  },

  // Historico de jornadas: jogos, resultados e classificacao. As apostas de
  // todas as jornadas (presentes e passadas) ficam na base de dados, marcadas
  // com o matchDay a que pertencem - por isso a classificacao de qualquer
  // jornada, mesmo ja fechada, e calculada aqui ao vivo a partir da BD.
  'GET /api/jornadas': async (req, res) => {
    // Dois pedidos ao todo, em vez de um por cada aposta.
    const [todasApostas, utilizadores] = await Promise.all([
      db.todasAsApostas(),
      db.todosOsUtilizadores()
    ]);

    const equipaDe = new Map(utilizadores.map((u) => [u.utilizador, u.equipa]));

    const porJornada = new Map();
    for (const a of todasApostas) {
      if (!porJornada.has(a.jornada)) porJornada.set(a.jornada, []);
      porJornada.get(a.jornada).push(a);
    }

    const jornadas = todasAsJornadas().map((j) => {
      const apostas = porJornada.get(j.matchDay) || [];

      const classificacao = apostas
        .map((a) => ({
          utilizador: a.utilizador,
          equipa: equipaDe.get(a.utilizador) ?? null,
          chave: a.chave,
          acertos: contarAcertos(a.chave, j.jogos)
        }))
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
    const sessao = sessoes.sessaoDoPedido(req);
    if (!sessao) return json(res, 200, { autenticado: false });

    const u = await db.obterUtilizador(sessao.utilizador);
    json(res, 200, {
      autenticado: true,
      utilizador: sessao.utilizador,
      equipa: u ? u.equipa : null
    });
  },

  'POST /api/registo': async (req, res) => {
    const ip = limite.ipDoPedido(req);
    const espera = await limite.esperaObrigatoria(ip);
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
    if (await db.obterUtilizador(nome)) {
      return json(res, 409, { erro: 'Esse nome de utilizador ja existe.' });
    }

    await db.criarUtilizador(nome, nomeEquipa, pass);
    json(res, 201, { utilizador: nome, equipa: nomeEquipa }, {
      'Set-Cookie': sessoes.cookieSessao(req, nome)
    });
  },

  'POST /api/login': async (req, res) => {
    const ip = limite.ipDoPedido(req);
    const espera = await limite.esperaObrigatoria(ip);
    if (espera !== null) {
      return json(res, 429, {
        erro: 'Demasiadas tentativas falhadas. Aguarda ' + espera + ' segundos e tenta de novo.'
      }, { 'Retry-After': String(espera) });
    }

    const { utilizador, password } = await lerCorpo(req);
    const nome = String(utilizador || '').trim();
    const registo = await db.obterUtilizador(nome);

    if (!registo || !db.verificarPassword(String(password || ''), registo.password)) {
      await limite.registarFalha(ip);
      // a mesma mensagem nos dois casos: nao revela se o utilizador existe
      return json(res, 401, { erro: 'Utilizador ou password incorretos.' });
    }

    await limite.limparFalhas(ip);
    json(res, 200, { utilizador: nome, equipa: registo.equipa }, {
      'Set-Cookie': sessoes.cookieSessao(req, nome)
    });
  },

  'POST /api/logout': async (req, res) => {
    json(res, 200, { ok: true }, { 'Set-Cookie': sessoes.cookieVazio(req) });
  },

  'POST /api/apostas': async (req, res) => {
    const sessao = sessoes.sessaoDoPedido(req);
    if (!sessao) return json(res, 401, { erro: 'Precisas de iniciar sessao para apostar.' });
    if (apostasFechadas()) {
      return json(res, 409, { erro: 'As apostas fecharam (' + JORNADA.limiteTexto + ').' });
    }

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
    const jaRegistadas = await db.contarApostasDoUtilizador(sessao.utilizador, JORNADA.matchDay);
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

    await db.inserirApostas(sessao.utilizador, JORNADA.matchDay, validas);
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
    const sessao = sessoes.sessaoDoPedido(req);
    if (!sessao) return json(res, 401, { erro: 'Sem sessao iniciada.' });

    const apostas = await db.apostasDoUtilizador(sessao.utilizador, JORNADA.matchDay);
    json(res, 200, {
      utilizador: sessao.utilizador,
      apostas: apostas.map((a) => ({
        id: a.id,
        chave: a.chave,
        prognosticos: a.chave.split(';')
      })),
      registadas: apostas.length,
      limite: JORNADA.maxApostasPorUtilizador,
      restantes: Math.max(0, JORNADA.maxApostasPorUtilizador - apostas.length),
      valorTotal: apostas.length * JORNADA.valorAposta
    });
  }
};

/*
 * Despacha um pedido para a rota certa.
 * Devolve true se tratou do pedido, false se a rota não existe.
 */
async function despachar(req, res, metodo, caminho) {
  const rota = rotas[metodo + ' ' + caminho];
  if (!rota) return false;

  try {
    await rota(req, res);
  } catch (err) {
    console.error('[erro]', metodo, caminho, err.message);
    if (!res.headersSent) {
      json(res, 500, { erro: 'Erro interno do servidor.' });
    }
  }
  return true;
}

module.exports = { rotas, despachar };
