"""Endpoints do catálogo: CRUD de marcas e modelos de impressora."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.database import get_db
from app.core.security import requer_admin

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


# --- Marcas ---
def _norm(s):
    """Normaliza nome para detectar duplicatas (ignora espaços e maiúsculas)."""
    return "".join((s or "").lower().split())


@router.post("/brands", response_model=schemas.BrandOut, dependencies=[Depends(requer_admin)])
def create_brand(p: schemas.BrandIn, db: Session = Depends(get_db)):
    alvo = _norm(p.name)
    for b in db.query(models.PrinterBrand).all():
        if _norm(b.name) == alvo:
            raise HTTPException(400, f"Já existe um fabricante \"{b.name}\".")
    b = models.PrinterBrand(name=p.name.strip())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.get("/brands", response_model=list[schemas.BrandOut])
def list_brands(db: Session = Depends(get_db)):
    return db.query(models.PrinterBrand).filter_by(active=1).all()


# --- Modelos ---
@router.post("/models", response_model=schemas.ModelOut, dependencies=[Depends(requer_admin)])
def create_model(p: schemas.ModelIn, db: Session = Depends(get_db)):
    alvo = _norm(p.name)
    existentes = db.query(models.PrinterModel).filter_by(brand_id=p.brand_id).all()
    for m in existentes:
        if _norm(m.name) == alvo:
            raise HTTPException(400, f"Este fabricante já tem o modelo \"{m.name}\".")
    m = models.PrinterModel(**p.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.patch("/models/{model_id}", response_model=schemas.ModelOut, dependencies=[Depends(requer_admin)])
def update_model(model_id: int, p: schemas.ModelUpdate,
                 db: Session = Depends(get_db)):
    m = db.query(models.PrinterModel).get(model_id)
    if not m:
        raise HTTPException(404, "Modelo não encontrado.")
    # Atenção: alterar current_price afeta APENAS tickets futuros.
    # Tickets já criados mantêm o custo_unitario congelado na criação.
    for k, v in p.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.get("/models", response_model=list[schemas.ModelOut])
def list_models(brand_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(models.PrinterModel).filter_by(active=1)
    if brand_id:
        q = q.filter_by(brand_id=brand_id)
    return q.all()


@router.delete("/models/{model_id}", dependencies=[Depends(requer_admin)])
def delete_model(model_id: int, db: Session = Depends(get_db)):
    # Não apaga se houver tickets usando o modelo (preserva o histórico).
    # Em vez de DELETE físico, marca como inativo (soft delete): some dos
    # cadastros novos, mas relatórios antigos continuam íntegros.
    em_uso = db.query(models.Ticket).filter_by(printer_model_id=model_id).count()
    m = db.query(models.PrinterModel).get(model_id)
    if not m:
        raise HTTPException(404, "Modelo não encontrado.")
    if em_uso:
        m.active = 0
        db.commit()
        return {"ok": True, "soft_deleted": True,
                "msg": "Modelo tem tickets; foi inativado em vez de excluído."}
    db.delete(m)
    db.commit()
    return {"ok": True, "soft_deleted": False}


@router.patch("/brands/{brand_id}", response_model=schemas.BrandOut, dependencies=[Depends(requer_admin)])
def update_brand(brand_id: int, p: schemas.BrandIn, db: Session = Depends(get_db)):
    b = db.query(models.PrinterBrand).get(brand_id)
    if not b:
        raise HTTPException(404, "Marca não encontrada.")
    b.name = p.name
    db.commit()
    db.refresh(b)
    return b


@router.delete("/brands/{brand_id}", dependencies=[Depends(requer_admin)])
def delete_brand(brand_id: int, db: Session = Depends(get_db)):
    # Bloqueia se a marca ainda tiver modelos ativos — evita órfãos silenciosos.
    modelos = (db.query(models.PrinterModel)
               .filter_by(brand_id=brand_id, active=1).count())
    if modelos:
        raise HTTPException(400, "Remova ou inative os modelos desta marca antes.")
    b = db.query(models.PrinterBrand).get(brand_id)
    if not b:
        raise HTTPException(404, "Marca não encontrada.")
    b.active = 0  # soft delete da marca também
    db.commit()
    return {"ok": True}
