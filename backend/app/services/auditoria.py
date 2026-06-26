"""Função utilitária para registrar ações na auditoria.

Centraliza a criação de AuditLog. Guarda um snapshot do nome do autor, para o
registro continuar legível mesmo se o usuário for removido depois. Não dá
commit — quem chama controla a transação.
"""
from app import models


def registrar_auditoria(db, autor, acao, entidade, descricao):
    """autor pode ser um objeto User ou None (ações do sistema)."""
    db.add(models.AuditLog(
        autor_id=autor.id if autor else None,
        autor_nome=(autor.nome or autor.username) if autor else "Sistema",
        acao=acao,
        entidade=entidade,
        descricao=descricao,
    ))
