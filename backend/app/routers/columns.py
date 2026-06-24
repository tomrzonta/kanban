"""Endpoints das colunas do Kanban — criar, editar, reordenar e remover."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.database import get_db
from app.core.security import requer_admin

router = APIRouter(prefix="/api/columns", tags=["columns"])


@router.get("", response_model=list[schemas.ColumnOut])
def list_columns(db: Session = Depends(get_db)):
    return (db.query(models.BoardColumn)
            .order_by(models.BoardColumn.order_index)
            .all())


@router.post("", response_model=schemas.ColumnOut, dependencies=[Depends(requer_admin)])
def create_column(p: schemas.ColumnIn, db: Session = Depends(get_db)):
    col = models.BoardColumn(**p.model_dump())
    db.add(col)
    db.commit()
    db.refresh(col)
    return col


@router.patch("/{column_id}", response_model=schemas.ColumnOut, dependencies=[Depends(requer_admin)])
def update_column(column_id: int, p: schemas.ColumnUpdate,
                  db: Session = Depends(get_db)):
    col = db.query(models.BoardColumn).get(column_id)
    if not col:
        raise HTTPException(404, "Coluna não encontrada.")
    for k, v in p.model_dump(exclude_unset=True).items():
        setattr(col, k, v)
    db.commit()
    db.refresh(col)
    return col


@router.put("/reorder", dependencies=[Depends(requer_admin)])
def reorder_columns(order: list[schemas.ColumnOrder],
                    db: Session = Depends(get_db)):
    """Recebe [{id, order_index}, ...] e regrava a ordem em lote."""
    for item in order:
        (db.query(models.BoardColumn)
         .filter_by(id=item.id)
         .update({"order_index": item.order_index}))
    db.commit()
    return {"ok": True}


@router.delete("/{column_id}", dependencies=[Depends(requer_admin)])
def delete_column(column_id: int, db: Session = Depends(get_db)):
    # Regra de segurança: não deletar coluna que ainda contém tickets.
    has = db.query(models.Ticket).filter_by(column_id=column_id).count()
    if has:
        raise HTTPException(400, "Mova os tickets antes de deletar a coluna.")
    db.query(models.BoardColumn).filter_by(id=column_id).delete()
    db.commit()
    return {"ok": True}
