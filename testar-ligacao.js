'use strict';

/*
 * Diagnóstico da ligação ao Supabase.
 *
 *   node --env-file=.env testar-ligacao.js
 *
 * Diz se o URL e a chave estão certos, se as tabelas existem, e — o mais
 * importante — se a chave é do tipo certo (uma chave secreta, que ignora o
 * RLS; e não a pública, que fica bloqueada por ele).
 *
 * Não escreve nada de permanente: a linha de teste que insere é apagada logo
 * a seguir.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const SEGREDO = process.env.SESSAO_SEGREDO || '';

const verde = (t) => '  OK   | ' + t;
const vermelho = (t) => ' FALHA | ' + t;

function descreverChave(chave) {
  if (chave.startsWith('sb_secret_')) return 'chave secreta, formato novo (sb_secret_...)  <- serve';
  if (chave.startsWith('sb_publishable_')) return 'chave PUBLICA, formato novo (sb_publishable_...)  <- NAO serve';
  if (chave.startsWith('eyJ')) {
    // as chaves legadas sao JWT: o payload diz o papel
    try {
      const payload = JSON.parse(Buffer.from(chave.split('.')[1], 'base64').toString('utf8'));
      const papel = payload.role || '(sem role)';
      return 'chave legada JWT, role="' + papel + '"' +
             (papel === 'service_role' ? '  <- serve' : '  <- NAO serve');
    } catch {
      return 'chave legada JWT (nao consegui ler o role)';
    }
  }
  return 'formato desconhecido';
}

(async () => {
  console.log('');
  console.log('--- configuracao ---');

  if (!SUPABASE_URL) { console.log(vermelho('SUPABASE_URL vazio')); process.exit(1); }
  if (!CHAVE) { console.log(vermelho('SUPABASE_SERVICE_KEY vazio')); process.exit(1); }

  console.log(verde('SUPABASE_URL: ' + SUPABASE_URL));
  console.log('       | tipo de chave: ' + descreverChave(CHAVE));
  console.log('       | ' + (SEGREDO.length >= 32
    ? 'SESSAO_SEGREDO tem ' + SEGREDO.length + ' caracteres (bom)'
    : 'ATENCAO: SESSAO_SEGREDO tem so ' + SEGREDO.length + ' caracteres - gera um maior'));

  const cabecalhos = {
    apikey: CHAVE,
    Authorization: 'Bearer ' + CHAVE,
    'Content-Type': 'application/json'
  };

  console.log('');
  console.log('--- tabelas ---');

  let falhou = false;

  for (const tabela of ['utilizadores', 'apostas', 'tentativas_login']) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/' + tabela + '?select=*&limit=1', {
        headers: cabecalhos
      });
      if (r.ok) {
        const linhas = await r.json();
        console.log(verde(tabela + ': acessivel (' + linhas.length + ' linha(s) na amostra)'));
      } else {
        const texto = await r.text();
        console.log(vermelho(tabela + ': HTTP ' + r.status + ' — ' + texto.slice(0, 160)));
        falhou = true;
      }
    } catch (err) {
      console.log(vermelho(tabela + ': ' + err.message));
      falhou = true;
    }
  }

  if (falhou) {
    console.log('');
    console.log('Se deu 401/403: a chave esta errada ou e a publica.');
    console.log('Se disse que a tabela nao existe: falta correr o sql/esquema.sql no SQL Editor.');
    process.exit(1);
  }

  console.log('');
  console.log('--- escrita (a chave ignora o RLS?) ---');

  const ipTeste = '0.0.0.0-teste-de-ligacao';
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/tentativas_login', {
      method: 'POST',
      headers: { ...cabecalhos, Prefer: 'return=representation' },
      body: JSON.stringify([{ ip: ipTeste, contagem: 1 }])
    });

    if (!r.ok) {
      const texto = await r.text();
      console.log(vermelho('nao consegui escrever: HTTP ' + r.status + ' — ' + texto.slice(0, 200)));
      console.log('');
      console.log('Isto e o sintoma tipico de estares a usar a chave PUBLICA (anon /');
      console.log('publishable): o RLS bloqueia-a, tal como deve. Vai a');
      console.log('Project Settings -> API Keys e usa uma chave SECRETA.');
      process.exit(1);
    }

    console.log(verde('escrita permitida — a chave ignora o RLS, e a certa'));

    await fetch(SUPABASE_URL + '/rest/v1/tentativas_login?ip=eq.' + encodeURIComponent(ipTeste), {
      method: 'DELETE',
      headers: cabecalhos
    });
    console.log(verde('linha de teste apagada — nao ficou lixo'));
  } catch (err) {
    console.log(vermelho('erro na escrita: ' + err.message));
    process.exit(1);
  }

  console.log('');
  console.log('Tudo pronto. Podes correr a migracao:');
  console.log('  node --env-file=.env migrar.js');
  console.log('');
})().catch((err) => {
  console.error('');
  console.error('Rebentou: ' + err.message);
  console.error('Verifica o SUPABASE_URL (deve ser https://<projeto>.supabase.co).');
  process.exit(1);
});
