# Passagem de administração — TotoFIEGSI

Este documento serve para a pessoa que passa a administrar o TotoFIEGSI conseguir
manter a aplicação sem depender de quem a construiu. Não contém segredos: as chaves
e palavras-passe são passadas por um canal seguro (ver secção 2).

---

## 1. O que existe e onde está

| Peça | Onde | Para quê |
|---|---|---|
| Código | GitHub — `ruben-ag-lopes/TotoFIEGSI` (privado) | tudo o que a aplicação faz |
| Site | Vercel — projeto `totofiegsi` → `totofiegsi.vercel.app` | aloja e publica o site |
| Base de dados | Supabase — projeto `zkwgrawwbjrwmadrwwnd` | utilizadores, apostas, sessões de login |
| Classificação e multas Fantasy | Google Sheet publicada em CSV | fonte da página Fantasy (lida pelo site) |
| Variáveis de ambiente | Vercel → Settings → Environment Variables | chaves de acesso (ver secção 2) |

Não há domínio próprio: o endereço é o `*.vercel.app`.

---

## 2. Acessos e segredos

Variáveis de ambiente que o site precisa (no Vercel, e no `.env` local):

| Nome | O que é | Onde se obtém |
|---|---|---|
| `SUPABASE_URL` | endereço do projeto Supabase | Supabase → Project Settings → Data API |
| `SUPABASE_SERVICE_KEY` | chave `service_role` (acesso total à base de dados) | Supabase → Project Settings → API Keys |
| `SESSAO_SEGREDO` | segredo que assina os cookies de login (mín. 32 caracteres) | gerar com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FANTASY_CSV_URL` | link CSV da Google Sheet do Fantasy | Google Sheets → Ficheiro → Partilhar → Publicar na Web → CSV |

**Regras:**
- Nunca colocar estes valores no git, num chat, num email ou num ficheiro partilhado.
- Guardar num gestor de palavras-passe (ex.: Bitwarden, 1Password) partilhado só pelos administradores.
- Se a chave `service_role` for exposta, rodá-la no Supabase e atualizar o Vercel.
- Mudar `SESSAO_SEGREDO` termina todas as sessões de login (todos têm de voltar a entrar). É seguro fazê-lo se houver suspeita de comprometimento.

---

## 3. Transferência técnica (quem passa → quem recebe)

Ordem recomendada. Fazer tudo antes de desligar o acesso de quem passa.

### 3.1 GitHub
1. Quem passa: Settings do repositório → Collaborators → adiciona a pessoa que recebe com permissão **Admin**.
2. Quem recebe: aceita o convite por email.
3. Confirmar: a pessoa que recebe consegue fazer `git clone` e `git push`.
4. (Opcional, mais tarde) Transferir a propriedade do repositório para a conta ou organização definitiva.

### 3.2 Vercel
1. Quem passa: Team/Account → Members → convida a pessoa que recebe como **Owner** (ou transfere o projeto para a equipa dela).
2. Quem recebe: aceita e confirma que vê o projeto `totofiegsi`, os **Deployments** e as **Environment Variables**.
3. Confirmar: abrir `https://totofiegsi.vercel.app/api/saude` — tem de responder `"ok": true`.

### 3.3 Supabase
1. Quem passa: Project Settings → Team → convida a pessoa que recebe como **Owner**.
2. Quem recebe: aceita e confirma que consegue abrir o **Table Editor** e o **SQL Editor**.
3. Atenção ao plano gratuito: o projeto **pausa após 7 dias sem atividade**. Ver secção 4.2.

### 3.4 Google Sheet do Fantasy
1. Quem passa: Partilhar → adiciona a pessoa que recebe como **Editor**.
2. Confirmar: a pessoa que recebe consegue editar a folha. O link CSV publicado não muda se a folha for a mesma.

### 3.5 Variáveis de ambiente
1. Quem passa: exporta os quatro valores da secção 2 para o gestor de palavras-passe partilhado.
2. Quem recebe: confirma que os valores estão no Vercel (não os copia para outro lado).

### 3.6 Confirmação final
- [ ] `git clone` e `git push` funcionam para quem recebe
- [ ] Vercel: quem recebe vê o projeto e os deployments
- [ ] Supabase: quem recebe consegue ver as tabelas `utilizadores` e `apostas`
- [ ] Google Sheet: quem recebe consegue editar
- [ ] `/api/saude` responde `ok: true`
- [ ] Quem passa removeu-se como Owner/Admin **só depois** de tudo o resto estar confirmado

---

## 4. Rotina de administração

### 4.1 Lançar resultados e abrir a jornada seguinte
Ficheiro: `jornadas.js` (raiz do projeto).

1. Em cada jogo terminado, trocar `resultado: null` por `'1'` (vitória da casa), `'x'` (empate) ou `'2'` (vitória do visitante). Conta o resultado aos 90 minutos.
2. Publicar:
   ```
   git add jornadas.js
   git commit -m "Resultados da MDx"
   git push origin main
   ```
3. Demora cerca de 30 segundos a ficar online.
4. **A jornada seguinte abre sozinha** quando todos os resultados da anterior estiverem lançados (e o prazo da seguinte ainda não tiver passado). Não é preciso editar nenhum campo `ativa`.
5. Confirmar em `/api/jornada` que a jornada ativa é a esperada.

Para acrescentar uma jornada nova: copiar o bloco de uma jornada existente para o fim do array `JORNADAS`, com `matchDay` único, `limiteISO` (em hora de Portugal, sem fuso), `limiteTexto`, e os jogos com `resultado: null`.

### 4.2 Projeto Supabase pausado
Sintoma: o site carrega mas não mostra apostas nem classificações, e o login falha.
1. Entrar em supabase.com → o projeto aparece **Paused**.
2. Carregar em **Restore** e esperar cerca de 1 minuto.
3. Os dados não se perdem.

Para evitar a pausa: visitar o site pelo menos uma vez por semana.

### 4.3 Anúncios e cartaz
- Página `public/anuncios.html`: a edição do jornal e o cartaz da final.
- A contagem de dias do cartaz está em `public/anuncios.js` (data da final: 5 de junho de 2027).
- Local e hora do evento estão como "A anunciar" no HTML.

### 4.4 Fantasy
Os valores vêm da Google Sheet — não se mexe no código. Quem gere a folha atualiza-a e o site reflete a mudança em cerca de 2 minutos (cache). Se a página mostrar "Não foi possível ler a Google Sheet", verificar se a folha continua publicada na Web em formato CSV.

### 4.5 Contactos MB WAY
Os números de telemóvel usados na janela de pagamento estão em `jornadas.js`, no objeto `CONFIG.pagamento.contactos`. Estes dados são pessoais: não os publicar em lado nenhum.

---

## 5. Diagnóstico

| Sintoma | Verificar |
|---|---|
| Site não carrega | Vercel → Deployments: o último está "Ready"? Se não, Redeploy da versão anterior |
| Site carrega sem dados | Supabase: está Paused? (ver 4.2) |
| Login não funciona | `/api/saude`: `SESSAO_SEGREDO` tem pelo menos 32 caracteres? |
| Fantasy em erro | Google Sheet ainda publicada em CSV? `FANTASY_CSV_URL` correto? |
| Jornada errada no boletim | Os resultados da anterior estão todos em `jornadas.js`? |
| Publicação falhou | Vercel → Deployments → abrir o falhado → Logs. Reverter: Deployments → versão anterior → Promote to Production |

Ferramentas úteis:
- `/api/saude` — diagnóstico da configuração (não toca na base de dados).
- `node --env-file=.env apostas.js resumo` — resumo da jornada ativa no terminal (precisa do `.env` local).

---

## 6. Limitações conhecidas

- O **pagamento é simulado**: não há cobrança nem confirmação de MB WAY. Quem paga tem de ser verificado manualmente.
- Os **prémios são calculados à mão**: a classificação é automática, mas a divisão do prize pool não.
- Sessões sem revogação no servidor: um cookie roubado vale até expirar (8 horas).
- Empates na classificação não têm desempate automático.
- A aplicação foi desenhada para uma liga pequena; não tem painel de administração, pelo que todas as alterações passam pelo código.

---

## 7. Checklist de passagem

- [ ] Acessos da secção 3 confirmados (GitHub, Vercel, Supabase, Google Sheet)
- [ ] Variáveis de ambiente guardadas no gestor de palavras-passe partilhado
- [ ] Quem recebe fez um resultado de teste (ou leu a secção 4.1 com atenção)
- [ ] Quem recebe sabe o que fazer quando o Supabase pausa (4.2)
- [ ] Quem recebe sabe publicar e reverter (4.1 e 5)
- [ ] Contactos MB WAY e cartaz revistos
- [ ] Quem passa removeu os seus acessos **depois** de tudo acima estar confirmado
