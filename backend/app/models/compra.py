"""Cadastro de compras de equipamentos: a fonte de verdade dos números de série.

Os dados chegam em planilha do fornecedor e são colados em massa. Marca/modelo
são guardados como texto (o que vem da planilha); a conferência com o catálogo
é feita na exibição, sem travar a inserção. O número de série é único.
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, Date, DateTime

from app.core.database import Base


class Compra(Base):
    __tablename__ = "compras"

    id = Column(Integer, primary_key=True)
    data_compra = Column(Date, nullable=True)
    responsavel_compra = Column(String(120), nullable=True)
    fornecedor = Column(String(160), nullable=True)
    contato_fornecedor = Column(String(200), nullable=True)
    marca = Column(String(120), nullable=True)      # texto (casa com catálogo na exibição)
    modelo = Column(String(160), nullable=True)     # texto
    numero_serie = Column(String(120), nullable=True, unique=True, index=True)
    nota_fiscal = Column(String(80), nullable=True)
    data_entrega = Column(Date, nullable=True)
    status_compra = Column(String(80), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
