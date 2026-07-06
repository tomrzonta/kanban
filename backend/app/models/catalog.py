"""Catálogo de impressoras 3D: Marca -> Modelo -> Preço de referência.

Decisão de modelagem importante:
- PrinterModel.current_price guarda o preço ATUAL (usado só para preencher
  novos tickets no momento da criação).
- O prejuízo histórico NÃO depende deste campo. Cada ticket congela o preço
  em Ticket.custo_unitario na criação, então reajustes futuros aqui não
  alteram relatórios passados.
"""
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class PrinterBrand(Base):
    __tablename__ = "printer_brands"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    # active=0 oculta a marca em novos cadastros mas preserva o histórico.
    active = Column(Integer, default=1)

    models = relationship("PrinterModel", back_populates="brand")


class PrinterModel(Base):
    __tablename__ = "printer_models"

    id = Column(Integer, primary_key=True)
    brand_id = Column(Integer, ForeignKey("printer_brands.id"), nullable=False)
    name = Column(String(120), nullable=False)        # ex: "Ender-3 V3 SE"
    sku = Column(String(60), nullable=True)            # código interno opcional
    current_price = Column(Numeric(10, 2), nullable=False, default=0)
    active = Column(Integer, default=1)

    brand = relationship("PrinterBrand", back_populates="models")


# --- Entidades padronizadas para análise (substituem campos texto livre) ---

class Supplier(Base):
    """Fornecedor — entidade separada (ex: quem repõe peças)."""
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    active = Column(Integer, default=1)


class DefectType(Base):
    """Tipo de defeito padronizado (ex: 'Não liga', 'Tela', 'Extrusora')."""
    __tablename__ = "defect_types"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    active = Column(Integer, default=1)


# Tipos de impacto de um desfecho no cálculo de prejuízo:
IMPACTO_SEM_PREJUIZO = "sem_prejuizo"   # conta R$ 0
IMPACTO_TOTAL = "total"                  # conta custo_unitario * quantidade
IMPACTO_PARCIAL = "parcial"              # conta um valor informado no ticket
IMPACTO_INFORMATIVO = "informativo"      # caso sem valor financeiro (ex: 2ª via de NF)
IMPACTOS = [IMPACTO_SEM_PREJUIZO, IMPACTO_TOTAL, IMPACTO_PARCIAL, IMPACTO_INFORMATIVO]


class Desfecho(Base):
    """Categoria de desfecho do ticket (ex: Reparado, Trocado, Coberto pelo
    fornecedor, Prejuízo). O 'impacto' define como o prejuízo é contado nas
    análises — é isso que evita o viés de tratar todo ticket como perda.
    """
    __tablename__ = "desfechos"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    impacto = Column(String(20), nullable=False, default=IMPACTO_SEM_PREJUIZO)
    active = Column(Integer, default=1)
