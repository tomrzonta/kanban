"""Limpa os DADOS do sistema para iniciar um beta em ambiente real, SEM mexer
na estrutura (tabelas, migrações) nem no volume do Docker.

O que faz:
  - Esvazia todas as tabelas de dados (tickets, recebimentos, eventos,
    histórico, auditoria, materiais de atendimento, catálogo, usuários…).
  - Recria APENAS o usuário admin (login: admin / senha: admin123).
  - Recria as colunas do fluxo de trabalho (Novo, Análise, Aguardando, Concluído)
    — isso também evita que o seed repovoe dados de exemplo no próximo restart.

NÃO recria fabricantes, fornecedores, defeitos, desfechos nem tickets de exemplo:
você começa o beta com o catálogo limpo, pronto para cadastrar os dados reais.

COMO RODAR (com os containers no ar):
    docker compose exec backend python -m app.limpar_para_beta

É uma operação destrutiva: faça backup antes (veja instruções no chat).
"""
from sqlalchemy import text

from app.core.database import SessionLocal, engine
from app import models
from app.core.security import hash_senha

# Ordem não importa: usamos TRUNCATE ... CASCADE, que ignora as FKs.
# Lista explícita para deixar claro o que está sendo limpo.
TABELAS = [
    "audit_logs", "ticket_eventos", "ticket_history", "attachments",
    "recebimentos", "tickets", "kb_artigos",
    "printer_models", "printer_brands", "suppliers", "defect_types",
    "desfechos", "status_tags", "columns", "users",
]


def run():
    # Confirmação interativa (evita rodar por engano).
    print("Este script vai APAGAR todos os dados e deixar só o admin.")
    resp = input("Tem certeza? Digite 'LIMPAR' para confirmar: ").strip()
    if resp != "LIMPAR":
        print("Cancelado. Nada foi alterado.")
        return

    # TRUNCATE de todas as tabelas de uma vez, reiniciando os contadores de id.
    with engine.begin() as conn:
        lista = ", ".join(TABELAS)
        conn.execute(text(f"TRUNCATE {lista} RESTART IDENTITY CASCADE;"))
    print("Tabelas esvaziadas.")

    db = SessionLocal()
    try:
        # Admin padrão.
        db.add(models.User(
            username="admin", nome="Administrador",
            password_hash=hash_senha("admin123"), role="admin",
        ))
        # Colunas do fluxo (estrutura de trabalho, não dados de exemplo).
        db.add_all([
            models.BoardColumn(name="Novo", order_index=0, sla_hours=24),
            models.BoardColumn(name="Análise interna", order_index=1, sla_hours=48),
            models.BoardColumn(name="Aguardando cliente", order_index=2,
                               sla_hours=72, is_waiting_client=1),
            models.BoardColumn(name="Concluído", order_index=3, is_done=1),
        ])
        db.commit()
        print("Admin recriado (login: admin / senha: admin123) e colunas do fluxo.")
        print("Pronto para o beta: catálogo limpo, sem tickets de exemplo.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
