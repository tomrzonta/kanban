"""Limpa APENAS os tickets e tudo que está preso a eles, para começar um beta
com dados reais sem enviesar as análises com os tickets de teste.

O que APAGA:
  - tickets
  - gastos_ticket (gastos discriminados dos tickets)
  - attachments (anexos dos tickets)
  - ticket_eventos (timeline dos cards)
  - ticket_history (histórico de movimentações)
  - recebimentos (registros de recebimento físico)
  - ticket_tags (associação de tags aos tickets)

O que PRESERVA (não é tocado):
  - columns (as colunas do kanban e suas configurações)
  - catálogo: printer_brands, printer_models, suppliers, defect_types, desfechos
  - users (todos os usuários e senhas)
  - categorias_gasto, status_tags
  - kb_artigos (material de atendimento e regras de negócio)
  - compras (cadastro de equipamentos / números de série)
  - audit_logs (a auditoria é mantida como histórico)

COMO RODAR (com os containers no ar):
    docker compose exec backend python -m app.limpar_tickets

É destrutivo para os tickets: pede confirmação digitada antes de apagar.
"""
from sqlalchemy import text

from app.core.database import engine

# Tabelas ligadas a ticket. Com TRUNCATE ... CASCADE a ordem não importa, mas
# listamos explicitamente só as de ticket — as demais NÃO são tocadas.
TABELAS_TICKET = [
    "gastos_ticket",
    "attachments",
    "ticket_eventos",
    "ticket_history",
    "recebimentos",
    "ticket_tags",
    "tickets",
]


def run():
    print("Este script vai APAGAR todos os tickets e o que está preso a eles")
    print("(gastos, anexos, eventos, histórico, recebimentos).")
    print("As colunas, o catálogo, os usuários, as regras e as compras são PRESERVADOS.")
    resp = input("Tem certeza? Digite 'LIMPAR TICKETS' para confirmar: ").strip()
    if resp != "LIMPAR TICKETS":
        print("Cancelado. Nada foi alterado.")
        return

    with engine.begin() as conn:
        lista = ", ".join(TABELAS_TICKET)
        conn.execute(text(f"TRUNCATE {lista} RESTART IDENTITY CASCADE;"))
    print("\nPronto. Todos os tickets e dados associados foram apagados.")
    print("As colunas, o catálogo, os usuários, as regras e as compras continuam intactos.")
    print("O sistema está pronto para o beta com dados reais.")


if __name__ == "__main__":
    run()
