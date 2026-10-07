import {
  useEffect,
  useState,
} from 'react'

import './index.css'

import SSHTerminal from './SSHTerminal'
import RDPViewer from './RDPViewer'
import SessionsPage from './SessionsPage'
import ServersPage from './ServersPage'
import UsersPage from './UsersPage'
import RemoteAccessPage from './RemoteAccessPage'
import MonitoringPage from './MonitoringPage'
import LoginPage from './LoginPage'
import AuditLogsPage from './AuditLogsPage'
import aksaraLogo from './assets/aksara-logo.svg'


type UserRole = {
  id: number
  name: string
}


type User = {
  id: number
  username: string
  email?: string | null
  full_name?: string | null
  role_id?: number | null
  is_active: boolean
  role?: UserRole | null
}


type Server = {
  id: number
  name: string
  hostname?: string | null
  ip_address: string
  operating_system?: string | null
  protocol: string
  port: number
  description?: string | null
  group_id?: number | null
  is_active: boolean
}


type ServerStatus = {
  server_id: number
  status: string
  response_time_ms?: number | null
  last_check?: string | null
  last_online?: string | null
}


type SSHRemoteSession = {
  id: string
  server: Server
  username: string
  password: string
  minimized: boolean
}



type DashboardAuditLog = {
  id: number
  user_id?: number | null
  username?: string | null
  full_name?: string | null
  action: string
  category: string
  severity: string
  resource_type?: string | null
  resource_id?: number | null
  resource_name?: string | null
  source_ip?: string | null
  detail?: string | null
  created_at: string
}


type DashboardAuditResponse = {
  items: DashboardAuditLog[]
  total: number
  page: number
  page_size: number
  pages: number
  total_events: number
  authentication_events: number
  remote_access_events: number
  change_events: number
  security_events: number
}


type Page =
  | 'dashboard'
  | 'remote-access'
  | 'servers'
  | 'sessions'
  | 'monitoring'
  | 'logs'
  | 'administration'


type IconName =
  | 'dashboard'
  | 'remote'
  | 'servers'
  | 'sessions'
  | 'monitoring'
  | 'logs'
  | 'administration'
  | 'search'
  | 'refresh'
  | 'server'
  | 'online'
  | 'offline'
  | 'terminal'
  | 'chevron'
  | 'sun'
  | 'moon'
  | 'bell'
  | 'fullscreen'


function Icon({
  name,
  size = 18,
}: {
  name: IconName
  size?: number
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1.5"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1.5"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1.5"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1.5"
          />
        </svg>
      )

    case 'remote':
      return (
        <svg {...common}>
          <rect
            x="3"
            y="4"
            width="18"
            height="13"
            rx="2"
          />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="m9 10 2-2-2-2" />
          <path d="M13 12h3" />
        </svg>
      )

    case 'servers':
    case 'server':
      return (
        <svg {...common}>
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
          <circle
            cx="7"
            cy="7"
            r=".5"
            fill="currentColor"
          />
          <circle
            cx="7"
            cy="17"
            r=".5"
            fill="currentColor"
          />
        </svg>
      )

    case 'sessions':
      return (
        <svg {...common}>
          <circle
            cx="9"
            cy="8"
            r="4"
          />
          <path d="M3 21v-2a6 6 0 0 1 6-6" />
          <path d="M16 11l2 2 3-3" />
          <path d="M15 18h6" />
        </svg>
      )

    case 'monitoring':
      return (
        <svg {...common}>
          <path d="M3 12h4l2-6 4 12 2-6h6" />
        </svg>
      )

    case 'logs':
      return (
        <svg {...common}>
          <path d="M6 3h12a2 2 0 0 1 2 2v16H4V5a2 2 0 0 1 2-2Z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      )

    case 'administration':
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="4"
          />
          <path d="M5 21a7 7 0 0 1 14 0" />
          <path d="M18 4l1-1" />
        </svg>
      )

    case 'search':
      return (
        <svg {...common}>
          <circle
            cx="11"
            cy="11"
            r="7"
          />
          <path d="m20 20-3.5-3.5" />
        </svg>
      )

    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M18.5 9A7 7 0 0 0 6 6.5L4 9" />
          <path d="M5.5 15A7 7 0 0 0 18 17.5l2-2.5" />
        </svg>
      )

    case 'online':
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      )

    case 'offline':
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M9 9l6 6" />
          <path d="m15 9-6 6" />
        </svg>
      )

    case 'terminal':
      return (
        <svg {...common}>
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
          />
          <path d="m7 9 3 3-3 3" />
          <path d="M13 15h4" />
        </svg>
      )

    case 'chevron':
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      )

    case 'sun':
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="4"
          />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )

    case 'moon':
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )

    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      )

    case 'fullscreen':
      return (
        <svg {...common}>
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M8 21H3v-5" />
          <path d="M16 21h5v-5" />
        </svg>
      )

    default:
      return null
  }
}


function App() {
  const [username, setUsername] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false)

  const [token, setToken] =
    useState(() => {
      return (
        sessionStorage.getItem(
          'aksara-access-token'
        ) || ''
      )
    })

  const [user, setUser] =
    useState<User | null>(null)

  const [servers, setServers] =
    useState<Server[]>([])

  const [statuses, setStatuses] =
    useState<ServerStatus[]>([])

  const [loading, setLoading] =
    useState(false)

  const [
    activeSessions,
    setActiveSessions,
  ] = useState(0)


  const [
    dashboardAudit,
    setDashboardAudit,
  ] = useState<DashboardAuditResponse | null>(
    null
  )

  const [
    currentPage,
    setCurrentPage,
  ] = useState<Page>(() => {

    const saved =
      localStorage.getItem(
        'aksara-current-page'
      ) as Page | null

    const allowed:
      Page[] = [
        'dashboard',
        'remote-access',
        'servers',
        'sessions',
        'monitoring',
        'logs',
        'administration',
      ]

    return (
      saved &&
      allowed.includes(saved)
        ? saved
        : 'dashboard'
    )
  })

  const [
    selectedServer,
    setSelectedServer,
  ] = useState<Server | null>(null)

  const [
    showCredential,
    setShowCredential,
  ] = useState(false)

  const [
    sshUsername,
    setSshUsername,
  ] = useState('')

  const [
    sshPassword,
    setSshPassword,
  ] = useState('')

  const [
    sshSessions,
    setSshSessions,
  ] = useState<SSHRemoteSession[]>([])

  const submitSSHConnection = () => {

    if (
      !selectedServer ||
      !sshUsername ||
      !sshPassword
    ) {
      return
    }


    const existing =
      sshSessions.find(
        session =>
          session.server.id ===
          selectedServer.id
      )


    /*
     * Existing session:
     *
     * Restore requested server and automatically
     * minimize every other SSH session.
     */

    if (existing) {

      setSshSessions(
        current =>
          current.map(
            session => ({
              ...session,

              minimized:
                session.id !==
                existing.id,
            })
          )
      )


      setShowCredential(
        false
      )

      setSshPassword('')

      return
    }


    const newSession:
      SSHRemoteSession = {

      id:
        `ssh-${selectedServer.id}-${Date.now()}`,

      server:
        selectedServer,

      username:
        sshUsername,

      password:
        sshPassword,

      minimized:
        false,
    }


    /*
     * New session:
     *
     * Existing sessions stay connected,
     * but move to the Session Dock.
     */

    setSshSessions(
      current => [

        ...current.map(
          session => ({
            ...session,
            minimized:
              true,
          })
        ),

        newSession,

      ]
    )


    setShowCredential(
      false
    )

    setSshPassword('')

  }


  /*
   * =====================================================
   * GLOBAL NAVIGATION WITH REMOTE SESSION
   *
   * Jika user pindah halaman saat SSH masih terbuka:
   * - SSH tidak disconnect
   * - terminal otomatis minimize
   * - session masuk ke global Session Dock
   * =====================================================
   */

  const navigateToPage = (
    page: Page
  ) => {

    /*
     * Jangan melakukan apa-apa jika user
     * klik menu yang sedang aktif.
     */
    if (page === currentPage) {
      return
    }

    /*
     * Minimize semua SSH session aktif.
     */
    if (sshSessions.length > 0) {

      setSshSessions(
        current =>
          current.map(
            session => ({
              ...session,
              minimized: true,
            })
          )
      )

    }

    /*
     * Minimize RDP viewer jika sedang aktif.
     * Session tetap hidup.
     */
    if (rdpViewerOpen) {

      setRdpMinimized(
        true
      )

    }

    setCurrentPage(page)
  }


  /*
   * =====================================================
   * RDP
   * =====================================================
   */

  const [
    rdpServer,
    setRdpServer,
  ] = useState<Server | null>(null)

  const [
    rdpCredentialOpen,
    setRdpCredentialOpen,
  ] = useState(false)

  const [
    rdpUsername,
    setRdpUsername,
  ] = useState('')

  const [
    rdpPassword,
    setRdpPassword,
  ] = useState('')

  const [
    rdpShowPassword,
    setRdpShowPassword,
  ] = useState(false)

  const [
    rdpDomain,
    setRdpDomain,
  ] = useState('')

  const [
    rdpViewerOpen,
    setRdpViewerOpen,
  ] = useState(false)

  const [
    rdpMinimized,
    setRdpMinimized,
  ] = useState(false)

  const submitRDPConnection = () => {

    if (
      !rdpServer ||
      !rdpUsername ||
      !rdpPassword
    ) {
      return
    }

    setRdpCredentialOpen(
      false
    )

    setRdpViewerOpen(
      true
    )

    setRdpMinimized(
      false
    )

    setRdpShowPassword(
      false
    )
  }


  const [
    theme,
    setTheme,
  ] = useState<
    'light' | 'dark'
  >(() => {
    const savedTheme =
      localStorage.getItem(
        'aksara-theme'
      )

    return savedTheme === 'dark'
      ? 'dark'
      : 'light'
  })


  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    () => new Date()
  )


  /*
   * =====================================================
   * CREDENTIAL MODAL SCROLL LOCK
   *
   * Prevent the application behind SSH/RDP credential
   * dialogs from scrolling.
   * =====================================================
   */

  useEffect(() => {

    const modalOpen =
      showCredential ||
      rdpCredentialOpen

    if (!modalOpen) {
      return
    }

    const previousBodyOverflow =
      document.body.style.overflow

    const previousHtmlOverflow =
      document.documentElement.style.overflow

    document.body.style.overflow =
      'hidden'

    document.documentElement.style.overflow =
      'hidden'

    return () => {

      document.body.style.overflow =
        previousBodyOverflow

      document.documentElement.style.overflow =
        previousHtmlOverflow

    }

  }, [
    showCredential,
    rdpCredentialOpen,
  ])


  /*
   * =====================================================
   * ROLE
   * =====================================================
   */

  const userRole =
    user?.role?.name || ''

  const isSuperAdmin =
    userRole === 'Super Admin'

  const isRemoteUser =
    userRole === 'Remote User'


  /*
   * =====================================================
   * LOGIN
   * =====================================================
   */

  const handleLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (
      !username.trim() ||
      !password
    ) {
      setMessage(
        'Username and password are required.'
      )

      return
    }

    setLoginLoading(true)
    setMessage('')

    try {
      const response =
        await fetch(
          '/api/auth/login',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                username:
                  username.trim(),

                password,
              }),
          }
        )

      let data:
        Record<string, any> = {}

      try {
        data =
          await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        setMessage(
          typeof data.detail ===
            'string'
            ? data.detail
            : 'Invalid username or password.'
        )

        return
      }

      if (!data.access_token) {
        setMessage(
          'Authentication response did not contain an access token.'
        )

        return
      }

      sessionStorage.setItem(
        'aksara-access-token',
        data.access_token
      )

      setToken(
        data.access_token
      )

      setPassword('')
      setMessage('')

      setCurrentPage(
        'dashboard'
      )
    } catch {
      setMessage(
        'Unable to connect to AKSARA API.'
      )
    } finally {
      setLoginLoading(false)
    }
  }


  /*
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  const clearLocalSession = () => {

    sessionStorage.removeItem(
      'aksara-access-token'
    )

    localStorage.removeItem(
      'aksara-current-page'
    )

    setToken('')
    setUser(null)

    setServers([])
    setStatuses([])

    setActiveSessions(0)

    setPassword('')
    setMessage('')
    setLoginLoading(false)

    setCurrentPage(
      'dashboard'
    )

    setSelectedServer(null)

    setShowCredential(false)

    setSshSessions([])

    setSshUsername('')
    setSshPassword('')

    setRdpViewerOpen(false)
    setRdpMinimized(false)
    setRdpCredentialOpen(false)
    setRdpServer(null)
    setRdpUsername('')
    setRdpPassword('')
    setRdpDomain('')
  }


  const handleLogout = async () => {

    const currentToken = token

    try {

      if (currentToken) {

        await fetch(
          '/api/auth/logout',
          {
            method: 'POST',

            headers: {
              Authorization:
                `Bearer ${currentToken}`,
            },
          }
        )

      }

    } catch {

      /*
       * Logout lokal tetap dilakukan
       * walaupun API tidak dapat dijangkau.
       */

    } finally {

      clearLocalSession()

    }

  }


  /*
   * =====================================================
   * AUTH FETCH
   * =====================================================
   */

  const authFetch = async (
    url: string,
    options: RequestInit = {}
  ) => {
    return fetch(
      url,
      {
        ...options,

        headers: {
          ...(options.headers || {}),

          Authorization:
            `Bearer ${token}`,
        },
      }
    )
  }


  /*
   * =====================================================
   * INITIAL DASHBOARD LOAD
   * =====================================================
   */

  const loadDashboard = async () => {
    if (!token) {
      return
    }

    setLoading(true)

    try {
      const [
        meResponse,
        serversResponse,
        statusResponse,
        activeSessionsResponse,
      ] = await Promise.all([
        authFetch(
          '/api/auth/me'
        ),

        authFetch(
          '/api/servers/'
        ),

        authFetch(
          '/api/monitoring/status'
        ),

        authFetch(
          '/api/sessions/active/count'
        ),
      ])

      if (
        meResponse.status === 401 ||
        serversResponse.status === 401 ||
        statusResponse.status === 401 ||
        activeSessionsResponse.status === 401
      ) {
        clearLocalSession()
        return
      }

      if (
        !meResponse.ok ||
        !serversResponse.ok
      ) {
        throw new Error(
          'Failed to load dashboard'
        )
      }

      const meData =
        await meResponse.json()

      const serversData =
        await serversResponse.json()

      let statusData:
        ServerStatus[] = []

      if (
        statusResponse.ok
      ) {
        const data =
          await statusResponse.json()

        statusData =
          Array.isArray(data)
            ? data
            : []
      }

      let sessionCount = 0

      if (
        activeSessionsResponse.ok
      ) {
        const data =
          await activeSessionsResponse.json()

        sessionCount =
          Number(
            data.count || 0
          )
      }

      setUser(
        meData
      )

      setServers(
        Array.isArray(
          serversData
        )
          ? serversData
          : []
      )

      setStatuses(
        statusData
      )

      setActiveSessions(
        sessionCount
      )
    } catch (error) {
      console.error(
        'Dashboard load failed:',
        error
      )

      setMessage(
        'Failed to load dashboard data'
      )
    } finally {
      setLoading(false)
    }
  }


  /*
   * =====================================================
   * GLOBAL REALTIME REFRESH
   *
   * Refresh every 3 seconds:
   * - server inventory
   * - online/offline
   * - response time
   * - active sessions
   * =====================================================
   */

  const refreshRealtimeData =
    async () => {
      if (!token) {
        return
      }

      try {
        const [
          serversResponse,
          statusResponse,
          activeSessionsResponse,
        ] = await Promise.all([
          authFetch(
            '/api/servers/'
          ),

          authFetch(
            '/api/monitoring/status'
          ),

          authFetch(
            '/api/sessions/active/count'
          ),
        ])

        if (
          serversResponse.status === 401 ||
          statusResponse.status === 401 ||
          activeSessionsResponse.status === 401
        ) {
          clearLocalSession()
          return
        }

        if (
          serversResponse.ok
        ) {
          const data =
            await serversResponse.json()

          setServers(
            Array.isArray(data)
              ? data
              : []
          )
        }

        if (
          statusResponse.ok
        ) {
          const data =
            await statusResponse.json()

          setStatuses(
            Array.isArray(data)
              ? data
              : []
          )
        }

        if (
          activeSessionsResponse.ok
        ) {
          const data =
            await activeSessionsResponse.json()

          setActiveSessions(
            Number(
              data.count || 0
            )
          )
        }
      } catch (error) {
        console.error(
          'AKSARA realtime refresh failed:',
          error
        )
      }
    }


  /*
   * =====================================================
   * DASHBOARD AUDIT SUMMARY
   *
   * Dashboard only:
   * - 5 most recent audit events
   * - security event summary
   * =====================================================
   */

  const loadDashboardAudit =
    async () => {
      if (
        !token ||
        currentPage !== 'dashboard'
      ) {
        return
      }

      try {
        const params =
          new URLSearchParams({
            range: '1D',
            search: '',
            category: 'ALL',
            action: 'ALL',
            page: '1',
            page_size: '10',
          })

        const response =
          await authFetch(
            `/api/audit-logs/?${params.toString()}`
          )

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          /*
           * Do not force logout on 403.
           * Audit Logs can be restricted by RBAC.
           */
          if (response.status === 401) {
            clearLocalSession()
          }

          return
        }

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          )
        }

        const data:
          DashboardAuditResponse =
            await response.json()

        setDashboardAudit(data)

      } catch (error) {
        console.error(
          'AKSARA dashboard audit refresh failed:',
          error
        )
      }
    }


  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    if (token) {
      loadDashboard()
    }
  }, [token])


  /*
   * =====================================================
   * GLOBAL POLLING
   *
   * - every 3 seconds
   * - pause when browser tab hidden
   * - immediate refresh when tab active again
   * =====================================================
   */

  useEffect(() => {
    if (!token) {
      return
    }

    const refresh = () => {
      if (
        !document.hidden
      ) {
        refreshRealtimeData()
      }
    }

    const interval =
      window.setInterval(
        refresh,
        3000
      )

    const handleVisibilityChange =
      () => {
        if (
          !document.hidden
        ) {
          refreshRealtimeData()
        }
      }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    )

    return () => {
      window.clearInterval(
        interval
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )
    }
  }, [token])


  /*
   * =====================================================
   * DASHBOARD AUDIT POLLING
   *
   * - dashboard page only
   * - refresh every 15 seconds
   * - pause while browser tab is hidden
   * =====================================================
   */

  useEffect(() => {
    if (
      !token ||
      currentPage !== 'dashboard'
    ) {
      return
    }

    loadDashboardAudit()

    const refresh = () => {
      if (!document.hidden) {
        loadDashboardAudit()
      }
    }

    const interval =
      window.setInterval(
        refresh,
        15000
      )

    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [
    token,
    currentPage,
  ])


  /*
   * =====================================================
   * THEME
   * =====================================================
   */

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      theme
    )

    localStorage.setItem(
      'aksara-theme',
      theme
    )
  }, [theme])


  /*
   * =====================================================
   * DASHBOARD CLOCK
   * =====================================================
   */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrentTime(
            new Date()
          )
        },
        1000
      )

    return () =>
      window.clearInterval(
        timer
      )
  }, [])


  /*
   * =====================================================
   * PERSIST CURRENT PAGE
   * =====================================================
   */

  useEffect(() => {

    if (!token) {
      return
    }

    localStorage.setItem(
      'aksara-current-page',
      currentPage
    )

  }, [
    token,
    currentPage,
  ])


  /*
   * =====================================================
   * REMOTE USER PAGE GUARD
   * =====================================================
   */

  useEffect(() => {
    if (!user) {
      return
    }

    if (isRemoteUser) {
      const allowed:
        Page[] = [
          'dashboard',
          'remote-access',
        ]

      if (
        !allowed.includes(
          currentPage
        )
      ) {
        setCurrentPage(
          'dashboard'
        )
      }
    }
  }, [
    user,
    currentPage,
    isRemoteUser,
  ])


  /*
   * =====================================================
   * STATUS HELPERS
   * =====================================================
   */

  const getStatus = (
    serverId: number
  ) => {
    return statuses.find(
      item =>
        item.server_id ===
        serverId
    )
  }


  const totalServers =
    servers.length


  const visibleIds =
    new Set(
      servers.map(
        server =>
          server.id
      )
    )


  const visibleStatuses =
    statuses.filter(
      item =>
        visibleIds.has(
          item.server_id
        )
    )


  const onlineServers =
    visibleStatuses.filter(
      item =>
        item.status
          .toUpperCase() ===
        'ONLINE'
    ).length


  const offlineServers =
    visibleStatuses.filter(
      item =>
        item.status
          .toUpperCase() ===
        'OFFLINE'
    ).length


  const availability =
    totalServers > 0
      ? Math.round(
          (
            onlineServers /
            totalServers
          ) * 100
        )
      : 0


  const responseTimes =
    visibleStatuses
      .filter(
        item =>
          item.status
            .toUpperCase() ===
          'ONLINE'
      )
      .map(
        item =>
          item.response_time_ms
      )
      .filter(
        (
          value
        ): value is number =>
          typeof value ===
            'number' &&
          Number.isFinite(
            value
          )
      )


  const averageLatency =
    responseTimes.length > 0
      ? (
          responseTimes.reduce(
            (
              sum,
              value
            ) =>
              sum + value,
            0
          ) /
          responseTimes.length
        ).toFixed(2)
      : '0.00'


  /*
   * =====================================================
   * SSH
   * =====================================================
   */

  const openSSHConnection = (
    server: Server
  ) => {
    const serverStatus =
      getStatus(
        server.id
      )

    const status =
      (
        serverStatus?.status ||
        'UNKNOWN'
      ).toUpperCase()

    if (
      !server.is_active ||
      server.protocol
        .toUpperCase() !==
        'SSH' ||
      status !==
        'ONLINE'
    ) {
      return
    }

    setSelectedServer(
      server
    )

    setSshUsername('')

    setSshPassword('')

    setShowCredential(
      true
    )
  }


  /*
   * =====================================================
   * RDP
   * =====================================================
   */

  const openRDPConnection = (
    server: Server
  ) => {
    const serverStatus =
      getStatus(
        server.id
      )

    const status =
      (
        serverStatus?.status ||
        'UNKNOWN'
      ).toUpperCase()

    if (
      !server.is_active ||
      server.protocol
        .toUpperCase() !==
        'RDP' ||
      status !==
        'ONLINE'
    ) {
      return
    }

    setRdpServer(
      server
    )

    setRdpUsername('')
    setRdpPassword('')
    setRdpDomain('')

    setRdpViewerOpen(
      false
    )

    setRdpMinimized(
      false
    )

    setRdpCredentialOpen(
      true
    )
  }


  /*
   * =====================================================
   * NAVIGATION
   * =====================================================
   */

  const renderNavButton = (
    page: Page,
    label: string,
    icon: IconName
  ) => {
    return (
      <button
        className={
          `aksara-nav-item ${
            currentPage === page
              ? 'active'
              : ''
          }`
        }

        onClick={() =>
          navigateToPage(
            page
          )
        }
      >
        <span className="aksara-nav-icon">
          <Icon
            name={icon}
            size={18}
          />
        </span>

        <span>
          {label}
        </span>
      </button>
    )
  }


  /*
   * =====================================================
   * GLOBAL TOPBAR
   * =====================================================
   */

  const renderGlobalTopbar = () => {

    /*
     * Hide dynamic topbar content while the
     * persisted session is being restored.
     *
     * This prevents:
     * - AKSARA User -> real username flash
     * - temporary health status flash
     * - profile layout jump during reload
     */
    const topbarInitializing =
      Boolean(token) &&
      !user

    const healthy =
      offlineServers === 0

    const pageLabels:
      Record<
        Page,
        string
      > = {
        dashboard:
          'Dashboard',

        'remote-access':
          'Remote Access',

        servers:
          'Servers',

        sessions:
          'Sessions',

        monitoring:
          'Monitoring',

        logs:
          'Audit Logs',

        administration:
          'Administration',
      }

    const pageSections:
      Record<
        Page,
        string
      > = {
        dashboard:
          'Overview',

        'remote-access':
          'Remote Access',

        servers:
          'Infrastructure',

        sessions:
          'Remote Access',

        monitoring:
          'Infrastructure',

        logs:
          'Security',

        administration:
          'Administration',
      }


    const displayName =
      user?.full_name ||
      user?.username ||
      'AKSARA User'

    return (
      <header className="aksara-global-topbar">

        <div className="aksara-topbar-left">

          <div className="aksara-topbar-breadcrumb">

            <span className="aksara-topbar-breadcrumb-section">
              {
                pageSections[
                  currentPage
                ]
              }
            </span>

            <span className="aksara-topbar-breadcrumb-separator">
              /
            </span>

            <strong>
              {
                pageLabels[
                  currentPage
                ]
              }
            </strong>

          </div>

        </div>


        <div
      className={
        `aksara-global-topbar-right ${
          topbarInitializing
            ? 'is-initializing'
            : ''
        }`
      }
    >

          <div
            className={
              `aksara-topbar-health ${
                healthy
                  ? 'healthy'
                  : 'degraded'
              }`
            }
          >
            <span className="aksara-topbar-health-dot" />

            <span>
              {healthy
                ? 'System Operational'
                : 'Attention Required'}
            </span>

          </div>


          <div className="aksara-topbar-separator" />


          <button
            type="button"
            className="aksara-topbar-icon-button"
            title="Notifications"
            aria-label="Notifications"
          >
            <Icon
              name="bell"
              size={16}
            />
          </button>


          <button
            type="button"
            className="aksara-topbar-icon-button"
            title={
              theme === 'light'
                ? 'Switch to dark mode'
                : 'Switch to light mode'
            }
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(
                current =>
                  current ===
                    'light'
                    ? 'dark'
                    : 'light'
              )
            }
          >
            <Icon
              name={
                theme === 'light'
                  ? 'moon'
                  : 'sun'
              }
              size={16}
            />
          </button>


          <button
            type="button"
            className="aksara-topbar-icon-button"
            title="Fullscreen"
            aria-label="Fullscreen"
            onClick={() => {
              if (
                !document
                  .fullscreenElement
              ) {
                document
                  .documentElement
                  .requestFullscreen?.()
              } else {
                document
                  .exitFullscreen?.()
              }
            }}
          >
            <Icon
              name="fullscreen"
              size={16}
            />
          </button>


          <div className="aksara-topbar-separator" />


          <div className="aksara-topbar-profile">

            <div className="aksara-user-avatar">

              {displayName
                .charAt(0)
                .toUpperCase()}

            </div>


            <div className="aksara-topbar-profile-info">

              <strong>
                {displayName}
              </strong>

              <span>
                {userRole ||
                  'AKSARA User'}
              </span>

            </div>


            <button
              type="button"
              className="aksara-topbar-logout"
              onClick={
                handleLogout
              }
            >
              Logout
            </button>

          </div>

        </div>

      </header>
    )
  }


  /*
   * =====================================================
   * FOOTER
   * =====================================================
   */

  const renderFooter = () => {
    const healthy =
      offlineServers === 0

    return (
      <footer className="aksara-footer">

        <div className="aksara-footer-brand">

          <strong>
            AKSARA
          </strong>

          <span>
            Secure Remote Access Platform
          </span>

        </div>


        <div className="aksara-footer-right">

          <span
            className={
              `aksara-system-status ${
                healthy
                  ? ''
                  : 'degraded'
              }`
            }
          >
            <span />

            {healthy
              ? 'System Operational'
              : 'Attention Required'}
          </span>


          <span>
            v0.1.0
          </span>


          <span>
            © 2026 AKSARA
          </span>

        </div>

      </footer>
    )
  }


  /*
   * =====================================================
   * LOGIN PAGE
   * =====================================================
   */

  if (!token) {
    return (
      <LoginPage
        username={
          username
        }

        password={
          password
        }

        loading={
          loginLoading
        }

        error={
          message
        }

        setUsername={
          setUsername
        }

        setPassword={
          setPassword
        }

        onSubmit={
          handleLogin
        }
      />
    )
  }


  /*
   * =====================================================
   * MAIN APPLICATION
   * =====================================================
   */

  return (
    <div className="aksara-shell">

      <aside className="aksara-sidebar">

        <div className="aksara-sidebar-brand">

          <img
            src={aksaraLogo}
            alt="AKSARA"
            className="aksara-sidebar-brand-logo"
          />

          <div className="aksara-sidebar-brand-copy">

            <strong>
              AKSARA
            </strong>

            <span>
              Privileged Access Management
            </span>

          </div>

        </div>


        <div className="aksara-sidebar-scroll">

          <div className="aksara-nav-section">

            <div className="aksara-nav-title">
              Overview
            </div>


            {renderNavButton(
              'dashboard',
              'Dashboard',
              'dashboard'
            )}

          </div>


          <div className="aksara-nav-section">

            <div className="aksara-nav-title">
              Remote Access
            </div>


            {renderNavButton(
              'remote-access',
              'Remote Access',
              'remote'
            )}


            {isSuperAdmin &&
              renderNavButton(
                'sessions',
                'Sessions',
                'sessions'
              )}

          </div>


          {isSuperAdmin && (
            <>

              <div className="aksara-nav-section">

                <div className="aksara-nav-title">
                  Infrastructure
                </div>


                {renderNavButton(
                  'servers',
                  'Servers',
                  'servers'
                )}


                {renderNavButton(
                  'monitoring',
                  'Monitoring',
                  'monitoring'
                )}

              </div>


              <div className="aksara-nav-section">

                <div className="aksara-nav-title">
                  Audit & Logs
                </div>


                {renderNavButton(
                  'logs',
                  'Audit Logs',
                  'logs'
                )}

              </div>


              <div className="aksara-nav-section">

                <div className="aksara-nav-title">
                  Administration
                </div>


                {renderNavButton(
                  'administration',
                  'Administration',
                  'administration'
                )}

              </div>

            </>
          )}

        </div>


        <div className="aksara-sidebar-footer aksara-sidebar-footer-v2">

          <div className="aksara-sidebar-footer-copy">

            <strong>
              AKSARA
            </strong>

            <span>
              Privileged Access Management
            </span>

            <small>
              v0.1.0
            </small>

          </div>

        </div>

      </aside>


      <main className="aksara-main">

        {renderGlobalTopbar()}


        <div className="aksara-main-body">

          {/*
           * =================================================
           * DASHBOARD
           * =================================================
           */}

          {currentPage ===
            'dashboard' && (

            <>

              <section className="aksara-dashboard-hero">

                <div className="aksara-dashboard-hero-main">

                  <h1>
                    {user?.full_name ||
                      user?.username ||
                      'AKSARA Administrator'}
                  </h1>

                  <p>
                    {isSuperAdmin
                      ? 'Monitor infrastructure, manage remote access, and keep your environment secure.'
                      : 'Monitor your assigned infrastructure and manage remote access securely.'}
                  </p>

                </div>


                <div className="aksara-dashboard-clock">

                  <span>
                    {currentTime.toLocaleDateString(
                      'en-GB',
                      {
                        weekday:
                          'long',
                        day:
                          '2-digit',
                        month:
                          'long',
                        year:
                          'numeric',
                      }
                    )}
                  </span>

                  <strong>
                    {currentTime.toLocaleTimeString(
                      'en-GB',
                      {
                        hour:
                          '2-digit',
                        minute:
                          '2-digit',
                        second:
                          '2-digit',
                      }
                    )}
                  </strong>

                  <small>
                    <i />

                    {offlineServers === 0
                      ? 'All systems operational'
                      : `${offlineServers} server needs attention`}
                  </small>

                </div>


                <div className="aksara-dashboard-motto">

                  <strong>
                    Secure Access
                  </strong>

                  <span>
                    for a Safer Infrastructure.
                  </span>

                  <small>
                    — AKSARA
                  </small>

                </div>

              </section>


              {loading ? (

                <div className="aksara-loading-card">
                  Loading infrastructure...
                </div>

              ) : (

                <>

                  <section className="aksara-stats-grid">

                    <div className="aksara-stat-card">

                      <div className="aksara-stat-top">

                        <span className="aksara-stat-icon">
                          <Icon
                            name="server"
                            size={19}
                          />
                        </span>

                        <span className="aksara-stat-label">
                          Total Servers
                        </span>

                      </div>

                      <strong className="aksara-stat-value">
                        {totalServers}
                      </strong>

                      <span className="aksara-stat-description">
                        {totalServers === 1
                          ? '1 managed server'
                          : `${totalServers} managed servers`}
                      </span>

                    </div>


                    <div className="aksara-stat-card">

                      <div className="aksara-stat-top">

                        <span className="aksara-stat-icon positive">
                          <Icon
                            name="online"
                            size={19}
                          />
                        </span>

                        <span className="aksara-stat-label">
                          Online Servers
                        </span>

                      </div>

                      <strong className="aksara-stat-value">
                        {onlineServers}
                      </strong>

                      <span className="aksara-stat-description positive-text">
                        {availability}% availability
                      </span>

                    </div>


                    <div className="aksara-stat-card">

                      <div className="aksara-stat-top">

                        <span className="aksara-stat-icon info">
                          <Icon
                            name="sessions"
                            size={19}
                          />
                        </span>

                        <span className="aksara-stat-label">
                          Active Sessions
                        </span>

                      </div>

                      <strong className="aksara-stat-value">
                        {activeSessions}
                      </strong>

                      <span className="aksara-stat-description">
                        Remote sessions active now
                      </span>

                    </div>


                    <div className="aksara-stat-card">

                      <div className="aksara-stat-top">

                        <span className="aksara-stat-icon info">
                          <Icon
                            name="logs"
                            size={19}
                          />
                        </span>

                        <span className="aksara-stat-label">
                          Security Events
                        </span>

                      </div>

                      <strong className="aksara-stat-value">
                        {isSuperAdmin
                          ? dashboardAudit?.security_events ?? 0
                          : '-'}
                      </strong>

                      <span className="aksara-stat-description">
                        {isSuperAdmin
                          ? 'Security events in the last 24 hours'
                          : 'Restricted by access policy'}
                      </span>

                    </div>

                  </section>


                  <section className="aksara-dashboard-primary-grid">

                    <div className="aksara-infrastructure-panel">

                      <div className="aksara-panel-heading aksara-panel-heading-rich">

                        <div className="aksara-panel-title-wrap">

                          <span className="aksara-panel-title-icon">
                            <Icon
                              name="monitoring"
                              size={17}
                            />
                          </span>

                          <div>

                            <h2>
                              Infrastructure Health
                            </h2>

                            <p>
                              Current reachability and performance summary
                              of managed infrastructure.
                            </p>

                          </div>

                        </div>


                        {isSuperAdmin && (

                          <div className="aksara-panel-actions">

                            <button
                              type="button"
                              className="aksara-secondary-action"
                              onClick={() =>
                                navigateToPage(
                                  'monitoring'
                                )
                              }
                            >
                              View Monitoring
                            </button>

                          </div>

                        )}

                      </div>


                      <div className="aksara-health-list">

                        <div>

                          <span className="health-dot online" />

                          <span>
                            Online Servers
                          </span>

                          <strong>
                            {onlineServers}
                          </strong>

                        </div>


                        <div>

                          <span className="health-dot offline" />

                          <span>
                            Offline Servers
                          </span>

                          <strong>
                            {offlineServers}
                          </strong>

                        </div>


                        <div>

                          <span className="health-dot session" />

                          <span>
                            Availability
                          </span>

                          <strong>
                            {availability}%
                          </strong>

                        </div>


                        <div>

                          <span className="health-dot latency" />

                          <span>
                            Average Response
                          </span>

                          <strong>
                            {averageLatency} ms
                          </strong>

                        </div>

                      </div>


                      <div
                        className={
                          `aksara-health-note ${
                            offlineServers === 0
                              ? 'healthy'
                              : 'degraded'
                          }`
                        }
                      >

                        <span className="aksara-health-note-icon">

                          <Icon
                            name={
                              offlineServers === 0
                                ? 'online'
                                : 'offline'
                            }
                            size={16}
                          />

                        </span>

                        <div>

                          <strong>
                            {offlineServers === 0
                              ? 'Infrastructure healthy'
                              : 'Infrastructure requires attention'}
                          </strong>

                          <span>
                            {offlineServers === 0
                              ? 'All managed servers are currently reachable.'
                              : `${offlineServers} ${
                                  offlineServers === 1
                                    ? 'server is'
                                    : 'servers are'
                                } currently unavailable.`}
                          </span>

                        </div>

                      </div>

                    </div>

                  </section>


                  <section className="aksara-dashboard-lower-grid">

                    {isSuperAdmin && (

                      <div className="aksara-dashboard-widget">

                        <div className="aksara-widget-header">

                          <div>
                            <h3>
                              Recent Audit Activity
                            </h3>

                            <p>
                              Latest security and administrative activity.
                            </p>
                          </div>


                          <button
                            type="button"
                            onClick={() =>
                              navigateToPage(
                                'logs'
                              )
                            }
                          >
                            View Audit Logs
                          </button>

                        </div>


                        <div className="aksara-dashboard-audit-list">

                          {!dashboardAudit ? (

                            <div className="aksara-dashboard-audit-empty">
                              Loading recent activity...
                            </div>

                          ) : dashboardAudit.items.length === 0 ? (

                            <div className="aksara-dashboard-audit-empty">
                              No audit activity in the last 24 hours.
                            </div>

                          ) : (

                            dashboardAudit.items
                              .slice(0, 5)
                              .map(
                              item => {

                                const actor =
                                  item.full_name ||
                                  item.username ||
                                  'System'

                                const severity =
                                  (
                                    item.severity ||
                                    'info'
                                  ).toLowerCase()

                                const resource =
                                  item.resource_name ||
                                  item.resource_type ||
                                  'AKSARA'

                                return (

                                  <div
                                    className="aksara-dashboard-audit-item"
                                    key={item.id}
                                  >

                                    <div
                                      className={
                                        `aksara-dashboard-audit-severity ${severity}`
                                      }
                                    >
                                      <Icon
                                        name={
                                          severity === 'critical' ||
                                          severity === 'warning'
                                            ? 'offline'
                                            : 'logs'
                                        }
                                        size={15}
                                      />
                                    </div>


                                    <div className="aksara-dashboard-audit-content">

                                      <div className="aksara-dashboard-audit-title">

                                        <strong>
                                          {item.action
                                            .replaceAll(
                                              '_',
                                              ' '
                                            )}
                                        </strong>

                                        <span
                                          className={
                                            `aksara-dashboard-audit-badge ${severity}`
                                          }
                                        >
                                          {item.severity ||
                                            'INFO'}
                                        </span>

                                      </div>


                                      <div className="aksara-dashboard-audit-meta">

                                        <span>
                                          {actor}
                                        </span>

                                        <span>
                                          •
                                        </span>

                                        <span>
                                          {resource}
                                        </span>

                                      </div>


                                      {item.detail && (

                                        <p>
                                          {item.detail}
                                        </p>

                                      )}

                                    </div>


                                    <time
                                      dateTime={
                                        item.created_at
                                      }
                                    >
                                      {new Date(
                                        item.created_at
                                      ).toLocaleTimeString(
                                        'en-GB',
                                        {
                                          hour:
                                            '2-digit',
                                          minute:
                                            '2-digit',
                                        }
                                      )}
                                    </time>

                                  </div>

                                )
                              }
                            )

                          )}

                        </div>

                      </div>

                    )}


                    <div className="aksara-dashboard-widget">

                      <div className="aksara-widget-header">

                        <div>
                          <h3>
                            Quick Actions
                          </h3>

                          <p>
                            Navigate to common AKSARA operations.
                          </p>
                        </div>

                      </div>


                      <div className="aksara-quick-actions">

                        <button
                          type="button"
                          onClick={() =>
                            navigateToPage(
                              'remote-access'
                            )
                          }
                        >
                          <span>

                            <Icon
                              name="remote"
                              size={17}
                            />

                          </span>

                          <div>
                            <strong>
                              Remote Access
                            </strong>

                            <small>
                              Start SSH or RDP session
                            </small>
                          </div>
                        </button>


                        {isSuperAdmin && (
                          <>

                            <button
                              type="button"
                              onClick={() =>
                                navigateToPage(
                                  'sessions'
                                )
                              }
                            >
                              <span>

                                <Icon
                                  name="sessions"
                                  size={17}
                                />

                              </span>

                              <div>
                                <strong>
                                  Sessions
                                </strong>

                                <small>
                                  Review active and past access
                                </small>
                              </div>
                            </button>


                            <button
                              type="button"
                              onClick={() =>
                                navigateToPage(
                                  'servers'
                                )
                              }
                            >
                              <span>

                                <Icon
                                  name="server"
                                  size={17}
                                />

                              </span>

                              <div>
                                <strong>
                                  Servers
                                </strong>

                                <small>
                                  Manage infrastructure inventory
                                </small>
                              </div>
                            </button>


                            <button
                              type="button"
                              onClick={() =>
                                navigateToPage(
                                  'logs'
                                )
                              }
                            >
                              <span>

                                <Icon
                                  name="logs"
                                  size={17}
                                />

                              </span>

                              <div>
                                <strong>
                                  Audit Logs
                                </strong>

                                <small>
                                  Review security activity
                                </small>
                              </div>
                            </button>

                          </>
                        )}

                      </div>

                    </div>


                  </section>

                </>

              )}

            </>

          )}


          {/*
           * =================================================
           * REMOTE ACCESS
           * =================================================
           */}

          {currentPage ===
            'remote-access' && (

            <RemoteAccessPage
              token={token}

              onUnauthorized={
                clearLocalSession
              }

              onConnectSSH={
                server => {
                  openSSHConnection(
                    server
                  )
                }
              }

              onConnectRDP={
                server => {
                  openRDPConnection(
                    server
                  )
                }
              }
            />

          )}


          {/*
           * =================================================
           * SERVERS
           * =================================================
           */}

          {currentPage ===
            'servers' &&
            isSuperAdmin && (

            <ServersPage
              token={token}

              onUnauthorized={
                clearLocalSession
              }

              onConnectSSH={
                server => {
                  openSSHConnection(
                    server
                  )
                }
              }

              onConnectRDP={
                server => {
                  openRDPConnection(
                    server
                  )
                }
              }
            />

          )}


          {/*
           * =================================================
           * SESSIONS
           * =================================================
           */}

          {currentPage ===
            'sessions' &&
            isSuperAdmin && (

            <SessionsPage
              token={token}

              onUnauthorized={
                clearLocalSession
              }
            />

          )}


          {/*
           * =================================================
           * MONITORING
           * =================================================
           */}

          {currentPage ===
            'monitoring' &&
            isSuperAdmin && (

            <MonitoringPage
              token={token}

              servers={
                servers
              }

              statuses={
                statuses
              }

              onUnauthorized={
                clearLocalSession
              }

              onRefresh={
                refreshRealtimeData
              }
            />

          )}


          {/*
           * =================================================
           * AUDIT LOGS
           * =================================================
           */}

          {currentPage ===
            'logs' &&
            isSuperAdmin && (

            <AuditLogsPage
              token={token}

              onUnauthorized={
                clearLocalSession
              }
            />

          )}


          {/*
           * =================================================
           * ADMINISTRATION
           * =================================================
           */}

          {currentPage ===
            'administration' &&
            isSuperAdmin && (

            <UsersPage
              token={token}

              onUnauthorized={
                clearLocalSession
              }
            />

          )}

        </div>


        {renderFooter()}

      </main>


      {/*
       * =====================================================
       * SSH CREDENTIAL MODAL
       * =====================================================
       */}

      {showCredential &&
        selectedServer && (

          <div className="aksara-connect-overlay">

            <div className="aksara-connect-modal">

              <div className="aksara-connect-header">

                <div>

                  <span className="aksara-connect-eyebrow">
                    SECURE REMOTE ACCESS
                  </span>

                  <h2>
                    Connect Server
                  </h2>

                  <p>
                    {selectedServer.name}
                    {' · '}
                    {selectedServer.ip_address}
                    :
                    {selectedServer.port}
                  </p>

                </div>

                <span className="aksara-connect-protocol">
                  SSH
                </span>

              </div>


              <div className="aksara-connect-body">

              <label>
                Username

                <input
                  type="text"

                  placeholder="Enter SSH username"

                  autoComplete="off"

                  name="aksara-ssh-user"

                  value={
                    sshUsername
                  }

                  onChange={
                    e =>
                      setSshUsername(
                        e.target.value
                      )
                  }
                />
              </label>


              <label>
                Password

                <input
                  type="password"

                  placeholder="Enter SSH password"

                  autoComplete="new-password"

                  name="aksara-ssh-secret"

                  value={
                    sshPassword
                  }

                  onChange={
                    e =>
                      setSshPassword(
                        e.target.value
                      )
                  }

                  onKeyDown={
                    e => {

                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey
                      ) {

                        e.preventDefault()

                        submitSSHConnection()

                      }

                    }
                  }
                />
              </label>


              </div>

              <div className="aksara-connect-actions">

                <button
                  type="button"
                  className="aksara-connect-cancel"

                  onClick={() => {
                    setShowCredential(
                      false
                    )

                    setSshPassword('')
                  }}
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="aksara-connect-submit"

                  disabled={
                    !sshUsername ||
                    !sshPassword
                  }

                  onClick={
                    submitSSHConnection
                  }
                >
                  Connect
                </button>

              </div>

            </div>

          </div>

        )}


      {/*
       * =====================================================
       * RDP CREDENTIAL MODAL
       * =====================================================
       */}

      {rdpCredentialOpen &&
        rdpServer && (

          <div className="aksara-connect-overlay aksara-rdp-connect-overlay">

            <div
              className="aksara-connect-modal aksara-rdp-connect-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="aksara-rdp-connect-title"
            >

              <div className="aksara-connect-header aksara-rdp-connect-header">

                <div className="aksara-rdp-connect-title-group">

                  <div className="aksara-rdp-connect-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="13"
                        rx="2"
                      />

                      <path d="M8 21h8" />
                      <path d="M12 17v4" />

                    </svg>
                  </div>


                  <div>

                    <span className="aksara-connect-eyebrow">
                      SECURE REMOTE ACCESS
                    </span>

                    <h2 id="aksara-rdp-connect-title">
                      Remote Desktop Connection
                    </h2>

                    <p>
                      Authenticate to start a secure Windows remote session.
                    </p>

                  </div>

                </div>


                <span className="aksara-connect-protocol">
                  RDP
                </span>

              </div>


              <div className="aksara-rdp-target-card">

                <div className="aksara-rdp-target-main">

                  <span className="aksara-rdp-target-label">
                    TARGET SERVER
                  </span>

                  <strong>
                    {rdpServer.name}
                  </strong>

                  <span>
                    {rdpServer.ip_address}
                    :
                    {rdpServer.port}
                  </span>

                </div>


                <div className="aksara-rdp-target-status">

                  <span className="aksara-rdp-target-dot" />

                  Ready

                </div>

              </div>


              <div className="aksara-connect-body aksara-rdp-connect-body">

                <label>
                  <span>
                    Username
                  </span>

                  <input
                    type="text"
                    placeholder="Username"
                    autoComplete="off"
                    name="aksara-rdp-user"
                    autoFocus
                    value={
                      rdpUsername
                    }
                    onChange={
                      e =>
                        setRdpUsername(
                          e.target.value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    Password
                  </span>

                  <div className="aksara-rdp-password-field">

                    <input
                      type={
                        rdpShowPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Password"
                      autoComplete="new-password"
                      name="aksara-rdp-secret"
                      value={
                        rdpPassword
                      }
                      onChange={
                        e =>
                          setRdpPassword(
                            e.target.value
                          )
                      }

                      onKeyDown={
                        e => {

                          if (
                            e.key === 'Enter' &&
                            !e.shiftKey
                          ) {

                            e.preventDefault()

                            submitRDPConnection()

                          }

                        }
                      }
                    />


                    <button
                      type="button"
                      className="aksara-rdp-password-toggle"
                      aria-label={
                        rdpShowPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      title={
                        rdpShowPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      onClick={() =>
                        setRdpShowPassword(
                          current =>
                            !current
                        )
                      }
                    >
                      {rdpShowPassword
                        ? 'Hide'
                        : 'Show'}
                    </button>

                  </div>

                </label>


                <label>
                  <span className="aksara-rdp-label-row">

                    <span>
                      Domain
                    </span>

                    <small>
                      Optional
                    </small>

                  </span>

                  <input
                    type="text"
                    placeholder="Domain"
                    autoComplete="off"
                    name="aksara-rdp-domain"
                    value={
                      rdpDomain
                    }
                    onChange={
                      e =>
                        setRdpDomain(
                          e.target.value
                        )
                    }

                    onKeyDown={
                      e => {

                        if (
                          e.key === 'Enter' &&
                          !e.shiftKey
                        ) {

                          e.preventDefault()

                          submitRDPConnection()

                        }

                      }
                    }
                  />
                </label>


                <div className="aksara-rdp-security-note">

                  <span className="aksara-rdp-security-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="5"
                        y="10"
                        width="14"
                        height="10"
                        rx="2"
                      />

                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />

                    </svg>
                  </span>


                  <div>

                    <strong>
                      Session credentials
                    </strong>

                    <span>
                      Credentials are used only to establish this remote session.
                    </span>

                  </div>

                </div>

              </div>


              <div className="aksara-connect-actions aksara-rdp-connect-actions">

                <button
                  type="button"
                  className="aksara-connect-cancel"
                  onClick={() => {

                    setRdpCredentialOpen(
                      false
                    )

                    setRdpUsername('')
                    setRdpPassword('')
                    setRdpDomain('')
                    setRdpShowPassword(
                      false
                    )
                    setRdpServer(null)

                  }}
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="aksara-connect-submit aksara-rdp-connect-submit"
                  disabled={
                    !rdpUsername.trim() ||
                    !rdpPassword
                  }
                  onClick={
                    submitRDPConnection
                  }
                >
                  <span>
                    Connect
                  </span>

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>

                </button>

              </div>

            </div>

          </div>

        )}


      {/*
       * =====================================================
       * RDP VIEWER
       * =====================================================
       */}

      {rdpViewerOpen &&
        rdpServer && (

          <div
            className={
              `aksara-rdp-session-host ${
                rdpMinimized
                  ? 'minimized'
                  : ''
              }`
            }
          >

          <RDPViewer
            serverId={
              rdpServer.id
            }

            serverName={
              rdpServer.name
            }

            token={
              token
            }

            username={
              rdpUsername
            }

            password={
              rdpPassword
            }

            domain={
              rdpDomain
            }

            onMinimize={() => {

              setRdpMinimized(
                true
              )

            }}

            onClose={() => {

              setRdpViewerOpen(
                false
              )

              setRdpMinimized(
                false
              )

              setRdpPassword('')
              setRdpUsername('')
              setRdpDomain('')
              setRdpServer(null)

              setTimeout(
                () => {
                  refreshRealtimeData()
                },
                500
              )

            }}
          />

          </div>

        )}


      {/*
       * =====================================================
       * SSH TERMINALS - MULTI SESSION
       * =====================================================
       */}

      {sshSessions.map(
        session => (

          <SSHTerminal
            key={
              session.id
            }

            serverId={
              session.server.id
            }

            serverName={
              session.server.name
            }

            token={
              token
            }

            sshUsername={
              session.username
            }

            sshPassword={
              session.password
            }

            minimized={
              session.minimized
            }

            onMinimize={() => {

              setSshSessions(
                current =>
                  current.map(
                    item =>
                      item.id ===
                      session.id
                        ? {
                            ...item,
                            minimized: true,
                          }
                        : item
                  )
              )

            }}

            onClose={() => {

              setSshSessions(
                current =>
                  current.filter(
                    item =>
                      item.id !==
                      session.id
                  )
              )


              setTimeout(
                () => {
                  refreshRealtimeData()
                },
                500
              )

            }}
          />

        )
      )}


      {(sshSessions.some(
        session =>
          session.minimized
      ) ||
        (
          rdpViewerOpen &&
          rdpMinimized &&
          rdpServer
        )
      ) && (

        <div className="aksara-session-dock">

          <div className="aksara-session-dock-header">

            <div>

              <strong>
                Remote Sessions
              </strong>

              <span>
                {
                  sshSessions.filter(
                    session =>
                      session.minimized
                  ).length +
                  (
                    rdpViewerOpen &&
                    rdpMinimized &&
                    rdpServer
                      ? 1
                      : 0
                  )
                } minimized
              </span>

            </div>

          </div>


          <div className="aksara-session-dock-list">

            {sshSessions
              .filter(
                session =>
                  session.minimized
              )
              .map(
                session => (

                  <button
                    type="button"
                    key={
                      session.id
                    }
                    className="aksara-session-dock-item"

                    onClick={() => {

                      setSshSessions(
                        current =>
                          current.map(
                            item => ({
                              ...item,

                              minimized:
                                item.id !==
                                session.id,
                            })
                          )
                      )

                      if (rdpViewerOpen) {
                        setRdpMinimized(
                          true
                        )
                      }

                    }}
                  >

                    <span
                      className="aksara-session-dock-dot"
                    />

                    <div className="aksara-session-dock-copy">

                      <strong>
                        {session.server.name}
                      </strong>

                      <span>
                        SSH · {
                          session.server.ip_address
                        }
                      </span>

                    </div>

                    <span className="aksara-session-dock-restore">
                      Restore
                    </span>

                  </button>

                )
              )}


            {rdpViewerOpen &&
              rdpMinimized &&
              rdpServer && (

                <button
                  type="button"
                  className="aksara-session-dock-item"
                  onClick={() => {

                    setRdpMinimized(
                      false
                    )

                    setSshSessions(
                      current =>
                        current.map(
                          item => ({
                            ...item,
                            minimized: true,
                          })
                        )
                    )

                  }}
                >

                  <span
                    className="aksara-session-dock-dot"
                  />

                  <div className="aksara-session-dock-copy">

                    <strong>
                      {rdpServer.name}
                    </strong>

                    <span>
                      RDP · {
                        rdpServer.ip_address
                      }
                    </span>

                  </div>

                  <span className="aksara-session-dock-restore">
                    Restore
                  </span>

                </button>

              )}

          </div>

        </div>

      )}

    </div>
  )
}


export default App
