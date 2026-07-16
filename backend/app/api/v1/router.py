from fastapi import APIRouter

from app.api.v1.routes import ai, auth, dashboard, operations, projects, status_reports

api_router = APIRouter()
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(operations.router, prefix="/operations", tags=["operations"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(status_reports.router, prefix="/status-reports", tags=["status-reports"])
