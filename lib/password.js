'use strict';

/*
 * Hash de passwords com scrypt (do módulo crypto do Node).
 * Formato guardado:  scrypt$<salt em hex>$<hash em hex>
 *
 * Igual ao que já era usado com o SQLite, por isso as passwords existentes
 * continuam a funcionar depois da migração para o Supabase.
 */

const crypto = require('node:crypto');

function criarHash(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return 'scrypt$' + salt.toString('hex') + '$' + hash.toString('hex');
}

function verificar(password, guardada) {
  const partes = String(guardada || '').split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;

  const salt = Buffer.from(partes[1], 'hex');
  const esperado = Buffer.from(partes[2], 'hex');
  if (!salt.length || !esperado.length) return false;

  const obtido = crypto.scryptSync(password, salt, esperado.length);
  return crypto.timingSafeEqual(esperado, obtido);
}

module.exports = { criarHash, verificar };
