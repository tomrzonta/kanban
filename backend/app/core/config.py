"""Configurações centrais da aplicação.

Lê variáveis de ambiente (de um arquivo .env em desenvolvimento).
Centralizar aqui evita espalhar strings de conexão pelo código.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # String de conexão do PostgreSQL. Sobrescreva via .env em produção.
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/garantias3d"

    # CORS — origens do frontend autorizadas a chamar a API.
    FRONTEND_ORIGINS: list[str] = ["http://localhost:5173"]

    # Chave para assinar os tokens JWT. EM PRODUÇÃO, defina via .env com um
    # valor longo e aleatório — nunca use este padrão fora de desenvolvimento.
    SECRET_KEY: str = "troque-esta-chave-em-producao-por-algo-bem-aleatorio"

    # Limites padrão de SLA (horas) usados quando a coluna não define o seu.
    SLA_WARNING_RATIO: float = 0.8  # a partir de 80% do SLA o card fica amarelo

    class Config:
        env_file = ".env"


settings = Settings()
