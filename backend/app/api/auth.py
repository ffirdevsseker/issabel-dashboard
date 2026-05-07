from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import verify_password, create_access_token
from app.db.async_session import get_async_db
from app.db.health import check_db_connection
from app.models.role import Rol
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserMe

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_async_db)):
    await check_db_connection()

    # Roller tablosu boş olsa bile giriş yapılabilmesi için outerjoin kullanıyoruz
    stmt = (
        select(User, Rol.ad)
        .outerjoin(Rol, Rol.id == User.rol_id)
        .where(User.kullanici_adi == credentials.username)
    )

    try:
        result = await db.execute(stmt)
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Veritabani baglantisi gecici olarak kullanilamiyor",
        ) from exc

    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı",
        )

    user, db_role_name = row
    # DB'den gelen rol adı yoksa modeldeki ROLE_MAP'ten al
    role_name = db_role_name or user.role_name

    if not verify_password(credentials.password, user.sifre_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı",
        )

    if user.silindi_mi:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabınız pasif durumda",
        )

    token = create_access_token(
        user_id=str(user.id),
        username=user.kullanici_adi,
        role=role_name,
        extension=user.dahili_no,
    )
    return TokenResponse(access_token=token)


@router.get("/dashboard-layout")
async def get_dashboard_layout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Role dayalı dashboard bileşenlerini veritabanından çekerek döner."""
    from app.models.dashboard import DashboardModul, RolModul
    
    rol_id = current_user.rol_id
    
    stmt = (
        select(DashboardModul.kod, DashboardModul.ad, DashboardModul.bilesen_adi, RolModul.sira)
        .join(RolModul, RolModul.modul_id == DashboardModul.id)
        .where(RolModul.rol_id == rol_id)
        .order_by(RolModul.sira)
    )
    
    try:
        result = await db.execute(stmt)
        rows = result.all()
        
        modules = [
            {"id": r.kod, "name": r.ad, "component": r.bilesen_adi, "order": r.sira}
            for r in rows
        ]
        
        if not modules:
            # Fallback (Eğer veritabanında henüz ayar yoksa)
            modules = [
                {"id": "agent_stats", "name": "İstatistiklerim", "component": "KPIOverview", "order": 1},
                {"id": "active_calls", "name": "Aktif Çağrılar", "component": "ActiveCalls", "order": 2}
            ]
            
        return {
            "role": current_user.role_name,
            "modules": modules
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard layout: {e}")
        return {"role": current_user.role_name, "modules": []}


@router.get("/me", response_model=UserMe)
def read_me(current_user: User = Depends(get_current_user)):
    return UserMe(
        id=str(current_user.id),
        username=current_user.kullanici_adi,
        full_name=current_user.ad_soyad,
        extension=current_user.dahili_no,
        role=current_user.role_name,
        is_active=not current_user.silindi_mi,
    )
