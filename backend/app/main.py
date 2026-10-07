from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import settings
from app.database import engine, Base

from app.api.auth import router as auth_router
from app.api.roles import router as roles_router
from app.api.users import router as users_router

from app.api.server_groups import router as server_groups_router
from app.api.servers import router as servers_router
from app.api.monitoring import router as monitoring_router
from app.api.server_permissions import router as server_permissions_router
from app.api.ssh import router as ssh_router
from app.api.ssh_ws import router as ssh_ws_router
from app.api.rdp_ws import router as rdp_ws_router
from app.api.sessions import router as sessions_router
from app.api.user_server_access import (
    router as user_server_access_router,
)
from app.api.session_commands import (
    router as session_commands_router,
)
from app.api.server_activity import (
    router as server_activity_router,
)
from app.api.audit_logs import (
    router as audit_logs_router,
)

import app.models

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.include_router(auth_router)
app.include_router(roles_router)
app.include_router(users_router)
app.include_router(user_server_access_router)
app.include_router(server_groups_router)
app.include_router(servers_router)
app.include_router(monitoring_router)
app.include_router(server_permissions_router)
app.include_router(ssh_router)
app.include_router(ssh_ws_router)
app.include_router(rdp_ws_router)
app.include_router(sessions_router)
app.include_router(session_commands_router)
app.include_router(server_activity_router)
app.include_router(audit_logs_router)

@app.get("/")
def root():
    return {
        "application": "AKSARA",
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/api/health")
def health():
    services = {
        "api": "healthy",
        "database": "unknown",
    }

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        services["database"] = "healthy"

    except Exception:
        services["database"] = "unhealthy"

    return {
        "status": (
            "healthy"
            if services["database"] == "healthy"
            else "degraded"
        ),
        "services": services,
    }
