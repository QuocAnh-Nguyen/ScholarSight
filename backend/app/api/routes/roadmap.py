"""Roadmap routes - Kanban to-do list CRUD."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_user
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    due_month: Optional[int] = None
    category: Optional[str] = None
    sort_order: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_month: Optional[int] = None
    category: Optional[str] = None
    sort_order: Optional[int] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    due_month: Optional[int]
    category: Optional[str]
    sort_order: Optional[int]
    created_at: Optional[str]


class ReorderItem(BaseModel):
    task_id: str
    sort_order: int


class SuggestRequest(BaseModel):
    grade: Optional[str] = None
    target_universities: Optional[list[str]] = None
    current_month: Optional[int] = None


@router.get("/tasks", response_model=list[TaskResponse])
async def list_tasks(
    month: Optional[int] = None,
    category: Optional[str] = None,
    task_status: Optional[str] = None,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[TaskResponse]:
    """List roadmap tasks with optional filters."""
    query = "SELECT id, title, description, status, due_month, category, sort_order, created_at FROM roadmap_tasks WHERE user_id = :uid"
    params: dict = {"uid": user_id}

    if month is not None:
        query += " AND due_month = :month"
        params["month"] = month
    if category:
        query += " AND category = :cat"
        params["cat"] = category
    if task_status:
        query += " AND status = :st"
        params["st"] = task_status

    query += " ORDER BY sort_order ASC, created_at ASC"

    result = await db.execute(text(query), params)
    rows = result.fetchall()
    return [
        TaskResponse(
            id=str(r[0]), title=r[1], description=r[2], status=r[3],
            due_month=r[4], category=r[5], sort_order=r[6],
            created_at=r[7].isoformat() if r[7] else None,
        )
        for r in rows
    ]


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    """Create a new roadmap task."""
    result = await db.execute(
        text(
            "INSERT INTO roadmap_tasks (user_id, title, description, status, due_month, category, sort_order) "
            "VALUES (:uid, :t, :d, :s, :m, :c, :so) "
            "RETURNING id, title, description, status, due_month, category, sort_order, created_at"
        ),
        {
            "uid": user_id, "t": body.title, "d": body.description,
            "s": body.status, "m": body.due_month, "c": body.category, "so": body.sort_order,
        },
    )
    r = result.fetchone()
    if not r:
        raise HTTPException(status_code=500, detail="Failed to create task")
    return TaskResponse(
        id=str(r[0]), title=r[1], description=r[2], status=r[3],
        due_month=r[4], category=r[5], sort_order=r[6],
        created_at=r[7].isoformat() if r[7] else None,
    )


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    body: TaskUpdate,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    """Update a roadmap task."""
    # Build dynamic update
    fields = []
    params: dict = {"tid": task_id, "uid": user_id}

    if body.title is not None:
        fields.append("title = :t")
        params["t"] = body.title
    if body.description is not None:
        fields.append("description = :d")
        params["d"] = body.description
    if body.status is not None:
        fields.append("status = :s")
        params["s"] = body.status
    if body.due_month is not None:
        fields.append("due_month = :m")
        params["m"] = body.due_month
    if body.category is not None:
        fields.append("category = :c")
        params["c"] = body.category
    if body.sort_order is not None:
        fields.append("sort_order = :so")
        params["so"] = body.sort_order

    if not fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    query = f"UPDATE roadmap_tasks SET {', '.join(fields)} WHERE id = :tid AND user_id = :uid RETURNING id, title, description, status, due_month, category, sort_order, created_at"
    result = await db.execute(text(query), params)
    r = result.fetchone()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return TaskResponse(
        id=str(r[0]), title=r[1], description=r[2], status=r[3],
        due_month=r[4], category=r[5], sort_order=r[6],
        created_at=r[7].isoformat() if r[7] else None,
    )


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a roadmap task."""
    result = await db.execute(
        text("DELETE FROM roadmap_tasks WHERE id = :tid AND user_id = :uid RETURNING id"),
        {"tid": task_id, "uid": user_id},
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")


@router.put("/reorder")
async def reorder_tasks(
    items: list[ReorderItem],
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Reorder roadmap tasks (drag-and-drop support)."""
    for item in items:
        await db.execute(
            text("UPDATE roadmap_tasks SET sort_order = :so WHERE id = :tid AND user_id = :uid"),
            {"so": item.sort_order, "tid": item.task_id, "uid": user_id},
        )
    return {"status": "ok", "updated": len(items)}


@router.post("/suggest")
async def suggest_tasks(
    body: SuggestRequest,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get AI-powered task suggestions based on user profile."""
    from app.services.roadmap.templates import generate_suggestions

    suggestions = await generate_suggestions(
        grade=body.grade,
        target_universities=body.target_universities,
        current_month=body.current_month,
    )
    return {"suggestions": suggestions}
