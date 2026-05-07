from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.kb import KbMakale
from app.api.deps import get_current_user
from app.models.user import User

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
    """Aktif KB makalelerini döner (kb_makaleler tablosundan)."""
    makaleler = (
        db.query(KbMakale)
        .filter(KbMakale.aktif == True)
        .order_by(KbMakale.olusturma_tarihi.desc())
        .limit(200)
        .all()
    )

    articles = []
    for m in makaleler:
        icerik = m.icerik or ""
        preview = icerik[:150].replace("\n", " ").strip()
        if len(icerik) > 150:
            preview += "..."

        cat_id = m.kategori or "bilgi"
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

    return articles
