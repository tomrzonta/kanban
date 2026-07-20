"""Controle de impressoras retidas — as que ficam com a empresa após uma troca
de garantia (o cliente recebeu uma nova; esta ficou conosco).

Cada impressora retida pode ter origem num ticket de cliente (para herdar os
dados de atendimento) ou ser avulsa. Recebe um destino/estado que evolui ao
longo do tempo (com histórico), e pode ser canibalizada — peças retiradas para
outras impressoras (destino por texto livre ou referência a outra retida).
"""
from datetime import datetime

from sqlalchemy import (Column, Integer, String, Text, DateTime, ForeignKey)
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class EstadoRetida(Base):
    """Estados/destinos gerenciáveis (Aguardando destino, Cemitério de peças,
    Em uso — Farm, Recuperada, Sucata...). Gerenciados como as categorias."""
    __tablename__ = "estados_retida"

    id = Column(Integer, primary_key=True)
    name = Column(String(80), nullable=False, unique=True)
    active = Column(Integer, nullable=False, default=1)
    ordem = Column(Integer, nullable=False, default=0)


class ImpressoraRetida(Base):
    __tablename__ = "impressoras_retidas"

    id = Column(Integer, primary_key=True)
    # Origem opcional: ticket de cliente que deu entrada nesta impressora.
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    # Dados da impressora (herdados do ticket ou preenchidos, se avulsa).
    marca = Column(String(120), nullable=True)
    modelo = Column(String(160), nullable=True)
    numero_serie = Column(String(120), nullable=True)
    condicao = Column(String(200), nullable=True)     # como veio (funciona parcial, morta...)
    # Estado/destino atual.
    estado_id = Column(Integer, ForeignKey("estados_retida.id"), nullable=True)
    local = Column(String(160), nullable=True)        # farm/local quando em uso
    observacao = Column(Text, nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
    atualizado_em = Column(DateTime(timezone=True), default=datetime.utcnow,
                           onupdate=datetime.utcnow)


class RetidaHistorico(Base):
    """Histórico de mudanças de estado de uma impressora retida."""
    __tablename__ = "retida_historico"

    id = Column(Integer, primary_key=True)
    retida_id = Column(Integer, ForeignKey("impressoras_retidas.id"),
                       nullable=False, index=True)
    estado_de = Column(String(80), nullable=True)     # nome do estado anterior
    estado_para = Column(String(80), nullable=True)   # nome do novo estado
    local = Column(String(160), nullable=True)        # local informado na mudança
    nota = Column(Text, nullable=True)
    autor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)


class RetidaPeca(Base):
    """Peça canibalizada de uma impressora retida. O destino pode ser: um ticket
    (GAR), outra impressora retida, ou texto livre."""
    __tablename__ = "retida_pecas"

    id = Column(Integer, primary_key=True)
    retida_id = Column(Integer, ForeignKey("impressoras_retidas.id"),
                       nullable=False, index=True)
    peca = Column(String(200), nullable=False)        # o que foi retirado
    # Destino (um dos três):
    destino_texto = Column(String(300), nullable=True)
    destino_retida_id = Column(Integer, ForeignKey("impressoras_retidas.id"),
                               nullable=True)
    destino_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"),
                               nullable=True)
    autor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)


class RetidaNota(Base):
    """Anotação livre (diário) de uma impressora retida — várias por impressora,
    cada uma com data e autor."""
    __tablename__ = "retida_notas"

    id = Column(Integer, primary_key=True)
    retida_id = Column(Integer, ForeignKey("impressoras_retidas.id"),
                       nullable=False, index=True)
    texto = Column(Text, nullable=False)
    autor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)


class PecaPadrao(Base):
    """Nomes padrão de peças (bico, placa-mãe, correia...), para o menu suspenso
    ao registrar canibalização. Gerenciável (como as categorias)."""
    __tablename__ = "pecas_padrao"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    active = Column(Integer, nullable=False, default=1)
    ordem = Column(Integer, nullable=False, default=0)
