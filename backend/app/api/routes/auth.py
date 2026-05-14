"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Register a new user account."""
    # Check if email already exists
    print(f"DEBUG PASSWORD LENGHT: {len(body.password)}")
    print(f"DEBUG PASSWORD VALUE: '{body.password}'")
    result = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": body.email})
    if result.fetchone():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Create user
    user_id_query = await db.execute(
        text(
            "INSERT INTO users (email, password_hash, full_name) "
            "VALUES (:email, :password_hash, :full_name) RETURNING id"
        ),
        {"email": body.email, "password_hash": hash_password(body.password), "full_name": body.full_name},
    )
    user_id = user_id_query.scalar_one()

    # Create roadmap defaults
    await _seed_default_roadmap(db, str(user_id))

    token = create_access_token({"sub": str(user_id)})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Login with email and password."""
    result = await db.execute(
        text("SELECT id, password_hash FROM users WHERE email = :email"),
        {"email": body.email},
    )
    row = result.fetchone()
    if not row or not verify_password(body.password, row[1]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token({"sub": str(row[0])})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(require_user), db: AsyncSession = Depends(get_db)) -> UserResponse:
    """Get current user profile."""
    result = await db.execute(
        text("SELECT id, email, full_name, role FROM users WHERE id = :id"),
        {"id": user_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(id=str(row[0]), email=row[1], full_name=row[2], role=row[3])


async def _seed_default_roadmap(db: AsyncSession, user_id: str) -> None:
    """Create default roadmap milestones for a new user."""
    defaults = [
        ("Tháng 1-2: Xác định ngành học & trường mục tiêu", "Tìm hiểu và chọn 3-5 trường đại học phù hợp", 2, "application"),
        ("Tháng 3: Ôn thi chuẩn hóa (IELTS/TOEFL/ĐGNL)", "Lên kế hoạch ôn luyện và đăng ký thi", 3, "exam_prep"),
        ("Tháng 4: Chuẩn bị hồ sơ học bạ", "Photo công chứng học bạ, bằng tốt nghiệp tạm thời", 4, "document"),
        ("Tháng 5: Đăng ký nguyện vọng (đợt 1)", "Hoàn thiện đăng ký nguyện vọng trên hệ thống của Bộ GD&ĐT", 5, "application"),
        ("Tháng 6: Thi THPT Quốc gia", "Ôn tập và tham gia kỳ thi THPT", 6, "exam_prep"),
        ("Tháng 7: Công bố điểm thi & điều chỉnh nguyện vọng", "Theo dõi điểm thi và điều chỉnh nguyện vọng nếu cần", 7, "application"),
        ("Tháng 8: Xác nhận nhập học", "Xác nhận nhập học trực tuyến và nộp giấy tờ", 8, "document"),
        ("Tháng 9: Nhập học & định hướng tân sinh viên", "Hoàn thiện thủ tục nhập học", 9, "other"),
    ]
    for idx, (title, desc, month, category) in enumerate(defaults):
        await db.execute(
            text(
                "INSERT INTO roadmap_tasks (user_id, title, description, due_month, category, sort_order) "
                "VALUES (:uid, :t, :d, :m, :c, :s)"
            ),
            {"uid": user_id, "t": title, "d": desc, "m": month, "c": category, "s": idx},
        )