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
           autor: str | None = Query(None),
           q: str | None = Query(None),
           date_from: str | None = Query(None),
           date_to: str | None = Query(None),
           limit: int = Query(50, le=500),
           offset: int = Query(0),
           _: models.User = Depends(requer_admin),
           db: Session = Depends(get_db)):
    """Lista os registros de auditoria, mais recentes primeiro, com filtros
    opcionais (entidade, ação, autor, texto na descrição, período) e paginação."""
    conds = []
    params = {"limit": limit, "offset": offset}
    if entidade:
        conds.append("entidade = :entidade")
        params["entidade"] = entidade
    if acao:
        conds.append("acao = :acao")
        params["acao"] = acao
    if autor:
        conds.append("autor_nome = :autor")
        params["autor"] = autor
    if q and q.strip():
        conds.append("LOWER(descricao) LIKE LOWER(:q)")
        params["q"] = f"%{q.strip()}%"
    if date_from:
        conds.append("criado_em >= :date_from")
        params["date_from"] = date_from
    if date_to:
        # Inclui o dia inteiro do 'até': compara com o dia seguinte às 00h.
        from datetime import datetime, timedelta
        try:
            dt = datetime.fromisoformat(date_to).date() + timedelta(days=1)
            conds.append("criado_em < :date_to_fim")
            params["date_to_fim"] = dt.isoformat()
        except ValueError:
            pass  # data inválida: ignora o filtro em vez de quebrar
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
    """Valores distintos de entidade, ação e autor, para os filtros da tela."""
    ents = [r[0] for r in db.execute(text(
        "SELECT DISTINCT entidade FROM audit_logs ORDER BY entidade")).all()]
    acoes = [r[0] for r in db.execute(text(
        "SELECT DISTINCT acao FROM audit_logs ORDER BY acao")).all()]
    autores = [r[0] for r in db.execute(text(
        "SELECT DISTINCT autor_nome FROM audit_logs "
        "WHERE autor_nome IS NOT NULL ORDER BY autor_nome")).all()]
    return {"entidades": ents, "acoes": acoes, "autores": autores}
