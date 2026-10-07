import {
  useEffect,
  useMemo,
  useState,
} from 'react'

type Range =
  | '1D'
  | '7D'
  | '30D'

type AuditLog = {
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

type AuditResponse = {
  items: AuditLog[]
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

type Props = {
  token: string
  onUnauthorized: () => void
}

type IconName =
  | 'activity'
  | 'remote'
  | 'security'
  | 'auth'
  | 'changes'
  | 'search'
  | 'refresh'
  | 'export'
  | 'clock'
  | 'user'
  | 'resource'
  | 'ip'
  | 'info'
  | 'warning'
  | 'critical'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'

function AuditIcon({
  name,
  size = 16,
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
    case 'activity':
      return (
        <svg {...common}>
          <path d="M3 12h4l2-6 4 12 2-6h6" />
        </svg>
      )

    case 'remote':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="m8 10 2.5 2.5L8 15" />
          <path d="M13 15h3" />
          <path d="M8 21h8" />
        </svg>
      )

    case 'security':
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
      )

    case 'auth':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21a7 7 0 0 1 14 0" />
          <path d="m16.5 11.5 1.5 1.5 3-3" />
        </svg>
      )

    case 'changes':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      )

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
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

    case 'export':
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m8 11 4 4 4-4" />
          <path d="M5 21h14" />
        </svg>
      )

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )

    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      )

    case 'resource':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="6" rx="2" />
          <rect x="4" y="14" width="16" height="6" rx="2" />
        </svg>
      )

    case 'ip':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18" />
          <path d="M12 3a14 14 0 0 0 0 18" />
        </svg>
      )

    case 'warning':
      return (
        <svg {...common}>
          <path d="M12 3 2.5 20h19Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      )

    case 'critical':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6" />
          <path d="M12 17h.01" />
        </svg>
      )

    case 'close':
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      )

    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      )

    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      )

    case 'info':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      )
  }
}

function AuditLogsPage({
  token,
  onUnauthorized,
}: Props) {
  const [data, setData] =
    useState<AuditResponse>({
      items: [],
      total: 0,
      page: 1,
      page_size: 25,
      pages: 1,
      total_events: 0,
      authentication_events: 0,
      remote_access_events: 0,
      change_events: 0,
      security_events: 0,
    })

  const [actions, setActions] =
    useState<string[]>([])

  const [range, setRange] =
    useState<Range>('1D')

  const [search, setSearch] =
    useState('')

  const [category, setCategory] =
    useState('ALL')

  const [action, setAction] =
    useState('ALL')

  const [page, setPage] =
    useState(1)

  const [pageSize, setPageSize] =
    useState(25)

  const [loading, setLoading] =
    useState(true)

  const [exporting, setExporting] =
    useState(false)

  const [error, setError] =
    useState('')

  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null)

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null)


  useEffect(() => {

    if (!selectedLog) {
      return
    }

    const previousBodyOverflow =
      document.body.style.overflow

    const previousHtmlOverflow =
      document.documentElement.style.overflow

    const previousBodyPaddingRight =
      document.body.style.paddingRight


    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth


    document.body.style.overflow =
      'hidden'

    document.documentElement.style.overflow =
      'hidden'


    if (scrollbarWidth > 0) {
      document.body.style.paddingRight =
        `${scrollbarWidth}px`
    }


    return () => {

      document.body.style.overflow =
        previousBodyOverflow

      document.documentElement.style.overflow =
        previousHtmlOverflow

      document.body.style.paddingRight =
        previousBodyPaddingRight

    }

  }, [selectedLog])


  const loadLogs =
    async (silent = false) => {
      if (!silent) {
        setLoading(true)
      }

      try {
        const params =
          new URLSearchParams({
            range,
            search: search.trim(),
            category,
            action,
            page: String(page),
            page_size: String(pageSize),
          })

        const response =
          await fetch(
            `/api/audit-logs/?${params.toString()}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          )

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          onUnauthorized()
          return
        }

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          )
        }

        const result:
          AuditResponse =
            await response.json()

        setData(result)
        setError('')
        setLastUpdated(new Date())
      } catch (err) {
        console.error(err)
        setError(
          'Unable to load audit activity.'
        )
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    }

  const loadActions =
    async () => {
      try {
        const response =
          await fetch(
            `/api/audit-logs/actions?range=${range}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          )

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          onUnauthorized()
          return
        }

        if (!response.ok) {
          return
        }

        const result: string[] =
          await response.json()

        setActions(
          Array.isArray(result)
            ? result
            : []
        )
      } catch (err) {
        console.error(err)
      }
    }

  useEffect(() => {
    setPage(1)
  }, [
    range,
    search,
    category,
    action,
    pageSize,
  ])

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadLogs()
        },
        search ? 300 : 0
      )

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    token,
    range,
    search,
    category,
    action,
    page,
    pageSize,
  ])

  useEffect(() => {
    void loadActions()
  }, [
    token,
    range,
  ])

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          if (!document.hidden) {
            void loadLogs(true)
          }
        },
        5000
      )

    return () => {
      window.clearInterval(interval)
    }
  }, [
    token,
    range,
    search,
    category,
    action,
    page,
    pageSize,
  ])

  const formatDateTime =
    (
      value: string
    ) => {
      const date =
        new Date(value)

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return '-'
      }

      return new Intl.DateTimeFormat(
        'id-ID',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta',
        }
      ).format(date)
    }

  const formatTime =
    (
      value: string
    ) => {
      const date =
        new Date(value)

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return '-'
      }

      return new Intl.DateTimeFormat(
        'id-ID',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta',
        }
      ).format(date)
    }

  const formatDate =
    (
      value: string
    ) => {
      const date =
        new Date(value)

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return '-'
      }

      return new Intl.DateTimeFormat(
        'id-ID',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        }
      ).format(date)
    }

  const formatAction =
    (
      value: string
    ) =>
      value.replaceAll(
        '_',
        ' '
      )

  const categoryLabel =
    (
      value: string
    ) => {
      switch (value) {
        case 'AUTHENTICATION':
          return 'Authentication'
        case 'REMOTE_ACCESS':
          return 'Remote Access'
        case 'CHANGE':
          return 'Change'
        case 'SECURITY':
          return 'Security'
        case 'SYSTEM':
          return 'System'
        default:
          return value
      }
    }

  const rangeLabel =
    range === '1D'
      ? 'Today'
      : range === '7D'
        ? 'Last 7 Days'
        : 'Last 30 Days'

  const categories =
    useMemo(
      () => [
        {
          value: 'ALL',
          label: 'All Categories',
        },
        {
          value: 'AUTHENTICATION',
          label: 'Authentication',
        },
        {
          value: 'REMOTE_ACCESS',
          label: 'Remote Access',
        },
        {
          value: 'CHANGE',
          label: 'Changes',
        },
        {
          value: 'SECURITY',
          label: 'Security',
        },
        {
          value: 'SYSTEM',
          label: 'System',
        },
      ],
      []
    )

  const remotePercent =
    data.total_events > 0
      ? Math.round(
          (
            data.remote_access_events /
            data.total_events
          ) * 100
        )
      : 0

  const exportCsv = async () => {

    if (
      exporting ||
      data.total === 0
    ) {
      return
    }

    setExporting(true)

    try {

      const allItems: AuditLog[] = []

      let exportPage = 1
      let totalPages = 1

      do {

        const params =
          new URLSearchParams({
            range,
            search:
              search.trim(),
            category,
            action,
            page:
              String(exportPage),
            page_size:
              '100',
          })

        const response =
          await fetch(
            `/api/audit-logs/?${params.toString()}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          )

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          onUnauthorized()
          return
        }

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          )
        }

        const result:
          AuditResponse =
            await response.json()

        allItems.push(
          ...result.items
        )

        totalPages =
          Math.max(
            1,
            result.pages
          )

        exportPage += 1

      } while (
        exportPage <= totalPages
      )


      const csvEscape =
        (
          value: unknown
        ) => {

          const valueText =
            String(
              value ?? ''
            ).replaceAll(
              '"',
              '""'
            )

          return `"${valueText}"`
        }


      const rows = [
        [
          'ID',
          'Timestamp WIB',
          'User',
          'Action',
          'Category',
          'Severity',
          'Resource Type',
          'Resource ID',
          'Source IP',
          'Detail',
        ],

        ...allItems.map(
          item => [
            item.id,

            formatDateTime(
              item.created_at
            ),

            item.username ||
              'System',

            item.action,

            item.category,

            item.severity,

            item.resource_type ||
              '',

            item.resource_id ??
              '',

            item.source_ip ||
              '',

            item.detail ||
              '',
          ]
        ),
      ]


      const csv =
        rows
          .map(
            row =>
              row
                .map(csvEscape)
                .join(',')
          )
          .join('\n')


      const blob =
        new Blob(
          [
            '\uFEFF',
            csv,
          ],
          {
            type:
              'text/csv;charset=utf-8;',
          }
        )


      const url =
        URL.createObjectURL(
          blob
        )


      const anchor =
        document.createElement(
          'a'
        )

      anchor.href = url

      anchor.download =
        `aksara-audit-${range}-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`

      document.body
        .appendChild(anchor)

      anchor.click()
      anchor.remove()

      URL.revokeObjectURL(url)

    } catch (err) {

      console.error(err)

      setError(
        'Unable to export audit activity.'
      )

    } finally {

      setExporting(false)

    }
  }


  const getSeverityIcon =
    (
      severity: string
    ): IconName => {
      if (
        severity === 'CRITICAL'
      ) {
        return 'critical'
      }

      if (
        severity === 'WARNING'
      ) {
        return 'warning'
      }

      return 'info'
    }

  const effectiveSeverity =
    (
      item: AuditLog
    ) => {

      const actionName =
        (item.action || '')
          .toUpperCase()

      const backendSeverity =
        (item.severity || 'INFO')
          .toUpperCase()


      /*
       * Administrative session termination
       * is abnormal session closure and
       * should require operator attention.
       */
      if (
        actionName ===
          'RDP_SESSION_TERMINATED' ||
        actionName ===
          'SSH_SESSION_TERMINATED'
      ) {
        return 'WARNING'
      }


      /*
       * Denied / failed remote access
       * and authentication activity.
       */
      if (
        actionName.includes(
          'ACCESS_DENIED'
        ) ||
        actionName.includes(
          'AUTH_FAILED'
        ) ||
        actionName.includes(
          'LOGIN_FAILED'
        ) ||
        actionName.includes(
          'CONNECTION_FAILED'
        ) ||
        actionName.includes(
          'PERMISSION_DENIED'
        )
      ) {
        return 'WARNING'
      }


      /*
       * Preserve explicit CRITICAL
       * classification from backend.
       */
      if (
        backendSeverity ===
          'CRITICAL'
      ) {
        return 'CRITICAL'
      }


      if (
        backendSeverity ===
          'WARNING'
      ) {
        return 'WARNING'
      }


      return 'INFO'
    }


  const getTerminationDetail =
    (
      item: AuditLog
    ) => {

      const actionName =
        (item.action || '')
          .toUpperCase()

      if (
        !actionName.includes(
          'SESSION_TERMINATED'
        )
      ) {
        return null
      }

      const detail =
        item.detail || ''

      const readValue =
        (
          key: string
        ) => {

          const marker =
            `${key}=`

          const start =
            detail.indexOf(marker)

          if (start === -1) {
            return null
          }

          const valueStart =
            start + marker.length

          const separator =
            detail.indexOf(
              ';',
              valueStart
            )

          return (
            separator === -1
              ? detail.slice(valueStart)
              : detail.slice(
                  valueStart,
                  separator
                )
          ).trim()
        }

      return {
        sessionUser:
          readValue('session user'),

        target:
          readValue('target'),

        reason:
          readValue('reason'),
      }
    }


  const actorName =
    (
      item: AuditLog
    ) =>
      item.full_name ||
      item.username ||
      'System'

  const actorInitial =
    (
      item: AuditLog
    ) =>
      actorName(item)
        .charAt(0)
        .toUpperCase()

  return (
    <div className="audit-v3-page">

      <header className="audit-v3-header">

        <div className="audit-v3-header-copy">

          <div className="audit-v3-kicker">
            Security & Compliance
          </div>

          <h1>
            Audit Logs
          </h1>

          <p>
            Centralized security,
            authentication and remote
            access activity across
            AKSARA.
          </p>

        </div>

        <div className="audit-v3-header-actions">

          <div className="audit-v3-live">
            <span className="audit-v3-live-dot" />

            <div>
              <strong>
                Live
              </strong>

              <span>
                {lastUpdated
                  ? formatTime(
                      lastUpdated
                        .toISOString()
                    )
                  : '--:--:--'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="audit-v3-btn secondary"
            onClick={exportCsv}
            disabled={
              exporting ||
              data.total === 0
            }
          >
            <AuditIcon
              name="export"
              size={15}
            />

            {exporting
              ? 'Exporting...'
              : 'Export'}
          </button>

          <button
            type="button"
            className="audit-v3-btn primary"
            onClick={() =>
              void loadLogs()
            }
          >
            <AuditIcon
              name="refresh"
              size={15}
            />

            Refresh
          </button>

        </div>

      </header>


      <section className="audit-v3-summary">

        <article className="audit-v3-summary-card total">

          <div className="audit-v3-summary-icon">
            <AuditIcon
              name="activity"
              size={18}
            />
          </div>

          <div className="audit-v3-summary-content">

            <span className="audit-v3-summary-label">
              Total Events
            </span>

            <strong>
              {data.total_events}
            </strong>

            <small>
              {rangeLabel}
            </small>

          </div>

        </article>


        <article className="audit-v3-summary-card">

          <div className="audit-v3-summary-icon">
            <AuditIcon
              name="remote"
              size={18}
            />
          </div>

          <div className="audit-v3-summary-content">

            <span className="audit-v3-summary-label">
              Remote Access
            </span>

            <strong>
              {data.remote_access_events}
            </strong>

            <small>
              {remotePercent}% of events
            </small>

          </div>

        </article>


        <article
          className={
            `audit-v3-summary-card ${
              data.security_events > 0
                ? 'security'
                : ''
            }`
          }
        >

          <div className="audit-v3-summary-icon">
            <AuditIcon
              name="security"
              size={18}
            />
          </div>

          <div className="audit-v3-summary-content">

            <span className="audit-v3-summary-label">
              Security
            </span>

            <strong>
              {data.security_events}
            </strong>

            <small>
              {data.security_events > 0
                ? `${data.security_events} event requires review`
                : 'No security alerts'}
            </small>

          </div>

        </article>


        <article className="audit-v3-summary-card">

          <div className="audit-v3-summary-icon">
            <AuditIcon
              name="auth"
              size={18}
            />
          </div>

          <div className="audit-v3-summary-content">

            <span className="audit-v3-summary-label">
              Authentication
            </span>

            <strong>
              {data.authentication_events}
            </strong>

            <small>
              Login and auth activity
            </small>

          </div>

        </article>


        <article className="audit-v3-summary-card">

          <div className="audit-v3-summary-icon">
            <AuditIcon
              name="changes"
              size={18}
            />
          </div>

          <div className="audit-v3-summary-content">

            <span className="audit-v3-summary-label">
              Changes
            </span>

            <strong>
              {data.change_events}
            </strong>

            <small>
              Administrative activity
            </small>

          </div>

        </article>

      </section>


      <section className="audit-v3-panel">

        <div className="audit-v3-panel-head">

          <div>
            <h2>
              Audit Activity
            </h2>

            <p>
              Review recorded events for
              {` ${rangeLabel.toLowerCase()}`}.
            </p>
          </div>

          <div className="audit-v3-range">

            <button
              type="button"
              className={
                range === '1D'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setRange('1D')
              }
            >
              Today
            </button>

            <button
              type="button"
              className={
                range === '7D'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setRange('7D')
              }
            >
              7 Days
            </button>

            <button
              type="button"
              className={
                range === '30D'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setRange('30D')
              }
            >
              30 Days
            </button>

          </div>

        </div>


        <div className="audit-v3-toolbar">

          <div className="audit-v3-search">

            <AuditIcon
              name="search"
              size={16}
            />

            <input
              type="text"
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search user, event, IP, resource or detail..."
            />

            {search && (
              <button
                type="button"
                className="audit-v3-search-clear"
                onClick={() =>
                  setSearch('')
                }
              >
                <AuditIcon
                  name="close"
                  size={13}
                />
              </button>
            )}

          </div>


          <div className="audit-v3-filters">

            <select
              value={category}
              onChange={event =>
                setCategory(
                  event.target.value
                )
              }
            >
              {categories.map(
                item => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>

            <select
              value={action}
              onChange={event =>
                setAction(
                  event.target.value
                )
              }
            >
              <option value="ALL">
                All Events
              </option>

              {actions.map(
                item => (
                  <option
                    key={item}
                    value={item}
                  >
                    {formatAction(item)}
                  </option>
                )
              )}
            </select>

            <select
              value={pageSize}
              onChange={event =>
                setPageSize(
                  Number(
                    event.target.value
                  )
                )
              }
            >
              <option value={25}>
                25 / page
              </option>

              <option value={50}>
                50 / page
              </option>

              <option value={100}>
                100 / page
              </option>
            </select>

          </div>

        </div>


        {error && (
          <div className="audit-v3-error">
            <AuditIcon
              name="warning"
              size={16}
            />

            {error}
          </div>
        )}


        {loading ? (

          <div className="audit-v3-empty">

            <span className="audit-v3-spinner" />

            <strong>
              Loading audit activity
            </strong>

            <p>
              Retrieving recorded
              security events.
            </p>

          </div>

        ) : data.items.length === 0 ? (

          <div className="audit-v3-empty">

            <div className="audit-v3-empty-icon">
              <AuditIcon
                name="activity"
                size={22}
              />
            </div>

            <strong>
              No audit activity found
            </strong>

            <p>
              Try changing the date range
              or current filters.
            </p>

          </div>

        ) : (

          <>

            <div className="audit-v3-table-wrap">

              <table className="audit-v3-table">

                <thead>
                  <tr>
                    <th>
                      Time
                    </th>

                    <th>
                      Actor
                    </th>

                    <th>
                      Event
                    </th>

                    <th>
                      Resource
                    </th>

                    <th>
                      Source IP
                    </th>

                    <th>
                      Level
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>

                  {data.items.map(
                    item => (

                      <tr key={item.id}>

                        <td>
                          <div className="audit-v3-time">
                            <strong>
                              {formatTime(
                                item.created_at
                              )}
                            </strong>

                            <span>
                              {formatDate(
                                item.created_at
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="audit-v3-actor">

                            <div className="audit-v3-avatar">
                              {actorInitial(
                                item
                              )}
                            </div>

                            <div>
                              <strong>
                                {actorName(
                                  item
                                )}
                              </strong>

                              <span>
                                {item.username
                                  ? `@${item.username}`
                                  : 'System'}
                              </span>
                            </div>

                          </div>
                        </td>

                        <td>
                          <div className="audit-v3-event">

                            <strong>
                              {formatAction(
                                item.action
                              )}
                            </strong>

                            <span
                              className={
                                `audit-v3-category ${item.category.toLowerCase()}`
                              }
                            >
                              {categoryLabel(
                                item.category
                              )}
                            </span>

                          </div>
                        </td>

                        <td>
                          <div className="audit-v3-resource">

                            <strong>
                              {item.resource_name ||
                                item.resource_type ||
                                '—'}
                            </strong>

                            {item.resource_id !=
                              null && (
                              <span>
                                ID #{item.resource_id}
                              </span>
                            )}

                          </div>
                        </td>

                        <td>
                          <code className="audit-v3-ip">
                            {item.source_ip ||
                              '—'}
                          </code>
                        </td>

                        <td>
                          <span
                            className={
                              `audit-v3-severity ${effectiveSeverity(item).toLowerCase()}`
                            }
                          >
                            <AuditIcon
                              name={
                                getSeverityIcon(
                                  effectiveSeverity(item)
                                )
                              }
                              size={12}
                            />

                            {effectiveSeverity(item)}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="audit-v3-details-btn"
                            onClick={() =>
                              setSelectedLog(
                                item
                              )
                            }
                          >
                            Details
                          </button>
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>


            <div className="audit-v3-footer">

              <div className="audit-v3-result-count">
                Showing{' '}
                <strong>
                  {data.items.length}
                </strong>
                {' of '}
                <strong>
                  {data.total}
                </strong>
                {' events'}
              </div>

              <div className="audit-v3-pagination">

                <button
                  type="button"
                  disabled={
                    data.page <= 1
                  }
                  onClick={() =>
                    setPage(
                      current =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                >
                  <AuditIcon
                    name="chevron-left"
                    size={15}
                  />
                </button>

                <div>
                  Page{' '}
                  <strong>
                    {data.page}
                  </strong>
                  {' of '}
                  <strong>
                    {data.pages}
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={
                    data.page >=
                    data.pages
                  }
                  onClick={() =>
                    setPage(
                      current =>
                        Math.min(
                          data.pages,
                          current + 1
                        )
                    )
                  }
                >
                  <AuditIcon
                    name="chevron-right"
                    size={15}
                  />
                </button>

              </div>

            </div>

          </>

        )}

      </section>


      {selectedLog && (

        <div
          className="audit-v3-modal-backdrop"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedLog(null)
            }
          }}
        >

          <div className="audit-v3-modal">

            <div className="audit-v3-modal-head">

              <div>
                <span>
                  Audit Event #{selectedLog.id}
                </span>

                <h2>
                  {formatAction(
                    selectedLog.action
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
              >
                <AuditIcon
                  name="close"
                  size={17}
                />
              </button>

            </div>


            <div className="audit-v3-modal-summary">

              <div>
                <AuditIcon
                  name="clock"
                  size={16}
                />

                <span>
                  Timestamp
                </span>

                <strong>
                  {formatDateTime(
                    selectedLog.created_at
                  )}
                </strong>
              </div>

              <div>
                <AuditIcon
                  name="user"
                  size={16}
                />

                <span>
                  Actor
                </span>

                <strong>
                  {actorName(
                    selectedLog
                  )}
                </strong>
              </div>

              <div>
                <AuditIcon
                  name="resource"
                  size={16}
                />

                <span>
                  Resource
                </span>

                <strong>
                  {selectedLog.resource_type ||
                    '—'}

                  {selectedLog.resource_id !=
                    null
                    ? ` #${selectedLog.resource_id}`
                    : ''}
                </strong>
              </div>

              <div>
                <AuditIcon
                  name="ip"
                  size={16}
                />

                <span>
                  Source IP
                </span>

                <strong>
                  {selectedLog.source_ip ||
                    '—'}
                </strong>
              </div>

            </div>


            <div className="audit-v3-modal-meta">

              <div>
                <span>
                  Category
                </span>

                <strong>
                  {categoryLabel(
                    selectedLog.category
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Severity
                </span>

                <span
                  className={
                    `audit-v3-severity ${effectiveSeverity(selectedLog).toLowerCase()}`
                  }
                >
                  <AuditIcon
                    name={
                      getSeverityIcon(
                        effectiveSeverity(selectedLog)
                      )
                    }
                    size={12}
                  />

                  {effectiveSeverity(selectedLog)}
                </span>
              </div>

              <div>
                <span>
                  Username
                </span>

                <strong>
                  {selectedLog.username ||
                    'System'}
                </strong>
              </div>

              <div>
                <span>
                  Event ID
                </span>

                <strong>
                  #{selectedLog.id}
                </strong>
              </div>

            </div>


            <div className="audit-v3-detail-block">

              <div className="audit-v3-detail-title">
                Event Detail
              </div>

              {getTerminationDetail(
                selectedLog
              ) ? (

                <div className="audit-v4-termination-detail">

                  <div>
                    <span>
                      Session User
                    </span>

                    <strong>
                      {getTerminationDetail(
                        selectedLog
                      )?.sessionUser || '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Target
                    </span>

                    <strong>
                      {getTerminationDetail(
                        selectedLog
                      )?.target || '—'}
                    </strong>
                  </div>

                  <div className="reason">
                    <span>
                      Reason
                    </span>

                    <strong>
                      {getTerminationDetail(
                        selectedLog
                      )?.reason || '—'}
                    </strong>
                  </div>

                </div>

              ) : (

                <pre>
                  {selectedLog.detail ||
                    'No additional detail recorded for this event.'}
                </pre>

              )}

            </div>


            <div className="audit-v3-modal-actions">

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default AuditLogsPage
