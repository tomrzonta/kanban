"""Popula o banco com dados de exemplo para visualizar o sistema funcionando.

Rodar uma vez, com o backend já configurado e o banco no ar:
    python -m app.seed

É idempotente no básico: se já houver colunas, não duplica a estrutura.
"""
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app import models
from app.core.security import hash_senha


def run():
    db = SessionLocal()
    try:
        # Usuário admin inicial (idempotente). Troque a senha após o 1º login.
        if not db.query(models.User).filter_by(username="admin").first():
            db.add(models.User(
                username="admin", nome="Administrador",
                password_hash=hash_senha("admin123"), role="admin",
            ))
            db.commit()
            print("Usuário admin criado (login: admin / senha: admin123).")

        if db.query(models.BoardColumn).count() > 0:
            print("Banco já contém dados de catálogo. Nada mais a fazer.")
            return

        # --- Colunas do fluxo ---
        # sla_hours: limite da etapa | is_waiting_client: espera externa | is_done: terminal
        colunas = [
            models.BoardColumn(name="Novo", order_index=0, sla_hours=24),
            models.BoardColumn(name="Análise interna", order_index=1, sla_hours=48),
            models.BoardColumn(name="Aguardando cliente", order_index=2,
                               sla_hours=72, is_waiting_client=1),
            models.BoardColumn(name="Concluído", order_index=3, is_done=1),
        ]
        db.add_all(colunas)
        db.flush()

        # --- Tags de status ---
        tags = [
            models.StatusTag(name="Aprovada", color="#3ba55d"),
            models.StatusTag(name="Negada", color="#e03e3e"),
            models.StatusTag(name="Aguardando peça", color="#378ADD"),
        ]
        db.add_all(tags)

        # --- Marcas e modelos ---
        creality = models.PrinterBrand(name="Creality")
        bambu = models.PrinterBrand(name="Bambu Lab")
        db.add_all([creality, bambu])
        db.flush()

        ender = models.PrinterModel(brand_id=creality.id, name="Ender-3 V3 SE",
                                    sku="CR-E3V3", current_price=1290)
        k1 = models.PrinterModel(brand_id=creality.id, name="K1 Max",
                                 sku="CR-K1M", current_price=4490)
        a1 = models.PrinterModel(brand_id=bambu.id, name="A1 mini",
                                 sku="BL-A1M", current_price=2190)
        db.add_all([ender, k1, a1])
        db.flush()

        # Entidades padronizadas para análise.
        forn_a = models.Supplier(name="Fornecedor Alpha")
        forn_b = models.Supplier(name="Fornecedor Beta")
        def_tela = models.DefectType(name="Tela / Display")
        def_naoliga = models.DefectType(name="Não liga")
        def_extrusora = models.DefectType(name="Extrusora")
        db.add_all([forn_a, forn_b,
                    def_tela, def_naoliga, def_extrusora])
        db.flush()

        # --- Tickets de exemplo ---
        agora = datetime.utcnow()
        tickets = [
            models.Ticket(
                titulo="Tela com mancha escura", problema="Mancha no display LCD.",
                supplier_id=forn_a.id,
                defect_type_id=def_tela.id, numero_nf="12345",
                origem=models.OrigemReclamacao.reclame_aqui,
                printer_model_id=ender.id, quantidade=1,
                custo_unitario=ender.current_price,
                column_id=colunas[0].id, order_index=0,
                created_at=agora - timedelta(hours=2),
                last_moved_at=agora - timedelta(hours=2),
            ),
            models.Ticket(
                titulo="Não liga após queda", problema="Sem resposta ao ligar.",
                supplier_id=forn_b.id,
                defect_type_id=def_naoliga.id,
                origem=models.OrigemReclamacao.atendimento_interno,
                printer_model_id=a1.id, quantidade=1,
                custo_unitario=a1.current_price,
                column_id=colunas[1].id, order_index=0,
                requer_contato_cliente=1, retorno_horas=8,
                retorno_definido_em=agora - timedelta(hours=2),
                created_at=agora - timedelta(hours=30),
                last_moved_at=agora - timedelta(hours=6),
            ),
            models.Ticket(
                titulo="Troca aprovada", problema="Defeito de fábrica confirmado.",
                supplier_id=forn_a.id,
                defect_type_id=def_extrusora.id, codigo_rastreio="BR4521",
                origem=models.OrigemReclamacao.redes_sociais,
                printer_model_id=k1.id, quantidade=1,
                custo_unitario=k1.current_price,
                column_id=colunas[3].id, order_index=0,
                created_at=agora - timedelta(hours=48),
                last_moved_at=agora - timedelta(hours=2),
            ),
        ]
        db.add_all(tickets)
        db.flush()

        # --- Histórico das movimentações ---
        # Ticket 1: só a entrada. Tickets 2 e 3: passaram por etapas (geram tempo p/ gargalos).
        db.add(models.TicketHistory(ticket_id=tickets[0].id,
                                    from_column_id=None, to_column_id=colunas[0].id,
                                    moved_at=tickets[0].created_at))

        db.add_all([
            models.TicketHistory(ticket_id=tickets[1].id, from_column_id=None,
                                 to_column_id=colunas[0].id,
                                 moved_at=agora - timedelta(hours=30)),
            models.TicketHistory(ticket_id=tickets[1].id, from_column_id=colunas[0].id,
                                 to_column_id=colunas[1].id,
                                 moved_at=agora - timedelta(hours=6)),
        ])

        db.add_all([
            models.TicketHistory(ticket_id=tickets[2].id, from_column_id=None,
                                 to_column_id=colunas[0].id,
                                 moved_at=agora - timedelta(hours=48)),
            models.TicketHistory(ticket_id=tickets[2].id, from_column_id=colunas[0].id,
                                 to_column_id=colunas[1].id,
                                 moved_at=agora - timedelta(hours=40)),
            models.TicketHistory(ticket_id=tickets[2].id, from_column_id=colunas[1].id,
                                 to_column_id=colunas[3].id,
                                 moved_at=agora - timedelta(hours=2)),
        ])

        db.commit()
        print("Seed concluído: 4 colunas, 2 marcas, 3 modelos, 3 tickets.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
