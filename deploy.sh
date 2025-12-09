#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Iniciando Script de Deploy ===${NC}"

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Erro: Node.js não encontrado.${NC}"
    echo "Por favor, instale o Node.js antes de continuar: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js encontrado$(node -v)${NC}"

# 2. Install Dependencies
echo -e "\n${YELLOW}Instalando dependências...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao instalar dependências.${NC}"
    exit 1
fi

# 3. Build Project
echo -e "\n${YELLOW}Gerando build de produção...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro no build.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build gerado com sucesso na pasta /dist${NC}"

# 4. Deploy to Vercel
echo -e "\n${YELLOW}Iniciando deploy na Vercel...${NC}"
echo "Se for a primeira vez, você precisará fazer login e confirmar as configurações."

# Check if vercel is installed, otherwise use npx
if command -v vercel &> /dev/null; then
    vercel --prod
else
    npx vercel --prod
fi

echo -e "\n${GREEN}=== Processo Finalizado ===${NC}"
