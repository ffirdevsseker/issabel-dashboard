"""
Agent · Şirket Rehberi
──────────────────────
GET /agent/directory  — Tüm aktif kullanıcıları rol gruplarına göre döner.
                        Softphone sol menü "Rehber" sekmesinde gösterilir.

Dönüş şeması:
{
    "admin":      [{ id, name, extension, unvan, role }],
    "supervisor": [...],
    "personel":   [...],
    "bt":         [...],
    "total":      <int>
}
"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.async_session import get_async_db
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["Agent"])


# Rol etiketleri (UI'da gösterilecek başlıklar)
_ROLE_LABELS = {
    "admin":      "Yönetim",
    "supervisor": "Süpervizör",
    "personel":   "Personel",
    "bt":         "Bilgi İşlem",
}


@router.get("/directory")
async def get_directory(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aktif tüm kullanıcılar — softphone rehberi için.
    DB hatasında boş gruplar döner (frontend skeleton/empty state gösterir).
    """
    try:
        rows = (await db.execute(text("""
            SELECT
                u.id::text                                   AS id,
                COALESCE(NULLIF(TRIM(u.ad_soyad), ''), u.kullanici_adi) AS name,
                u.dahili_no                                  AS extension,
                COALESCE(u.unvan, '')                        AS unvan,
                COALESCE(u.anlik_durum, 'offline')           AS anlik_durum,
                LOWER(COALESCE(r.ad, 'personel'))            AS role
            FROM kullanicilar u
            LEFT JOIN roller r ON r.id = u.rol_id
            WHERE u.silindi_mi = FALSE
            ORDER BY
                CASE LOWER(COALESCE(r.ad, ''))
                    WHEN 'admin'      THEN 1
                    WHEN 'supervisor' THEN 2
                    WHEN 'personel'   THEN 3
                    WHEN 'bt'         THEN 4
                    ELSE 5
                END,
                u.ad_soyad ASC
        """))).fetchall()
    except Exception as exc:
        logger.warning("directory sorgusu başarısız: %s", exc)
        return {
            "admin": [], "supervisor": [], "personel": [], "bt": [],
            "labels": _ROLE_LABELS, "total": 0,
        }

    # Rollere göre grupla; çağıran kullanıcıyı işaretle (isMe)
    grouped: dict[str, list[dict]] = {"admin": [], "supervisor": [], "personel": [], "bt": []}
    me_id = str(current_user.id) if current_user else None

    for r in rows:
        role = r.role if r.role in grouped else "personel"
        grouped[role].append({
            "id":           r.id,
            "name":         r.name or "—",
            "extension":    r.extension,
            "unvan":        r.unvan,
            "anlik_durum":  r.anlik_durum,   # online / mola / offline
            "role":         role,
            "isMe":         (r.id == me_id),
        })

    total = sum(len(v) for v in grouped.values())
    return {**grouped, "labels": _ROLE_LABELS, "total": total}
