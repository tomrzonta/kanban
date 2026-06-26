"""Endpoint de consulta da auditoria (somente admin)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import requer_admin

router = APIRouter(prefix="/api/auditoria", tags=["auditoria"])


@router.get("")
def listar(entidade: str | None = Query(None),
           acao: str | None = Query(None),
           limit: int = Query(100, le=500),
           offset: int = Query(0),
           _: models.User = Depends(requer_admin),
           db: Session = Depends(get_db)):
    """Lista os registros de auditoria, mais recentes primeiro, com filtros
    opcionais por entidade e ação, e paginação."""
    conds = []
    params = {"limit": limit, "offset": offset}
    if entidade:
        conds.append("entidade = :entidade")
        params["entidade"] = entidade
    if acao:
        conds.append("acao = :acao")
        params["acao"] = acao
    where = ("WHERE " + " AND ".join(conds)) if conds else ""

    total = db.execute(text(f"SELECT COUNT(*) FROM audit_logs {where}"),
                       params).scalar()
    rows = db.execute(text(f"""
        SELECT id, autor_nome, acao, entidade, descricao, criado_em
        FROM audit_logs {where}
        ORDER BY criado_em DESC, id DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    return {"total": total, "itens": [dict(r) for r in rows]}


@router.get("/opcoes")
def opcoes(_: models.User = Depends(requer_admin), db: Session = Depends(get_db)):
    """Valores distintos de entidade e ação, para os filtros da tela."""
    ents = [r[0] for r in db.execute(text(
        "SELECT DISTINCT entidade FROM audit_logs ORDER BY entidade")).all()]
    acoes = [r[0] for r in db.execute(text(
        "SELECT DISTINCT acao FROM audit_logs ORDER BY acao")).all()]
    return {"entidades": ents, "acoes": acoes}
