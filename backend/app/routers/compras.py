"""Endpoints do cadastro de compras/equipamentos.

CRUD + inserção em massa (colar da planilha). Marca/modelo são texto; a
conferência com o catálogo é feita na listagem (campos *_no_catalogo). O
número de série é único — na inserção em massa, linhas com SN já existente
são puladas e reportadas.
"""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import usuario_atual
from app.services.auditoria import registrar_auditoria

router = APIRouter(prefix="/api/compras", tags=["compras"])


class CompraIn(BaseModel):
    data_compra: date | None = None
    responsavel_compra: str | None = None
    fornecedor: str | None = None
    contato_fornecedor: str | None = None
    marca: str | None = None
    modelo: str | None = None
    numero_serie: str | None = None
    nota_fiscal: str | None = None
    data_entrega: date | None = None
    status_compra: str | None = None


class ColarIn(BaseModel):
    linhas: list[CompraIn]


def _catalogo_sets(db):
    """Conjuntos de marcas e modelos do catálogo, em minúsculas, para conferir
    divergências sem diferenciar maiúsculas/minúsculas."""
    marcas = {m[0].strip().lower() for m in db.execute(text(
        "SELECT name FROM printer_brands")).all() if m[0]}
    modelos = {m[0].strip().lower() for m in db.execute(text(
        "SELECT name FROM printer_models")).all() if m[0]}
    return marcas, modelos


def _to_dict(c, marcas, modelos):
    return {
        "id": c.id,
        "data_compra": str(c.data_compra) if c.data_compra else None,
        "responsavel_compra": c.responsavel_compra,
        "fornecedor": c.fornecedor,
        "contato_fornecedor": c.contato_fornecedor,
        "marca": c.marca,
        "modelo": c.modelo,
        "numero_serie": c.numero_serie,
        "nota_fiscal": c.nota_fiscal,
        "data_entrega": str(c.data_entrega) if c.data_entrega else None,
        "status_compra": c.status_compra,
        # Sinaliza divergência com o catálogo (para destaque visual na tela).
        "marca_no_catalogo": (not c.marca) or (c.marca.strip().lower() in marcas),
        "modelo_no_catalogo": (not c.modelo) or (c.modelo.strip().lower() in modelos),
    }


@router.get("")
def listar(q: str | None = None, db: Session = Depends(get_db)):
    """Lista as compras. `q` busca por SN, marca, modelo, fornecedor ou NF."""
    marcas, modelos = _catalogo_sets(db)
    query = db.query(models.Compra)
    if q and q.strip():
        t = f"%{q.strip().lower()}%"
        query = query.filter(text(
            "LOWER(COALESCE(numero_serie,'')||COALESCE(marca,'')||"
            "COALESCE(modelo,'')||COALESCE(fornecedor,'')||"
            "COALESCE(nota_fiscal,'')) LIKE :q")).params(q=t)
    compras = query.order_by(models.Compra.id.desc()).all()
    return [_to_dict(c, marcas, modelos) for c in compras]


def _aplica(c, p: CompraIn):
    c.data_compra = p.data_compra
    c.responsavel_compra = p.responsavel_compra
    c.fornecedor = p.fornecedor
    c.contato_fornecedor = p.contato_fornecedor
    c.marca = p.marca
    c.modelo = p.modelo
    c.numero_serie = (p.numero_serie or "").strip() or None
    c.nota_fiscal = p.nota_fiscal
    c.data_entrega = p.data_entrega
    c.status_compra = p.status_compra


@router.post("")
def criar(p: CompraIn, user: models.User = Depends(usuario_atual),
          db: Session = Depends(get_db)):
    sn = (p.numero_serie or "").strip()
    if sn and db.query(models.Compra).filter_by(numero_serie=sn).first():
        raise HTTPException(400, f"Já existe uma compra com o número de série {sn}.")
    c = models.Compra()
    _aplica(c, p)
    db.add(c)
    registrar_auditoria(db, user, "criar", "compra",
                        f"Cadastrou compra (SN: {sn or '—'}).")
    db.commit()
    db.refresh(c)
    marcas, modelos = _catalogo_sets(db)
    return _to_dict(c, marcas, modelos)


@router.post("/colar")
def colar(p: ColarIn, user: models.User = Depends(usuario_atual),
          db: Session = Depends(get_db)):
    """Inserção em massa (colar da planilha). Pula linhas com SN já existente
    ou duplicada dentro do próprio lote, e reporta quantas entraram/foram puladas."""
    inseridas = 0
    puladas = []
    vistas = set()  # SNs já vistas neste lote
    existentes = {r[0] for r in db.execute(text(
        "SELECT numero_serie FROM compras WHERE numero_serie IS NOT NULL")).all()}

    for i, linha in enumerate(p.linhas):
        sn = (linha.numero_serie or "").strip()
        if sn and (sn in existentes or sn in vistas):
            puladas.append({"linha": i + 1, "sn": sn, "motivo": "SN já cadastrada"})
            continue
        c = models.Compra()
        _aplica(c, linha)
        db.add(c)
        if sn:
            vistas.add(sn)
        inseridas += 1

    registrar_auditoria(db, user, "criar", "compra",
                        f"Importou {inseridas} compra(s) em massa.")
    db.commit()
    return {"inseridas": inseridas, "puladas": puladas}


@router.put("/{compra_id}")
def atualizar(compra_id: int, p: CompraIn,
              user: models.User = Depends(usuario_atual),
              db: Session = Depends(get_db)):
    c = db.query(models.Compra).get(compra_id)
    if not c:
        raise HTTPException(404, "Compra não encontrada.")
    sn = (p.numero_serie or "").strip()
    if sn:
        outro = db.query(models.Compra).filter(
            models.Compra.numero_serie == sn,
            models.Compra.id != compra_id).first()
        if outro:
            raise HTTPException(400, f"Outra compra já usa o número de série {sn}.")
    _aplica(c, p)
    registrar_auditoria(db, user, "editar", "compra",
                        f"Editou compra (SN: {sn or '—'}).")
    db.commit()
    marcas, modelos = _catalogo_sets(db)
    return _to_dict(c, marcas, modelos)


@router.delete("/{compra_id}")
def excluir(compra_id: int, user: models.User = Depends(usuario_atual),
            db: Session = Depends(get_db)):
    c = db.query(models.Compra).get(compra_id)
    if not c:
        raise HTTPException(404, "Compra não encontrada.")
    sn = c.numero_serie
    db.delete(c)
    registrar_auditoria(db, user, "excluir", "compra",
                        f"Excluiu compra (SN: {sn or '—'}).")
    db.commit()
    return {"ok": True}


@router.post("/sincronizar-catalogo")
def sincronizar_catalogo(user: models.User = Depends(usuario_atual),
                         db: Session = Depends(get_db)):
    """Cria no catálogo as marcas e modelos que aparecem nas compras e ainda não
    existem. Modelos novos entram com preço zero (ajustável depois no Catálogo).
    Casamento case-insensitive e ignorando espaços; não duplica o que já existe."""
    _norm = lambda s: "".join((s or "").lower().split())
    # Marcas já no catálogo (nome normalizado -> id).
    marcas_cat = {_norm(m[1]): m[0] for m in db.execute(text(
        "SELECT id, name FROM printer_brands")).all() if m[1]}
    modelos_cat = {(m[0], _norm(m[1])) for m in db.execute(text(
        "SELECT brand_id, name FROM printer_models")).all() if m[1]}

    # Pares (marca, modelo) distintos das compras.
    pares = db.execute(text("""
        SELECT DISTINCT TRIM(marca) AS marca, TRIM(modelo) AS modelo
        FROM compras
        WHERE marca IS NOT NULL AND TRIM(marca) <> ''
    """)).mappings().all()

    marcas_criadas, modelos_criados = 0, 0
    for p in pares:
        marca, modelo = p["marca"], p["modelo"]
        chave_marca = _norm(marca)
        # Cria a marca se não existe.
        if chave_marca not in marcas_cat:
            nova = models.PrinterBrand(name=marca)
            db.add(nova)
            db.flush()
            marcas_cat[chave_marca] = nova.id
            marcas_criadas += 1
        brand_id = marcas_cat[chave_marca]
        # Cria o modelo (se houver) se não existe naquela marca.
        if modelo and modelo.strip():
            chave_modelo = (brand_id, _norm(modelo))
            if chave_modelo not in modelos_cat:
                db.add(models.PrinterModel(brand_id=brand_id, name=modelo,
                                           current_price=0))
                modelos_cat.add(chave_modelo)
                modelos_criados += 1

    registrar_auditoria(db, user, "criar", "catalogo",
                        f"Sincronizou catálogo das compras: "
                        f"{marcas_criadas} marca(s), {modelos_criados} modelo(s).")
    db.commit()
    return {"marcas_criadas": marcas_criadas, "modelos_criados": modelos_criados}


@router.get("/por-serie/{sn}")
def por_serie(sn: str, db: Session = Depends(get_db)):
    """Busca uma compra pelo número de série exato — usado no autopreenchimento
    do ticket. Retorna 404 se não encontrar (frontend mostra 'SN não encontrado')."""
    c = db.query(models.Compra).filter_by(numero_serie=sn.strip()).first()
    if not c:
        raise HTTPException(404, "Número de série não encontrado.")
    marcas, modelos = _catalogo_sets(db)
    return _to_dict(c, marcas, modelos)
