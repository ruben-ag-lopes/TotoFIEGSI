# TotoFIEGSI

Webapp do jogo **TotoFIEGSI** da Liga FIEGSI 26/27: boletim de prognósticos 1X2 para os
10 jogos da jornada da Liga dos Campeões, aposta de valor fixo (2 €) e registo das
apostas numa base de dados SQLite.

---

## 1. Resumo da aplicação

### O que faz

- **Landing page com o boletim** (`/`) no estilo do talão do Totobola: os 10 jogos da
  jornada em linha, com data e hora, e 5 colunas de aposta com as opções `1` / `X` / `2`.
- **Um prognóstico por jogo em cada coluna** — clicar noutro símbolo troca a escolha,
  clicar no mesmo desmarca. Não existem múltiplos prognósticos.
- **Cada coluna completa = 1 aposta = 2 €.** O total no cabeçalho e na barra inferior
  atualiza em tempo real (`2 € × colunas completas`). Colunas começadas mas incompletas
  ficam marcadas a laranja e não são submetidas.
- **Botões `Limpar` e `Apostar`.** Ao carregar em Apostar sem sessão iniciada, o
  utilizador é encaminhado para o login; depois de entrar (ou criar conta) segue para o
  pagamento e, no fim, aparece a notificação **"Aposta submetida!"**.
- **Pagamento simulado por MB WAY:** janela com o valor a pagar (2 € × nº de apostas),
  os contactos para onde enviar, **cronómetro de 5 minutos** e os botões `Já paguei` e
  `Sair`. `Já paguei` dá a aposta por paga e regista-a; `Sair` (ou o fim do tempo)
  abandona a aposta sem a registar, mantendo o boletim preenchido para nova tentativa.
  Nada é cobrado nem verificado — ver secção 5.
- **Limite de 5 apostas por utilizador em cada jornada**, validado no servidor e avisado
  na interface (contador, medidor, aviso e bloqueio do botão Apostar).
- **"As minhas apostas"**: lista das apostas já registadas pelo utilizador com sessão
  iniciada, prognóstico a prognóstico, valor de cada uma e quantas ainda pode fazer.
- **Informação da jornada** em destaque: match day, datas dos jogos, data limite de
  aposta (com contagem decrescente), valor da aposta e regulamento resumido.
- O boletim em curso fica guardado no `localStorage` do browser: não se perde ao ir ao
  login nem ao recarregar a página.

### Tecnologia

Node.js puro, **sem dependências externas**: servidor HTTP da biblioteca padrão,
SQLite através do módulo integrado `node:sqlite` e frontend em HTML/CSS/JavaScript
sem frameworks. Requer **Node 22.5 ou superior** (testado em Node 24).

### Estrutura

```
server.js      servidor HTTP + API
db.js          acesso à base de dados e hash das passwords
jornada.js     dados da jornada em jogo  <-- é aqui que se muda a jornada
apostas.js     utilitário de consulta da BD pelo terminal
duckdns.js     mantém o totofiegsi.duckdns.org a apontar para o IP certo
Caddyfile      configuração do HTTPS (ver secção 4.3)
public/
  index.html   landing page + boletim
  login.html   login / criar conta
  app.js       lógica do boletim
  login.js     lógica do login
  styles.css   estilos
totofiegsi.db  base de dados SQLite (criada na 1ª execução)
```

### Como correr localmente

```powershell
# terminal 1 — a aplicação
node server.js

# terminal 2 — o acesso público (endereço temporário, muda a cada arranque)
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
```

Só com o terminal 1, a app fica disponível em **http://localhost:3000** (acesso local).
Para um endereço fixo em vez do túnel temporário, ver a secção 4.3.

### API

| Método | Rota                  | Descrição                                          |
|--------|-----------------------|----------------------------------------------------|
| GET    | `/api/jornada`        | dados da jornada (jogos, limite, valor, limites)   |
| GET    | `/api/sessao`         | sessão atual                                        |
| POST   | `/api/registo`        | criar conta (utilizador, equipa, password)         |
| POST   | `/api/login`          | iniciar sessão                                      |
| POST   | `/api/logout`         | terminar sessão                                     |
| POST   | `/api/apostas`        | submeter chaves (valida 10 prognósticos e o limite) |
| GET    | `/api/minhas-apostas` | apostas do utilizador + quantas ainda pode fazer    |

---

## 2. Base de dados

Duas tabelas, no ficheiro `totofiegsi.db`:

```sql
CREATE TABLE utilizadores (
  utilizador TEXT PRIMARY KEY,   -- nome de utilizador
  equipa     TEXT NOT NULL,      -- nome da equipa (pedido apenas no registo)
  password   TEXT NOT NULL       -- hash scrypt: scrypt$<salt>$<hash>
);

CREATE TABLE apostas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  utilizador TEXT NOT NULL REFERENCES utilizadores(utilizador),
  chave      TEXT NOT NULL       -- 10 prognósticos separados por ';'
);
```

Cada aposta é uma linha, no formato combinado:

```
user123   1;2;x;1;1;2;2;x;x;1
```

Consultas pelo terminal:

```bash
node apostas.js           # utilizadores e apostas
node apostas.js resumo    # apostas por utilizador + prize pool (90%)
node apostas.js chaves    # "utilizador chave", uma linha por aposta
```

Para gestão manual serve qualquer cliente SQLite (DB Browser for SQLite, extensão
SQLite do VS Code, `sqlite3` na linha de comandos). O ficheiro está em modo de
journal normal, por isso é um **único ficheiro** — copiar `totofiegsi.db` é um backup
completo.

As passwords são guardadas com hash `scrypt`. Se preferires texto simples para
gerires a base de dados à mão, é uma alteração de duas linhas em `db.js`
(`hashPassword` e `verificarPassword`).

### Base de dados de exemplo (para partilhar com os colegas)

A base de dados **é criada automaticamente na primeira execução**: quem clonar o
repositório só tem de correr `node server.js` e já tem as duas tabelas prontas. Não
precisa de receber nenhum ficheiro.

Para que os colegas vejam a app já com dados, há uma base de dados de exemplo
versionada no repositório, com 5 utilizadores e 12 apostas fictícias:

```bash
# ver os dados de exemplo sem tocar na base de dados real
TOTO_DB=exemplo/totofiegsi.exemplo.db node apostas.js

# correr a app com a base de dados de exemplo (Windows PowerShell)
$env:TOTO_DB = "exemplo\totofiegsi.exemplo.db"; node server.js

# ou simplesmente usá-la como ponto de partida
copy exemplo\totofiegsi.exemplo.db totofiegsi.db
```

A password de todas as contas de exemplo é `1234`. Para a regerar (por exemplo depois
de mudares de jornada): `node exemplo/criar-exemplo.js`.

**Porque é que o `totofiegsi.db` real não vai para o repositório?** Não é por ser
público — o repositório é privado. É porque o SQLite é um ficheiro **binário**: se duas
pessoas correrem a app e ambas fizerem commit do `.db`, o git não consegue juntar as
duas versões e alguém perde as suas apostas. Além disso, tudo o que entra no histórico
do git lá fica, incluindo os utilizadores e as passwords com hash.

Se mesmo assim quiseres partilhar a base de dados real pelo repositório, basta apagar a
linha `/totofiegsi.db` do `.gitignore` e fazer commit — combinem só que **uma única
pessoa** é que a atualiza. Em alternativa, para uma entrega pontual, envia o ficheiro
por outro meio (Drive, Teams) em vez de o versionar.

### Corrigir/anular apostas à mão

```sql
-- apagar uma aposta específica
DELETE FROM apostas WHERE id = 12;

-- apagar todas as apostas de um utilizador
DELETE FROM apostas WHERE utilizador = 'user123';

-- ver quem está no limite
SELECT utilizador, COUNT(*) AS apostas FROM apostas GROUP BY utilizador ORDER BY 2 DESC;
```

---

## 3. Atualizar os jogos de cada jornada

Toda a configuração da jornada está num único ficheiro: **[jornada.js](jornada.js)**.
Não é preciso mexer em mais nada — o frontend lê estes dados de `/api/jornada` e
desenha o boletim a partir deles.

### 3.1 Passo a passo

**1) Fechar a jornada anterior.** Antes de apagar seja o que for, guarda o registo:

```bash
node apostas.js chaves > jornadas/MD1-apostas.txt   # exportar as chaves
copy totofiegsi.db jornadas\MD1-totofiegsi.db       # backup da BD (Windows)
```

**2) Editar `jornada.js`** com os dados da nova jornada:

```js
const JORNADA = {
  matchDay: 'MD2',                                   // <- match day
  epoca: '2026/27',
  competicao: 'Liga dos Campeões',
  periodo: '29 setembro a 1 de outubro de 2026',     // <- texto das datas
  valorAposta: 2,                                    // valor fixo por aposta
  colunas: 5,                                        // colunas do boletim
  percentagemPrizePool: 90,
  maxApostasPorUtilizador: 5,                        // limite por utilizador
  minimoApostas: 5,                                  // mínimo para ativar o prémio
  limiteISO: '2026-09-29T17:00:00',                  // <- 17H00 do dia do 1º jogo
  limiteTexto: 'Terça-feira, 29/09/2026 às 17H00',   // <- o mesmo, para mostrar
  jogos: [
    { n:  1, casa: 'Equipa A', fora: 'Equipa B', data: '2026-09-29', hora: '20:00', dia: 'Ter' },
    // ... exatamente 10 jogos, numerados de 1 a 10
  ]
};
```

Regras a respeitar:

- **10 jogos**, com `n` de 1 a 10 — a ordem define a ordem dos prognósticos na chave
  (`1;2;x;...`), por isso é a mesma ordem que usas para conferir os resultados.
- `data` no formato `AAAA-MM-DD` e `hora` em `HH:MM`; `dia` é a abreviatura mostrada
  (`Ter`, `Qua`, `Qui`).
- `limiteISO` é a data/hora **do primeiro jogo da jornada às 17H00** — é o que fecha
  as apostas (o servidor recusa apostas depois desta hora e a página mostra a contagem
  decrescente). `limiteTexto` é só o texto apresentado; convém manterem-se coerentes.
- Os jogos são agrupados visualmente por dia: basta que estejam ordenados por data.

**3) Limpar as apostas da jornada anterior** (a tabela `apostas` não guarda o match day,
por isso serve uma jornada de cada vez):

```bash
node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('./totofiegsi.db').exec('DELETE FROM apostas')"
```

Os utilizadores mantêm-se — não é preciso voltar a registar nem a pedir o nome da equipa.

**4) Reiniciar o servidor** (`Ctrl+C` e `node server.js`) e confirmar em
http://localhost:3000 que aparecem o novo match day, as novas datas e o novo limite.

### 3.2 Checklist rápida

- [ ] `matchDay` atualizado (MD2, MD3, ...)
- [ ] 10 jogos, na ordem em que vais conferir os resultados
- [ ] `limiteISO` = dia do primeiro jogo, às 17:00
- [ ] `limiteTexto` coerente com o `limiteISO`
- [ ] `periodo` com o intervalo de datas
- [ ] apostas da jornada anterior exportadas e apagadas
- [ ] servidor reiniciado e página verificada

### 3.3 Outros parâmetros do jogo

| Parâmetro                 | Efeito                                                        |
|---------------------------|---------------------------------------------------------------|
| `valorAposta`             | valor fixo de cada aposta (2 €)                               |
| `colunas`                 | colunas do boletim (convém ser igual ao limite por utilizador) |
| `maxApostasPorUtilizador` | limite de apostas por pessoa em cada jornada (5)              |
| `minimoApostas`           | mínimo para ativar o prémio (5 apostas = 10 €)                |
| `percentagemPrizePool`    | percentagem do arrecadado que vai a prémio (90%)              |
| `pagamento.minutos`       | minutos do cronómetro da janela de pagamento (5)              |
| `pagamento.contactos`     | nomes e números MB WAY mostrados ao jogador                   |

Os contactos para onde os jogadores enviam o MB WAY estão em `jornada.js`, na secção
`pagamento` — é aí que se acrescenta, remove ou corrige um número:

```js
pagamento: {
  metodo: 'MB WAY',
  minutos: 5,
  contactos: [
    { nome: 'Nome a mostrar', telemovel: '9XX XXX XXX' }
    // ...
  ]
},
```

---

## 4. Opções de alojamento (sem custos)

Só estão aqui opções que não implicam pagar nada. O critério técnico decisivo é
**haver disco persistente**: sem ele, o ficheiro `totofiegsi.db` desaparece a cada
reinício ou publicação, e deixas de poder gerir a base de dados como fazes hoje.

> Os planos gratuitos mudam com frequência. Confirma as condições atuais antes de
> contares com qualquer um deles para uma jornada a sério.

### 4.1 O teu PC + Cloudflare Tunnel — a via mais simples

O `cloudflared` abre uma ligação de saída do teu computador para a Cloudflare e
devolve um endereço `https://...` público. Não é preciso IP fixo, abrir portas no
router nem configurar certificados.

```bash
node server.js                                   # numa janela
cloudflared tunnel --url http://localhost:3000   # noutra janela
```

O comando imprime o endereço (algo como `https://xxx-yyy-zzz.trycloudflare.com`) e é
esse que partilhas com os jogadores.

**O que implica:**

- A app só está no ar **enquanto o teu PC estiver ligado** com o servidor e o túnel a
  correr. Se o computador suspender, o site cai. Na prática, tens de o manter ligado
  desde que abres as apostas até às 17H00 do dia do primeiro jogo.
- O endereço do túnel gratuito é **aleatório e muda sempre que reinicias** — tens de
  reenviar o link a cada jornada. Um endereço fixo exigiria um domínio próprio
  (~10 €/ano), que é precisamente o que estamos a excluir.
- A base de dados **fica no teu computador**, que é a situação ideal para quem a gere
  à mão: nada sai do teu controlo e os backups são cópias do ficheiro.
- HTTPS incluído, sem configuração.
- Chega folgadamente para dezenas de jogadores em simultâneo.

Instalação do `cloudflared` no Windows: `winget install --id Cloudflare.cloudflared`
(ou o `.exe` a partir do site da Cloudflare). **Já está instalado nesta máquina**, em
`C:\Program Files (x86)\cloudflared\cloudflared.exe`.

Para fechar o acesso público, basta terminar o processo do `cloudflared` (`Ctrl+C` na
janela do túnel): o site deixa imediatamente de estar acessível de fora, sem afetar o
`http://localhost:3000`.

**Alternativa equivalente:** `ngrok`. O plano gratuito dá um endereço estático por
conta, mas mostra uma página de aviso antes do site na primeira visita de cada
browser — mais atrito para os jogadores do que o Cloudflare Tunnel.

### 4.2 VPS gratuito permanente (Oracle Cloud Always Free)

A Oracle Cloud mantém um escalão *Always Free* com máquinas que dão perfeitamente para
esta app. Também a Google Cloud tem uma `e2-micro` gratuita em certas regiões.

**O que implica:**

- Servidor **a funcionar 24/7 sem depender do teu PC**, com disco persistente: o SQLite
  funciona sem alterar uma linha de código.
- É preciso **cartão para verificação de identidade** no registo (não é cobrado
  enquanto ficares dentro dos recursos *Always Free*) — se preferires não dar cartão,
  esta opção sai de cima da mesa.
- A capacidade das máquinas ARM gratuitas nem sempre está disponível na região
  escolhida, e instâncias inativas podem ser recuperadas; convém confirmar as regras
  em vigor.
- **És tu o administrador**: atualizações do sistema, firewall, arranque automático do
  serviço e backups do `.db` ficam do teu lado.
- Para teres um endereço `https://` com certificado precisas de um nome: dá para fazer
  de graça com um subdomínio **DuckDNS** e o **Caddy**, que trata do certificado
  Let's Encrypt sozinho.
- É a opção com mais trabalho inicial, mas a única gratuita que fica sempre no ar com
  a base de dados no formato atual.


### 4.3 Endereço fixo: `totofiegsi.duckdns.org` *(gratuito)*

O DuckDNS dá um subdomínio permanente e gratuito, que aponta para o **IP público** desta
ligação. Ao contrário do túnel da Cloudflare, o endereço **não muda** — é sempre
`https://totofiegsi.duckdns.org`, e não é preciso reenviar links a cada jornada.

Os ficheiros necessários já estão no repositório: [`Caddyfile`](Caddyfile) (HTTPS +
encaminhamento para a app) e [`duckdns.js`](duckdns.js) (mantém o IP atualizado).

#### Passo 1 — criar o subdomínio *(só tu podes fazer)*

1. Entra em **https://www.duckdns.org** com a conta GitHub, Google ou Reddit.
2. No campo *sub domain*, escreve `totofiegsi` e carrega em **add domain**.
3. Copia o **token** que aparece no topo da página.
4. Na pasta do projeto, cria o ficheiro `duckdns.token` com esse token (uma linha, mais
   nada). O `.gitignore` já o exclui — **o token nunca vai para o GitHub**.

#### Passo 2 — manter o IP atualizado

```bash
node duckdns.js          # atualiza o registo agora
node duckdns.js --ver    # só mostra o IP público, sem atualizar
```

O IP doméstico muda de tempos a tempos, por isso convém correr isto automaticamente.
No Windows, no **Agendador de Tarefas**: nova tarefa → repetir a cada 5 minutos →
ação `node` com o argumento `duckdns.js` e "iniciar em" a pasta do projeto.

#### Passo 3 — abrir as portas no router

O certificado HTTPS e o acesso de fora exigem que o teu computador esteja alcançável:

- Encaminhar no router as portas **80** e **443** para o IP local deste PC (`192.168.1.174`).
- Convém fixar esse IP local no router (reserva por MAC), senão muda e o
  encaminhamento deixa de apontar para o sítio certo.
- Permitir o Caddy na Firewall do Windows quando ele pedir.

A tua ligação **serve para isto**: o IP público (`176.79.148.144`) é um IP real, não
CGNAT, portanto o encaminhamento de portas funciona. Se o teu ISP mudar para CGNAT,
esta via deixa de ser possível e a alternativa é o VPS gratuito da Oracle (4.2), onde
o mesmo `Caddyfile` funciona tal e qual.

#### Passo 4 — pôr o Caddy à frente da app

```bash
winget install CaddyServer.Caddy     # instalar (uma vez)

node server.js                       # terminal 1: a app, em localhost:3000
caddy run --config Caddyfile         # terminal 2: HTTPS em totofiegsi.duckdns.org
```

O Caddy pede e renova sozinho o certificado Let's Encrypt. A app continua a correr em
HTTP no `localhost:3000` — quem trata do HTTPS é o Caddy, e o `server.js` já reconhece
esse cenário (ver 4.5).

> Enquanto as portas não estiverem encaminhadas, o Caddy não consegue obter o
> certificado e fica a tentar. Nessa fase continua a usar o túnel da Cloudflare (4.1),
> que não precisa de nada disto.

### 4.4 Comparação

| Opção | Sempre no ar | SQLite atual | HTTPS | Endereço fixo | Trabalho |
|---|---|---|---|---|---|
| PC + Cloudflare Tunnel | não (só com o PC ligado) | sim, no teu disco | incluído | não (muda) | mínimo |
| PC + DuckDNS + Caddy | não (só com o PC ligado) | sim, no teu disco | Let's Encrypt | **sim** | médio (router) |
| Oracle Always Free | sim | sim | Let's Encrypt | **sim** | alto (administras tudo) |
| Render / Koyeb grátis | adormece | **não** (exige mudar de BD) | incluído | sim | médio (migrar a BD) |

### 4.5 Sugestão

Para as primeiras jornadas, **o teu PC com Cloudflare Tunnel**: é gratuito, monta-se em
minutos, mantém a base de dados contigo e não obriga a mudar nada no código. Se mais
tarde o jogo pegar e quiseres o site sempre disponível, o passo seguinte natural é o
VPS gratuito da Oracle — a app corre lá tal como está.

### 4.6 O que mudar antes de expor na internet

1. ~~**Cookie com a flag `Secure`**~~ — **feito.** O `server.js` acrescenta `Secure` ao
   cookie de sessão quando o pedido chega por HTTPS (deteta o cabeçalho
   `X-Forwarded-Proto` que o Caddy envia). Em `localhost`, sem HTTPS, a flag não é
   adicionada — se fosse, o browser recusaria o cookie e o login deixava de funcionar.
2. **Sessões em memória** — ainda por fazer: um reinício do servidor termina as sessões
   de todos. Passar para um cookie assinado ou uma tabela de sessões.
3. **Backups do `totofiegsi.db`** — pelo menos um por jornada.
4. **Limite de tentativas de login**, para travar força bruta às passwords.

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
- Sessões guardadas em memória: reiniciar o servidor termina as sessões.
- Não há registo de resultados nem apuramento automático do vencedor — o cálculo de
  acertos e a divisão do prize pool ainda são feitos à mão.
- Uma jornada de cada vez: a tabela `apostas` não guarda o match day.
- Sem pagamentos (ver secção 5).
