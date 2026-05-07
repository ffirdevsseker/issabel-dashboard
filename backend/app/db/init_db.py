import logging
from sqlalchemy import select
from app.db.async_session import AsyncSessionLocal
from app.models.role import Rol
from app.models.dashboard import DashboardModul, RolModul
from app.models.user import User
from app.core.security import hash_password

logger = logging.getLogger(__name__)

async def seed_db():
    async with AsyncSessionLocal() as db:
        try:
            # 1. Roller
            res = await db.execute(select(Rol))
            if not res.scalars().first():
                logger.info("Seeding roles...")
                roles = [
                    Rol(id=1, ad="admin"),
                    Rol(id=2, ad="supervisor"),
                    Rol(id=3, ad="personel"),
                    Rol(id=4, ad="bt")
                ]
                db.add_all(roles)
                await db.commit()

            # 2. Modüller
            res = await db.execute(select(DashboardModul))
            if not res.scalars().first():
                logger.info("Seeding dashboard modules...")
                modules = [
                    DashboardModul(kod="kpi_summary", ad="Genel İstatistikler", bilesen_adi="KPIOverview"),
                    DashboardModul(kod="queue_status", ad="Kuyruk Durumu", bilesen_adi="QueueWidget"),
                    DashboardModul(kod="team_monitor", ad="Ekip İzleme", bilesen_adi="TeamMonitor"),
                    DashboardModul(kod="active_calls", ad="Aktif Çağrılar", bilesen_adi="ActiveCalls"),
                    DashboardModul(kod="recent_cdr", ad="Son Aramalar", bilesen_adi="RecentCalls"),
                ]
                db.add_all(modules)
                await db.commit()

                # Rol-Modül eşleşmeleri
                # Admin için her şey
                res_mods = await db.execute(select(DashboardModul))
                all_mods = res_mods.scalars().all()
                for i, mod in enumerate(all_mods):
                    db.add(RolModul(rol_id=1, modul_id=mod.id, sira=i))
                    # Supervisor için bazıları
                    if mod.kod in ["team_monitor", "queue_status", "kpi_summary"]:
                        db.add(RolModul(rol_id=2, modul_id=mod.id, sira=i))
                    # Personel için bazıları
                    if mod.kod in ["kpi_summary", "active_calls", "recent_cdr"]:
                        db.add(RolModul(rol_id=3, modul_id=mod.id, sira=i))
                await db.commit()

            # 3. Varsayılan Admin Kullanıcısı
            res = await db.execute(select(User).where(User.kullanici_adi == "admin"))
            if not res.scalars().first():
                logger.info("Creating default admin user...")
                admin = User(
                    kullanici_adi="admin",
                    sifre_hash=hash_password("admin123"),
                    ad_soyad="Sistem Yöneticisi",
                    rol_id=1,
                    dahili_no="1000"
                )
                db.add(admin)
                await db.commit()

        except Exception as e:
            logger.error(f"Error seeding database: {e}")
            await db.rollback()
