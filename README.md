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
public/
  index.html   landing page + boletim
  login.html   login / criar conta
  app.js       lógica do boletim
  login.js     lógica do login
  styles.css   estilos
totofiegsi.db  base de dados SQLite (criada na 1ª execução)
```

### Como correr localmente

```bash
node server.js        # ou: npm start
```

Abrir **http://localhost:3000**. Para mudar a porta: `PORT=8080 node server.js`.

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

Os contactos de pagamento estão em `jornada.js` com **números fictícios** —
substitui-os pelos reais antes de usar a app a sério:

```js
pagamento: {
  metodo: 'MB WAY',
  minutos: 5,
  contactos: [
    { nome: 'Ruben',     telemovel: '912 000 001' },
    { nome: 'Mané',      telemovel: '912 000 002' },
    { nome: 'John Mira', telemovel: '912 000 003' }
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


### 4.3 Comparação

| Opção | Sempre no ar | SQLite atual | HTTPS | Endereço fixo | Trabalho |
|---|---|---|---|---|---|
| PC + Cloudflare Tunnel | não (só com o PC ligado) | sim, no teu disco | incluído | não (muda) | mínimo |
| Oracle Always Free | sim | sim | via DuckDNS + Caddy | sim | alto (administras tudo) |
| Render / Koyeb grátis | adormece | **não** (exige mudar de BD) | incluído | sim | médio (migrar a BD) |

### 4.4 Sugestão

Para as primeiras jornadas, **o teu PC com Cloudflare Tunnel**: é gratuito, monta-se em
minutos, mantém a base de dados contigo e não obriga a mudar nada no código. Se mais
tarde o jogo pegar e quiseres o site sempre disponível, o passo seguinte natural é o
VPS gratuito da Oracle — a app corre lá tal como está.

### 4.5 O que mudar antes de expor na internet

Independentemente da opção:

1. **Sessões em memória** — hoje um reinício do servidor termina as sessões de todos.
   Passar para um cookie assinado ou uma tabela de sessões.
2. **Cookie com a flag `Secure`** quando o acesso for por HTTPS (já tem `HttpOnly` e
   `SameSite=Lax`).
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
| **Revolut Business / Revolut Pay** | Links de pagamento, transferência | Prático para grupos fechados; pode ser usado sem integração nenhuma. |
| **MB WAY manual** | Transferência para um número | Sem integração: o organizador confere os pagamentos e marca a aposta como paga. É o mais simples para uma liga interna. |

Duas notas práticas:

- **Comissões.** Em pagamentos de 2 €, uma taxa percentual (Stripe, PayPal) come uma
  fatia grande. Referência Multibanco com custo fixo baixo, ou cobrar o saldo em lote
  (ex.: 10 € por 5 apostas / por época), sai muito mais em conta.
- **Enquadramento legal.** Apostas com prémio em dinheiro em Portugal são atividade
  regulada (SRIJ). Para um jogo interno entre colegas, sem lucro para o organizador,
  é habitual ficar-se pela gestão manual dos valores; se a coisa crescer ou passar a
  ter margem, vale a pena confirmar o enquadramento antes de integrar pagamentos.

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
