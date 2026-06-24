"""Endpoints de autenticação (login, perfil) e gestão de usuários (só admin)."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import (
    hash_senha, verificar_senha, criar_token, usuario_atual, requer_admin,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserOut(BaseModel):
    id: int
    username: str
    nome: str | None
    role: str


class UserCreate(BaseModel):
    username: str
    nome: str | None = None
    senha: str
    role: str = "atendente"


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Recebe usuário e senha (form), devolve o token de acesso."""
    user = db.query(models.User).filter_by(username=form.username).first()
    if not user or not user.active or not verificar_senha(form.password, user.password_hash):
        raise HTTPException(401, "Usuário ou senha inválidos.")
    return {
        "access_token": criar_token(user),
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username,
                 "nome": user.nome, "role": user.role},
    }


@router.get("/me", response_model=UserOut)
def me(user: models.User = Depends(usuario_atual)):
    """Devolve os dados do usuário logado (usado pelo frontend ao carregar)."""
    return user


# --- Gestão de usuários: só admin ---
@router.get("/users", response_model=list[UserOut])
def list_users(_: models.User = Depends(requer_admin), db: Session = Depends(get_db)):
    return db.query(models.User).filter_by(active=1).all()


@router.post("/users", response_model=UserOut)
def create_user(p: UserCreate, _: models.User = Depends(requer_admin),
                db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(username=p.username).first():
        raise HTTPException(400, "Já existe um usuário com esse login.")
    if p.role not in ("admin", "atendente"):
        raise HTTPException(400, "Papel inválido.")
    user = models.User(username=p.username, nome=p.nome,
                       password_hash=hash_senha(p.senha), role=p.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_role(user_id: int, role: str, admin: models.User = Depends(requer_admin),
                db: Session = Depends(get_db)):
    """Altera o papel de um usuário (admin <-> atendente)."""
    if role not in ("admin", "atendente"):
        raise HTTPException(400, "Papel inválido.")
    if user_id == admin.id:
        raise HTTPException(400, "Você não pode alterar o seu próprio papel.")
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")
    user.role = role
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: models.User = Depends(requer_admin),
                db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(400, "Você não pode remover a si mesmo.")
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")
    user.active = 0  # soft delete
    db.commit()
    return {"ok": True}
