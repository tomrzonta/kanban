"""Endpoints de anexos: upload, listagem, download e remoção.

Os arquivos são salvos numa pasta do servidor (/app/uploads, persistida por
volume Docker). No banco guardamos só o caminho e o nome original.
"""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import requer_admin

router = APIRouter(prefix="/api/tickets", tags=["attachments"])

# Pasta de armazenamento — montada como volume no Docker para persistir.
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/{ticket_id}/attachments")
def list_attachments(ticket_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Attachment).filter_by(ticket_id=ticket_id).all()
    return [{"id": a.id, "original_name": a.original_name,
             "file_type": a.file_type} for a in rows]


@router.post("/{ticket_id}/attachments")
async def upload_attachment(ticket_id: str, file: UploadFile = File(...),
                            db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).get(ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket não encontrado.")

    # Nome físico único (evita colisão); preserva a extensão original.
    ext = os.path.splitext(file.filename or "")[1]
    nome_fisico = f"{uuid.uuid4().hex}{ext}"
    destino = UPLOAD_DIR / nome_fisico

    # Grava o conteúdo em disco.
    conteudo = await file.read()
    destino.write_bytes(conteudo)

    att = models.Attachment(
        ticket_id=ticket_id,
        file_url=str(destino),
        original_name=file.filename,
        file_type=file.content_type or "outro",
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return {"id": att.id, "original_name": att.original_name,
            "file_type": att.file_type}


@router.get("/attachments/{att_id}/download")
def download_attachment(att_id: int, db: Session = Depends(get_db)):
    att = db.query(models.Attachment).get(att_id)
    if not att or not os.path.exists(att.file_url):
        raise HTTPException(404, "Anexo não encontrado.")
    return FileResponse(att.file_url, filename=att.original_name or "anexo")


@router.delete("/attachments/{att_id}", dependencies=[Depends(requer_admin)])
def delete_attachment(att_id: int, db: Session = Depends(get_db)):
    att = db.query(models.Attachment).get(att_id)
    if not att:
        raise HTTPException(404, "Anexo não encontrado.")
    # Remove o arquivo físico, se existir.
    try:
        if os.path.exists(att.file_url):
            os.remove(att.file_url)
    except OSError:
        pass
    db.delete(att)
    db.commit()
    return {"ok": True}
