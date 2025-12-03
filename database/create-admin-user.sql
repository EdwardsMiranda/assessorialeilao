-- ============================================
-- CRIAR USUÁRIO ADMINISTRADOR
-- Email: edwards.miranda123@gmail.com
-- Senha: antedwma
-- ============================================

-- OPÇÃO 1: Criar via Supabase Auth (RECOMENDADO)
-- Execute este SQL no SQL Editor do Supabase

-- Passo 1: Criar o usuário na tabela auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'edwards.miranda123@gmail.com',
  crypt('antedwma', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{}',
  NULL,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
) RETURNING id;

-- IMPORTANTE: Copie o UUID retornado acima e use no próximo comando!

-- Passo 2: Inserir na tabela users (substitua 'UUID-AQUI' pelo UUID retornado acima)
INSERT INTO users (id, name, email, password_hash, role, avatar, blocked)
VALUES (
  'UUID-AQUI',  -- ⚠️ SUBSTITUA PELO UUID RETORNADO NO PASSO 1
  'Edwards Miranda',
  'edwards.miranda123@gmail.com',
  '',
  'Gestor',
  'https://ui-avatars.com/api/?name=Edwards+Miranda&background=random',
  false
);


-- ============================================
-- OPÇÃO 2: Criar via Interface do Supabase (MAIS FÁCIL)
-- ============================================

-- 1. No Supabase, vá em Authentication > Users
-- 2. Clique em "Add user" (botão verde)
-- 3. Preencha:
--    Email: edwards.miranda123@gmail.com
--    Password: antedwma
--    ✅ Marque "Auto Confirm User"
-- 4. Clique em "Create user"
-- 5. Copie o UUID do usuário criado (coluna ID)
-- 6. Execute este SQL substituindo o UUID:

INSERT INTO users (id, name, email, password_hash, role, avatar, blocked)
VALUES (
  'UUID-COPIADO-AQUI',  -- ⚠️ Cole o UUID aqui
  'Edwards Miranda',
  'edwards.miranda123@gmail.com',
  '',
  'Gestor',
  'https://ui-avatars.com/api/?name=Edwards+Miranda&background=random',
  false
);


-- ============================================
-- VERIFICAR SE O USUÁRIO FOI CRIADO
-- ============================================

-- Verificar na tabela auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'edwards.miranda123@gmail.com';

-- Verificar na tabela users
SELECT id, name, email, role FROM users WHERE email = 'edwards.miranda123@gmail.com';
