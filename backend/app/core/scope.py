"""Veri kapsamı (scope) helper'ları — gerçek DB şemasına göre güncellenmiş."""
from typing import List
from sqlalchemy.orm import Session, Query

from app.models.user import User
from app.models.organization import SupervisorEkip


def get_supervisor_team_ids(db: Session, user: User) -> List:
    """Supervisor'ın bağlı olduğu ekip UUID'lerini döner."""
    rows = db.query(SupervisorEkip.ekip_id).filter(
        SupervisorEkip.supervisor_id == user.id
    ).all()
    return [r[0] for r in rows]


def get_team_personel_ids(db: Session, ekip_ids: List) -> List:
    """Verilen ekiplerdeki personel UUID'lerini döner (kullanicilar.ekip_id üzerinden)."""
    if not ekip_ids:
        return []
    rows = db.query(User.id).filter(
        User.ekip_id.in_(ekip_ids),
        User.silindi_mi == False,
    ).all()
    return [r[0] for r in rows]


def get_personel_team_ids(db: Session, user: User) -> List:
    """Personelin bağlı olduğu ekip id'lerini döner (en fazla 1 ekip)."""
    if user.ekip_id:
        return [user.ekip_id]
    return []


def apply_user_scope(query: Query, user: User, user_id_column, db: Session) -> Query:
    """
    user_id bazlı filtre — Mola / VardiyaTalep gibi tablolar için.
    - admin: kısıt yok
    - supervisor: kendi ekibindeki personeller
    - personel: sadece kendi kaydı
    """
    role = user.role_name
    if role == "admin":
        return query
    if role == "supervisor":
        team_ids = get_supervisor_team_ids(db, user)
        per_ids = get_team_personel_ids(db, team_ids)
        if not per_ids:
            return query.filter(user_id_column == None)  # boş sonuç
        return query.filter(user_id_column.in_(per_ids))
    # personel
    return query.filter(user_id_column == user.id)


def apply_team_scope(query: Query, user: User, team_id_column, db: Session) -> Query:
    """Geriye dönük uyumluluk — ekip id kolonu olan tablolar için."""
    role = user.role_name
    if role == "admin":
        return query
    if role == "supervisor":
        team_ids = get_supervisor_team_ids(db, user)
        if not team_ids:
            return query.filter(team_id_column == None)
        return query.filter(team_id_column.in_(team_ids))
    return query.filter(team_id_column == user.ekip_id)


def apply_personel_scope(query: Query, user: User, personel_id_column, db: Session) -> Query:
    """Personel id bazlı filtre."""
    return apply_user_scope(query, user, personel_id_column, db)


def supervisor_can_act_on_personel(db: Session, supervisor: User, personel_id) -> bool:
    """Supervisor verilen personele aksiyon alabilir mi?"""
    if supervisor.role_name == "admin":
        return True
    if supervisor.role_name != "supervisor":
        return False
    team_ids = get_supervisor_team_ids(db, supervisor)
    if not team_ids:
        return False
    per_ids = set(get_team_personel_ids(db, team_ids))
    return personel_id in per_ids
