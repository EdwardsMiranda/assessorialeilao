# 🚀 GUIA RÁPIDO - Configurar Supabase

## Passo 1: Criar as Tabelas (2 minutos)

1. **Abra o Supabase**: https://supabase.com/dashboard
2. **Selecione seu projeto**: `zadpeugkyktfzhasrxaa`
3. **Clique em "SQL Editor"** (ícone de banco de dados no menu lateral)
4. **Clique em "New query"**
5. **Abra o arquivo** `database/setup-supabase.sql` deste projeto
6. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
7. **Cole no SQL Editor** do Supabase
8. **Clique em "Run"** (ou pressione Ctrl+Enter)
9. **Aguarde** a mensagem de sucesso ✅

## Passo 2: Criar Usuário Admin (1 minuto)

### Opção A: Via Interface (MAIS FÁCIL)
1. No Supabase, vá em **Authentication** > **Users**
2. Clique em **"Add user"** (botão verde)
3. Preencha:
   ```
   Email: admin@leilao.com
   Password: 123
   ```
4. ✅ **IMPORTANTE**: Marque "Auto Confirm User"
5. Clique em **"Create user"**
6. **Copie o UUID** que aparece na coluna "ID" (algo como `a1b2c3d4-...`)
7. Volte ao **SQL Editor** e execute:

```sql
INSERT INTO users (id, name, email, password_hash, role, avatar, blocked)
VALUES (
  'COLE-O-UUID-AQUI',
  'Carlos Gestor',
  'admin@leilao.com',
  '',
  'Gestor',
  'https://picsum.photos/seed/u1/40',
  false
);
```

### Opção B: Via SQL (Tudo de uma vez)
Execute este SQL no SQL Editor:

```sql
-- Criar usuário na autenticação
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@leilao.com',
  crypt('123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- Copie o ID retornado e use no comando abaixo
INSERT INTO users (id, name, email, password_hash, role, avatar, blocked)
VALUES (
  'ID-RETORNADO-ACIMA',
  'Carlos Gestor',
  'admin@leilao.com',
  '',
  'Gestor',
  'https://picsum.photos/seed/u1/40',
  false
);
```

## Passo 3: Configurar Autenticação (30 segundos)

1. No Supabase, vá em **Authentication** > **Providers**
2. Certifique-se que **Email** está ✅ habilitado
3. Vá em **Authentication** > **Email Templates**
4. **Desmarque** "Enable email confirmations"
5. Salve

## Passo 4: Testar Localmente

```bash
# Instalar dependências
npm install

# Rodar o projeto
npm run dev
```

Acesse: http://localhost:5173

**Login:**
- Email: `admin@leilao.com`
- Senha: `123`

## ✅ Checklist

- [ ] Executei o SQL no Supabase
- [ ] Criei o usuário admin
- [ ] Configurei a autenticação
- [ ] Instalei as dependências (`npm install`)
- [ ] Testei localmente (`npm run dev`)
- [ ] Consegui fazer login

## 🆘 Problemas?

### "Invalid login credentials"
- Certifique-se que o usuário foi criado em **ambas** as tabelas (`auth.users` E `users`)
- Verifique se marcou "Auto Confirm User"

### "Missing Supabase environment variables"
- O arquivo `.env` já está configurado com suas credenciais
- Reinicie o servidor (`npm run dev`)

### Erro ao executar SQL
- Execute os comandos um por um se der erro
- Verifique se já não existem tabelas com o mesmo nome

## 📞 Próximo Passo

Depois que tudo funcionar localmente, precisamos configurar o Vercel para produção!
