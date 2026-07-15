from fastapi import APIRouter

from app.api.v1.routes import dashboard, projects, status_reports

api_router = APIRouter()
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(status_reports.router, prefix="/status-reports", tags=["status-reports"])
