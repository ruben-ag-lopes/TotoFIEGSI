'use strict';

/*
 * Sessões em cookie assinado (HMAC-SHA256), sem estado no servidor.
 *
 * Porquê: em serverless (Vercel) cada pedido pode cair numa instância
 * diferente, e as instâncias morrem a toda a hora. O Map em memória que
 * usávamos no servidor local perdia sessões ao acaso — aqui o cookie
 * transporta a identidade e a assinatura prova que não foi adulterado.
 *
 * Formato:  <payload em base64url>.<assinatura em base64url>
 * Payload:  { u: "<utilizador>", exp: <epoch em segundos> }
 *
 * Limitação assumida: sendo sem estado, não há revogação do lado do servidor.
 * O logout apaga o cookie do browser; um cookie roubado continua válido até
 * expirar. Para o que esta app faz, é o compromisso certo.
 */

const crypto = require('node:crypto');
const { SESSAO_SEGREDO } = require('./config');

const DURACAO_SEGUNDOS = 8 * 60 * 60; // 8h, como antes

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function assinar(payloadCodificado) {
  return crypto.createHmac('sha256', SESSAO_SEGREDO).update(payloadCodificado).digest('base64url');
}

function criarToken(utilizador) {
  const payload = { u: utilizador, exp: Math.floor(Date.now() / 1000) + DURACAO_SEGUNDOS };
  const codificado = b64(JSON.stringify(payload));
  return codificado + '.' + assinar(codificado);
}

function lerToken(token) {
  if (typeof token !== 'string') return null;

  const ponto = token.lastIndexOf('.');
  if (ponto < 1) return null;

  const codificado = token.slice(0, ponto);
  const assinatura = token.slice(ponto + 1);
  const esperada = assinar(codificado);

  // comparação em tempo constante: não revela onde a assinatura difere
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(codificado, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload.u !== 'string') return null;
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return { utilizador: payload.u };
}

// --- cookies ---------------------------------------------------------------

function lerCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const i = c.indexOf('=');
        return i < 0 ? [c, ''] : [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
      })
  );
}

// A flag Secure só entra quando o pedido chegou por HTTPS. Em localhost, sem
// HTTPS, o browser recusaria o cookie e o login deixava de funcionar.
function porHttps(req) {
  return (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function cookieSessao(req, utilizador) {
  const partes = [
    'sid=' + criarToken(utilizador),
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=' + DURACAO_SEGUNDOS
  ];
  if (porHttps(req)) partes.push('Secure');
  return partes.join('; ');
}

function cookieVazio(req) {
  const partes = ['sid=', 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (porHttps(req)) partes.push('Secure');
  return partes.join('; ');
}

/** Devolve { utilizador } se o cookie for válido, ou null. */
function sessaoDoPedido(req) {
  return lerToken(lerCookies(req).sid);
}

module.exports = {
  DURACAO_SEGUNDOS,
  cookieSessao,
  cookieVazio,
  sessaoDoPedido,
  porHttps,
  // para testes
  _criarToken: criarToken,
  _lerToken: lerToken
};
