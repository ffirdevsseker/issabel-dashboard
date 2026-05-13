import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.kb import KbMakale
from app.api.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kb", tags=["Knowledge Base"])

KATEGORI_LABELS = {
    "prosedurler": "Prosedürler",
    "sss": "Sık Sorulan Sorular",
    "kargo": "Kargo & Teslimat",
    "scriptler": "Konuşma Scriptleri",
    "satis": "Satış",
    "sikayet": "Şikayet",
    "bilgi": "Bilgi",
    "urunler": "Ürünler & Markalar",
    "ayakkabi": "Ayakkabı",
    "giyim": "Giyim & Takım",
    "aksesuar": "Aksesuar & Ekipman",
    "markalar": "Marka Rehberi",
    "acil": "Acil Durum Yönergeleri",
}


@router.get("/articles")
def get_articles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aktif KB makalelerini döner (kb_makaleler tablosundan).

    DB şeması uyumsuzluğunda boş liste döner; frontend mock veriyi gösterir.
    """
    try:
        makaleler = (
            db.query(KbMakale)
            .filter(KbMakale.aktif == True)
            .order_by(KbMakale.olusturma_tarihi.desc())
            .limit(200)
            .all()
        )
    except Exception as exc:
        logger.warning("kb_makaleler sorgusu başarısız (DB şema uyumsuzluğu olabilir): %s", exc)
        return []

    articles = []
    for m in makaleler:
        try:
            icerik = m.icerik or ""
            preview = icerik[:150].replace("\n", " ").strip()
            if len(icerik) > 150:
                preview += "..."

            cat_id = str(m.kategori or "bilgi")
            articles.append({
                "id": str(m.id),
                "categoryId": cat_id,
                "categoryLabel": KATEGORI_LABELS.get(cat_id, cat_id.capitalize()),
                "title": m.baslik,
                "preview": preview,
                "updatedAt": m.olusturma_tarihi.strftime("%Y-%m-%d") if m.olusturma_tarihi else "",
                "author": m.olusturan.ad_soyad if m.olusturan else "Admin",
                "tags": [],
                "related": [],
                "content": icerik,
            })
        except Exception as exc:
            logger.warning("KB makalesi serileştirilemedi (id=%s): %s", getattr(m, "id", "?"), exc)
            continue

    return articles
