"""
Gamification · Leaderboard
───────────────────────────
GET /gamification/leaderboard  → personel XP sıralaması (rol adına göre)

Düzeltme notu (Sprint 7-C bugfix):
  Eski kod `User.rol_id == 3` hardcoded değeri kullanıyordu — DB seed'ine bağımlı
  ve yanlış (bu DB'de "personel" rolünün ID'si 3 değil). Bu yüzden tablo boş
  dönüyordu. Artık personnel.py pattern'ine uygun olarak `roller` tablosuna
  join atılıp `LOWER(ad) = 'personel'` ile süzülüyor.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/leaderboard")
async def get_leaderboard(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    kullanicilar + roller join'i — sadece role adı 'personel' olanlar, XP desc.
    Boş dahili filtresi yumuşatıldı: dahili_no NULL ise yine listeye girer
    (sıralama bilgisi değer kaybetmesin).
    """
    rows = (await db.execute(text("""
        SELECT
            u.id::text                              AS id,
            COALESCE(u.ad_soyad, u.kullanici_adi)   AS ad_soyad,
            u.dahili_no                             AS dahili_no,
            COALESCE(u.xp, 0)                       AS xp,
            COALESCE(u.unvan, '')                   AS unvan
        FROM kullanicilar u
        JOIN roller r ON r.id = u.rol_id
        WHERE u.silindi_mi = FALSE
          AND LOWER(r.ad) = 'personel'
        ORDER BY COALESCE(u.xp, 0) DESC, u.ad_soyad ASC
        LIMIT 50
    """))).fetchall()

    leaderboard = []
    for idx, r in enumerate(rows):
        rank = idx + 1
        badge = (r.unvan or "").strip() or (
            "Altın" if rank == 1 else
            "Gümüş" if rank == 2 else
            "Bronz" if rank == 3 else
            f"#{rank}"
        )
        leaderboard.append({
            "id":            r.id,
            "rank":          rank,
            "name":          r.ad_soyad or "—",
            "extension":     r.dahili_no,
            "points":        int(r.xp or 0),
            "calls":         0,             # ileride v_personel_perf join'iyle doldurulabilir
            "total_billsec": 0,
            "badge":         badge,
            "isMe":          r.id == str(current_user.id),
        })

    return leaderboard
