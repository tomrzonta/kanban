"""Entrypoint da API. Registra os routers e configura CORS.

Rodar em desenvolvimento:
    uvicorn app.main:app --reload
Docs interativas (Swagger): http://localhost:8000/docs
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import usuario_atual, requer_admin
from app import models  # noqa: F401  (garante o registro dos modelos no metadata)
from app.routers import (
    catalog, columns, tickets, reports, export, entities, analytics, auth,
    attachments, recebimentos, eventos, auditoria, kb, compras, gastos, retidas,
)

# As tabelas são criadas/atualizadas por migrações Alembic (rodadas no startup
# do container, antes da API subir). Não usamos mais create_all: assim mudanças
# de schema preservam os dados existentes.

app = FastAPI(title="Garantias 3D — Kanban de Tickets")

# Em rede local de teste, CORS_ABERTO=true libera qualquer origem (evita listar
# cada IP). Caso contrário, usa a lista explícita de FRONTEND_ORIGINS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.CORS_ABERTO else settings.FRONTEND_ORIGINS,
    allow_credentials=not settings.CORS_ABERTO,  # "*" + credentials não é permitido juntos
    allow_methods=["*"],
    allow_headers=["*"],
)

# Autenticação: aberto (login não pode exigir login).
app.include_router(auth.router)

# Endpoints de uso geral: exigem usuário logado (qualquer papel).
# Catálogo, colunas e entidades também exigem login; a restrição de ADMIN para
# escrita (criar/editar/excluir) é aplicada dentro de cada router, pois leitura
# (listar) precisa estar disponível para atendentes montarem os formulários.
login_obrigatorio = [Depends(usuario_atual)]
for r in (tickets.router, reports.router, export.router, analytics.router,
          catalog.router, columns.router, entities.router, attachments.router,
          recebimentos.router, eventos.router, auditoria.router, kb.router,
          compras.router, gastos.router, retidas.router):
    app.include_router(r, dependencies=login_obrigatorio)


@app.get("/health")
def health():
    return {"status": "ok"}
