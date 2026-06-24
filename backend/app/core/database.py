"""Camada de banco de dados: engine, fábrica de sessões e dependência get_db.

A função get_db é injetada nos endpoints via Depends() e garante que cada
requisição abra e feche sua própria sessão (sem vazamento de conexão).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base compartilhada por todos os modelos. Importada em cada arquivo de model.
Base = declarative_base()


def get_db():
    """Abre uma sessão por requisição e a fecha ao final, mesmo com erro."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
