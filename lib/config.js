'use strict';

/*
 * Configuração vinda do ambiente.
 *
 * Localmente:  node --env-file=.env server.js   (o .env não vai para o git)
 * No Vercel:   Project Settings → Environment Variables
 *
 * SUPABASE_URL          https://<projeto>.supabase.co
 * SUPABASE_SERVICE_KEY  chave service_role — acesso total à base de dados.
 *                       NUNCA pode chegar ao browser: é usada só aqui, no servidor.
 * SESSAO_SEGREDO        segredo aleatório para assinar os cookies de sessão.
 *                       Gera um com:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SESSAO_SEGREDO = process.env.SESSAO_SEGREDO || '';

// Falta alguma? Dizemos qual, em vez de rebentar mais à frente com um erro obscuro.
function validar() {
  const emFalta = [];
  if (!SUPABASE_URL) emFalta.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) emFalta.push('SUPABASE_SERVICE_KEY');
  if (!SESSAO_SEGREDO) emFalta.push('SESSAO_SEGREDO');

  if (emFalta.length) {
    throw new Error(
      'Faltam variáveis de ambiente: ' + emFalta.join(', ') + '.\n' +
      'Localmente, cria um ficheiro .env (ver .env.exemplo) e corre:\n' +
      '  node --env-file=.env server.js'
    );
  }
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SESSAO_SEGREDO,
  validar
};
