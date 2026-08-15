-- ═══════════════════════════════════════════════════════════
-- EXECUTAR NO SUPABASE → SQL EDITOR (é só copiar, colar e RUN)
-- Cria as 3 tabelas necessárias para a app Fornecedores
-- ═══════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- 1. FORNECEDORES
create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome_empresa text not null,
  nome_comercial text,
  contato_comercial text,
  nif text,
  nib text,
  created_at timestamptz default now()
);

-- Se a tabela "fornecedores" já existia (versão anterior sem NIF), corre isto:
alter table fornecedores add column if not exists nif text;

-- 2. FATURAS DE FORNECEDOR
create table if not exists faturas_fornecedores (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references fornecedores(id) on delete cascade,
  tipo text default 'FT',
  numero text,
  data date default current_date,
  valor numeric not null default 0,
  created_at timestamptz default now()
);

-- 3. PAGAMENTOS A FORNECEDOR (conta corrente)
create table if not exists pagamentos_fornecedores (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references fornecedores(id) on delete cascade,
  fatura_id uuid references faturas_fornecedores(id) on delete set null,
  forma_pagamento text default 'TRANSFERÊNCIA',
  banco text,
  valor numeric not null default 0,
  data date default current_date,
  created_at timestamptz default now()
);

-- ── RLS (igual ao resto da app: acesso via chave "anon") ──
alter table fornecedores enable row level security;
alter table faturas_fornecedores enable row level security;
alter table pagamentos_fornecedores enable row level security;

create policy "anon full access fornecedores" on fornecedores
  for all using (true) with check (true);

create policy "anon full access faturas_fornecedores" on faturas_fornecedores
  for all using (true) with check (true);

create policy "anon full access pagamentos_fornecedores" on pagamentos_fornecedores
  for all using (true) with check (true);
