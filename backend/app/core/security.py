"""Segurança: hash de senha (bcrypt), tokens JWT e dependências de proteção.

Fluxo: usuário faz login -> recebe um JWT assinado -> envia esse token no
cabeçalho Authorization de cada requisição -> o backend valida e identifica
quem é e qual o papel.
"""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app import models

# O cliente envia o token assim: Authorization: Bearer <token>.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12  # token válido por 12h; depois exige novo login


def hash_senha(senha: str) -> str:
    # bcrypt opera sobre bytes e limita a senha a 72 bytes (truncamos por segurança).
    senha_b = senha.encode("utf-8")[:72]
    return bcrypt.hashpw(senha_b, bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, hash_: str) -> bool:
    senha_b = senha.encode("utf-8")[:72]
    return bcrypt.checkpw(senha_b, hash_.encode("utf-8"))


def criar_token(user: "models.User") -> str:
    """Gera um JWT contendo o id, username e papel do usuário."""
    expira = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "exp": expira,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def usuario_atual(token: str = Depends(oauth2_scheme),
                  db: Session = Depends(get_db)) -> "models.User":
    """Valida o token e devolve o usuário. Usado para proteger endpoints."""
    erro = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou sessão expirada.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise erro
    except JWTError:
        raise erro

    user = db.query(models.User).get(int(user_id))
    if not user or not user.active:
        raise erro
    return user


def requer_admin(user: "models.User" = Depends(usuario_atual)) -> "models.User":
    """Dependência para endpoints que só admin pode acessar."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
    return user
