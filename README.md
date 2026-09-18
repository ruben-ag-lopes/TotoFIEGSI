# TotoFIEGSI

Webapp do jogo **TotoFIEGSI** da Liga FIEGSI 26/27: boletim de prognósticos 1X2 para os
10 jogos da jornada da Liga dos Campeões, aposta de valor fixo (2 €) e registo das
apostas numa base de dados Postgres (Supabase). Alojada no Vercel, sem custos.

---

## 1. Resumo da aplicação

### O que faz

- **Landing page com o boletim** (`/`) no estilo do talão do Totobola: os 10 jogos da
  jornada em linha, com data e hora, e as opções `1` / `X` / `2` para cada um.
- **Um prognóstico por jogo** — clicar noutro símbolo troca a escolha, clicar no mesmo
  desmarca. Não existem múltiplos prognósticos.
- **Uma aposta por jogador em cada jornada**, no valor fixo de **2 €**, validada no
  servidor. O boletim só é submetido com os 10 jogos preenchidos.
- **Página Jornadas**: os jogos de cada match day, os resultados oficiais e a
  classificação dos jogadores, com cada prognóstico marcado a verde ou vermelho.
- **Botões `Limpar` e `Apostar`.** Ao carregar em Apostar sem sessão iniciada, o
  utilizador é encaminhado para o login; depois de entrar (ou criar conta) segue para o
  pagamento e, no fim, aparece a notificação **"Aposta submetida!"**.
- **Pagamento simulado por MB WAY:** janela com o valor a pagar,
  os contactos para onde enviar, **cronómetro de 5 minutos** e os botões `Já paguei` e
  `Sair`. `Já paguei` dá a aposta por paga e regista-a; `Sair` (ou o fim do tempo)
  abandona a aposta sem a registar, mantendo o boletim preenchido para nova tentativa.
  Nada é cobrado nem verificado — ver secção 5.
- **"As minhas apostas"**: a aposta já registada pelo utilizador com sessão iniciada,
  prognóstico a prognóstico. Quem já apostou vê o botão bloqueado, com o aviso de que
  só é permitida uma aposta por jornada.
- **Informação da jornada** em destaque: match day, datas dos jogos, data limite de
  aposta (com contagem decrescente), valor da aposta e regulamento resumido.
- O boletim em curso fica guardado no `localStorage` do browser: não se perde ao ir ao
  login nem ao recarregar a página.

### Tecnologia

**Zero dependências npm** — continua a não haver `node_modules`. O servidor usa só
a biblioteca padrão do Node, e fala com a base de dados pela API REST do Supabase
através do `fetch` nativo. Isto elimina por completo o risco de *supply chain*,
que é hoje o vetor mais comum de comprometimento em apps Node.

| Peça | Serviço | Custo |
|---|---|---|
| Alojamento e HTTPS | Vercel (plano Hobby) | grátis |
| Base de dados | Supabase (Postgres, plano Free) | grátis |
| Endereço | `totofiegsi.vercel.app` | grátis |

Requer **Node 20 ou superior** (para o `fetch` nativo).

### Estrutura

```
api/
  [...rota].js   ponto de entrada da API no Vercel (catch-all)
lib/
  rotas.js       a API — a MESMA tabela de rotas usada no Vercel e localmente
  db.js          acesso aos dados (Supabase)
  supabase.js    cliente REST mínimo, feito com o fetch nativo
  sessao.js      sessões em cookie assinado (HMAC)
  limite.js      limite de tentativas de login
  password.js    hash scrypt
  http.js        ajudas de HTTP
  config.js      variáveis de ambiente
sql/
  esquema.sql    tabelas + RLS, para correr no SQL Editor do Supabase
public/          frontend (servido como estático pelo Vercel)
jornadas.js      TODAS as jornadas: jogos e resultados  <-- é aqui que se muda tudo
jornada.js       atalho para a jornada com ativa: true
server.js        servidor local, para desenvolvimento
migrar.js        migração única do SQLite antigo para o Supabase
apostas.js       utilitário de consulta pelo terminal
```

### Como correr localmente

Precisas de um ficheiro `.env` (ver [.env.exemplo](.env.exemplo)) com as chaves do
Supabase. Nunca vai para o git.

```bash
npm start                    # = node --env-file=.env server.js
```

Abrir **http://localhost:3000**.

O servidor local e o Vercel partilham a mesma tabela de rotas (`lib/rotas.js`),
por isso o que testas localmente é o que corre em produção.

### Pôr o site no ar / atualizar

**O site:** https://totofiegsi.vercel.app

#### A) Publicar alterações ao código

Basta enviar para o GitHub — o Vercel publica sozinho:

```bash
git add -A
git commit -m "descrição da alteração"
git push
```

Demora cerca de 30 segundos. Isto serve para tudo o que esteja no repositório:
mudar de jornada, lançar resultados, alterar textos.

Se quiseres publicar sem passar pelo git (por exemplo, para testar uma alteração
local antes de a commitar):

```bash
npx vercel --prod
```

#### B) Acordar a base de dados (o caso mais provável)

O plano gratuito do Supabase **adormece o projeto ao fim de 7 dias sem uso**. Quando
isso acontece o site carrega, mas fica sem dados — apostas e classificações vêm
vazias e o login falha.

Para acordar:

1. Entra em **supabase.com** → o projeto aparece marcado como **Paused**
2. Carrega em **Restore**
3. Espera cerca de 1 minuto

Os dados não se perdem. Convém fazer isto no dia em que abres a jornada seguinte.

#### C) Confirmar que está tudo bem

Abre:

```
https://totofiegsi.vercel.app/api/saude
```

Este endereço **não toca na base de dados**, por isso responde mesmo quando algo
está mal configurado. Devolve:

```json
{ "ok": true, "jornadaAtiva": "MD2", "configuracao": { ... } }
```

- **`ok: true`** → configuração correta
- **`ok: false`** → diz-te qual das variáveis de ambiente falta
- **erro `FUNCTION_INVOCATION_FAILED`** → a função nem arranca; ver os logs (abaixo)

#### D) Ver o que correu mal

```bash
npx vercel logs https://totofiegsi.vercel.app
```

Mostra os erros reais do servidor — foi assim que se descobriu, por exemplo, que o
Vercel estava a correr o JavaScript do browser como se fosse código de servidor.

Outros comandos úteis:

```bash
npx vercel ls                    # publicações recentes e o estado de cada uma
npx vercel env ls production     # que variáveis de ambiente estão definidas
```

#### E) Voltar a uma versão anterior

Se uma publicação partir o site:

```bash
npx vercel rollback
```

Ou no painel: *Deployments* → escolhe uma publicação que funcionava → **Promote to
Production**.

### API

| Método | Rota                  | Descrição                                          |
|--------|-----------------------|----------------------------------------------------|
| GET    | `/api/jornada`        | dados da jornada em jogo (jogos, limite, valor)    |
| GET    | `/api/jornadas`       | histórico: jogos, resultados e classificação       |
| GET    | `/api/sessao`         | sessão atual                                        |
| POST   | `/api/registo`        | criar conta (utilizador, equipa, password)         |
| POST   | `/api/login`          | iniciar sessão                                      |
| POST   | `/api/logout`         | terminar sessão                                     |
| POST   | `/api/apostas`        | submeter chaves (valida 10 prognósticos e o limite) |
| GET    | `/api/minhas-apostas` | apostas do utilizador + quantas ainda pode fazer    |

---

## 2. Base de dados (Supabase / Postgres)

Três tabelas — o esquema completo está em [sql/esquema.sql](sql/esquema.sql), pronto
a colar no **SQL Editor** do Supabase:

```sql
create table utilizadores (
  utilizador text primary key,   -- nome de utilizador
  equipa     text not null,      -- nome da equipa (pedido apenas no registo)
  password   text not null       -- hash scrypt: scrypt$<salt>$<hash>
);

create table apostas (
  id         bigint generated always as identity primary key,
  utilizador text not null references utilizadores(utilizador),
  jornada    text not null,      -- match day a que a aposta pertence (ex.: 'MD1')
  chave      text not null       -- 10 prognósticos separados por ';'
);

create table tentativas_login (   -- limite anti força bruta
  ip       text primary key,
  contagem integer not null default 0,
  inicio   timestamptz not null default now()
);
```

A coluna `jornada` é o que permite manter **todo o histórico na base de dados**: as
apostas de uma jornada fechada nunca são apagadas, só deixam de ser a jornada em jogo.
É por isso que a página Jornadas mostra a classificação de qualquer match day, mesmo
anos depois de ter fechado.

### Segurança: RLS (a parte que não pode falhar)

As três tabelas têm **Row Level Security ligado e nenhuma política** definida. Na
prática: a chave `anon` do Supabase (a que é pública e pode aparecer no browser) não
consegue ler nem escrever nada. Só a chave `service_role` passa — e essa vive apenas
nas variáveis de ambiente do servidor.

Toda a app fala com a base de dados pelas funções de servidor; o frontend nunca
recebe chave nenhuma. Este é o erro clássico com Supabase — tabelas sem RLS e uma
chave anónima a circular — e aqui está fechado pela raiz.

### Gerir a base de dados

Pelo painel do Supabase: **Table Editor** (edição ponto a ponto) ou **SQL Editor**
(consultas). Ao contrário do SQLite, abrir a base de dados para conferir **já não
bloqueia a app** — acabaram os `database is locked`.

Pelo terminal:

```bash
npm run apostas                      # utilizadores e apostas de TODAS as jornadas
npm run apostas -- resumo            # apostas + prize pool da jornada ativa
npm run apostas -- resumo MD1        # o mesmo, para uma jornada específica
npm run apostas -- chaves MD1        # "utilizador chave" de uma jornada
```

### O projeto adormece ao fim de 7 dias sem uso

É o comportamento do plano gratuito do Supabase e, neste caso, é intencional: entre
jornadas o site não precisa de estar de pé. Quando adormecer, a app deixa de
responder até reativares.

**Reativar:** painel do Supabase → o projeto aparece marcado como *Paused* → botão
**Restore**. Demora cerca de um minuto e os dados não se perdem.

Convém fazê-lo no dia em que abres a jornada seguinte.

### Corrigir/anular apostas à mão

No SQL Editor do Supabase:

```sql
-- apagar uma aposta específica
delete from apostas where id = 12;

-- apagar todas as apostas de um utilizador numa jornada
delete from apostas where utilizador = 'user123' and jornada = 'MD1';

-- ver quantas apostas cada jogador tem, por jornada
select jornada, utilizador, count(*) as apostas
from apostas group by jornada, utilizador order by jornada, apostas desc;
```

---

## 3. Jornadas: jogos, resultados e classificação

Toda a informação das jornadas está em **[jornadas.js](jornadas.js)** — presentes e
passadas, com os jogos e os resultados. O `jornada.js` é apenas um atalho para a
jornada que tem `ativa: true`.

As apostas de **todas** as jornadas ficam sempre na base de dados, marcadas com o
match day a que pertencem (coluna `jornada` da tabela `apostas` — ver secção 2). Por
isso o histórico nunca se perde e **nunca é preciso apagar apostas** para abrir a
jornada seguinte.

A página **Jornadas** (no menu do topo) mostra, para cada match day: os jogos, os
resultados oficiais e a classificação dos jogadores, com cada prognóstico marcado a
verde (acertou) ou vermelho (falhou). Funciona tanto para a jornada em curso como para
qualquer jornada já fechada.

### 3.1 Lançar os resultados

Basta preencher o campo `resultado` de cada jogo em `jornadas.js`: `'1'` vitória da
casa, `'x'` empate, `'2'` vitória do visitante. Fica `null` enquanto não se souber.

```js
{ n: 1, casa: 'Porto', fora: 'Manchester City', data: '2026-09-08', hora: '20:00', dia: 'Ter', resultado: '1' },
```

Reinicia o servidor e a classificação aparece calculada na página Jornadas — para
qualquer jornada, a qualquer momento, a partir das apostas guardadas na base de dados.

### 3.2 Fechar uma jornada e abrir a seguinte

**1) Preenche todos os resultados** da jornada que está a fechar, em `jornadas.js`.

**2) Confirma a classificação e o vencedor** na página Jornadas, ou pelo terminal:

```bash
npm run apostas -- resumo MD1
```

**3) Fecha a jornada e abre a próxima**, editando `jornadas.js`:

```js
const JORNADAS = [
  {
    matchDay: 'MD1',
    ativa: false,              // <- deixa de ser a jornada em jogo
    // ... jogos com os resultados preenchidos
  },
  {
    matchDay: 'MD2',           // <- a nova
    ativa: true,
    periodo: '29 setembro a 1 de outubro de 2026',
    limiteISO: '2026-09-29T17:30:00',
    limiteTexto: 'Terça-feira, 29/09/2026 às 17H30',
    jogos: [
      { n: 1, casa: 'Equipa A', fora: 'Equipa B', data: '2026-09-29', hora: '20:00', dia: 'Ter', resultado: null },
      // ... exatamente 10 jogos, numerados de 1 a 10
    ]
  }
];
```

**4) Reinicia o servidor** e confirma o novo match day no boletim.

Não há mais passos. Os utilizadores mantêm-se, as apostas da MD1 continuam na base de
dados e continuam visíveis (e corretamente contabilizadas) na página Jornadas; cada
jogador pode voltar a apostar, agora na MD2 — o limite de uma aposta é **por jornada**,
não vitalício.

### 3.3 Regras a respeitar nos jogos

- **10 jogos**, com `n` de 1 a 10 — a ordem define a ordem dos prognósticos na chave
  (`1;2;x;...`), por isso é a mesma ordem que usas para conferir os resultados.
- `data` no formato `AAAA-MM-DD` e `hora` em `HH:MM`; `dia` é a abreviatura mostrada.
- `limiteISO` é a data/hora a que as apostas fecham (por norma, 17H30 do dia do
  primeiro jogo). `limiteTexto` é só o texto apresentado; convém manterem-se coerentes.
- Os jogos são agrupados visualmente por dia: basta estarem ordenados por data.
- **`matchDay` tem de ser único** entre todas as jornadas do array — é o que liga cada
  aposta guardada à jornada correta.

### 3.4 Definições comuns a todas as jornadas

Ficam no objeto `CONFIG`, no topo de `jornadas.js`:

| Parâmetro | Efeito |
|---|---|
| `valorAposta` | valor fixo de cada aposta (2 €) |
| `colunas` | colunas do boletim — **1**, uma aposta por jogador |
| `maxApostasPorUtilizador` | apostas por pessoa em cada jornada — **1** |
| `minimoApostas` | mínimo para ativar o prémio (5 apostas = 10 €) |
| `percentagemPrizePool` | percentagem do arrecadado que vai a prémio (90%) |
| `pagamento.minutos` | minutos do cronómetro da janela de pagamento (5) |
| `pagamento.contactos` | nomes e números MB WAY mostrados ao jogador |

### 3.5 Checklist rápida

- [ ] resultados da jornada anterior preenchidos
- [ ] jornada anterior com `ativa: false`
- [ ] nova jornada com 10 jogos, `ativa: true` e `matchDay` único
- [ ] `limiteISO` e `limiteTexto` coerentes
- [ ] servidor reiniciado e página verificada

---

## 4. Publicar (Vercel + Supabase)

Custo total: **0 €**. Endereço: `https://totofiegsi.vercel.app`.

### 4.1 Supabase — a base de dados

1. **supabase.com** → novo projeto (região Europa, por exemplo Frankfurt ou Londres)
2. **SQL Editor** → cola o conteúdo de [sql/esquema.sql](sql/esquema.sql) → *Run*
3. **Project Settings → Data API** → copia o **Project URL**
4. **Project Settings → API Keys** → copia a chave **`service_role`** (a secreta)

> A chave `service_role` dá acesso total à base de dados. Nunca a ponhas no código,
> num commit, nem num chat — só nas variáveis de ambiente.

### 4.2 Vercel — a aplicação

1. **vercel.com** → *Add New Project* → importa o repositório `TotoFIEGSI`
2. Framework Preset: **Other** (não é preciso build)
3. **Environment Variables** — acrescenta as três:

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | o Project URL do Supabase |
   | `SUPABASE_SERVICE_KEY` | a chave `service_role` |
   | `SESSAO_SEGREDO` | um segredo aleatório (ver abaixo) |

   Gera o segredo das sessões com:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. *Deploy*. A partir daqui, cada `git push` para o `main` publica sozinho.
5. **Settings → Domains** → o domínio pode ser mudado para `totofiegsi.vercel.app`
   (se estiver livre).

### 4.3 Migrar os dados do SQLite antigo

Uma única vez, com o `.env` preenchido localmente:

```bash
node --env-file=.env migrar.js              # mostra o que vai migrar, sem escrever
node --env-file=.env migrar.js --escrever   # migra a sério
```

Leva os utilizadores e as apostas do `totofiegsi.db` para o Supabase. Pode ser
corrido mais do que uma vez sem duplicar nada. O `totofiegsi.db` fica intacto no
disco, como cópia de segurança.

### 4.4 Domínio próprio (opcional, ~1 €/ano)

O `totofiegsi.vercel.app` é gratuito e chega perfeitamente. Se um dia quiseres um
domínio teu (`totofiegsi.pt`, `.com`, `.xyz`):

1. Compra o domínio num registador (o `.xyz` anda por ~$0,99 no primeiro ano —
   **confirma o preço de renovação**, que sobe para 10–15 €/ano)
2. No Vercel: *Settings → Domains* → adiciona o domínio
3. No registador: aponta os nameservers ou os registos DNS para o Vercel

O Cloudflare só entra se quiseres gerir o DNS lá — com o subdomínio do Vercel, ou
até com domínio próprio apontado diretamente ao Vercel, não é preciso.

### 4.5 O que mudou na segurança com esta migração

| | Antes (PC + túnel) | Agora (Vercel + Supabase) |
|---|---|---|
| Onde corre | o teu computador pessoal | infraestrutura do Vercel |
| Se houvesse falha na app | acesso aos teus ficheiros | contentor isolado e efémero |
| Base de dados | ficheiro no teu disco | Postgres gerido, com RLS |
| Endereço | mudava a cada arranque | fixo |
| Segredos | nenhum | em variáveis de ambiente, fora do git |
| Dependências npm | zero | **zero** (mantido) |

**Sessões:** passaram de um `Map` em memória para **cookie assinado com HMAC**. Em
serverless cada pedido pode cair noutra instância, e o `Map` perdia sessões ao acaso.
Contrapartida assumida: sendo sem estado, não há revogação do lado do servidor — o
logout apaga o cookie, mas um cookie roubado vale até expirar (8 horas).

**Limite de tentativas de login:** passou de memória para a tabela `tentativas_login`,
pela mesma razão.

---

## 5. Pagamentos

### 5.1 O que está implementado: uma simulação

Depois do login, antes de a aposta ser registada, aparece uma janela de pagamento por
MB WAY com o valor (2 € × nº de apostas), os contactos e um cronómetro de 5 minutos:

- **`Já paguei`** — a aposta é considerada paga e fica registada na base de dados.
- **`Sair`** ou **fim do tempo** — a aposta é abandonada e **não** é registada; o
  boletim mantém-se preenchido para o jogador tentar de novo.

**Não há qualquer verificação:** nada é cobrado, nada é confirmado com o MB WAY e o
estado "pago" não é guardado na base de dados (as tabelas continuam a ser apenas
`utilizadores` e `apostas`). Na prática, quem organiza confere os MB WAY recebidos e
compara com a lista de apostas (`node apostas.js resumo`).

Se quiseres registar o pagamento na base de dados, o caminho mais simples é acrescentar
uma coluna `pago INTEGER DEFAULT 0` à tabela `apostas` e marcá-la no `POST /api/apostas`.

### 5.2 Sistemas de pagamento reais que podes integrar *(informativo)*

Se um dia quiseres cobrar mesmo os 2 €:

| Solução | Métodos | Notas |
|---|---|---|
| **IfthenPay** | Multibanco (referência), MB WAY, Payshop, cartão | Gateway portuguesa, API HTTP simples, comissões baixas e sobretudo **fixas por transação** — a opção mais adequada a valores de 2 €. |
| **Easypay** | MB WAY, Multibanco, cartão, débitos diretos | Portuguesa, boa documentação e webhooks; contrato/onboarding um pouco mais formal. |
| **Eupago** | MB WAY, Multibanco, Payshop, cartão | Alternativa direta à IfthenPay, condições semelhantes. |
| **SIBS Payment Gateway** (API Market) | MB WAY, Multibanco, cartão | Ligação direta à SIBS, sem intermediário; integração mais pesada. |
| **Stripe** | Cartão, Apple/Google Pay, Multibanco | Excelente developer experience (Stripe Checkout resolve tudo com um redirect); comissão percentual + fixa pesa muito em pagamentos de 2 €. |
| **PayPal** | Saldo PayPal, cartão | Rápido de integrar, muito reconhecido; comissões altas para micropagamentos. |
| **Revolut Business / Revolut Pay** | Links de pagamento, transferência | Prático para grupos fechados; a via sem taxas está detalhada em 5.3. |
| **MB WAY manual** | Transferência para um número | Sem integração: o organizador confere os pagamentos e marca a aposta como paga. É o mais simples para uma liga interna. |

Duas notas práticas:

- **Comissões.** Em pagamentos de 2 €, uma taxa percentual (Stripe, PayPal) come uma
  fatia grande. Referência Multibanco com custo fixo baixo, ou cobrar o saldo em lote
  (ex.: 10 € por 5 apostas / por época), sai muito mais em conta.
- **Enquadramento legal.** Apostas com prémio em dinheiro em Portugal são atividade
  regulada (SRIJ). Para um jogo interno entre colegas, sem lucro para o organizador,
  é habitual ficar-se pela gestão manual dos valores; se a coisa crescer ou passar a
  ter margem, vale a pena confirmar o enquadramento antes de integrar pagamentos.

### 5.3 Integrar o Revolut para pagamento real, sem taxas

**O ponto de partida:** no Revolut, o que é grátis são as **transferências entre contas
Revolut**. Dinheiro recebido por *payment link* vindo de outra conta Revolut não tem
comissão nem limite. O que tem custo é o **Revolut Pay / Merchant API** (o checkout a
sério, integrado por API), que cobra a partir de ~0,8%–1% + ~0,02 € por transação, mais
1,5% adicionais em cartões de fora do EEE. Numa aposta de 2 € isso são 2% a 4% do valor
— e obriga a conta **Revolut Business**, que por sua vez exige uma entidade registada.

**Conclusão: para taxa zero, o caminho não é integrar o checkout do Revolut — é usar o
link de pagamento pessoal e automatizar apenas a conferência.** Abaixo, três níveis,
do mais simples ao mais automático.

#### Nível 1 — link de pagamento no boletim *(zero taxas, zero API)*

1. Na app do Revolut: **Conta → Adicionar dinheiro → Payment link**, ou usa o teu
   `revolut.me/<utilizador>` permanente.
2. Guarda o link no `jornada.js`, ao lado dos contactos MB WAY:

   ```js
   pagamento: {
     metodo: 'MB WAY / Revolut',
     minutos: 5,
     revolut: {
       link: 'https://revolut.me/o-teu-utilizador',
       referencia: 'TOTO {matchDay} {utilizador}'   // ex.: TOTO MD1 ruben
     },
     contactos: [ /* ... */ ]
   },
   ```

3. Na janela de pagamento, mostrar o link (ou um QR code gerado no cliente) e a
   **referência a escrever na descrição da transferência**. É a referência que permite
   saber de quem veio o dinheiro.
4. O botão `Já paguei` continua igual: quem confere és tu, na app do Revolut.

**Taxas: nenhuma**, desde que o jogador pague com **saldo Revolut**. Quem pagar com
cartão através do link entra nas regras de carregamento por cartão (limites semanais e
mensais e eventuais comissões), por isso convém pedir expressamente "paga por Revolut,
não por cartão".

#### Nível 2 — conferência semi-automática pelo extrato *(zero taxas)*

Continua tudo grátis e deixa de ser preciso conferir à mão aposta a aposta:

1. Na app do Revolut: **Conta → Extrato → Excel/CSV**, para o período da jornada.
2. Um script (por exemplo `conferir.js`) lê o CSV, extrai o nome de utilizador da
   descrição de cada entrada e compara o valor recebido com `2 € × nº de apostas` desse
   utilizador na tabela `apostas`.
3. Saída: lista de quem pagou, quem falta e quem pagou a menos.

Para marcar o pagamento na base de dados seria preciso uma coluna nova
(`ALTER TABLE apostas ADD COLUMN pago INTEGER DEFAULT 0`) — hoje o estado "pago" não é
guardado (ver 5.1).

#### Nível 3 — confirmação automática pela API *(zero taxas nas transferências, mas exige conta Business)*

A API que permite **ler os movimentos recebidos** é a do **Revolut Business**
(`GET /api/1.0/transactions`, mais webhooks de transação criada, com OAuth 2.0 e
certificado). Com ela, o servidor confirmava sozinho: chega uma transferência com a
referência `TOTO MD1 ruben` no valor certo → a aposta fica paga, sem ninguém carregar
em `Já paguei`.

As contrapartidas:

- **Exige conta Revolut Business**, que só é aberta a entidades registadas (empresa ou,
  nalguns países, trabalhador independente). Uma conta pessoal **não tem API**.
- As transferências recebidas de contas Revolut continuam **sem comissão**; o que custa
  é aceitar cartões (Revolut Pay), que aqui não é preciso.
- Contas pessoais não se destinam a cobranças comerciais — para um bolo entre colegas é
  prática comum, mas é a diferença que justifica o salto para Business se o jogo crescer.

#### Resumo

| Nível | Taxas | Automatismo | Requisitos |
|---|---|---|---|
| 1 — link no boletim | **0** (saldo Revolut) | nenhum; confirmas tu | conta pessoal |
| 2 — extrato CSV | **0** | conferência em lote | conta pessoal + script |
| 3 — API Business | **0** nas transferências | total | conta Revolut Business |
| *(Revolut Pay / Merchant API)* | 0,8%–1% + 0,02 € | total | conta Business |

> Os valores e limites do Revolut mudam com frequência e variam com o plano e o país —
> confirma na app antes de anunciares aos jogadores que não há custos.

---

## 6. Repositório

O código está em **https://github.com/ruben-ag-lopes/TotoFIEGSI** (privado).

```bash
git add -A
git commit -m "descrição da alteração"
git push
```

O ficheiro `totofiegsi.db` está no `.gitignore` — os dados dos jogadores **não** vão
para o GitHub. A imagem de referência do talão original também fica de fora.

---

## 7. Limitações desta versão

- O pagamento é simulado (secção 5.1): não há cobrança nem confirmação.
- Sessões sem estado: o logout apaga o cookie, mas não há revogação do lado do
  servidor — um cookie roubado vale até expirar (8 horas).
- Não há registo de resultados nem apuramento automático do vencedor — o cálculo de
  acertos e a divisão do prize pool ainda são feitos à mão.
- Uma jornada de cada vez: a tabela `apostas` não guarda o match day.
- Sem pagamentos (ver secção 5).
