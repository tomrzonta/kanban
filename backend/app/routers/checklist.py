"""Endpoints do checklist de recebimento.

- Componentes (gerenciáveis, admin).
- Checklist por modelo (quais componentes cada modelo tem).
- Consulta do checklist de um modelo (usada no recebimento).

Estados possíveis de cada componente no recebimento (fixos):
    Bom estado, Avaria leve, Danificado, Ausente / faltando, Não testado, N/A
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import usuario_atual, requer_admin
from app.services.auditoria import registrar_auditoria

router = APIRouter(prefix="/api/checklist", tags=["checklist"])

ESTADOS_CHECKLIST = ["Bom estado", "Avaria leve", "Danificado",
                     "Ausente / faltando", "Não testado", "N/A"]


@router.get("/estados")
def estados():
    return ESTADOS_CHECKLIST


# ---------- Componentes (gerenciáveis) ----------
class ComponenteIn(BaseModel):
    name: str


@router.get("/componentes")
def listar_componentes(db: Session = Depends(get_db)):
    cs = db.query(models.ChecklistComponente).order_by(
        models.ChecklistComponente.ordem, models.ChecklistComponente.name).all()
    return [{"id": c.id, "name": c.name, "active": c.active} for c in cs]


@router.post("/componentes")
def criar_componente(p: ComponenteIn, admin: models.User = Depends(requer_admin),
                     db: Session = Depends(get_db)):
    nome = p.name.strip()
    if not nome:
        raise HTTPException(400, "Informe o nome do componente.")
    ja = db.execute(text(
        "SELECT id FROM checklist_componentes WHERE LOWER(TRIM(name))=LOWER(TRIM(:n))"),
        {"n": nome}).first()
    if ja:
        return {"id": ja[0], "name": nome}  # idempotente
    c = models.ChecklistComponente(name=nome, active=1, ordem=999)
    db.add(c)
    registrar_auditoria(db, admin, "criar", "catalogo",
                        f"Criou o componente de checklist \"{nome}\".")
    db.commit(); db.refresh(c)
    return {"id": c.id, "name": c.name}


@router.delete("/componentes/{cid}")
def excluir_componente(cid: int, admin: models.User = Depends(requer_admin),
                       db: Session = Depends(get_db)):
    c = db.query(models.ChecklistComponente).get(cid)
    if not c:
        raise HTTPException(404, "Componente não encontrado.")
    nome = c.name
    # Remove das associações de modelos também.
    db.execute(text("DELETE FROM modelo_checklist WHERE componente_id = :c"), {"c": cid})
    db.delete(c)
    registrar_auditoria(db, admin, "excluir", "catalogo",
                        f"Excluiu o componente de checklist \"{nome}\".")
    db.commit()
    return {"ok": True}


# ---------- Checklist por modelo ----------
@router.get("/modelo/{modelo_id}")
def checklist_do_modelo(modelo_id: int, db: Session = Depends(get_db)):
    """Componentes do checklist de um modelo (em ordem). Usado no recebimento."""
    rows = db.execute(text("""
        SELECT mc.id, mc.componente_id, c.name AS componente_nome, mc.ordem
        FROM modelo_checklist mc
        JOIN checklist_componentes c ON c.id = mc.componente_id
        WHERE mc.modelo_id = :m
        ORDER BY mc.ordem, c.name
    """), {"m": modelo_id}).mappings().all()
    return [dict(r) for r in rows]


class ModeloChecklistIn(BaseModel):
    componente_ids: list[int]  # lista de componentes que compõem o checklist


@router.put("/modelo/{modelo_id}")
def definir_checklist_modelo(modelo_id: int, p: ModeloChecklistIn,
                             admin: models.User = Depends(requer_admin),
                             db: Session = Depends(get_db)):
    """Substitui o checklist do modelo pela lista informada (na ordem dada)."""
    m = db.query(models.PrinterModel).get(modelo_id)
    if not m:
        raise HTTPException(404, "Modelo não encontrado.")
    db.execute(text("DELETE FROM modelo_checklist WHERE modelo_id = :m"), {"m": modelo_id})
    for i, cid in enumerate(p.componente_ids):
        db.add(models.ModeloChecklist(modelo_id=modelo_id, componente_id=cid, ordem=i))
    registrar_auditoria(db, admin, "editar", "catalogo",
                        f"Atualizou o checklist do modelo #{modelo_id} "
                        f"({len(p.componente_ids)} componentes).")
    db.commit()
    return {"ok": True, "total": len(p.componente_ids)}


@router.get("/modelos-com-checklist")
def modelos_com_checklist(db: Session = Depends(get_db)):
    """IDs de modelos que já têm ao menos um componente no checklist."""
    rows = db.execute(text(
        "SELECT DISTINCT modelo_id FROM modelo_checklist")).fetchall()
    return [r[0] for r in rows]
