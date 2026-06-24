# Frontend React + Vite, em modo desenvolvimento (hot reload).
# Para produção, troque por um build multi-stage servindo com nginx (ver nota no compose).
FROM node:20-slim

WORKDIR /app

# Instala dependências primeiro (camada cacheada enquanto package.json não muda).
COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host 0.0.0.0 expõe o Vite para fora do container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
