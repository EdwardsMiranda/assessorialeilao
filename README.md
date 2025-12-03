# Sistema de Análise de Leilões

Sistema completo para análise e gestão de imóveis em leilão.

## 🚀 Tecnologias

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** Google Gemini
- **Deploy:** Vercel

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Supabase (gratuita)
- Conta no Vercel (gratuita)

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Execute o schema SQL:
   - Vá em **SQL Editor** no Supabase
   - Copie o conteúdo de `database/schema.sql`
   - Cole e execute no SQL Editor

### 3. Configurar Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas credenciais do Supabase
# Encontre suas credenciais em: Settings > API
```

### 4. Configurar Autenticação no Supabase

1. Vá em **Authentication > Providers**
2. Habilite **Email** provider
3. Desabilite "Confirm email" (para desenvolvimento)
4. Em **Authentication > URL Configuration**:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: adicione `http://localhost:5173/**`

### 5. Executar Localmente

```bash
npm run dev
```

Acesse: `http://localhost:5173`

**Credenciais padrão:**
- Admin: `admin@leilao.com` / `123`
- Analista: `ana@leilao.com` / `123`

## 📦 Deploy

### Vercel

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy automático a cada push

## 📁 Estrutura do Projeto

```
src/
├── components/       # Componentes React
├── context/          # Context API (AppContext)
├── lib/              # Configurações (Supabase)
├── pages/            # Páginas da aplicação
├── services/         # Serviços de API
│   ├── auth.service.ts
│   ├── property.service.ts
│   ├── client.service.ts
│   └── geminiService.ts
├── types.ts          # TypeScript types
└── utils/            # Funções utilitárias

database/
└── schema.sql        # Schema PostgreSQL
```

## 🔐 Segurança

- Senhas hasheadas com bcrypt
- Row Level Security (RLS) habilitado
- Tokens JWT para autenticação
- Variáveis de ambiente para credenciais

## 📚 Documentação Adicional

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Guia detalhado de configuração
- [database/schema.sql](./database/schema.sql) - Schema do banco de dados

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Lint do código
```

## 📝 Funcionalidades

- ✅ Autenticação de usuários
- ✅ Gestão de propriedades
- ✅ Análise detalhada de imóveis
- ✅ CRM de clientes
- ✅ Análise com IA (Gemini)
- ✅ Dashboard com estatísticas
- ✅ Gestão de oportunidades
- ✅ Controle de vendas

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.
