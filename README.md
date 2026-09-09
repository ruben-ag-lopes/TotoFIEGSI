# TotoFIEGSI

Webapp do jogo **TotoFIEGSI** da Liga FIEGSI 26/27: boletim de prognósticos 1X2 para os
10 jogos da jornada da Liga dos Campeões, aposta de valor fixo (2 €) e registo das
apostas numa base de dados SQLite.

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

Node.js puro, **sem dependências externas**: servidor HTTP da biblioteca padrão,
SQLite através do módulo integrado `node:sqlite` e frontend em HTML/CSS/JavaScript
sem frameworks. Requer **Node 22.5 ou superior** (testado em Node 24).

### Estrutura

```
server.js       servidor HTTP + API
db.js           acesso à base de dados e hash das passwords
jornadas.js     TODAS as jornadas: jogos e resultados  <-- é aqui que se muda tudo
jornada.js      atalho para a jornada com ativa: true
arquivar.js     arquiva a classificação antes de fechar uma jornada
apostas.js      utilitário de consulta da BD pelo terminal
public/
  index.html    landing page + boletim
  jornadas.html jornadas, resultados e classificação
  login.html    login / criar conta
  app.js        lógica do boletim
  jornadas.js   lógica da página de jornadas
  login.js      lógica do login
  styles.css    estilos
totofiegsi.db   base de dados SQLite (criada na 1ª execução)
```

### Como correr localmente

```bash
node server.js        # ou: npm start
```

Abrir **http://localhost:3000**. Para mudar a porta: `PORT=8080 node server.js`.

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

## 3. Jornadas: jogos, resultados e classificação

Toda a informação das jornadas está em **[jornadas.js](jornadas.js)** — presentes e
passadas, com os jogos e os resultados. O `jornada.js` é apenas um atalho para a
jornada que tem `ativa: true`.

A página **Jornadas** (no menu do topo) mostra, para cada match day: os jogos, os
resultados oficiais e a classificação dos jogadores, com cada prognóstico marcado a
verde (acertou) ou vermelho (falhou).

### 3.1 Lançar os resultados

Basta preencher o campo `resultado` de cada jogo em `jornadas.js`: `'1'` vitória da
casa, `'x'` empate, `'2'` vitória do visitante. Fica `null` enquanto não se souber.

```js
{ n: 1, casa: 'Porto', fora: 'Manchester City', data: '2026-09-08', hora: '20:00', dia: 'Ter', resultado: '1' },
```

Reinicia o servidor e a classificação aparece calculada na página Jornadas. Enquanto a
jornada está `ativa`, os acertos são calculados **ao vivo** a partir das apostas que
estão na base de dados.

### 3.2 Fechar uma jornada e abrir a seguinte

A tabela `apostas` não guarda a que jornada pertence cada aposta, por isso a
classificação tem de ser **arquivada** antes de se limparem as apostas.

**1) Preenche todos os resultados** da jornada em `jornadas.js`.

**2) Confere e arquiva a classificação:**

```bash
node arquivar.js            # mostra a classificação e o vencedor, sem gravar
node arquivar.js --gravar   # escreve-a em jornadas.js (guarda cópia em .bak)
```

O script diz também quem ganhou e quanto recebe, já com a divisão em caso de empate e
o aviso se não se atingiu o mínimo de apostas.

**3) Fecha a jornada e abre a próxima** em `jornadas.js`:

```js
const JORNADAS = [
  {
    matchDay: 'MD1',
    ativa: false,              // <- deixa de ser a jornada em jogo
    // ... jogos com os resultados preenchidos
    classificacao: [ /* gravada pelo arquivar.js */ ]
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
    ],
    classificacao: null
  }
];
```

**4) Limpa as apostas** da jornada anterior:

```bash
node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('./totofiegsi.db').exec('DELETE FROM apostas')"
```

Os utilizadores mantêm-se — não é preciso voltarem a registar-se.

**5) Reinicia o servidor** e confirma o novo match day no boletim.

### 3.3 Regras a respeitar nos jogos

- **10 jogos**, com `n` de 1 a 10 — a ordem define a ordem dos prognósticos na chave
  (`1;2;x;...`), por isso é a mesma ordem que usas para conferir os resultados.
- `data` no formato `AAAA-MM-DD` e `hora` em `HH:MM`; `dia` é a abreviatura mostrada.
- `limiteISO` é a data/hora a que as apostas fecham (por norma, 17H30 do dia do
  primeiro jogo). `limiteTexto` é só o texto apresentado; convém manterem-se coerentes.
- Os jogos são agrupados visualmente por dia: basta estarem ordenados por data.

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
- [ ] `node arquivar.js --gravar` corrido
- [ ] jornada anterior com `ativa: false`
- [ ] nova jornada com 10 jogos, `ativa: true` e `classificacao: null`
- [ ] `limiteISO` e `limiteTexto` coerentes
- [ ] apostas antigas apagadas da base de dados
- [ ] servidor reiniciado e página verificada

---

## 4. Opções de alojamento

Quase todas são gratuitas; a única com custo é a 4.3 (~1 €/ano pelo domínio) e está
assinalada. O critério técnico decisivo é
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


### 4.3 Endereço fixo com domínio próprio (~1 €/ano) — para fazer mais tarde

Esta é a única forma de teres um **endereço que não muda**, sem tocar no router e com a
base de dados a viver no teu computador. Não é gratuita, mas é barata: o custo é só o
domínio.

**Porque é que o domínio é obrigatório:** o túnel *temporário* da secção 4.1 sorteia um
endereço a cada arranque. Para um endereço fixo é preciso um túnel **nomeado**, e esse
exige que a Cloudflare controle o DNS de um domínio teu. Subdomínios gratuitos (DuckDNS
e afins) não servem, porque não deixam mudar os nameservers.

**O que ganhas face ao túnel temporário:** endereço fixo e teu, WAF e proteção DDoS da
Cloudflare à frente da app, e a opção do Cloudflare Access. O teu IP de casa continua
escondido e não se abre porta nenhuma.

#### Passo 1 — comprar o domínio

Num registador como o Namecheap, procura um `.xyz` livre (ex.: `totofiegsi.xyz`) —
rondam **$0,99 no primeiro ano**.

> **Confirma a coluna de renovação antes de pagar.** O preço promocional é só do 1.º
> ano; a renovação sobe tipicamente para 10–15 €/ano.

Não contrates extras: sem alojamento, sem email, sem SSL pago — o certificado vem da
Cloudflare, de graça.

#### Passo 2 — pôr o domínio na Cloudflare

1. Cria conta gratuita em `dash.cloudflare.com`
2. **Add a site** → escreve o domínio → escolhe o plano **Free**
3. A Cloudflare mostra **dois nameservers** (algo como `xxx.ns.cloudflare.com`)
4. No registador: *Domain* → *Nameservers* → passa de "BasicDNS" para **Custom DNS** e
   cola os dois
5. Espera pela confirmação (minutos, por vezes algumas horas)

#### Passo 3 — criar o túnel nomeado

Numa consola, na pasta do projeto (`CF` é o caminho do cloudflared já instalado):

```powershell
$CF = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

& $CF tunnel login                                 # abre o browser para autorizares
& $CF tunnel create totofiegsi                     # cria o tunel e o ficheiro de credenciais
& $CF tunnel route dns totofiegsi totofiegsi.xyz   # aponta o dominio ao tunel
```

Depois cria o ficheiro `C:\Users\HP\.cloudflared\config.yml`:

```yaml
tunnel: totofiegsi
credentials-file: C:\Users\HP\.cloudflared\<id-do-tunel>.json

ingress:
  - hostname: totofiegsi.xyz
    service: http://localhost:3000
  - service: http_status:404
```

E corre o túnel:

```powershell
& $CF tunnel run totofiegsi
```

#### Passo 4 — arrancar sozinho com o Windows

Para deixares de depender de uma janela aberta, instala como serviço (consola **como
administrador**):

```powershell
& $CF service install
```

O `node server.js` também tem de estar a correr — o túnel só encaminha, não serve a app.

#### Opcional — Cloudflare Access (filtrar quem entra)

O plano **Zero Trust gratuito** inclui o Access até **50 utilizadores**: uma camada de
autenticação **à frente** da app, em que só emails autorizados conseguem ver a página.
Configura-se em `dash.cloudflare.com` → *Zero Trust* → *Access* → *Applications*.

O custo é atrito: cada jogador faz um código por email **antes** do login da app. Vale a
pena se te preocupar gente aleatória tropeçar no link; caso contrário, as proteções que
a app já tem (limite de tentativas, password de 8 caracteres, contactos só com sessão
iniciada) chegam.

> **Privacidade:** a Cloudflare termina o TLS nos servidores dela, ou seja, vê o tráfego
> em claro. Para uma liga interna é irrelevante, mas é a diferença face ao Tailscale
> Funnel, que termina o TLS na tua máquina.

### 4.4 Comparação

| Opção | Sempre no ar | SQLite atual | HTTPS | Endereço fixo | Trabalho |
|---|---|---|---|---|---|
| PC + Cloudflare Tunnel | não (só com o PC ligado) | sim, no teu disco | incluído | não (muda) | mínimo |
| PC + domínio próprio (4.3) | não (só com o PC ligado) | sim, no teu disco | incluído | **sim** | médio (~1 €/ano) |
| Oracle Always Free | sim | sim | Let's Encrypt | sim | alto (administras tudo) |
| Render / Koyeb grátis | adormece | **não** (exige mudar de BD) | incluído | sim | médio (migrar a BD) |

### 4.5 Sugestão

Para as primeiras jornadas, **o teu PC com Cloudflare Tunnel**: é gratuito, monta-se em
minutos, mantém a base de dados contigo e não obriga a mudar nada no código. Se mais
tarde o jogo pegar e quiseres o site sempre disponível, o passo seguinte natural é o
VPS gratuito da Oracle — a app corre lá tal como está.

### 4.6 O que mudar antes de expor na internet

Independentemente da opção:

**Já implementado:**

1. **A app só escuta em `127.0.0.1`.** Antes aceitava ligações de qualquer máquina da
   rede Wi-Fi; agora só do próprio computador. Os túneis (Cloudflare, Tailscale) correm
   localmente e ligam-se a `127.0.0.1`, por isso continuam a funcionar. Para servir
   deliberadamente a rede local: `HOST=0.0.0.0 node server.js`.
2. **Limite de tentativas de login:** 5 falhas por minuto por IP, no `server.js`. À 6ª
   devolve `429` com o tempo de espera. Não depende de nenhum serviço externo. O IP é
   lido do `X-Forwarded-For` quando há túnel à frente.
3. **Password mínima de 8 caracteres** (era 4).
4. **Contactos de MB WAY só com sessão iniciada.** O `GET /api/jornada` entregava os
   números de telemóvel a qualquer visitante; agora a lista vai vazia sem login. Os
   jogos, datas e limites continuam públicos.
5. **Cookie com a flag `Secure`** quando o pedido chega por HTTPS (deteta o
   `X-Forwarded-Proto`). Em `localhost`, sem HTTPS, não é adicionada — se fosse, o
   browser recusava o cookie e o login deixava de funcionar.
6. **Mesma mensagem de erro** para utilizador inexistente e password errada, para não
   revelar quem tem conta.

**Por fazer:**

- **Sessões em memória** — um reinício do servidor termina as sessões de todos.
- **Backups do `totofiegsi.db`** — pelo menos um por jornada.
- **Código de registo** — hoje qualquer pessoa com o link cria conta e mete apostas no
  bolo. Uma palavra combinada no registo resolveria.
- As contas criadas **antes** desta versão mantêm as passwords antigas, que podem ter
  menos de 8 caracteres: o mínimo só se aplica a registos novos.

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
