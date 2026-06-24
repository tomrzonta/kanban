#!/bin/sh
# Aplica as migrações pendentes e então inicia a API.
# Rodar 'alembic upgrade head' no startup garante que o banco está sempre na
# versão mais recente do schema — sem apagar dados.
set -e

echo "Aplicando migrações do banco (alembic upgrade head)..."
alembic upgrade head

echo "Iniciando a API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
