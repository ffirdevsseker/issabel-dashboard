import logging
import uuid
from sqlalchemy import select, text
from app.db.async_session import AsyncSessionLocal
from app.models.role import Rol
from app.models.dashboard import DashboardModul, RolModul
from app.models.user import User
from app.core.security import hash_password

logger = logging.getLogger(__name__)


async def seed_db():
    async with AsyncSessionLocal() as db:
        try:
            # DB'de NOT NULL kalmış nullable sütunları düzelt
            await db.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name  = 'kullanicilar'
                          AND column_name = 'departman_id'
                          AND is_nullable = 'NO'
                    ) THEN
                        ALTER TABLE kullanicilar ALTER COLUMN departman_id DROP NOT NULL;
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name  = 'departmanlar'
                          AND column_name = 'dahili_baslangic'
                          AND is_nullable = 'NO'
                    ) THEN
                        ALTER TABLE departmanlar ALTER COLUMN dahili_baslangic DROP NOT NULL;
                        ALTER TABLE departmanlar ALTER COLUMN dahili_bitis      DROP NOT NULL;
                        ALTER TABLE departmanlar ALTER COLUMN ivr_kodu          DROP NOT NULL;
                        ALTER TABLE departmanlar ALTER COLUMN hedef_gunluk_cagri DROP NOT NULL;
                        ALTER TABLE departmanlar ALTER COLUMN max_mola_dakika   DROP NOT NULL;
                    END IF;
                END $$;
            """))
            await db.commit()

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
                await db.execute(text(
                    "SELECT setval(pg_get_serial_sequence('roller', 'id'), "
                    "(SELECT MAX(id) FROM roller))"
                ))
                await db.commit()

            # 2. Modüller
            res = await db.execute(select(DashboardModul))
            if not res.scalars().first():
                logger.info("Seeding dashboard modules...")
                modules = [
                    DashboardModul(kod="kpi_summary", ad="Genel İstatistikler", bilesen_adi="KPIOverview"),
                    DashboardModul(kod="queue_status", ad="Kuyruk Durumu",       bilesen_adi="QueueWidget"),
                    DashboardModul(kod="team_monitor", ad="Ekip İzleme",         bilesen_adi="TeamMonitor"),
                    DashboardModul(kod="active_calls", ad="Aktif Çağrılar",      bilesen_adi="ActiveCalls"),
                    DashboardModul(kod="recent_cdr",   ad="Son Aramalar",        bilesen_adi="RecentCalls"),
                ]
                db.add_all(modules)
                await db.commit()

                res_mods = await db.execute(select(DashboardModul))
                all_mods = res_mods.scalars().all()
                for i, mod in enumerate(all_mods):
                    db.add(RolModul(rol_id=1, modul_id=mod.id, sira=i))
                    if mod.kod in ["team_monitor", "queue_status", "kpi_summary"]:
                        db.add(RolModul(rol_id=2, modul_id=mod.id, sira=i))
                    if mod.kod in ["kpi_summary", "active_calls", "recent_cdr"]:
                        db.add(RolModul(rol_id=3, modul_id=mod.id, sira=i))
                await db.commit()

            # 3. Varsayılan Admin Kullanıcısı
            res = await db.execute(select(User).where(User.kullanici_adi == "admin"))
            if not res.scalars().first():
                logger.info("Creating default admin user...")
                # Hardcoded ID yerine DB'deki gerçek admin rol ID'sini al
                r = await db.execute(text("SELECT id FROM roller WHERE ad = 'admin' LIMIT 1"))
                admin_rol = r.scalar_one_or_none()
                if admin_rol is None:
                    logger.error("Admin rolü bulunamadı, kullanıcı oluşturulamadı")
                else:
                    pwd = hash_password("admin123")
                    await db.execute(text("""
                        INSERT INTO kullanicilar
                            (id, rol_id, ad_soyad, kullanici_adi, sifre_hash, dahili_no,
                             xp, seviye, unvan, anlik_durum, silindi_mi)
                        VALUES
                            (:id, :rol_id, 'Sistem Yöneticisi', 'admin', :pwd, '1000',
                             0, 1, 'Bronz', 'offline', false)
                    """), {"id": str(uuid.uuid4()), "rol_id": admin_rol, "pwd": pwd})
                    await db.commit()
                    logger.info("Default admin user created (admin / admin123)")

        except Exception as e:
            logger.error(f"Database seeding failed: {e}", exc_info=True)
            await db.rollback()
            raise
