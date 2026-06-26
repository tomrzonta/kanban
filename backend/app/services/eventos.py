"""Função utilitária para registrar eventos na timeline de um ticket.

Centraliza a criação de TicketEvento para que os vários pontos do sistema
(mover, receber, desfecho, contato) registrem de forma consistente. Não dá
commit — quem chama controla a transação.
"""
from app import models


def registrar_evento(db, ticket_id, tipo, texto, autor_id=None):
    db.add(models.TicketEvento(
        ticket_id=ticket_id, tipo=tipo, texto=texto, autor_id=autor_id,
    ))
