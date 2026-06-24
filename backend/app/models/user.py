"""Modelo de usuário para autenticação.

A senha NUNCA é guardada em texto — apenas seu hash bcrypt (password_hash).
O papel (role) controla o que o usuário pode fazer: 'admin' ou 'atendente'.
"""
from sqlalchemy import Column, Integer, String
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(80), nullable=False, unique=True)
    nome = Column(String(120), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="atendente")  # admin | atendente
    active = Column(Integer, default=1)
