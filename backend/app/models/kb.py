"""Base de conhecimento de atendimento (KB): material de apoio para o time.

Cada artigo tem título, categoria, descrição do problema, resolução e uma lista
de pitches (mensagens prontas para enviar ao cliente). Os pitches são guardados
como JSON dentro do artigo — só existem no contexto do artigo e são editados
junto com ele, então não precisam de tabela própria.

Formato de `pitches` (lista de objetos):
    [{"titulo": "Opcional", "texto": "corpo do pitch"}, ...]
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON

from app.core.database import Base


class KbArtigo(Base):
    __tablename__ = "kb_artigos"

    id = Column(Integer, primary_key=True)
    titulo = Column(String(200), nullable=False)
    categoria = Column(String(80), nullable=True)
    favorito = Column(Integer, nullable=False, default=0)  # 0/1 — sobe ao topo
    problema = Column(Text, nullable=True)        # descrição do problema
    resolucao = Column(Text, nullable=True)       # como resolver
    pitches = Column(JSON, nullable=False, default=list)  # lista de {titulo, texto}
    # Cópia em texto puro dos pitches (títulos + corpos), só para a busca
    # funcionar de forma portável entre Postgres e SQLite (o cast de JSON para
    # texto difere entre os bancos). Mantido em sincronia a cada gravação.
    pitches_texto = Column(Text, nullable=True)
    autor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
    atualizado_em = Column(DateTime(timezone=True), default=datetime.utcnow,
                           onupdate=datetime.utcnow)
