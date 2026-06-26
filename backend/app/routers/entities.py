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
from app.services.auditoria import registrar_auditoria

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

    @router.post(f"/{path}", name=f"create_{path}")
    def criar(p: SimpleIn, admin: models.User = Depends(requer_admin),
              db: Session = Depends(get_db)):
        obj = model(name=p.name)
        db.add(obj)
        registrar_auditoria(db, admin, "criar", "catalogo",
                            f"Criou em {path}: \"{p.name}\".")
        db.commit()
        db.refresh(obj)
        return obj

    @router.patch(f"/{path}/{{item_id}}", name=f"update_{path}")
    def atualizar(item_id: int, p: SimpleIn,
                  admin: models.User = Depends(requer_admin),
                  db: Session = Depends(get_db)):
        obj = db.query(model).get(item_id)
        if not obj:
            raise HTTPException(404, "Registro não encontrado.")
        antigo = obj.name
        obj.name = p.name
        registrar_auditoria(db, admin, "editar", "catalogo",
                            f"Renomeou em {path}: \"{antigo}\" → \"{p.name}\".")
        db.commit()
        db.refresh(obj)
        return obj

    @router.delete(f"/{path}/{{item_id}}", name=f"delete_{path}")
    def excluir(item_id: int, admin: models.User = Depends(requer_admin),
                db: Session = Depends(get_db)):
        obj = db.query(model).get(item_id)
        if not obj:
            raise HTTPException(404, "Registro não encontrado.")
        nome = obj.name
        # Se estiver em uso por tickets, inativa em vez de apagar (preserva análise).
        if em_uso_check and em_uso_check(db, item_id):
            obj.active = 0
            registrar_auditoria(db, admin, "excluir", "catalogo",
                                f"Inativou em {path}: \"{nome}\" (em uso).")
            db.commit()
            return {"ok": True, "soft_deleted": True,
                    "msg": "Registro em uso; foi inativado em vez de excluído."}
        db.delete(obj)
        registrar_auditoria(db, admin, "excluir", "catalogo",
                            f"Excluiu em {path}: \"{nome}\".")
        db.commit()
        return {"ok": True, "soft_deleted": False}


# Verificadores de uso por tickets (para soft delete).
def _sup_em_uso(db, i):
    return db.query(models.Ticket).filter_by(supplier_id=i).count()

def _def_em_uso(db, i):
    return db.query(models.Ticket).filter_by(defect_type_id=i).count()


_crud("suppliers", models.Supplier, _sup_em_uso)
_crud("defect-types", models.DefectType, _def_em_uso)


# --- Desfechos: têm um campo extra (impacto), então CRUD próprio ---
class DesfechoIn(BaseModel):
    name: str
    impacto: str = "sem_prejuizo"


@router.get("/desfechos")
def list_desfechos(db: Session = Depends(get_db)):
    return db.query(models.Desfecho).filter_by(active=1).order_by(
        models.Desfecho.name).all()


@router.post("/desfechos")
def create_desfecho(p: DesfechoIn, admin: models.User = Depends(requer_admin),
                    db: Session = Depends(get_db)):
    if p.impacto not in models.IMPACTOS:
        raise HTTPException(400, "Tipo de impacto inválido.")
    obj = models.Desfecho(name=p.name, impacto=p.impacto)
    db.add(obj)
    registrar_auditoria(db, admin, "criar", "desfecho",
                        f"Criou o desfecho \"{p.name}\" (impacto: {p.impacto}).")
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/desfechos/{item_id}")
def update_desfecho(item_id: int, p: DesfechoIn,
                    admin: models.User = Depends(requer_admin),
                    db: Session = Depends(get_db)):
    obj = db.query(models.Desfecho).get(item_id)
    if not obj:
        raise HTTPException(404, "Desfecho não encontrado.")
    if p.impacto not in models.IMPACTOS:
        raise HTTPException(400, "Tipo de impacto inválido.")
    obj.name = p.name
    obj.impacto = p.impacto
    registrar_auditoria(db, admin, "editar", "desfecho",
                        f"Editou o desfecho \"{p.name}\" (impacto: {p.impacto}).")
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/desfechos/{item_id}")
def delete_desfecho(item_id: int, admin: models.User = Depends(requer_admin),
                    db: Session = Depends(get_db)):
    obj = db.query(models.Desfecho).get(item_id)
    if not obj:
        raise HTTPException(404, "Desfecho não encontrado.")
    nome = obj.name
    em_uso = db.query(models.Ticket).filter_by(desfecho_id=item_id).count()
    if em_uso:
        obj.active = 0
        registrar_auditoria(db, admin, "excluir", "desfecho",
                            f"Inativou o desfecho \"{nome}\" (em uso).")
        db.commit()
        return {"ok": True, "soft_deleted": True,
                "msg": "Desfecho em uso; foi inativado em vez de excluído."}
    db.delete(obj)
    registrar_auditoria(db, admin, "excluir", "desfecho",
                        f"Excluiu o desfecho \"{nome}\".")
    db.commit()
    return {"ok": True, "soft_deleted": False}
