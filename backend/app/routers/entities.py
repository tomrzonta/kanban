"""Endpoints CRUD para entidades simples de catálogo: distribuidoras,
fornecedores e tipos de defeito.

As três têm a mesma forma (id, name, active), então uma fábrica de rotas evita
repetir o mesmo CRUD três vezes — mais fácil de manter e estender.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import requer_admin

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


class SimpleIn(BaseModel):
    name: str


def _crud(path: str, model, em_uso_check=None):
    """Registra GET/POST/PATCH/DELETE para uma entidade simples.

    em_uso_check: função opcional (db, id) -> int que conta tickets usando o
    registro. Se houver uso, o delete vira soft delete (active=0).
    """

    @router.get(f"/{path}", name=f"list_{path}")
    def listar(db: Session = Depends(get_db)):
        return db.query(model).filter_by(active=1).order_by(model.name).all()

    @router.post(f"/{path}", name=f"create_{path}", dependencies=[Depends(requer_admin)])
    def criar(p: SimpleIn, db: Session = Depends(get_db)):
        obj = model(name=p.name)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @router.patch(f"/{path}/{{item_id}}", name=f"update_{path}", dependencies=[Depends(requer_admin)])
    def atualizar(item_id: int, p: SimpleIn, db: Session = Depends(get_db)):
        obj = db.query(model).get(item_id)
        if not obj:
            raise HTTPException(404, "Registro não encontrado.")
        obj.name = p.name
        db.commit()
        db.refresh(obj)
        return obj

    @router.delete(f"/{path}/{{item_id}}", name=f"delete_{path}", dependencies=[Depends(requer_admin)])
    def excluir(item_id: int, db: Session = Depends(get_db)):
        obj = db.query(model).get(item_id)
        if not obj:
            raise HTTPException(404, "Registro não encontrado.")
        # Se estiver em uso por tickets, inativa em vez de apagar (preserva análise).
        if em_uso_check and em_uso_check(db, item_id):
            obj.active = 0
            db.commit()
            return {"ok": True, "soft_deleted": True,
                    "msg": "Registro em uso; foi inativado em vez de excluído."}
        db.delete(obj)
        db.commit()
        return {"ok": True, "soft_deleted": False}


# Verificadores de uso por tickets (para soft delete).
def _sup_em_uso(db, i):
    return db.query(models.Ticket).filter_by(supplier_id=i).count()

def _def_em_uso(db, i):
    return db.query(models.Ticket).filter_by(defect_type_id=i).count()


_crud("suppliers", models.Supplier, _sup_em_uso)
_crud("defect-types", models.DefectType, _def_em_uso)
