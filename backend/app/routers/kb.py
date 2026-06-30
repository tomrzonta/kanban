"""Endpoints da base de conhecimento de atendimento (KB).

CRUD completo (qualquer usuário logado), busca por título e corpo, filtro por
categoria. Cada ação é auditada.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text, or_
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import usuario_atual
from app.services.auditoria import registrar_auditoria

router = APIRouter(prefix="/api/kb", tags=["kb"])


class Pitch(BaseModel):
    titulo: str | None = None
    texto: str


class ArtigoIn(BaseModel):
    titulo: str
    categoria: str | None = None
    problema: str | None = None
    resolucao: str | None = None
    pitches: list[Pitch] = []


def _pitches_para_texto(pitches):
    """Concatena títulos e corpos dos pitches num texto único, para busca."""
    partes = []
    for pi in pitches:
        d = pi if isinstance(pi, dict) else pi.model_dump()
        if d.get("titulo"):
            partes.append(d["titulo"])
        if d.get("texto"):
            partes.append(d["texto"])
    return "\n".join(partes)


def _to_dict(a: models.KbArtigo):
    return {
        "id": a.id, "titulo": a.titulo, "categoria": a.categoria,
        "favorito": bool(a.favorito),
        "problema": a.problema, "resolucao": a.resolucao,
        "pitches": a.pitches or [],
        "atualizado_em": str(a.atualizado_em) if a.atualizado_em else None,
    }


@router.get("")
def listar(q: str | None = None, categoria: str | None = None,
           db: Session = Depends(get_db)):
    """Lista artigos. `q` busca no título, problema, resolução e nos pitches
    (corpo). `categoria` filtra por categoria exata."""
    query = db.query(models.KbArtigo)
    if categoria:
        query = query.filter(models.KbArtigo.categoria == categoria)
    if q and q.strip():
        termo = f"%{q.strip()}%"
        # Busca no título e nos campos de texto. Os pitches são JSON; comparar
        # como texto cobre a busca no corpo deles de forma simples e portável.
        query = query.filter(or_(
            models.KbArtigo.titulo.ilike(termo),
            models.KbArtigo.problema.ilike(termo),
            models.KbArtigo.resolucao.ilike(termo),
            models.KbArtigo.pitches_texto.ilike(termo),
        ))
    artigos = query.order_by(models.KbArtigo.favorito.desc(),
                             models.KbArtigo.titulo).all()
    return [_to_dict(a) for a in artigos]


@router.get("/categorias")
def categorias(db: Session = Depends(get_db)):
    """Categorias distintas já cadastradas (para o filtro e sugestões)."""
    rows = db.execute(text("""
        SELECT DISTINCT categoria FROM kb_artigos
        WHERE categoria IS NOT NULL AND categoria <> ''
        ORDER BY categoria
    """)).all()
    return [r[0] for r in rows]


@router.post("")
def criar(p: ArtigoIn, user: models.User = Depends(usuario_atual),
          db: Session = Depends(get_db)):
    if not p.titulo.strip():
        raise HTTPException(400, "O título é obrigatório.")
    a = models.KbArtigo(
        titulo=p.titulo.strip(), categoria=(p.categoria or "").strip() or None,
        problema=p.problema, resolucao=p.resolucao,
        pitches=[pi.model_dump() for pi in p.pitches],
        pitches_texto=_pitches_para_texto(p.pitches),
        autor_id=user.id,
    )
    db.add(a)
    registrar_auditoria(db, user, "criar", "kb",
                        f"Criou o material \"{p.titulo.strip()}\".")
    db.commit()
    db.refresh(a)
    return _to_dict(a)


@router.put("/{artigo_id}")
def atualizar(artigo_id: int, p: ArtigoIn,
              user: models.User = Depends(usuario_atual),
              db: Session = Depends(get_db)):
    a = db.query(models.KbArtigo).get(artigo_id)
    if not a:
        raise HTTPException(404, "Material não encontrado.")
    if not p.titulo.strip():
        raise HTTPException(400, "O título é obrigatório.")
    a.titulo = p.titulo.strip()
    a.categoria = (p.categoria or "").strip() or None
    a.problema = p.problema
    a.resolucao = p.resolucao
    a.pitches = [pi.model_dump() for pi in p.pitches]
    a.pitches_texto = _pitches_para_texto(p.pitches)
    registrar_auditoria(db, user, "editar", "kb",
                        f"Editou o material \"{a.titulo}\".")
    db.commit()
    db.refresh(a)
    return _to_dict(a)


@router.delete("/{artigo_id}")
def excluir(artigo_id: int, user: models.User = Depends(usuario_atual),
            db: Session = Depends(get_db)):
    a = db.query(models.KbArtigo).get(artigo_id)
    if not a:
        raise HTTPException(404, "Material não encontrado.")
    titulo = a.titulo
    db.delete(a)
    registrar_auditoria(db, user, "excluir", "kb",
                        f"Excluiu o material \"{titulo}\".")
    db.commit()
    return {"ok": True}


@router.patch("/{artigo_id}/favorito")
def alternar_favorito(artigo_id: int,
                      user: models.User = Depends(usuario_atual),
                      db: Session = Depends(get_db)):
    """Liga/desliga o favorito (global). Favoritos sobem ao topo da lista."""
    a = db.query(models.KbArtigo).get(artigo_id)
    if not a:
        raise HTTPException(404, "Material não encontrado.")
    a.favorito = 0 if a.favorito else 1
    registrar_auditoria(db, user, "editar", "kb",
                        f"{'Favoritou' if a.favorito else 'Desfavoritou'} "
                        f"o material \"{a.titulo}\".")
    db.commit()
    return {"ok": True, "favorito": bool(a.favorito)}
