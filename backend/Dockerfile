# Backend FastAPI. Imagem slim para reduzir o tamanho final.
FROM python:3.12-slim

WORKDIR /app

# Instala dependências primeiro (camada cacheada enquanto requirements.txt não muda).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia configuração do Alembic, as migrações e o código da aplicação.
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8000

# O entrypoint aplica as migrações e então sobe a API.
ENTRYPOINT ["./entrypoint.sh"]
