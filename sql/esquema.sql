-- ---------------------------------------------------------------------------
--  TotoFIEGSI — esquema para o Supabase (Postgres)
--
--  Como correr: painel do Supabase → SQL Editor → cola isto → Run.
--  É seguro correr mais do que uma vez (usa IF NOT EXISTS).
-- ---------------------------------------------------------------------------

create table if not exists utilizadores (
  utilizador text primary key,
  equipa     text not null,
  password   text not null            -- hash scrypt: scrypt$<salt>$<hash>
);

create table if not exists apostas (
  id         bigint generated always as identity primary key,
  utilizador text not null references utilizadores(utilizador),
  jornada    text not null,           -- match day a que a aposta pertence (ex.: 'MD1')
  chave      text not null            -- 10 prognósticos separados por ';'
);

-- Procuras mais frequentes: apostas de uma jornada, e de um jogador numa jornada.
create index if not exists apostas_jornada_idx on apostas (jornada);
create index if not exists apostas_utilizador_jornada_idx on apostas (utilizador, jornada);

-- Limite de tentativas de login por IP (anti força bruta).
create table if not exists tentativas_login (
  ip       text primary key,
  contagem integer not null default 0,
  inicio   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  SEGURANÇA — a parte que não pode falhar
--
--  Liga-se o RLS (Row Level Security) e NÃO se cria nenhuma política. O efeito
--  é: a chave `anon` (a que é pública e pode aparecer no browser) não consegue
--  ler nem escrever absolutamente nada nestas tabelas.
--
--  Só a chave `service_role` passa — e essa vive apenas nas variáveis de
--  ambiente do servidor, nunca no código do frontend. Toda a app fala com a
--  base de dados através das funções de servidor.
--
--  Isto é o erro clássico com Supabase: deixar tabelas sem RLS e assumir que
--  ninguém descobre a chave anónima. Aqui, mesmo que descubram, não abre nada.
-- ---------------------------------------------------------------------------

alter table utilizadores     enable row level security;
alter table apostas          enable row level security;
alter table tentativas_login enable row level security;

-- Confirmação: deve devolver as três tabelas com rowsecurity = true
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public'
--     and tablename in ('utilizadores','apostas','tentativas_login');
