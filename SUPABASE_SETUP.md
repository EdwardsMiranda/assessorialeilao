# Variáveis de Ambiente - Supabase

## Instruções de Configuração

1. Crie uma conta no Supabase: https://supabase.com
2. Crie um novo projeto
3. Vá em Settings > API
4. Copie as credenciais abaixo

## Arquivo .env

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

## Configuração no Vercel

Adicione as mesmas variáveis no Vercel:
1. Acesse seu projeto no Vercel
2. Vá em Settings > Environment Variables
3. Adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Executar o Schema SQL

1. No Supabase, vá em SQL Editor
2. Abra o arquivo `database/schema.sql`
3. Copie todo o conteúdo
4. Cole no SQL Editor do Supabase
5. Clique em "Run"

## Configurar Autenticação

1. No Supabase, vá em Authentication > Providers
2. Habilite "Email" provider
3. Desabilite "Confirm email" (para desenvolvimento)
4. Em Authentication > URL Configuration:
   - Site URL: `http://localhost:5173` (dev) ou sua URL de produção
   - Redirect URLs: adicione suas URLs permitidas

## Row Level Security (RLS)

O schema já inclui políticas RLS básicas. Para produção, revise e ajuste conforme necessário.
