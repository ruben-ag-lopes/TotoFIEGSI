'use strict';

/*
 * Limite de tentativas de login (anti força bruta).
 *
 * Tal como as sessões, isto não pode viver em memória num ambiente serverless:
 * cada pedido pode cair noutra instância e o contador andaria sempre a zero.
 * Fica numa tabela pequena no Supabase, partilhada por todas as instâncias.
 *
 * Nota assumida: o incremento é ler-e-escrever, não é atómico. Duas tentativas
 * exatamente em simultâneo podem contar como uma. À escala desta app isso
 * deixa passar uma tentativa a mais, não desfaz a proteção.
 */

const supabase = require('./supabase');

const MAX_TENTATIVAS = 5;        // falhas permitidas...
const JANELA_SEGUNDOS = 60;      // ...por minuto, para cada IP

// Atrás de um túnel ou proxy (Vercel, Cloudflare), o IP real do visitante vem
// no X-Forwarded-For. Sem isto, todos os visitantes apareciam com o mesmo IP e
// o primeiro a errar bloqueava toda a gente.
function ipDoPedido(req) {
  const encaminhado = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return encaminhado || req.socket?.remoteAddress || 'desconhecido';
}

async function registoDoIp(ip) {
  const linhas = await supabase.selecionar('tentativas_login', {
    ip: 'eq.' + ip,
    limit: 1
  });
  return linhas[0] || null;
}

const expirou = (registo) =>
  Date.now() - new Date(registo.inicio).getTime() > JANELA_SEGUNDOS * 1000;

/** Devolve null se pode tentar, ou os segundos que falta esperar. */
async function esperaObrigatoria(ip) {
  const registo = await registoDoIp(ip);
  if (!registo || expirou(registo)) return null;
  if (registo.contagem < MAX_TENTATIVAS) return null;

  const decorridos = (Date.now() - new Date(registo.inicio).getTime()) / 1000;
  return Math.max(1, Math.ceil(JANELA_SEGUNDOS - decorridos));
}

async function registarFalha(ip) {
  const registo = await registoDoIp(ip);

  if (!registo || expirou(registo)) {
    await supabase.inserirOuAtualizar('tentativas_login', {
      ip,
      contagem: 1,
      inicio: new Date().toISOString()
    });
    return;
  }

  await supabase.atualizar('tentativas_login', { ip: 'eq.' + ip }, {
    contagem: registo.contagem + 1
  });
}

async function limparFalhas(ip) {
  await supabase.apagar('tentativas_login', { ip: 'eq.' + ip });
}

module.exports = {
  MAX_TENTATIVAS,
  JANELA_SEGUNDOS,
  ipDoPedido,
  esperaObrigatoria,
  registarFalha,
  limparFalhas
};
