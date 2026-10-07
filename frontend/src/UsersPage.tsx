import {
  useEffect,
  useMemo,
  useState,
} from "react";


type Role = {
  id: number;
  name: string;
  description?: string | null;
};


type User = {
  id: number;
  username: string;
  email?: string | null;
  full_name?: string | null;
  role_id?: number | null;
  is_active: boolean;
  role?: Role | null;
};


type ServerAccess = {
  server_id: number;
  server_name: string;
  hostname?: string | null;
  ip_address: string;
  protocol: string;
  port: number;
  is_active: boolean;

  permission_id?: number | null;

  allow_ssh: boolean;
  allow_rdp: boolean;
  allow_vnc: boolean;
};


type UserPermissionResponse = {
  user_id: number;
  username: string;
  role?: string | null;
  servers: ServerAccess[];
};


type UserActivityLog = {
  id: number;
  user_id?: number | null;
  username?: string | null;
  full_name?: string | null;
  action: string;
  category: string;
  severity: string;
  resource_type?: string | null;
  resource_id?: number | null;
  source_ip?: string | null;
  detail?: string | null;
  created_at: string;
};


type UserActivityResponse = {
  items: UserActivityLog[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};


type UsersPageProps = {
  token: string;
  onUnauthorized: () => void;
};


type UserForm = {
  username: string;
  email: string;
  full_name: string;
  role_id: string;
  password: string;
};


export default function UsersPage({
  token,
  onUnauthorized,
}: UsersPageProps) {

  const [users, setUsers] =
    useState<User[]>([]);

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");


  const [
    activityUser,
    setActivityUser,
  ] = useState<User | null>(null);

  const [
    activityLogs,
    setActivityLogs,
  ] = useState<UserActivityLog[]>([]);

  const [
    loadingActivity,
    setLoadingActivity,
  ] = useState(false);

  const [
    loadingMoreActivity,
    setLoadingMoreActivity,
  ] = useState(false);

  const [
    activityPage,
    setActivityPage,
  ] = useState(1);

  const [
    activityTotal,
    setActivityTotal,
  ] = useState(0);

  const [
    activityFilter,
    setActivityFilter,
  ] = useState<
    | "ALL"
    | "AUTHENTICATION"
    | "REMOTE_ACCESS"
    | "CHANGE"
    | "SECURITY"
  >("ALL");


  const [
    selectedUser,
    setSelectedUser,
  ] = useState<User | null>(null);

  const [
    accessServers,
    setAccessServers,
  ] = useState<ServerAccess[]>([]);

  const [
    loadingAccess,
    setLoadingAccess,
  ] = useState(false);

  const [
    savingAccess,
    setSavingAccess,
  ] = useState(false);

  const [
    accessSearch,
    setAccessSearch,
  ] = useState("");

  const [
    accessFilter,
    setAccessFilter,
  ] = useState<
    "ALL" | "ASSIGNED" | "UNASSIGNED"
  >("ALL");


  const [
    showUserForm,
    setShowUserForm,
  ] = useState(false);

  const [
    editingUser,
    setEditingUser,
  ] = useState<User | null>(null);

  const [
    userForm,
    setUserForm,
  ] = useState<UserForm>({
    username: "",
    email: "",
    full_name: "",
    role_id: "",
    password: "",
  });

  const [
    savingUser,
    setSavingUser,
  ] = useState(false);


  const [
    passwordUser,
    setPasswordUser,
  ] = useState<User | null>(null);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    savingPassword,
    setSavingPassword,
  ] = useState(false);


  const [
    statusUser,
    setStatusUser,
  ] = useState<User | null>(null);

  const [
    savingStatus,
    setSavingStatus,
  ] = useState(false);


  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");


  /*
   * =====================================================
   * MODAL SCROLL LOCK
   * =====================================================
   */

  useEffect(() => {

    const modalOpen =
      showUserForm ||
      passwordUser !== null ||
      selectedUser !== null ||
      statusUser !== null ||
      activityUser !== null;

    if (!modalOpen) {
      return;
    }


    const previousBodyOverflow =
      document.body.style.overflow;

    const previousHtmlOverflow =
      document.documentElement.style.overflow;

    const previousBodyPaddingRight =
      document.body.style.paddingRight;


    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth;


    document.body.style.overflow =
      "hidden";

    document.documentElement.style.overflow =
      "hidden";


    if (scrollbarWidth > 0) {

      document.body.style.paddingRight =
        `${scrollbarWidth}px`;

    }


    return () => {

      document.body.style.overflow =
        previousBodyOverflow;

      document.documentElement.style.overflow =
        previousHtmlOverflow;

      document.body.style.paddingRight =
        previousBodyPaddingRight;

    };

  }, [
    showUserForm,
    passwordUser,
    selectedUser,
    statusUser,
    activityUser,
  ]);


  /*
   * =====================================================
   * API
   * =====================================================
   */

  const authFetch = async (
    url: string,
    options: RequestInit = {}
  ) => {

    const response =
      await fetch(
        url,
        {
          ...options,

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,

            ...(options.headers || {}),
          },
        }
      );


    if (
      response.status === 401
    ) {
      onUnauthorized();

      throw new Error(
        "Session expired"
      );
    }


    return response;
  };


  const loadUsers = async () => {

    try {

      const response =
        await authFetch(
          "/api/users/"
        );


      if (!response.ok) {

        const data =
          await response.json();

        throw new Error(
          data.detail ||
          "Failed to load users"
        );

      }


      const data =
        await response.json();


      setUsers(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load users"
      );

    }

  };


  const loadRoles = async () => {

    try {

      const response =
        await authFetch(
          "/api/roles/"
        );


      if (!response.ok) {

        const data =
          await response.json();

        throw new Error(
          data.detail ||
          "Failed to load roles"
        );

      }


      const data =
        await response.json();


      setRoles(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load roles"
      );

    }

  };


  const loadAll = async () => {

    setLoading(true);
    setError("");


    await Promise.all([
      loadUsers(),
      loadRoles(),
    ]);


    setLoading(false);
  };


  useEffect(() => {
    loadAll();
  }, [token]);


  /*
   * =====================================================
   * FILTER
   * =====================================================
   */

  const filteredUsers =
    useMemo(() => {

      const keyword =
        search
          .trim()
          .toLowerCase();


      return users.filter(
        user => {

          const roleName =
            user.role?.name ||
            "No Role";


          const matchSearch =
            !keyword ||
            [
              user.username,
              user.full_name,
              user.email,
              roleName,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(keyword);


          const matchRole =
            roleFilter === "ALL" ||
            String(
              user.role_id || ""
            ) === roleFilter;


          const matchStatus =
            statusFilter === "ALL" ||
            (
              statusFilter ===
                "ACTIVE" &&
              user.is_active
            ) ||
            (
              statusFilter ===
                "INACTIVE" &&
              !user.is_active
            );


          return (
            matchSearch &&
            matchRole &&
            matchStatus
          );

        }
      );

    }, [
      users,
      search,
      roleFilter,
      statusFilter,
    ]);


  /*
   * =====================================================
   * USER ACTION MENU BEHAVIOR
   * =====================================================
   */

  useEffect(() => {

    const closeMenus = (
      except?: HTMLDetailsElement | null
    ) => {

      document
        .querySelectorAll<HTMLDetailsElement>(
          '.admin-v2-more[open]'
        )
        .forEach(
          menu => {

            if (
              menu !== except
            ) {
              menu.removeAttribute(
                'open'
              )
            }

          }
        )

    }


    const handleAdminActionMenuClick =
      (
        event: MouseEvent
      ) => {

        const target =
          event.target

        if (
          !(target instanceof Element)
        ) {
          return
        }


        const currentMenu =
          target.closest(
            '.admin-v2-more'
          ) as
            HTMLDetailsElement |
            null


        /*
         * Clicking a menu trigger:
         * close every other menu.
         */

        if (
          target.closest(
            '.admin-v2-more summary'
          )
        ) {

          closeMenus(
            currentMenu
          )

          return
        }


        /*
         * Clicking an action:
         * immediately close the menu.
         */

        if (
          target.closest(
            '.admin-v2-more-menu button'
          )
        ) {

          closeMenus()

          return
        }


        /*
         * Clicking anywhere outside:
         * close all menus.
         */

        if (!currentMenu) {
          closeMenus()
        }

      }


    const handleAdminActionMenuKeyDown =
      (
        event: KeyboardEvent
      ) => {

        if (
          event.key === 'Escape'
        ) {
          closeMenus()
        }

      }


    const handleAdminActionMenuScroll =
      () => {

        closeMenus()

      }


    document.addEventListener(
      'click',
      handleAdminActionMenuClick
    )

    document.addEventListener(
      'keydown',
      handleAdminActionMenuKeyDown
    )

    window.addEventListener(
      'scroll',
      handleAdminActionMenuScroll,
      true
    )


    return () => {

      document.removeEventListener(
        'click',
        handleAdminActionMenuClick
      )

      document.removeEventListener(
        'keydown',
        handleAdminActionMenuKeyDown
      )

      window.removeEventListener(
        'scroll',
        handleAdminActionMenuScroll,
        true
      )

    }

  }, [])


  /*
   * =====================================================
   * HELPERS
   * =====================================================
   */

  const getInitials = (
    user: User
  ) => {

    const name =
      user.full_name?.trim() ||
      user.username;


    const parts =
      name
        .split(/\s+/)
        .filter(Boolean);


    if (
      parts.length >= 2
    ) {
      return (
        parts[0][0] +
        parts[1][0]
      ).toUpperCase();
    }


    return name
      .slice(0, 1)
      .toUpperCase();
  };


  const isSuperAdmin = (
    user: User
  ) => (
    user.role?.name ===
    "Super Admin"
  );


  /*
   * =====================================================
   * ADD / EDIT USER
   * =====================================================
   */

  const openAddUser = () => {

    setEditingUser(null);

    setUserForm({
      username: "",
      email: "",
      full_name: "",

      role_id:
        roles.length > 0
          ? String(
              roles[0].id
            )
          : "",

      password: "",
    });

    setMessage("");
    setError("");

    setShowUserForm(true);
  };


  const openEditUser = (
    user: User
  ) => {

    setEditingUser(user);

    setUserForm({
      username:
        user.username,

      email:
        user.email || "",

      full_name:
        user.full_name || "",

      role_id:
        user.role_id
          ? String(
              user.role_id
            )
          : "",

      password: "",
    });

    setMessage("");
    setError("");

    setShowUserForm(true);
  };


  const closeUserForm = () => {

    if (savingUser) {
      return;
    }

    setShowUserForm(false);
    setEditingUser(null);

    setUserForm({
      username: "",
      email: "",
      full_name: "",
      role_id: "",
      password: "",
    });

  };


  const forceCloseUserForm =
    () => {

      setShowUserForm(false);
      setEditingUser(null);

      setUserForm({
        username: "",
        email: "",
        full_name: "",
        role_id: "",
        password: "",
      });

    };


  const saveUser = async () => {

    setSavingUser(true);
    setError("");
    setMessage("");


    try {

      if (
        !userForm.username.trim()
      ) {
        throw new Error(
          "Username is required"
        );
      }


      if (
        !userForm.role_id
      ) {
        throw new Error(
          "Role is required"
        );
      }


      if (
        !editingUser &&
        userForm.password.length < 8
      ) {
        throw new Error(
          "Password must contain at least 8 characters"
        );
      }


      const payload:
        Record<string, unknown> = {

        username:
          userForm.username
            .trim(),

        email:
          userForm.email.trim()
            ? userForm.email.trim()
            : null,

        full_name:
          userForm.full_name
            .trim()
            ? userForm.full_name
                .trim()
            : null,

        role_id:
          Number(
            userForm.role_id
          ),
      };


      if (!editingUser) {
        payload.password =
          userForm.password;
      }


      const response =
        await authFetch(
          editingUser
            ? `/api/users/${editingUser.id}`
            : "/api/users/",
          {
            method:
              editingUser
                ? "PUT"
                : "POST",

            body:
              JSON.stringify(
                payload
              ),
          }
        );


      if (!response.ok) {

        const data =
          await response.json();

        throw new Error(
          data.detail ||
          "Failed to save user"
        );

      }


      await loadUsers();


      setMessage(
        editingUser
          ? "User updated successfully."
          : "User created successfully."
      );


      forceCloseUserForm();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save user"
      );

    } finally {

      setSavingUser(false);

    }

  };


  /*
   * =====================================================
   * USER STATUS
   * =====================================================
   */

  const openStatusConfirmation =
    (
      user: User
    ) => {

      if (
        isSuperAdmin(
          user
        )
      ) {
        return;
      }

      setStatusUser(
        user
      );

      setError("");
      setMessage("");

    };


  const closeStatusConfirmation =
    () => {

      if (savingStatus) {
        return;
      }

      setStatusUser(null);

    };


  const confirmUserStatus =
    async () => {

      if (!statusUser) {
        return;
      }

      setSavingStatus(true);

      setError("");
      setMessage("");


      try {

        let response:
          Response;


        if (
          statusUser.is_active
        ) {

          response =
            await authFetch(
              `/api/users/${statusUser.id}`,
              {
                method:
                  "DELETE",
              }
            );

        } else {

          response =
            await authFetch(
              `/api/users/${statusUser.id}`,
              {
                method:
                  "PUT",

                body:
                  JSON.stringify({
                    is_active:
                      true,
                  }),
              }
            );

        }


        if (!response.ok) {

          const data =
            await response.json();

          throw new Error(
            data.detail ||
            "Failed to update user status"
          );

        }


        const wasActive =
          statusUser.is_active;


        await loadUsers();


        setMessage(
          wasActive
            ? "User deactivated successfully."
            : "User activated successfully."
        );


        setStatusUser(null);

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Failed to update user status"
        );

      } finally {

        setSavingStatus(false);

      }

    };


  /*
   * =====================================================
   * PASSWORD
   * =====================================================
   */

  const openPasswordReset = (
    user: User
  ) => {

    setPasswordUser(user);

    setNewPassword("");

    setError("");
    setMessage("");

  };


  const closePasswordReset =
    () => {

      if (
        savingPassword
      ) {
        return;
      }

      setPasswordUser(null);
      setNewPassword("");

    };


  const forceClosePasswordReset =
    () => {

      setPasswordUser(null);
      setNewPassword("");

    };


  const savePassword =
    async () => {

      if (!passwordUser) {
        return;
      }


      if (
        newPassword.length < 8
      ) {

        setError(
          "Password must contain at least 8 characters"
        );

        return;
      }


      setSavingPassword(true);

      setError("");
      setMessage("");


      try {

        const response =
          await authFetch(
            `/api/users/${passwordUser.id}/password`,
            {
              method:
                "PUT",

              body:
                JSON.stringify({
                  password:
                    newPassword,
                }),
            }
          );


        if (!response.ok) {

          const data =
            await response.json();

          throw new Error(
            data.detail ||
            "Failed to reset password"
          );

        }


        setMessage(
          "Password updated successfully."
        );


        forceClosePasswordReset();

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Failed to reset password"
        );

      } finally {

        setSavingPassword(false);

      }

    };


  /*
   * =====================================================
   * USER ACTIVITY
   * =====================================================
   */

  const openUserActivity =
    async (
      user: User
    ) => {

      setActivityUser(user);
      setActivityLogs([]);
      setActivityFilter("ALL");
      setActivityPage(1);
      setActivityTotal(0);
      setLoadingActivity(true);

      setError("");
      setMessage("");


      try {

        const params =
          new URLSearchParams({
            range: "30D",
            search: "",
            category: "ALL",
            action: "ALL",
            user_id:
              String(user.id),
            page: "1",
            page_size: "25",
          });


        const response =
          await authFetch(
            `/api/audit-logs/?${params.toString()}`
          );


        if (!response.ok) {

          const data =
            await response.json();

          throw new Error(
            data.detail ||
            "Failed to load user activity"
          );

        }


        const data:
          UserActivityResponse =
          await response.json();


        const items =
          Array.isArray(data.items)
            ? data.items
            : [];

        setActivityLogs(
          items
        );

        setActivityTotal(
          typeof data.total === "number"
            ? data.total
            : items.length
        );

        setActivityPage(1);

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user activity"
        );

      } finally {

        setLoadingActivity(false);

      }

    };


  const closeUserActivity =
    () => {

      setActivityUser(null);
      setActivityLogs([]);
      setActivityFilter("ALL");
      setActivityPage(1);
      setActivityTotal(0);
      setLoadingMoreActivity(false);

    };


  const filteredActivityLogs =
    useMemo(
      () => {

        if (
          activityFilter === "ALL"
        ) {
          return activityLogs;
        }

        return activityLogs.filter(
          item =>
            item.category ===
            activityFilter
        );

      },
      [
        activityLogs,
        activityFilter,
      ]
    );


  const loadMoreUserActivity =
    async () => {

      if (
        !activityUser ||
        loadingMoreActivity ||
        activityLogs.length >=
          activityTotal
      ) {
        return;
      }

      const nextPage =
        activityPage + 1;

      setLoadingMoreActivity(true);

      try {

        const params =
          new URLSearchParams({
            range: "30D",
            search: "",
            category: "ALL",
            action: "ALL",
            user_id:
              String(activityUser.id),
            page:
              String(nextPage),
            page_size: "25",
          });

        const response =
          await authFetch(
            `/api/audit-logs/?${params.toString()}`
          );

        if (!response.ok) {

          const data =
            await response.json();

          throw new Error(
            data.detail ||
            "Failed to load more activity"
          );
        }

        const data:
          UserActivityResponse =
          await response.json();

        const newItems =
          Array.isArray(data.items)
            ? data.items
            : [];

        setActivityLogs(
          current => {

            const existingIds =
              new Set(
                current.map(
                  item => item.id
                )
              );

            const uniqueItems =
              newItems.filter(
                item =>
                  !existingIds.has(
                    item.id
                  )
              );

            return [
              ...current,
              ...uniqueItems,
            ];
          }
        );

        setActivityTotal(
          typeof data.total === "number"
            ? data.total
            : activityTotal
        );

        setActivityPage(
          nextPage
        );

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load more activity"
        );

      } finally {

        setLoadingMoreActivity(false);
      }

    };


  const formatActivityTime =
    (
      value: string
    ) => {

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "-";
      }

      return new Intl.DateTimeFormat(
        "id-ID",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone:
            "Asia/Jakarta",
        }
      ).format(date);

    };


  const getActivityLabel = (
    action: string
  ) => {

    const labels:
      Record<string, string> = {

      LOGIN_SUCCESS:
        "Signed in successfully",

      LOGOUT:
        "Signed out",

      LOGIN_FAILED:
        "Sign-in failed",

      LOGIN_BLOCKED:
        "Sign-in blocked",

      PASSWORD_RESET:
        "Password reset",

      USER_CREATED:
        "User created",

      USER_UPDATED:
        "User updated",

      USER_ACTIVATED:
        "Account activated",

      USER_DEACTIVATED:
        "Account deactivated",

      SERVER_ACCESS_UPDATED:
        "Server access updated",

      SSH_SESSION_STARTED:
        "SSH session started",

      SSH_SESSION_ENDED:
        "SSH session ended",

      SSH_AUTH_FAILED:
        "SSH authentication failed",

      SSH_CONNECTION_FAILED:
        "SSH connection failed",

      SSH_ACCESS_DENIED:
        "SSH access denied",

      RDP_SESSION_STARTED:
        "RDP session started",

      RDP_SESSION_ENDED:
        "RDP session ended",

      RDP_SESSION_TERMINATED:
        "RDP session terminated",

      RDP_ACCESS_DENIED:
        "RDP access denied",
    };

    return (
      labels[action] ||
      action
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(
          /^./,
          value =>
            value.toUpperCase()
        )
    );
  };


  const getActivityCategoryLabel = (
    category: string
  ) => {

    const labels:
      Record<string, string> = {

      AUTHENTICATION:
        "Authentication",

      REMOTE_ACCESS:
        "Remote Access",

      CHANGE:
        "Account / Access Change",

      SECURITY:
        "Security",

      SYSTEM:
        "System",
    };

    return (
      labels[category] ||
      category.replaceAll(
        "_",
        " "
      )
    );
  };


  const getActivityActor = (
    item: UserActivityLog
  ) => {

    if (
      activityUser &&
      item.user_id ===
        activityUser.id
    ) {
      return (
        `Performed by @${activityUser.username}`
      );
    }

    if (item.username) {
      return (
        `Changed by @${item.username}`
      );
    }

    return "System activity";
  };


  const splitServerAccessItems = (
    value: string
  ) => {

    const items: string[] = [];
    let current = "";
    let bracketDepth = 0;

    for (const char of value) {

      if (char === "[") {
        bracketDepth += 1;
      }

      if (char === "]") {
        bracketDepth = Math.max(
          0,
          bracketDepth - 1
        );
      }

      if (
        char === "," &&
        bracketDepth === 0
      ) {

        if (current.trim()) {
          items.push(
            current.trim()
          );
        }

        current = "";
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      items.push(
        current.trim()
      );
    }

    return items;
  };


  const parseServerAccessChanges = (
    detail?: string | null
  ) => {

    const result = {
      granted: [] as string[],
      revoked: [] as string[],
      changed: [] as string[],
    };

    if (!detail) {
      return result;
    }

    const sections = [
      "granted",
      "revoked",
      "changed",
    ] as const;

    for (const section of sections) {

      const match = detail.match(
        new RegExp(
          `${section}=([^;]+)`,
          "i"
        )
      );

      if (
        match &&
        match[1] &&
        match[1].trim()
      ) {
        result[section] =
          splitServerAccessItems(
            match[1].trim()
          );
      }
    }

    return result;
  };


  /*
   * =====================================================
   * SERVER ACCESS
   * =====================================================
   */

  const openAccessModal =
    async (
      user: User
    ) => {

      setSelectedUser(user);
      setAccessSearch("");
      setAccessFilter("ALL");
      setLoadingAccess(true);

      setMessage("");
      setError("");


      try {

        const response =
          await authFetch(
            `/api/server-permissions/user/${user.id}`
          );


        if (!response.ok) {

          const data =
            await response.json();

          throw new Error(
            data.detail ||
            "Failed to load server permissions"
          );

        }


        const data:
          UserPermissionResponse =
          await response.json();


        setAccessServers(
          data.servers ||
          []
        );

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load permissions"
        );

      } finally {

        setLoadingAccess(false);

      }

    };


  const closeAccessModal =
    () => {

      if (
        savingAccess
      ) {
        return;
      }

      setSelectedUser(null);
      setAccessServers([]);
      setAccessSearch("");
      setAccessFilter("ALL");

      setMessage("");
      setError("");

    };


  const hasServerAccess = (
    server: ServerAccess
  ) => {

    const protocol =
      (
        server.protocol ||
        ""
      ).toUpperCase();


    if (
      protocol === "SSH"
    ) {
      return server.allow_ssh;
    }


    if (
      protocol === "RDP"
    ) {
      return server.allow_rdp;
    }


    if (
      protocol === "VNC"
    ) {
      return server.allow_vnc;
    }


    return false;
  };


  const toggleServerAccess = (
    serverId: number
  ) => {

    setAccessServers(
      current =>
        current.map(
          server => {

            if (
              server.server_id !==
              serverId
            ) {
              return server;
            }


            if (
              !server.is_active
            ) {
              return server;
            }


            const protocol =
              (
                server.protocol ||
                ""
              ).toUpperCase();


            const currentlyAllowed =
              hasServerAccess(
                server
              );


            if (
              protocol === "SSH"
            ) {
              return {
                ...server,

                allow_ssh:
                  !currentlyAllowed,
              };
            }


            if (
              protocol === "RDP"
            ) {
              return {
                ...server,

                allow_rdp:
                  !currentlyAllowed,
              };
            }


            if (
              protocol === "VNC"
            ) {
              return {
                ...server,

                allow_vnc:
                  !currentlyAllowed,
              };
            }


            return server;

          }
        )
    );

  };


  const filteredAccessServers =
    accessServers.filter(
      server => {

        const query =
          accessSearch
            .trim()
            .toLowerCase();

        const matchesSearch =
          !query ||
          server.server_name
            .toLowerCase()
            .includes(query) ||
          (
            server.hostname ||
            ""
          )
            .toLowerCase()
            .includes(query) ||
          server.ip_address
            .toLowerCase()
            .includes(query) ||
          (
            server.protocol ||
            ""
          )
            .toLowerCase()
            .includes(query);

        const assigned =
          hasServerAccess(
            server
          );

        const matchesFilter =
          accessFilter === "ALL" ||
          (
            accessFilter ===
              "ASSIGNED" &&
            assigned
          ) ||
          (
            accessFilter ===
              "UNASSIGNED" &&
            !assigned
          );

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );

  const accessSelectedCount =
    accessServers.filter(
      server =>
        server.is_active &&
        hasServerAccess(
          server
        )
    ).length;

  const accessActiveCount =
    accessServers.filter(
      server =>
        server.is_active
    ).length;

  const setServerAccessState = (
    server: ServerAccess,
    allowed: boolean
  ): ServerAccess => {

    const protocol =
      (
        server.protocol ||
        ""
      ).toUpperCase();

    if (
      protocol === "SSH"
    ) {
      return {
        ...server,
        allow_ssh:
          allowed,
      };
    }

    if (
      protocol === "RDP"
    ) {
      return {
        ...server,
        allow_rdp:
          allowed,
      };
    }

    if (
      protocol === "VNC"
    ) {
      return {
        ...server,
        allow_vnc:
          allowed,
      };
    }

    return server;
  };

  const selectVisibleServers =
    () => {

      const visibleIds =
        new Set(
          filteredAccessServers
            .filter(
              server =>
                server.is_active
            )
            .map(
              server =>
                server.server_id
            )
        );

      setAccessServers(
        current =>
          current.map(
            server => {

              if (
                !visibleIds.has(
                  server.server_id
                )
              ) {
                return server;
              }

              return (
                setServerAccessState(
                  server,
                  true
                )
              );
            }
          )
      );
    };

  const clearServerSelection =
    () => {

      setAccessServers(
        current =>
          current.map(
            server =>
              server.is_active
                ? setServerAccessState(
                    server,
                    false
                  )
                : server
          )
      );
    };


  const saveAccess =
    async () => {

      if (!selectedUser) {
        return;
      }


      setSavingAccess(true);

      setMessage("");
      setError("");


      const payload =
        accessServers.map(
          server => ({
            user_id:
              selectedUser.id,

            server_id:
              server.server_id,

            allow_ssh:
              server.allow_ssh,

            allow_rdp:
              server.allow_rdp,

            allow_vnc:
              server.allow_vnc,
          })
        );


      try {

        const response =
          await authFetch(
            `/api/server-permissions/user/${selectedUser.id}`,
            {
              method:
                "PUT",

              body:
                JSON.stringify(
                  payload
                ),
            }
          );


        if (!response.ok) {

          const data =
            await response.json();

          throw new Error(
            data.detail ||
            "Failed to save permissions"
          );

        }


        setMessage(
          "Server access saved successfully."
        );


        setSelectedUser(null);
        setAccessServers([]);

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Failed to save permissions"
        );

      } finally {

        setSavingAccess(false);

      }

    };


  /*
   * =====================================================
   * SUMMARY
   * =====================================================
   */

  const activeUsers =
    users.filter(
      user =>
        user.is_active
    ).length;


  const superAdminUsers =
    users.filter(
      user =>
        isSuperAdmin(
          user
        )
    ).length;


  const restrictedUsers =
    users.filter(
      user =>
        !isSuperAdmin(
          user
        )
    ).length;


  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="admin-v2-page">

      <header className="admin-v2-header">

        <div>

          <div className="admin-v2-eyebrow">
            Administration
          </div>


          <h1>
            User & Access Management
          </h1>


          <p>
            Manage AKSARA accounts,
            roles and infrastructure
            access permissions.
          </p>

        </div>


        <button
          className="admin-v2-add-button"

          type="button"

          onClick={
            openAddUser
          }
        >
          <span>
            +
          </span>

          Add User
        </button>

      </header>


      {/*
       * =================================================
       * SUMMARY
       * =================================================
       */}

      <section className="admin-v2-summary">

        <div>

          <span>
            Total Users
          </span>

          <strong>
            {users.length}
          </strong>

          <small>
            AKSARA accounts
          </small>

        </div>


        <div>

          <span>
            Active
          </span>

          <strong className="positive">
            {activeUsers}
          </strong>

          <small>
            Enabled accounts
          </small>

        </div>


        <div>

          <span>
            Super Admin
          </span>

          <strong>
            {superAdminUsers}
          </strong>

          <small>
            Full platform access
          </small>

        </div>


        <div>

          <span>
            Restricted
          </span>

          <strong>
            {restrictedUsers}
          </strong>

          <small>
            Scoped server access
          </small>

        </div>

      </section>


      {message && (

        <div className="users-success admin-v2-message">
          {message}
        </div>

      )}


      {error && (

        <div className="users-error admin-v2-message">
          {error}
        </div>

      )}


      {/*
       * =================================================
       * USER DIRECTORY
       * =================================================
       */}

      <section className="admin-v2-panel">

        <div className="admin-v2-panel-heading">

          <div>

            <h2>
              User Directory
            </h2>

            <p>
              Accounts authorized to use
              the AKSARA platform.
            </p>

          </div>


          <span>
            {filteredUsers.length}
            {' '}
            {filteredUsers.length === 1
              ? "user"
              : "users"}
          </span>

        </div>


        <div className="admin-v2-toolbar">

          <div className="admin-v2-search">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />

              <path
                d="m20 20-3.5-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>


            <input
              value={
                search
              }

              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }

              placeholder="Search name, username, email..."
            />

          </div>


          <div className="admin-v2-filters">

            <select
              value={
                roleFilter
              }

              onChange={
                event =>
                  setRoleFilter(
                    event.target.value
                  )
              }
            >
              <option value="ALL">
                All Roles
              </option>

              {roles.map(
                role => (

                  <option
                    key={
                      role.id
                    }

                    value={
                      role.id
                    }
                  >
                    {role.name}
                  </option>

                )
              )}
            </select>


            <select
              value={
                statusFilter
              }

              onChange={
                event =>
                  setStatusFilter(
                    event.target.value
                  )
              }
            >
              <option value="ALL">
                All Status
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>
            </select>

          </div>

        </div>


        {loading ? (

          <div className="admin-v2-empty">
            Loading users...
          </div>

        ) : filteredUsers.length ===
        0 ? (

          <div className="admin-v2-empty">

            <strong>
              No users found
            </strong>

            <span>
              Try adjusting your
              search or filters.
            </span>

          </div>

        ) : (

          <div className="admin-v2-table">

            <div className="admin-v2-table-head">

              <span>
                User
              </span>

              <span>
                Role
              </span>

              <span>
                Status
              </span>

              <span>
                Server Access
              </span>

              <span>
                Action
              </span>

            </div>


            {filteredUsers.map(
              (
                user,
                index
              ) => {

                const superAdmin =
                  isSuperAdmin(
                    user
                  );

                const openMenuUp =
                  index >=
                  filteredUsers.length - 2;


                return (

                  <div
                    className="admin-v2-row"

                    key={
                      user.id
                    }
                  >

                    <div className="admin-v2-identity">

                      <div className="admin-v2-avatar">
                        {getInitials(
                          user
                        )}
                      </div>


                      <div>

                        <strong>
                          {user.full_name ||
                            user.username}
                        </strong>


                        <span>
                          {user.username}
                        </span>


                        {user.email && (

                          <small>
                            {user.email}
                          </small>

                        )}

                      </div>

                    </div>


                    <div>

                      <span
                        className={
                          superAdmin
                            ? "admin-v2-role super"
                            : "admin-v2-role"
                        }
                      >
                        {user.role?.name ||
                          "No Role"}
                      </span>

                    </div>


                    <div>

                      <span
                        className={
                          `admin-v2-status ${
                            user.is_active
                              ? "active"
                              : "inactive"
                          }`
                        }
                      >
                        <i />

                        {user.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>

                    </div>


                    <div>

                      <span
                        className={
                          superAdmin
                            ? "admin-v2-access full"
                            : "admin-v2-access restricted"
                        }
                      >
                        {superAdmin
                          ? "Full Access"
                          : "Restricted"}
                      </span>

                    </div>


                    <div className="admin-v2-actions">

                      


                      <details
                          className={
                            openMenuUp
                              ? "admin-v2-more admin-v2-more-up"
                              : "admin-v2-more"
                          }
                          name="admin-user-actions"
                        >

                        <summary>
                          •••
                        </summary>


                        <div className="admin-v2-more-menu">

                          <button
                            type="button"

                            onClick={() =>
                              openEditUser(
                                user
                              )
                            }
                          >
                            Edit User
                          </button>


                          <button
                            type="button"

                            onClick={() =>
                              openPasswordReset(
                                user
                              )
                            }
                          >
                            Reset Password
                          </button>

                            {!superAdmin && (

                              <button
                                type="button"

                                onClick={() => {
                                  openAccessModal(
                                    user
                                  )
                                }}
                              >
                                Manage Access
                              </button>

                            )}

                            <button
                              type="button"

                              onClick={() =>
                                openUserActivity(
                                  user
                                )
                              }
                            >
                              View Activity
                            </button>


                          {!superAdmin && (

                            <>

                            <div
                              className="admin-v2-menu-divider"
                            />


                            <button
                              type="button"

                              className={
                                user.is_active
                                  ? "danger"
                                  : "positive"
                              }

                              onClick={() =>
                                openStatusConfirmation(
                                  user
                                )
                              }
                            >
                              {user.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>

                          

                            </>

                          )}

                        </div>

                      </details>

                    </div>

                  </div>

                );

              }
            )}

          </div>

        )}

      </section>


      {statusUser && (

        <div className="admin-status-overlay">

          <div className="admin-status-modal">

            <div className="admin-status-icon">
              {statusUser.is_active
                ? "!"
                : "✓"}
            </div>


            <div className="admin-status-content">

              <h2>
                {statusUser.is_active
                  ? "Deactivate User?"
                  : "Activate User?"}
              </h2>


              <p>
                {statusUser.is_active
                  ? "This user will no longer be able to sign in to AKSARA."
                  : "This user will be allowed to sign in to AKSARA again."}
              </p>


              <div className="admin-status-user">

                <strong>
                  {statusUser.full_name ||
                    statusUser.username}
                </strong>

                <span>
                  @{statusUser.username}
                </span>

              </div>

            </div>


            <div className="admin-status-actions">

              <button
                type="button"
                className="access-cancel-button"
                onClick={
                  closeStatusConfirmation
                }
                disabled={
                  savingStatus
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className={
                  statusUser.is_active
                    ? "admin-status-confirm danger"
                    : "admin-status-confirm positive"
                }
                onClick={
                  confirmUserStatus
                }
                disabled={
                  savingStatus
                }
              >
                {savingStatus
                  ? "Processing..."
                  : statusUser.is_active
                    ? "Deactivate User"
                    : "Activate User"}
              </button>

            </div>

          </div>

        </div>

      )}


      {activityUser && (

        <div className="user-activity-overlay">

          <div className="user-activity-modal">

            <div className="user-activity-header">

              <div>

                <div className="user-activity-eyebrow">
                  User Activity
                </div>

                <h2>
                  {activityUser.full_name ||
                    activityUser.username}
                </h2>

                <p>
                  @{activityUser.username}
                  {" · "}
                  Last 30 days
                </p>

              </div>


              <button
                type="button"
                className="user-access-close"
                onClick={
                  closeUserActivity
                }
              >
                ×
              </button>

            </div>


            <div className="user-activity-summary">

              <div>
                <span>
                  Events
                </span>

                <strong>
                  {activityLogs.length}
                </strong>
              </div>

              <div>
                <span>
                  Remote Access
                </span>

                <strong>
                  {
                    activityLogs.filter(
                      item =>
                        item.category ===
                        "REMOTE_ACCESS"
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span>
                  Security
                </span>

                <strong>
                  {
                    activityLogs.filter(
                      item =>
                        item.category ===
                        "SECURITY"
                    ).length
                  }
                </strong>
              </div>

            </div>


            <div className="user-activity-filterbar">

              {[
                {
                  key: "ALL",
                  label: "All",
                },
                {
                  key: "AUTHENTICATION",
                  label: "Authentication",
                },
                {
                  key: "REMOTE_ACCESS",
                  label: "Remote Access",
                },
                {
                  key: "CHANGE",
                  label: "Account Changes",
                },
                {
                  key: "SECURITY",
                  label: "Security",
                },
              ].map(
                filter => (

                  <button
                    type="button"
                    key={filter.key}

                    className={
                      `user-activity-filter ${
                        activityFilter ===
                        filter.key
                          ? "active"
                          : ""
                      }`
                    }

                    onClick={() =>
                      setActivityFilter(
                        filter.key as
                          | "ALL"
                          | "AUTHENTICATION"
                          | "REMOTE_ACCESS"
                          | "CHANGE"
                          | "SECURITY"
                      )
                    }
                  >
                    {filter.label}
                  </button>

                )
              )}

            </div>


            <div className="user-activity-list">

              {loadingActivity ? (

                <div className="user-activity-empty">
                  Loading activity...
                </div>

              ) : activityLogs.length ===
                0 ? (

                <div className="user-activity-empty">

                  <strong>
                    No activity found
                  </strong>

                  <span>
                    No audit events were recorded
                    for this user in the last
                    30 days.
                  </span>

                </div>

              ) : filteredActivityLogs.length ===
                0 ? (

                <div className="user-activity-empty">

                  <strong>
                    No matching activity
                  </strong>

                  <span>
                    No events match the selected
                    activity filter.
                  </span>

                </div>

              ) : (

                filteredActivityLogs.map(
                  item => (

                    <div
                      className="user-activity-item"
                      key={
                        item.id
                      }
                    >

                      <div
                        className={
                          `user-activity-severity ${
                            item.severity
                              .toLowerCase()
                          }`
                        }
                      />

                      <div className="user-activity-main">

                        <div className="user-activity-title">

                          <strong>
                            {getActivityLabel(
                              item.action
                            )}
                          </strong>

                          <span
                            className={
                              `user-activity-badge ${
                                item.severity
                                  .toLowerCase()
                              }`
                            }
                          >
                            {item.severity}
                          </span>

                        </div>


                        <div className="user-activity-meta">

                          <span>
                            {getActivityCategoryLabel(
                              item.category
                            )}
                          </span>

                          <i>•</i>

                          <span
                            className="user-activity-actor"
                          >
                            {getActivityActor(
                              item
                            )}
                          </span>

                          {item.source_ip && (
                            <>
                              <i>•</i>

                              <span
                                className="user-activity-ip"
                              >
                                {item.source_ip}
                              </span>
                            </>
                          )}

                          {item.resource_id && (
                            <>
                              <i>•</i>

                              <span>
                                {item.resource_type ||
                                  "resource"}
                                {" #"}
                                {item.resource_id}
                              </span>
                            </>
                          )}

                        </div>


                        {item.detail && (

                          item.action ===
                          "SERVER_ACCESS_UPDATED"
                            ? (() => {

                                const changes =
                                  parseServerAccessChanges(
                                    item.detail
                                  );

                                const hasChanges =
                                  changes.granted.length > 0 ||
                                  changes.revoked.length > 0 ||
                                  changes.changed.length > 0;

                                if (!hasChanges) {
                                  return (
                                    <p>
                                      {item.detail}
                                    </p>
                                  );
                                }

                                return (
                                  <div className="user-access-change-card">

                                    {changes.granted.length > 0 && (

                                      <div className="user-access-change-group granted">

                                        <span className="user-access-change-label">
                                          Granted
                                        </span>

                                        <div className="user-access-change-items">

                                          {changes.granted.map(
                                            value => (
                                              <span
                                                key={`granted-${value}`}
                                                className="user-access-change-chip granted"
                                              >
                                                {value}
                                              </span>
                                            )
                                          )}

                                        </div>

                                      </div>

                                    )}


                                    {changes.revoked.length > 0 && (

                                      <div className="user-access-change-group revoked">

                                        <span className="user-access-change-label">
                                          Revoked
                                        </span>

                                        <div className="user-access-change-items">

                                          {changes.revoked.map(
                                            value => (
                                              <span
                                                key={`revoked-${value}`}
                                                className="user-access-change-chip revoked"
                                              >
                                                {value}
                                              </span>
                                            )
                                          )}

                                        </div>

                                      </div>

                                    )}


                                    {changes.changed.length > 0 && (

                                      <div className="user-access-change-group changed">

                                        <span className="user-access-change-label">
                                          Changed
                                        </span>

                                        <div className="user-access-change-items">

                                          {changes.changed.map(
                                            value => (
                                              <span
                                                key={`changed-${value}`}
                                                className="user-access-change-chip changed"
                                              >
                                                {value}
                                              </span>
                                            )
                                          )}

                                        </div>

                                      </div>

                                    )}

                                  </div>
                                );

                              })()

                            : (
                              <p>
                                {item.detail}
                              </p>
                            )

                        )}

                      </div>


                      <time>
                        {formatActivityTime(
                          item.created_at
                        )}
                      </time>

                    </div>

                  )
                )

              )}

            </div>


            {activityLogs.length <
              activityTotal && (

              <div className="user-activity-loadmore">

                <button
                  type="button"
                  onClick={
                    loadMoreUserActivity
                  }
                  disabled={
                    loadingMoreActivity
                  }
                >
                  {loadingMoreActivity
                    ? "Loading..."
                    : "Load More"}
                </button>

                <span>
                  {activityLogs.length}
                  {" of "}
                  {activityTotal}
                  {" events loaded"}
                </span>

              </div>

            )}


            <div className="user-activity-footer">

              <span>
                {activityFilter === "ALL"
                  ? (
                    <>
                      Showing
                      {" "}
                      {activityLogs.length}
                      {" of "}
                      {activityTotal}
                      {" events"}
                    </>
                  )
                  : (
                    <>
                      Showing
                      {" "}
                      {filteredActivityLogs.length}
                      {" matching events from "}
                      {activityLogs.length}
                      {" loaded"}
                    </>
                  )}
              </span>

              <button
                type="button"
                className="access-cancel-button"
                onClick={
                  closeUserActivity
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}


      {/*
       * =================================================
       * ADD / EDIT USER MODAL
       * =================================================
       */}

      {showUserForm && (

        <div className="user-management-overlay">

          <div className="user-management-modal">

            <div className="user-management-header">

              <div>

                <h2>
                  {editingUser
                    ? "Edit User"
                    : "Add User"}
                </h2>

                <p>
                  {editingUser
                    ? "Update AKSARA user information."
                    : "Create a new AKSARA account."}
                </p>

              </div>


              <button
                className="user-access-close"

                onClick={
                  closeUserForm
                }
              >
                ×
              </button>

            </div>


            <div className="user-management-body">

              <label>
                Full Name

                <input
                  type="text"

                  value={
                    userForm.full_name
                  }

                  onChange={
                    event =>
                      setUserForm({
                        ...userForm,

                        full_name:
                          event.target.value,
                      })
                  }

                  placeholder="Full name"
                />
              </label>


              <label>
                Username

                <input
                  type="text"

                  value={
                    userForm.username
                  }

                  onChange={
                    event =>
                      setUserForm({
                        ...userForm,

                        username:
                          event.target.value,
                      })
                  }

                  placeholder="Username"
                />
              </label>


              <label>
                Email

                <input
                  type="email"

                  value={
                    userForm.email
                  }

                  onChange={
                    event =>
                      setUserForm({
                        ...userForm,

                        email:
                          event.target.value,
                      })
                  }

                  placeholder="user@example.com"
                />
              </label>


              <label>
                Role

                <select
                  value={
                    userForm.role_id
                  }

                  onChange={
                    event =>
                      setUserForm({
                        ...userForm,

                        role_id:
                          event.target.value,
                      })
                  }
                >

                  <option value="">
                    Select role
                  </option>


                  {roles.map(
                    role => (

                      <option
                        key={
                          role.id
                        }

                        value={
                          role.id
                        }
                      >
                        {role.name}
                      </option>

                    )
                  )}

                </select>
              </label>


              {!editingUser && (

                <label>
                  Password

                  <input
                    type="password"

                    value={
                      userForm.password
                    }

                    onChange={
                      event =>
                        setUserForm({
                          ...userForm,

                          password:
                            event.target.value,
                        })
                    }

                    placeholder="Minimum 8 characters"
                  />
                </label>

              )}

            </div>


            <div className="user-management-footer">

              <button
                className="access-cancel-button"

                onClick={
                  closeUserForm
                }

                disabled={
                  savingUser
                }
              >
                Cancel
              </button>


              <button
                className="access-save-button"

                onClick={
                  saveUser
                }

                disabled={
                  savingUser
                }
              >
                {savingUser
                  ? "Saving..."
                  : editingUser
                    ? "Save Changes"
                    : "Create User"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/*
       * =================================================
       * RESET PASSWORD
       * =================================================
       */}

      {passwordUser && (

        <div className="user-management-overlay">

          <div className="password-reset-modal">

            <div className="user-management-header">

              <div>

                <h2>
                  Reset Password
                </h2>

                <p>
                  Set a new password for{" "}
                  <strong>
                    {passwordUser.username}
                  </strong>.
                </p>

              </div>


              <button
                className="user-access-close"

                onClick={
                  closePasswordReset
                }
              >
                ×
              </button>

            </div>


            <div className="user-management-body">

              <label>
                New Password

                <input
                  type="password"

                  value={
                    newPassword
                  }

                  onChange={
                    event =>
                      setNewPassword(
                        event.target.value
                      )
                  }

                  placeholder="Minimum 8 characters"
                />
              </label>

            </div>


            <div className="user-management-footer">

              <button
                className="access-cancel-button"

                onClick={
                  closePasswordReset
                }

                disabled={
                  savingPassword
                }
              >
                Cancel
              </button>


              <button
                className="access-save-button"

                onClick={
                  savePassword
                }

                disabled={
                  savingPassword
                }
              >
                {savingPassword
                  ? "Saving..."
                  : "Update Password"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/*
       * =================================================
       * SERVER ACCESS
       * =================================================
       */}

      {selectedUser && (

        <div className="user-access-overlay">

          <div className="user-access-modal">

            <div className="user-access-header">

              <div>

                <h2>
                  Server Access
                </h2>

                <p>
                  Configure infrastructure
                  accessible by{" "}
                  <strong>
                    {selectedUser.username}
                  </strong>
                </p>

              </div>


              <button
                className="user-access-close"

                onClick={
                  closeAccessModal
                }
              >
                ×
              </button>

            </div>


            <div className="user-access-summary">

              <div>
                <span>
                  Assigned
                </span>

                <strong>
                  {accessSelectedCount}
                </strong>
              </div>

              <div>
                <span>
                  Available Servers
                </span>

                <strong>
                  {accessActiveCount}
                </strong>
              </div>

            </div>


            <div className="user-access-tools">

              <div className="user-access-search">

                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path
                    d="m20 20-3.8-3.8"
                  />
                </svg>

                <input
                  type="search"
                  value={
                    accessSearch
                  }
                  onChange={
                    event =>
                      setAccessSearch(
                        event.target.value
                      )
                  }
                  placeholder="Search server, hostname, IP or protocol..."
                  autoComplete="off"
                />

              </div>


              <div className="user-access-filter">

                <button
                  type="button"
                  className={
                    accessFilter ===
                    "ALL"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setAccessFilter(
                      "ALL"
                    )
                  }
                >
                  All
                </button>

                <button
                  type="button"
                  className={
                    accessFilter ===
                    "ASSIGNED"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setAccessFilter(
                      "ASSIGNED"
                    )
                  }
                >
                  Assigned
                </button>

                <button
                  type="button"
                  className={
                    accessFilter ===
                    "UNASSIGNED"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setAccessFilter(
                      "UNASSIGNED"
                    )
                  }
                >
                  Unassigned
                </button>

              </div>

            </div>


            <div className="user-access-bulkbar">

              <span>
                <strong>
                  {
                    accessSelectedCount
                  }
                </strong>
                {" "}
                server
                {
                  accessSelectedCount ===
                  1
                    ? ""
                    : "s"
                }
                {" "}
                assigned
              </span>

              <div>

                <button
                  type="button"
                  onClick={
                    selectVisibleServers
                  }
                  disabled={
                    loadingAccess ||
                    filteredAccessServers
                      .filter(
                        server =>
                          server.is_active
                      ).length === 0
                  }
                >
                  Select Visible
                </button>

                <button
                  type="button"
                  onClick={
                    clearServerSelection
                  }
                  disabled={
                    loadingAccess ||
                    accessSelectedCount ===
                      0
                  }
                >
                  Clear Selection
                </button>

              </div>

            </div>


            <div className="user-access-list">

              {loadingAccess ? (

                <div className="user-access-empty">
                  Loading server access...
                </div>

              ) : filteredAccessServers.length ===
                0 ? (

                <div className="user-access-empty">

                  <strong>
                    No servers found
                  </strong>

                  <span>
                    Try another search
                    or access filter.
                  </span>

                </div>

              ) : (

                filteredAccessServers.map(
                  server => {

                    const allowed =
                      hasServerAccess(
                        server
                      );

                    return (

                      <label
                        key={
                          server.server_id
                        }
                        className={
                          "user-access-server " +
                          (
                            allowed
                              ? "server-selected "
                              : ""
                          ) +
                          (
                            !server.is_active
                              ? "server-disabled"
                              : ""
                          )
                        }
                      >

                        <div className="access-checkbox">

                          <input
                            type="checkbox"
                            checked={
                              allowed
                            }
                            disabled={
                              !server.is_active
                            }
                            onChange={() =>
                              toggleServerAccess(
                                server.server_id
                              )
                            }
                          />

                        </div>


                        <div className="access-server-icon">

                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="6"
                              rx="2"
                            />

                            <rect
                              x="3"
                              y="14"
                              width="18"
                              height="6"
                              rx="2"
                            />

                          </svg>

                        </div>


                        <div className="access-server-info">

                          <div className="access-server-name">
                            {
                              server.server_name
                            }
                          </div>

                          {server.hostname && (
                            <div className="access-server-hostname">
                              {
                                server.hostname
                              }
                            </div>
                          )}

                          <div className="access-server-meta">

                            <span>
                              {
                                server.ip_address
                              }
                            </span>

                            <i>
                              •
                            </i>

                            <span>
                              Port {
                                server.port
                              }
                            </span>

                            {!server.is_active && (
                              <>
                                <i>
                                  •
                                </i>

                                <span className="access-server-inactive">
                                  Inactive
                                </span>
                              </>
                            )}

                          </div>

                        </div>


                        <div className="access-server-right">

                          {allowed && (
                            <span className="access-assigned-badge">
                              Assigned
                            </span>
                          )}

                          <span className="protocol-badge">
                            {
                              server.protocol
                            }
                          </span>

                        </div>

                      </label>

                    );
                  }
                )

              )}

            </div>


            <div className="user-access-footer">

              <button
                className="access-cancel-button"

                onClick={
                  closeAccessModal
                }

                disabled={
                  savingAccess
                }
              >
                Cancel
              </button>


              <button
                className="access-save-button"

                onClick={
                  saveAccess
                }

                disabled={
                  savingAccess ||
                  loadingAccess
                }
              >
                {savingAccess
                  ? "Saving..."
                  : "Save Access"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
