PERMISSIONS = [
    "dashboard.view",

    "remote_access.view",
    "remote_access.connect",

    "sessions.view",
    "sessions.terminate",

    "servers.view",
    "servers.manage",

    "monitoring.view",

    "audit_logs.view",

    "users.view",
    "users.manage",

    "roles.view",
    "roles.manage",
]


SUPER_ADMIN_PERMISSIONS = set(
    PERMISSIONS
)


ADMINISTRATOR_PERMISSIONS = {
    "dashboard.view",

    "remote_access.view",
    "remote_access.connect",

    "sessions.view",

    "servers.view",

    "monitoring.view",
}
