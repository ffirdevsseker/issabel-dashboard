from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/leaderboard")
def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """kullanicilar tablosundaki xp kolonundan gerçek liderlik tablosu."""
    personel = (
        db.query(User)
        .filter(
            User.silindi_mi == False,
            User.rol_id == 3,       # sadece personel
            User.dahili_no.isnot(None),
            User.dahili_no != "",
        )
        .order_by(User.xp.desc())
        .limit(50)
        .all()
    )

    leaderboard = []
    for idx, u in enumerate(personel):
        rank = idx + 1
        badge = u.unvan or ("Altın" if rank == 1 else "Gümüş" if rank == 2 else "Bronz")
        leaderboard.append({
            "id": str(u.id),
            "rank": rank,
            "name": u.ad_soyad or u.kullanici_adi,
            "extension": u.dahili_no,
            "points": u.xp,
            "calls": 0,
            "total_billsec": 0,
            "badge": badge,
            "isMe": u.id == current_user.id,
        })

    return leaderboard
