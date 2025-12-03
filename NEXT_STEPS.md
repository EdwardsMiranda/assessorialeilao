# Próximos Passos - Configuração do Supabase

## ✅ Concluído
- Schema SQL criado
- Serviços de API implementados
- AppContext integrado com Supabase
- Login component atualizado
- Loading states adicionados
- Código commitado e enviado para GitHub

## 🔧 Configuração Necessária no Supabase

### 1. Executar o Schema SQL (5 min)
1. Acesse seu projeto Supabase: https://supabase.com/dashboard
2. Vá em **SQL Editor** (ícone de banco de dados no menu lateral)
3. Clique em **New query**
4. Copie todo o conteúdo de `database/schema.sql`
5. Cole no editor e clique em **Run**
6. Aguarde a confirmação de sucesso

### 2. Configurar Autenticação (3 min)
1. No Supabase, vá em **Authentication** > **Providers**
2. Certifique-se que **Email** está habilitado
3. **IMPORTANTE**: Desabilite "Confirm email" (para desenvolvimento)
   - Vá em **Authentication** > **Email Templates**
   - Desmarque "Enable email confirmations"
4. Em **Authentication** > **URL Configuration**:
   - Site URL: `https://seu-dominio.vercel.app` (ou localhost para dev)
   - Redirect URLs: adicione `https://seu-dominio.vercel.app/**`

### 3. Criar Usuários Iniciais (2 min)

**Opção A: Via SQL Editor**
```sql
-- Criar usuário admin
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'admin@leilao.com',
  crypt('123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Pegar o ID do usuário criado
SELECT id FROM auth.users WHERE email = 'admin@leilao.com';

-- Inserir na tabela users (substitua o UUID pelo ID retornado acima)
INSERT INTO users (id, name, email, password_hash, role, avatar)
VALUES (
  'UUID-DO-USUARIO-AQUI',
  'Carlos Gestor',
  'admin@leilao.com',
  '',
  'Gestor',
  'https://picsum.photos/seed/u1/40'
);
```

**Opção B: Via Interface do Supabase**
1. Vá em **Authentication** > **Users**
2. Clique em **Add user**
3. Email: `admin@leilao.com`
4. Password: `123`
5. Clique em **Create user**
6. Copie o UUID do usuário criado
7. Vá no **SQL Editor** e execute:
```sql
INSERT INTO users (id, name, email, password_hash, role, avatar, blocked)
VALUES (
  'UUID-COPIADO-AQUI',
  'Carlos Gestor',
  'admin@leilao.com',
  '',
  'Gestor',
  'https://picsum.photos/seed/u1/40',
  false
);
```

### 4. Configurar Row Level Security (Opcional - Produção)

O schema já inclui RLS básico. Para produção, adicione políticas mais específicas:

```sql
-- Exemplo: Usuários só podem ver suas próprias properties
CREATE POLICY "Users can view own properties"
ON properties FOR SELECT
TO authenticated
USING (assigned_to = auth.uid() OR added_by = auth.uid());
```

## 🚀 Deploy no Vercel

### Adicionar Variáveis de Ambiente
1. Acesse seu projeto no Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione:
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://zadpeugkyktfzhasrxaa.supabase.co`
   - Environments: Production, Preview, Development
4. Adicione:
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (sua chave)
   - Environments: Production, Preview, Development
5. Clique em **Save**

### Redeployar
O push que acabamos de fazer já deve ter triggerado um novo deploy. Verifique em:
- Vercel Dashboard > Deployments

## 🧪 Testar Localmente

1. Instale as dependências:
```bash
npm install
```

2. Execute o projeto:
```bash
npm run dev
```

3. Acesse `http://localhost:5173`

4. Faça login com:
   - Email: `admin@leilao.com`
   - Senha: `123`

## ⚠️ Troubleshooting

### Erro: "Cannot find module @supabase/supabase-js"
```bash
npm install @supabase/supabase-js
```

### Erro: "Invalid login credentials"
- Verifique se o usuário foi criado corretamente no Supabase
- Verifique se o email está confirmado (ou se desabilitou a confirmação)
- Verifique se o usuário existe na tabela `users`

### Erro: "Missing Supabase environment variables"
- Verifique se o arquivo `.env` existe
- Verifique se as variáveis começam com `VITE_`
- Reinicie o servidor de desenvolvimento

### Erro de CORS
- Adicione sua URL no Supabase em **Settings** > **API** > **URL Configuration**

## 📊 Próximas Funcionalidades

Após o setup estar funcionando:
1. ✅ Autenticação funcionando
2. ⏳ Testar CRUD de properties
3. ⏳ Testar CRUD de clients
4. ⏳ Testar upload de arquivos (Supabase Storage)
5. ⏳ Implementar realtime subscriptions (opcional)

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase em **Logs** > **Database**
2. Verifique os logs do Vercel
3. Verifique o console do navegador (F12)
