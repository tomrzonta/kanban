"""Endpoints de gastos por ticket e categorias de gasto.

Categorias: gerenciadas no Catálogo (admin). Gastos: cada ticket tem uma lista;
a soma alimenta o prejuízo efetivo (ver analytics). CRUD por usuário logado.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import usuario_atual, requer_admin
from app.services.auditoria import registrar_auditoria

router = APIRouter(prefix="/api", tags=["gastos"])


# ---------- Categorias de gasto (Catálogo) ----------
class CategoriaIn(BaseModel):
    name: str
    active: int = 1


@router.get("/categorias-gasto")
def listar_categorias(db: Session = Depends(get_db)):
    cats = db.query(models.CategoriaGasto).order_by(models.CategoriaGasto.name).all()
    return [{"id": c.id, "name": c.name, "active": c.active} for c in cats]


@router.post("/categorias-gasto")
def criar_categoria(p: CategoriaIn, admin: models.User = Depends(requer_admin),
                    db: Session = Depends(get_db)):
    if not p.name.strip():
        raise HTTPException(400, "Informe o nome da categoria.")
    c = models.CategoriaGasto(name=p.name.strip(), active=p.active)
    db.add(c)
    registrar_auditoria(db, admin, "criar", "catalogo",
                        f"Criou a categoria de gasto \"{p.name.strip()}\".")
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "active": c.active}


@router.patch("/categorias-gasto/{cat_id}")
def atualizar_categoria(cat_id: int, p: CategoriaIn,
                        admin: models.User = Depends(requer_admin),
                        db: Session = Depends(get_db)):
    c = db.query(models.CategoriaGasto).get(cat_id)
    if not c:
        raise HTTPException(404, "Categoria não encontrada.")
    c.name = p.name.strip()
    c.active = p.active
    registrar_auditoria(db, admin, "editar", "catalogo",
                        f"Editou a categoria de gasto \"{c.name}\".")
    db.commit()
    return {"id": c.id, "name": c.name, "active": c.active}


@router.delete("/categorias-gasto/{cat_id}")
def excluir_categoria(cat_id: int, admin: models.User = Depends(requer_admin),
                      db: Session = Depends(get_db)):
    c = db.query(models.CategoriaGasto).get(cat_id)
    if not c:
        raise HTTPException(404, "Categoria não encontrada.")
    nome = c.name
    db.delete(c)
    registrar_auditoria(db, admin, "excluir", "catalogo",
                        f"Excluiu a categoria de gasto \"{nome}\".")
    db.commit()
    return {"ok": True}


# ---------- Gastos de um ticket ----------
class GastoIn(BaseModel):
    categoria_id: int | None = None
    valor: float
    descricao: str | None = None


def _gasto_dict(g, nome_cat=None):
    return {
        "id": g.id, "ticket_id": str(g.ticket_id),
        "categoria_id": g.categoria_id, "categoria_nome": nome_cat,
        "valor": float(g.valor or 0), "descricao": g.descricao,
    }


@router.get("/tickets/{ticket_id}/gastos")
def listar_gastos(ticket_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT g.id, g.ticket_id, g.categoria_id, g.valor, g.descricao,
               cg.name AS categoria_nome
        FROM gastos_ticket g
        LEFT JOIN categorias_gasto cg ON cg.id = g.categoria_id
        WHERE g.ticket_id = :tid
        ORDER BY g.id
    """), {"tid": ticket_id}).mappings().all()
    total = sum(float(r["valor"] or 0) for r in rows)
    return {"gastos": [dict(r) | {"valor": float(r["valor"] or 0),
                                  "ticket_id": str(r["ticket_id"])} for r in rows],
            "total": total}


@router.post("/tickets/{ticket_id}/gastos")
def criar_gasto(ticket_id: str, p: GastoIn,
                user: models.User = Depends(usuario_atual),
                db: Session = Depends(get_db)):
    t = db.query(models.Ticket).get(ticket_id)
    if not t:
        raise HTTPException(404, "Ticket não encontrado.")
    g = models.GastoTicket(ticket_id=ticket_id, categoria_id=p.categoria_id,
                           valor=p.valor, descricao=p.descricao)
    db.add(g)
    registrar_auditoria(db, user, "editar", "ticket",
                        f"Adicionou gasto de R$ {p.valor:.2f} ao ticket "
                        f"{t.codigo_interno or t.id}.")
    db.commit()
    db.refresh(g)
    return _gasto_dict(g)


@router.delete("/gastos/{gasto_id}")
def excluir_gasto(gasto_id: int, user: models.User = Depends(usuario_atual),
                  db: Session = Depends(get_db)):
    g = db.query(models.GastoTicket).get(gasto_id)
    if not g:
        raise HTTPException(404, "Gasto não encontrado.")
    db.delete(g)
    registrar_auditoria(db, user, "editar", "ticket",
                        f"Removeu um gasto de R$ {float(g.valor or 0):.2f}.")
    db.commit()
    return {"ok": True}
