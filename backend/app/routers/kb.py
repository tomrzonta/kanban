"""Endpoints da base de conhecimento de atendimento (KB).

CRUD completo (qualquer usuário logado), busca por título e corpo, filtro por
categoria. Cada ação é auditada.
"""
from datetime import datetime, timedelta
import difflib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text, or_
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import usuario_atual
from app.services.auditoria import registrar_auditoria

router = APIRouter(prefix="/api/kb", tags=["kb"])

# Categoria normativa: só admin cria/edita/exclui artigos nela. O restante da
# Atendimento continua livre para qualquer usuário logado.
CATEGORIA_REGRAS = "Regras de negócio"

# Dias em que o texto novo de uma regra fica grifado (destaque de mudança).
DIAS_DESTAQUE = 5


def _segmentos_diff(anterior, atual):
    """Compara duas versões de texto (por palavras) e devolve uma lista de
    segmentos [{texto, novo}] onde `novo=True` marca o que foi adicionado na
    versão atual. Usado para grifar só o trecho que mudou.

    Preserva espaços e quebras de linha para o texto remontar igual ao original.
    """
    if not atual:
        return []
    if not anterior:
        # Sem versão anterior (ou primeira edição): tudo é "novo".
        return [{"texto": atual, "novo": True}]

    # Tokeniza mantendo os separadores (espaços/quebras), para reconstruir fiel.
    import re
    tok = lambda s: re.findall(r"\S+|\s+", s or "")
    a, b = tok(anterior), tok(atual)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)

    segs = []
    for op, _i1, _i2, j1, j2 in sm.get_opcodes():
        trecho = "".join(b[j1:j2])
        if not trecho:
            continue
        # 'equal' e 'delete' não geram texto novo; 'insert'/'replace' sim.
        novo = op in ("insert", "replace")
        # Agrupa segmentos consecutivos do mesmo tipo.
        if segs and segs[-1]["novo"] == novo:
            segs[-1]["texto"] += trecho
        else:
            segs.append({"texto": trecho, "novo": novo})
    return segs


def _exige_admin_se_regra(user, *categorias):
    """Bloqueia se a ação toca a categoria de Regras e o usuário não é admin.
    Verifica tanto a categoria de destino quanto a atual (para impedir editar
    ou mover uma regra existente sem ser admin)."""
    toca_regra = any((c or "").strip() == CATEGORIA_REGRAS for c in categorias)
    if toca_regra and getattr(user, "role", None) != "admin":
        raise HTTPException(
            403, f"Apenas administradores podem alterar a categoria "
                 f"\"{CATEGORIA_REGRAS}\".")


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
    d = {
        "id": a.id, "titulo": a.titulo, "categoria": a.categoria,
        "favorito": bool(a.favorito),
        "problema": a.problema, "resolucao": a.resolucao,
        "pitches": a.pitches or [],
        "atualizado_em": str(a.atualizado_em) if a.atualizado_em else None,
    }
    # Para regras: grifa o que mudou nos últimos DIAS_DESTAQUE dias, comparando
    # a versão atual com a que vigorava ~5 dias atrás. Cada trecho some 5 dias
    # após a edição que o introduziu (uma edição nova não apaga grifos antigos
    # ainda dentro do prazo).
    if a.categoria == CATEGORIA_REGRAS:
        historico = a.resolucao_historico or []
        limite = datetime.utcnow() - timedelta(days=DIAS_DESTAQUE)
        referencia = None
        # A referência é a versão mais RECENTE dentre as que já são mais antigas
        # que o limite (isto é, "como o texto estava há 5 dias").
        for v in historico:
            try:
                dt = datetime.fromisoformat(v["data"])
            except (ValueError, KeyError, TypeError):
                continue
            if dt <= limite:
                referencia = v["texto"]  # continua atualizando -> pega a última <= limite
        # Se nenhuma versão é antiga o bastante, mas há histórico, todas as
        # mudanças são recentes: referência = a versão mais antiga registrada.
        if referencia is None and historico:
            referencia = historico[0].get("texto", "")
        # Só grifa se houver uma referência diferente da atual.
        if referencia is not None and referencia != (a.resolucao or ""):
            d["segmentos"] = _segmentos_diff(referencia, a.resolucao)
    return d


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
    _exige_admin_se_regra(user, p.categoria)
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
    _exige_admin_se_regra(user, a.categoria, p.categoria)
    a.titulo = p.titulo.strip()
    a.categoria = (p.categoria or "").strip() or None
    a.problema = p.problema
    # Guarda o histórico de versões da resolução (para grifar o que mudou nos
    # últimos dias, cada trecho com seu próprio prazo). Registra a versão ANTIGA
    # com o momento em que ela vigorava, só quando o texto realmente muda.
    nova_resolucao = p.resolucao
    if (nova_resolucao or "") != (a.resolucao or ""):
        hist = list(a.resolucao_historico or [])
        hist.append({"texto": a.resolucao or "", "data": datetime.utcnow().isoformat()})
        # Mantém o histórico enxuto: só o necessário para a janela de destaque
        # (as últimas ~20 versões cobrem qualquer cenário real).
        a.resolucao_historico = hist[-20:]
    a.resolucao = nova_resolucao
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
    _exige_admin_se_regra(user, a.categoria)
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
