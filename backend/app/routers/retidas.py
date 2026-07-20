"""Endpoints do controle de impressoras retidas.

- Estados (gerenciáveis, só admin cria/edita/exclui).
- Impressoras retidas: CRUD, com origem opcional num ticket (herda dados).
- Mudança de estado: registra histórico.
- Peças canibalizadas: destino por texto livre ou referência a outra retida.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import usuario_atual, requer_admin
from app.services.auditoria import registrar_auditoria

router = APIRouter(prefix="/api/retidas", tags=["retidas"])


# ---------- Estados (gerenciáveis) ----------
class EstadoIn(BaseModel):
    name: str
    active: int = 1
    ordem: int = 0


@router.get("/estados")
def listar_estados(db: Session = Depends(get_db)):
    ests = db.query(models.EstadoRetida).order_by(
        models.EstadoRetida.ordem, models.EstadoRetida.name).all()
    return [{"id": e.id, "name": e.name, "active": e.active, "ordem": e.ordem}
            for e in ests]


@router.post("/estados")
def criar_estado(p: EstadoIn, admin: models.User = Depends(requer_admin),
                 db: Session = Depends(get_db)):
    if not p.name.strip():
        raise HTTPException(400, "Informe o nome do estado.")
    e = models.EstadoRetida(name=p.name.strip(), active=p.active, ordem=p.ordem)
    db.add(e)
    registrar_auditoria(db, admin, "criar", "catalogo",
                        f"Criou o estado de retida \"{p.name.strip()}\".")
    db.commit(); db.refresh(e)
    return {"id": e.id, "name": e.name, "active": e.active, "ordem": e.ordem}


@router.patch("/estados/{eid}")
def atualizar_estado(eid: int, p: EstadoIn,
                     admin: models.User = Depends(requer_admin),
                     db: Session = Depends(get_db)):
    e = db.query(models.EstadoRetida).get(eid)
    if not e:
        raise HTTPException(404, "Estado não encontrado.")
    e.name = p.name.strip(); e.active = p.active; e.ordem = p.ordem
    registrar_auditoria(db, admin, "editar", "catalogo",
                        f"Editou o estado de retida \"{e.name}\".")
    db.commit()
    return {"id": e.id, "name": e.name, "active": e.active, "ordem": e.ordem}


@router.delete("/estados/{eid}")
def excluir_estado(eid: int, admin: models.User = Depends(requer_admin),
                   db: Session = Depends(get_db)):
    e = db.query(models.EstadoRetida).get(eid)
    if not e:
        raise HTTPException(404, "Estado não encontrado.")
    nome = e.name
    db.delete(e)
    registrar_auditoria(db, admin, "excluir", "catalogo",
                        f"Excluiu o estado de retida \"{nome}\".")
    db.commit()
    return {"ok": True}


# ---------- Impressoras retidas ----------
class RetidaIn(BaseModel):
    ticket_id: str | None = None
    marca: str | None = None
    modelo: str | None = None
    numero_serie: str | None = None
    condicao: str | None = None
    estado_id: int | None = None
    local: str | None = None
    observacao: str | None = None


def _retida_dict(r, estado_nome=None, ticket_codigo=None):
    return {
        "id": r.id, "ticket_id": str(r.ticket_id) if r.ticket_id else None,
        "ticket_codigo": ticket_codigo,
        "marca": r.marca, "modelo": r.modelo, "numero_serie": r.numero_serie,
        "condicao": r.condicao, "estado_id": r.estado_id, "estado_nome": estado_nome,
        "local": r.local, "observacao": r.observacao,
        "criado_em": str(r.criado_em) if r.criado_em else None,
    }


@router.get("")
def listar(q: str | None = None, estado_id: int | None = None,
           db: Session = Depends(get_db)):
    """Lista as impressoras retidas, com nome do estado e código do ticket de
    origem. `q` busca por SN, marca, modelo; `estado_id` filtra por estado."""
    sql = """
        SELECT ir.*, er.name AS estado_nome, t.codigo_interno AS ticket_codigo
        FROM impressoras_retidas ir
        LEFT JOIN estados_retida er ON er.id = ir.estado_id
        LEFT JOIN tickets t ON t.id = ir.ticket_id
        WHERE 1=1
    """
    params = {}
    if estado_id:
        sql += " AND ir.estado_id = :eid"; params["eid"] = estado_id
    if q and q.strip():
        sql += (" AND LOWER(COALESCE(ir.numero_serie,'')||COALESCE(ir.marca,'')"
                "||COALESCE(ir.modelo,'')) LIKE :q")
        params["q"] = f"%{q.strip().lower()}%"
    sql += " ORDER BY ir.id DESC"
    rows = db.execute(text(sql), params).mappings().all()
    return [{**dict(r), "ticket_id": str(r["ticket_id"]) if r["ticket_id"] else None,
             "criado_em": str(r["criado_em"]) if r["criado_em"] else None}
            for r in rows]


@router.get("/de-ticket/{ticket_ref}")
def dados_do_ticket(ticket_ref: str, db: Session = Depends(get_db)):
    """Busca dados de um ticket para pré-preencher uma retida (marca, modelo, SN).

    Aceita o CÓDIGO do ticket (ex: GAR-2026-0001, o que o usuário vê) ou o UUID
    interno. Retorna também o id (UUID) para o vínculo correto ao salvar.
    """
    ref = (ticket_ref or "").strip()
    # Busca por código (case-insensitive) OU pelo id interno.
    row = db.execute(text("""
        SELECT t.id, t.codigo_interno, t.serial_number, t.problema,
               b.name AS marca, m.name AS modelo
        FROM tickets t
        JOIN printer_models m ON m.id = t.printer_model_id
        JOIN printer_brands b ON b.id = m.brand_id
        WHERE UPPER(t.codigo_interno) = UPPER(:ref)
           OR CAST(t.id AS TEXT) = :ref
    """), {"ref": ref}).mappings().first()
    if not row:
        raise HTTPException(404, "Ticket não encontrado. Confira o código (ex: GAR-2026-0001).")
    return {**dict(row), "id": str(row["id"])}


@router.post("")
def criar(p: RetidaIn, user: models.User = Depends(usuario_atual),
          db: Session = Depends(get_db)):
    r = models.ImpressoraRetida(
        ticket_id=p.ticket_id or None, marca=p.marca, modelo=p.modelo,
        numero_serie=(p.numero_serie or "").strip() or None,
        condicao=p.condicao, estado_id=p.estado_id, local=p.local,
        observacao=p.observacao)
    db.add(r); db.flush()
    # Primeiro estado entra no histórico.
    if p.estado_id:
        est = db.query(models.EstadoRetida).get(p.estado_id)
        db.add(models.RetidaHistorico(
            retida_id=r.id, estado_de=None,
            estado_para=est.name if est else None, local=p.local,
            autor_id=user.id))
    registrar_auditoria(db, user, "criar", "retida",
                        f"Cadastrou impressora retida (SN: {r.numero_serie or '—'}).")
    db.commit(); db.refresh(r)
    return _retida_dict(r)


@router.put("/{rid}")
def atualizar(rid: int, p: RetidaIn, user: models.User = Depends(usuario_atual),
              db: Session = Depends(get_db)):
    r = db.query(models.ImpressoraRetida).get(rid)
    if not r:
        raise HTTPException(404, "Impressora retida não encontrada.")
    r.ticket_id = p.ticket_id or None
    r.marca = p.marca; r.modelo = p.modelo
    r.numero_serie = (p.numero_serie or "").strip() or None
    r.condicao = p.condicao; r.local = p.local; r.observacao = p.observacao
    registrar_auditoria(db, user, "editar", "retida",
                        f"Editou impressora retida (SN: {r.numero_serie or '—'}).")
    db.commit()
    return _retida_dict(r)


class MudarEstadoIn(BaseModel):
    estado_id: int
    local: str | None = None
    nota: str | None = None


@router.post("/{rid}/estado")
def mudar_estado(rid: int, p: MudarEstadoIn,
                 user: models.User = Depends(usuario_atual),
                 db: Session = Depends(get_db)):
    """Muda o estado/destino da impressora e registra no histórico."""
    r = db.query(models.ImpressoraRetida).get(rid)
    if not r:
        raise HTTPException(404, "Impressora retida não encontrada.")
    est_novo = db.query(models.EstadoRetida).get(p.estado_id)
    if not est_novo:
        raise HTTPException(404, "Estado não encontrado.")
    est_antigo = db.query(models.EstadoRetida).get(r.estado_id) if r.estado_id else None
    db.add(models.RetidaHistorico(
        retida_id=r.id,
        estado_de=est_antigo.name if est_antigo else None,
        estado_para=est_novo.name, local=p.local, nota=p.nota, autor_id=user.id))
    r.estado_id = p.estado_id
    if p.local is not None:
        r.local = p.local
    registrar_auditoria(db, user, "editar", "retida",
                        f"Mudou o estado da retida #{r.id} para \"{est_novo.name}\".")
    db.commit()
    return _retida_dict(r, estado_nome=est_novo.name)


@router.get("/{rid}/historico")
def historico(rid: int, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT h.estado_de, h.estado_para, h.local, h.nota, h.criado_em,
               u.nome AS autor_nome, u.username AS autor_username
        FROM retida_historico h
        LEFT JOIN users u ON u.id = h.autor_id
        WHERE h.retida_id = :rid
        ORDER BY h.id DESC
    """), {"rid": rid}).mappings().all()
    return [{**dict(r), "criado_em": str(r["criado_em"]) if r["criado_em"] else None}
            for r in rows]


# ---------- Peças canibalizadas ----------
class PecaIn(BaseModel):
    peca: str
    destino_texto: str | None = None
    destino_retida_id: int | None = None
    destino_ticket_ref: str | None = None   # código GAR (ou UUID) do ticket destino


@router.get("/{rid}/pecas")
def listar_pecas(rid: int, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT p.id, p.peca, p.destino_ticket_id, p.criado_em,
               dt.codigo_interno AS destino_ticket_codigo, u.nome AS autor_nome
        FROM retida_pecas p
        LEFT JOIN tickets dt ON dt.id = p.destino_ticket_id
        LEFT JOIN users u ON u.id = p.autor_id
        WHERE p.retida_id = :rid
        ORDER BY p.id DESC
    """), {"rid": rid}).mappings().all()
    return [{**dict(r), "criado_em": str(r["criado_em"]) if r["criado_em"] else None,
             "destino_ticket_id": str(r["destino_ticket_id"]) if r["destino_ticket_id"] else None}
            for r in rows]


@router.post("/{rid}/pecas")
def criar_peca(rid: int, p: PecaIn, user: models.User = Depends(usuario_atual),
               db: Session = Depends(get_db)):
    r = db.query(models.ImpressoraRetida).get(rid)
    if not r:
        raise HTTPException(404, "Impressora retida não encontrada.")
    if not p.peca.strip():
        raise HTTPException(400, "Informe a peça retirada.")
    peca_nome = p.peca.strip()
    # Ticket de destino (opcional): resolve por código GAR (ou UUID).
    destino_ticket_id = None
    if p.destino_ticket_ref and p.destino_ticket_ref.strip():
        ref = p.destino_ticket_ref.strip()
        row = db.execute(text(
            "SELECT id FROM tickets WHERE UPPER(codigo_interno)=UPPER(:r) "
            "OR CAST(id AS TEXT)=:r"), {"r": ref}).first()
        if not row:
            raise HTTPException(404, f"Ticket não encontrado: {ref}")
        destino_ticket_id = row[0]
    peca = models.RetidaPeca(retida_id=rid, peca=peca_nome,
                             destino_ticket_id=destino_ticket_id, autor_id=user.id)
    db.add(peca)

    # Se a peça não existe na lista padrão, cadastra automaticamente (case-insensitive).
    existe = db.execute(text(
        "SELECT 1 FROM pecas_padrao WHERE LOWER(TRIM(name))=LOWER(TRIM(:n))"),
        {"n": peca_nome}).first()
    if not existe:
        db.add(models.PecaPadrao(name=peca_nome, active=1, ordem=999))

    # Registra a retirada na timeline do ticket de origem da retida (se houver)
    # e, se a peça foi destinada a um ticket, também na timeline dele.
    sn = r.numero_serie or f"#{r.id}"
    if r.ticket_id:
        db.add(models.TicketEvento(
            ticket_id=r.ticket_id, tipo=models.TIPO_COMENTARIO, autor_id=user.id,
            texto=f"Peça \"{peca_nome}\" retirada desta impressora retida (SN {sn})."))
    if destino_ticket_id:
        db.add(models.TicketEvento(
            ticket_id=destino_ticket_id, tipo=models.TIPO_COMENTARIO, autor_id=user.id,
            texto=f"Peça \"{peca_nome}\" aproveitada da impressora retida SN {sn}."))

    registrar_auditoria(db, user, "editar", "retida",
                        f"Registrou peça \"{peca_nome}\" retirada da retida #{rid}.")
    db.commit(); db.refresh(peca)
    return {"id": peca.id}


@router.delete("/pecas/{peca_id}")
def excluir_peca(peca_id: int, user: models.User = Depends(usuario_atual),
                 db: Session = Depends(get_db)):
    peca = db.query(models.RetidaPeca).get(peca_id)
    if not peca:
        raise HTTPException(404, "Peça não encontrada.")
    peca_nome = peca.peca
    retida = db.query(models.ImpressoraRetida).get(peca.retida_id)
    sn = (retida.numero_serie if retida else None) or f"#{peca.retida_id}"
    ticket_origem = retida.ticket_id if retida else None
    ticket_destino = peca.destino_ticket_id

    db.delete(peca)

    # Não apaga o rastro: ACRESCENTA um evento de exclusão nas timelines dos
    # tickets envolvidos, mostrando quem removeu e quando.
    autor = user.nome or user.username
    if ticket_origem:
        db.add(models.TicketEvento(
            ticket_id=ticket_origem, tipo=models.TIPO_COMENTARIO, autor_id=user.id,
            texto=f"{autor} removeu o registro da peça \"{peca_nome}\" da impressora retida (SN {sn})."))
    if ticket_destino:
        db.add(models.TicketEvento(
            ticket_id=ticket_destino, tipo=models.TIPO_COMENTARIO, autor_id=user.id,
            texto=f"{autor} removeu o registro da peça \"{peca_nome}\" aproveitada da retida SN {sn}."))

    registrar_auditoria(db, user, "excluir", "retida",
                        f"Removeu o registro da peça \"{peca_nome}\" da retida SN {sn}.")
    db.commit()
    return {"ok": True}


@router.delete("/{rid}")
def excluir(rid: int, user: models.User = Depends(usuario_atual),
            db: Session = Depends(get_db)):
    r = db.query(models.ImpressoraRetida).get(rid)
    if not r:
        raise HTTPException(404, "Impressora retida não encontrada.")
    sn = r.numero_serie
    ticket_origem = r.ticket_id
    # Limpa histórico, peças e notas associadas.
    db.execute(text("DELETE FROM retida_historico WHERE retida_id = :rid"), {"rid": rid})
    db.execute(text("DELETE FROM retida_pecas WHERE retida_id = :rid"), {"rid": rid})
    db.execute(text("DELETE FROM retida_notas WHERE retida_id = :rid"), {"rid": rid})
    db.delete(r)
    # Registra na timeline do ticket de origem, se houver (mantém rastro).
    if ticket_origem:
        autor = user.nome or user.username
        db.add(models.TicketEvento(
            ticket_id=ticket_origem, tipo=models.TIPO_COMENTARIO, autor_id=user.id,
            texto=f"{autor} excluiu o registro da impressora retida (SN {sn or '—'})."))
    registrar_auditoria(db, user, "excluir", "retida",
                        f"Excluiu impressora retida (SN: {sn or '—'}).")
    db.commit()
    return {"ok": True}


# ---------- Notas (diário) ----------
class NotaIn(BaseModel):
    texto: str


@router.get("/{rid}/notas")
def listar_notas(rid: int, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT n.id, n.texto, n.criado_em,
               u.nome AS autor_nome, u.username AS autor_username
        FROM retida_notas n
        LEFT JOIN users u ON u.id = n.autor_id
        WHERE n.retida_id = :rid
        ORDER BY n.id DESC
    """), {"rid": rid}).mappings().all()
    return [{**dict(r), "criado_em": str(r["criado_em"]) if r["criado_em"] else None}
            for r in rows]


@router.post("/{rid}/notas")
def criar_nota(rid: int, p: NotaIn, user: models.User = Depends(usuario_atual),
               db: Session = Depends(get_db)):
    r = db.query(models.ImpressoraRetida).get(rid)
    if not r:
        raise HTTPException(404, "Impressora retida não encontrada.")
    if not p.texto.strip():
        raise HTTPException(400, "A nota não pode ser vazia.")
    n = models.RetidaNota(retida_id=rid, texto=p.texto.strip(), autor_id=user.id)
    db.add(n)
    registrar_auditoria(db, user, "editar", "retida", f"Adicionou nota à retida #{rid}.")
    db.commit(); db.refresh(n)
    return {"id": n.id}


@router.delete("/notas/{nota_id}")
def excluir_nota(nota_id: int, user: models.User = Depends(usuario_atual),
                 db: Session = Depends(get_db)):
    n = db.query(models.RetidaNota).get(nota_id)
    if not n:
        raise HTTPException(404, "Nota não encontrada.")
    db.delete(n)
    db.commit()
    return {"ok": True}


# ---------- Peças padrão (menu suspenso) ----------
class PecaPadraoIn(BaseModel):
    name: str
    active: int = 1
    ordem: int = 0


@router.get("/pecas-padrao")
def listar_pecas_padrao(db: Session = Depends(get_db)):
    ps = db.query(models.PecaPadrao).order_by(
        models.PecaPadrao.ordem, models.PecaPadrao.name).all()
    return [{"id": p.id, "name": p.name, "active": p.active, "ordem": p.ordem} for p in ps]


@router.post("/pecas-padrao")
def criar_peca_padrao(p: PecaPadraoIn, admin: models.User = Depends(requer_admin),
                      db: Session = Depends(get_db)):
    if not p.name.strip():
        raise HTTPException(400, "Informe o nome da peça.")
    obj = models.PecaPadrao(name=p.name.strip(), active=p.active, ordem=p.ordem)
    db.add(obj)
    registrar_auditoria(db, admin, "criar", "catalogo",
                        f"Criou a peça padrão \"{p.name.strip()}\".")
    db.commit(); db.refresh(obj)
    return {"id": obj.id, "name": obj.name}


@router.delete("/pecas-padrao/{pid}")
def excluir_peca_padrao(pid: int, admin: models.User = Depends(requer_admin),
                        db: Session = Depends(get_db)):
    obj = db.query(models.PecaPadrao).get(pid)
    if not obj:
        raise HTTPException(404, "Peça padrão não encontrada.")
    nome = obj.name
    db.delete(obj)
    registrar_auditoria(db, admin, "excluir", "catalogo",
                        f"Excluiu a peça padrão \"{nome}\".")
    db.commit()
    return {"ok": True}
