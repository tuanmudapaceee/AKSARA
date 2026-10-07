import {
  useEffect,
  useMemo,
  useState,
} from 'react'


type SessionRecord = {
  id: number
  user_id: number
  username?: string | null

  server_id: number
  server_name?: string | null

  protocol: string

  remote_username?: string | null
  source_ip?: string | null

  started_at?: string | null
  ended_at?: string | null

  status: string

  duration_seconds?: number | null

  audit_session?: number | null
  tty?: string | null
  remote_shell_pid?: number | null
}


type ActivityEvent = {
  source: string
  source_id: number

  type: string
  category: string

  time: string

  remote_username?: string | null

  command?: string | null
  target?: string | null
  path?: string | null
  process?: string | null
  syscall?: string | null

  success?: boolean | null

  audit_session?: number | null
  tty?: string | null

  pid?: number | null
  ppid?: number | null
  auid?: number | null

  detail?: string | null
  raw_detail?: string | null
}


type ActivitySummary = {
  total_events: number
  commands: number
  files: number
  identity: number
  packages: number
  services: number
  containers: number
  processes: number
  network: number
}


type ActivitySession = {
  id: number
  user_id: number
  username?: string | null

  server_id: number
  server_name?: string | null
  server_ip?: string | null

  protocol: string
  source_ip?: string | null
  remote_username?: string | null

  status: string

  started_at?: string | null
  ended_at?: string | null

  audit_session?: number | null
  tty?: string | null
  remote_shell_pid?: number | null

  termination?: {
    terminated_by?: string | null
    terminated_by_user_id?: number | null
    reason?: string | null
    terminated_at?: string | null
  } | null

}


type ActivityResponse = {
  session: ActivitySession
  summary: ActivitySummary
  events: ActivityEvent[]
}


type Props = {
  token: string
  onUnauthorized: () => void
}


type StatusFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'CLOSED'
  | 'TERMINATED'


type ProtocolFilter =
  | 'ALL'
  | 'SSH'
  | 'RDP'
  | 'VNC'


type SessionRange =
  | '1D'
  | '7D'
  | '30D'


type ActivityFilter =
  | 'IMPORTANT'
  | 'ALL'
  | 'COMMAND'
  | 'FILE'
  | 'IDENTITY'
  | 'PACKAGE'
  | 'SERVICE'
  | 'CONTAINER'


const ACTIVITY_FILTERS: {
  value: ActivityFilter
  label: string
}[] = [
  {
    value: 'IMPORTANT',
    label: 'Important',
  },
  {
    value: 'COMMAND',
    label: 'Commands',
  },
  {
    value: 'FILE',
    label: 'Files',
  },
  {
    value: 'IDENTITY',
    label: 'Identity',
  },
  {
    value: 'PACKAGE',
    label: 'Packages',
  },
  {
    value: 'SERVICE',
    label: 'Services',
  },
  {
    value: 'CONTAINER',
    label: 'Containers',
  },
  {
    value: 'ALL',
    label: 'All Events',
  },
]


function SessionsPage({
  token,
  onUnauthorized,
}: Props) {

  const [sessions, setSessions] =
    useState<SessionRecord[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>('ALL')

  const [
    protocolFilter,
    setProtocolFilter,
  ] =
    useState<ProtocolFilter>('ALL')

  const [
    sessionRange,
    setSessionRange,
  ] =
    useState<SessionRange>('1D')

  const [page, setPage] =
    useState(1)

  const [pageSize, setPageSize] =
    useState(10)


  const [
    selectedSession,
    setSelectedSession,
  ] =
    useState<SessionRecord | null>(
      null
    )

  const [
    activityData,
    setActivityData,
  ] =
    useState<ActivityResponse | null>(
      null
    )

  const [
    activityLoading,
    setActivityLoading,
  ] =
    useState(false)

  const [
    activityError,
    setActivityError,
  ] =
    useState('')

  const [
    activityFilter,
    setActivityFilter,
  ] =
    useState<ActivityFilter>('IMPORTANT')

  const [
    activitySearch,
    setActivitySearch,
  ] =
    useState('')

  const [
    showProcesses,
    setShowProcesses,
  ] =
    useState(false)



  const [
    terminateTarget,
    setTerminateTarget,
  ] =
    useState<SessionRecord | null>(
      null
    )

  const [
    terminateReason,
    setTerminateReason,
  ] =
    useState(
      'Administrative termination'
    )

  const [
    terminateBusy,
    setTerminateBusy,
  ] =
    useState(false)

  const [
    terminateError,
    setTerminateError,
  ] =
    useState('')


  const loadSessions =
    async (
      silent = false
    ) => {

      if (!silent) {
        setLoading(true)
      }

      try {

        const response =
          await fetch(
            '/api/sessions/',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          )

        if (
          response.status === 401
        ) {
          onUnauthorized()
          return
        }

        if (!response.ok) {
          throw new Error(
            'Failed to load sessions'
          )
        }

        const data =
          await response.json()

        setSessions(
          Array.isArray(data)
            ? data
            : []
        )

        setError('')

      } catch {

        setError(
          'Unable to load session history.'
        )

      } finally {

        if (!silent) {
          setLoading(false)
        }

      }

    }


  const loadSessionTimeline =
    async (
      sessionId: number,
      silent = false
    ) => {

      if (!silent) {
        setActivityLoading(true)
      }

      try {

        const response =
          await fetch(
            `/api/server-activity/session/${sessionId}/timeline`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          )

        if (
          response.status === 401
        ) {
          onUnauthorized()
          return
        }

        if (!response.ok) {
          throw new Error(
            'Failed to load activity'
          )
        }

        const data:
          ActivityResponse =
          await response.json()

        setActivityData(data)

        setActivityError('')

      } catch {

        setActivityError(
          'Unable to load session activity.'
        )

      } finally {

        if (!silent) {
          setActivityLoading(false)
        }

      }

    }


  const openTerminateModal = (
    session: SessionRecord
  ) => {

    if (
      session.status.toUpperCase() !==
        'ACTIVE' ||
      session.protocol.toUpperCase() !==
        'RDP'
    ) {
      return
    }

    setTerminateTarget(session)

    setTerminateReason(
      'Administrative termination'
    )

    setTerminateError('')
  }


  const closeTerminateModal = () => {

    if (terminateBusy) {
      return
    }

    setTerminateTarget(null)
    setTerminateReason('')
    setTerminateError('')
  }


  const confirmTerminateSession =
    async () => {

      if (!terminateTarget) {
        return
      }

      const trimmedReason =
        terminateReason.trim()

      if (!trimmedReason) {
        setTerminateError(
          'Termination reason is required.'
        )
        return
      }

      setTerminateBusy(true)
      setTerminateError('')

      try {

        const response =
          await fetch(
            `/api/sessions/${terminateTarget.id}/terminate`,
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${token}`,
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                reason: trimmedReason,
              }),
            }
          )

        if (response.status === 401) {
          onUnauthorized()
          return
        }

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              'Failed to terminate session'
          )
        }

        await loadSessions(true)

        if (!data.control_delivered) {
          setTerminateError(
            data.message ||
              'Session was marked TERMINATED, but live disconnect was not confirmed.'
          )
          return
        }

        setTerminateTarget(null)
        setTerminateReason('')
        setTerminateError('')

      } catch (error) {

        setTerminateError(
          error instanceof Error
            ? error.message
            : 'Unable to terminate session.'
        )

      } finally {

        setTerminateBusy(false)

      }

    }


  const openActivity =
    async (
      session: SessionRecord
    ) => {

      setSelectedSession(session)

      setActivityData(null)
      setActivityError('')
      setActivitySearch('')
      setActivityFilter('IMPORTANT')
      setShowProcesses(false)

      await loadSessionTimeline(
        session.id
      )

    }


  const closeActivity = () => {

    setSelectedSession(null)
    setActivityData(null)

    setActivityError('')
    setActivitySearch('')
    setActivityFilter('IMPORTANT')
    setShowProcesses(false)

  }


  useEffect(() => {

    loadSessions()

    const interval =
      window.setInterval(
        () => {

          if (!document.hidden) {
            loadSessions(true)
          }

        },
        3000
      )

    return () => {
      window.clearInterval(
        interval
      )
    }

  }, [token])


  useEffect(() => {

    if (!selectedSession) {
      return
    }

    if (
      selectedSession.status
        .toUpperCase() !==
      'ACTIVE'
    ) {
      return
    }

    const interval =
      window.setInterval(
        () => {

          if (!document.hidden) {
            loadSessionTimeline(
              selectedSession.id,
              true
            )
          }

        },
        2000
      )

    return () => {
      window.clearInterval(
        interval
      )
    }

  }, [
    token,
    selectedSession?.id,
    selectedSession?.status,
  ])


  useEffect(() => {

    if (!selectedSession) {
      return
    }

    const updated =
      sessions.find(
        item =>
          item.id ===
          selectedSession.id
      )

    if (updated) {
      setSelectedSession(updated)
    }

  }, [sessions])


  useEffect(() => {

    if (!selectedSession) {
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

  }, [selectedSession])


  useEffect(() => {

    const handleEscape = (
      event: KeyboardEvent
    ) => {

      if (
        event.key === 'Escape' &&
        selectedSession
      ) {
        closeActivity()
      }

    }

    window.addEventListener(
      'keydown',
      handleEscape
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape
      )
    }

  }, [selectedSession])


  useEffect(() => {

    setPage(1)

  }, [
    search,
    statusFilter,
    protocolFilter,
    pageSize,
    sessionRange,
  ])


  const formatSessionId = (
    session: {
      id: number
    }
  ) => {

    const sequence =
      String(
        session.id
      ).padStart(
        3,
        '0'
      )

    return `SES-${sequence}`
  }


  const formatDate = (
    value?: string | null
  ) => {

    if (!value) {
      return '-'
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-'
    }

    const datePart =
      date.toLocaleDateString(
        'en-GB',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }
      )

    const timePart =
      date.toLocaleTimeString(
        'en-GB',
        {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      )

    return `${datePart}, ${timePart}`
  }


  const formatTime = (
    value?: string | null
  ) => {

    if (!value) {
      return '-'
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-'
    }

    return date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }
    )
  }


  const formatDuration = (
    seconds?: number | null
  ) => {

    if (
      seconds === null ||
      seconds === undefined ||
      Number.isNaN(seconds)
    ) {
      return '-'
    }

    const value =
      Math.max(
        0,
        Math.floor(seconds)
      )

    const hours =
      Math.floor(
        value / 3600
      )

    const minutes =
      Math.floor(
        (
          value % 3600
        ) / 60
      )

    const secs =
      value % 60

    if (hours > 0) {
      return (
        `${hours}h ${minutes}m`
      )
    }

    if (minutes > 0) {
      return (
        `${minutes}m ${secs}s`
      )
    }

    return `${secs}s`
  }


  const getDurationSeconds = (
    session: SessionRecord
  ) => {

    if (
      session.duration_seconds !==
        null &&
      session.duration_seconds !==
        undefined
    ) {
      return (
        session.duration_seconds
      )
    }

    if (!session.started_at) {
      return null
    }

    const started =
      new Date(
        session.started_at
      ).getTime()

    const ended =
      session.ended_at
        ? new Date(
            session.ended_at
          ).getTime()
        : Date.now()

    if (
      Number.isNaN(started) ||
      Number.isNaN(ended)
    ) {
      return null
    }

    return Math.max(
      0,
      Math.floor(
        (
          ended - started
        ) / 1000
      )
    )

  }


  const rangeDays =
    sessionRange === '1D'
      ? 1
      : sessionRange === '7D'
        ? 7
        : 30


  const rangeLabel =
    sessionRange === '1D'
      ? 'Last 24 hours'
      : sessionRange === '7D'
        ? 'Last 7 days'
        : 'Last 30 days'


  const rangeSessions =
    useMemo(
      () => {

        /*
         * Rolling time window:
         *
         * 1D  = last 24 hours
         * 7D  = last 7 x 24 hours
         * 30D = last 30 x 24 hours
         *
         * This prevents sessions from disappearing
         * immediately after the calendar date changes.
         */

        const nowTime =
          Date.now()

        const rangeMs =
          rangeDays *
          24 *
          60 *
          60 *
          1000

        const startTime =
          nowTime - rangeMs

        return sessions.filter(
          session => {

            if (!session.started_at) {
              return false
            }

            const started =
              new Date(
                session.started_at
              ).getTime()

            return (
              !Number.isNaN(started) &&
              started >= startTime &&
              started <= nowTime
            )

          }
        )

      },
      [
        sessions,
        rangeDays,
      ]
    )


  const activeCount =
    sessions.filter(
      item =>
        item.status
          .toUpperCase() ===
        'ACTIVE'
    ).length


  const closedCount =
    rangeSessions.filter(
      item =>
        item.status
          .toUpperCase() ===
        'CLOSED'
    ).length


  const terminatedCount =
    rangeSessions.filter(
      item =>
        item.status
          .toUpperCase() ===
        'TERMINATED'
    ).length


  const filteredSessions =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase()

        return rangeSessions.filter(
          session => {

            const status =
              session.status
                .toUpperCase()

            const protocol =
              session.protocol
                .toUpperCase()

            if (
              statusFilter !==
                'ALL' &&
              status !==
                statusFilter
            ) {
              return false
            }

            if (
              protocolFilter !==
                'ALL' &&
              protocol !==
                protocolFilter
            ) {
              return false
            }

            if (!keyword) {
              return true
            }

            const haystack = [
              session.id,
              session.username,
              session.server_name,
              session.remote_username,
              session.source_ip,
              session.protocol,
              session.status,
              session.audit_session,
              session.tty,
            ]
              .filter(
                value =>
                  value !== null &&
                  value !== undefined
              )
              .join(' ')
              .toLowerCase()

            return haystack.includes(
              keyword
            )

          }
        )

      },
      [
        rangeSessions,
        search,
        statusFilter,
        protocolFilter,
      ]
    )


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredSessions.length /
        pageSize
      )
    )


  const safePage =
    Math.min(
      page,
      totalPages
    )


  const firstIndex =
    (
      safePage - 1
    ) * pageSize


  const paginatedSessions =
    filteredSessions.slice(
      firstIndex,
      firstIndex + pageSize
    )


  const resultStart =
    filteredSessions.length === 0
      ? 0
      : firstIndex + 1


  const resultEnd =
    Math.min(
      firstIndex + pageSize,
      filteredSessions.length
    )


  const isIdentitySupportingPath = (
    value?: string | null
  ) => {

    if (!value) {
      return false
    }

    const path =
      value.toLowerCase()


    const identityFiles = [
      '/etc/.pwd.lock',
      '/etc/passwd',
      '/etc/passwd-',
      '/etc/group',
      '/etc/group-',
      '/etc/shadow',
      '/etc/shadow-',
      '/etc/gshadow',
      '/etc/gshadow-',
      '/etc/subuid',
      '/etc/subuid-',
      '/etc/subgid',
      '/etc/subgid-',
    ]


    return identityFiles.includes(
      path
    )
  }


  const isPackageSupportingPath = (
    value?: string | null
  ) => {

    if (!value) {
      return false
    }

    const path =
      value.toLowerCase()


    const prefixes = [
      '/var/lib/dpkg/',
      '/var/lib/apt/',
      '/var/cache/apt/',
      '/var/cache/debconf/',
      '/var/lib/ucf/',
      '/var/lib/update-notifier/',
    ]


    return prefixes.some(
      prefix =>
        path.startsWith(prefix)
    )
  }


  const isRuntimeNoisePath = (
    value?: string | null
  ) => {

    if (!value) {
      return false
    }

    const path =
      value.toLowerCase()


    const prefixes = [
      '/var/lib/landscape/',
      '/var/cache/',
      '/var/log/',
      '/var/tmp/',
      '/run/',
      '/var/run/',
      '/proc/',
      '/sys/',
      '/dev/',
      '/var/lib/systemd/',
      '/var/lib/private/',
      '/var/lib/cloud/',
      '/var/lib/snapd/',
      '/var/lib/command-not-found/',
    ]


    return prefixes.some(
      prefix =>
        path.startsWith(prefix)
    )
  }


  const isInternalEditorFile = (
    value?: string | null
  ) => {

    if (!value) {
      return false
    }

    const path =
      value.toLowerCase()

    const name =
      path
        .split('/')
        .pop() || ''


    return (
      name.endsWith('~') ||
      name.endsWith('.swp') ||
      name.endsWith('.swo') ||
      name.endsWith('.swx') ||
      name.endsWith('.tmp') ||
      name.startsWith('.#') ||
      (
        name.startsWith('#') &&
        name.endsWith('#')
      )
    )
  }


  const isNoisyActivityEvent = (
    event: ActivityEvent
  ) => {

    const category =
      (
        event.category ||
        'SYSTEM'
      ).toUpperCase()

    const path =
      event.path ||
      event.target ||
      null

    const process =
      (
        event.process ||
        ''
      ).toLowerCase()


    if (
      category === 'PROCESS'
    ) {
      return true
    }


    if (
      isIdentitySupportingPath(
        path
      )
    ) {
      return true
    }


    if (
      isPackageSupportingPath(
        path
      )
    ) {
      return true
    }


    if (
      isRuntimeNoisePath(
        path
      )
    ) {
      return true
    }


    if (
      isInternalEditorFile(
        path
      )
    ) {
      return true
    }


    const noisyProcesses = [
      '/usr/bin/base64',
      '/usr/bin/tr',
    ]


    if (
      noisyProcesses.includes(
        process
      )
    ) {
      return true
    }


    return false
  }


  const isImportantActivityEvent = (
    event: ActivityEvent
  ) => {

    const category =
      (
        event.category ||
        'SYSTEM'
      ).toUpperCase()


    /*
     * Semantic activities are always important.
     *
     * These are higher value than the low-level
     * filesystem/syscall events which caused them.
     */

    if (
      [
        'SESSION',
        'COMMAND',
        'IDENTITY',
        'PACKAGE',
        'SERVICE',
        'CONTAINER',
        'NETWORK',
        'SECURITY',
      ].includes(category)
    ) {
      return true
    }


    /*
     * File events are useful when they describe an
     * actual user/application configuration change.
     *
     * Internal identity/package/runtime supporting
     * files are intentionally hidden from Important
     * because a higher-level semantic event already
     * represents the same action.
     */

    if (
      category === 'FILE'
    ) {

      if (
        isNoisyActivityEvent(
          event
        )
      ) {
        return false
      }


      const path =
        (
          event.path ||
          event.target ||
          ''
        ).toLowerCase()


      const relevantPrefixes = [
        '/etc/',
        '/opt/',
        '/srv/',
        '/home/',
        '/root/',
        '/var/www/',
        '/usr/local/',
        '/tmp/',
      ]


      return relevantPrefixes.some(
        prefix =>
          path.startsWith(prefix)
      )
    }


    return false
  }


  const importantActivityEvents =
    useMemo(
      () => {

        if (!activityData) {
          return []
        }


        return activityData.events.filter(
          event =>
            isImportantActivityEvent(
              event
            )
        )

      },
      [activityData]
    )


  const filteredActivityEvents =
    useMemo(
      () => {

        if (!activityData) {
          return []
        }


        const keyword =
          activitySearch
            .trim()
            .toLowerCase()


        return activityData.events.filter(
          event => {

            const category =
              (
                event.category ||
                'SYSTEM'
              ).toUpperCase()


            if (
              activityFilter ===
                'IMPORTANT' &&
              !isImportantActivityEvent(
                event
              )
            ) {
              return false
            }


            if (
              activityFilter !==
                'IMPORTANT' &&
              activityFilter !==
                'ALL' &&
              category !==
                activityFilter
            ) {
              return false
            }


            if (
              category ===
                'PROCESS' &&
              !showProcesses
            ) {
              return false
            }


            if (
              activityFilter ===
                'ALL' &&
              category ===
                'PROCESS' &&
              !showProcesses
            ) {
              return false
            }


            if (!keyword) {
              return true
            }


            const haystack = [
              event.type,
              event.category,
              event.remote_username,
              event.command,
              event.target,
              event.path,
              event.process,
              event.syscall,
              event.detail,
              event.tty,
              event.audit_session,
            ]
              .filter(
                value =>
                  value !== null &&
                  value !== undefined
              )
              .join(' ')
              .toLowerCase()


            return haystack.includes(
              keyword
            )

          }
        )

      },
      [
        activityData,
        activityFilter,
        activitySearch,
        showProcesses,
      ]
    )


  const downloadAllEvents = () => {

    if (
      !activityData ||
      !selectedSession
    ) {
      return
    }


    const csvEscape = (
      value:
        string |
        number |
        boolean |
        null |
        undefined
    ) => {

      if (
        value === null ||
        value === undefined
      ) {
        return '""'
      }


      const normalized =
        String(value)
          .replace(
            /\r?\n/g,
            ' '
          )
          .replace(
            /"/g,
            '""'
          )


      return `"${normalized}"`
    }


    const headers = [
      'event_time',
      'session_id',
      'server_id',
      'server_name',
      'aksara_user',
      'source_ip',
      'protocol',
      'remote_username',
      'event_type',
      'category',
      'source',
      'success',
      'command',
      'path',
      'target',
      'process',
      'syscall',
      'tty',
      'audit_session',
      'pid',
      'ppid',
      'auid',
      'detail',
      'raw_detail',
    ]


    const rows =
      activityData.events.map(
        event => [
          event.time,
          selectedSession.id,
          selectedSession.server_id,
          selectedSession.server_name ||
            '',
          selectedSession.username ||
            '',
          selectedSession.source_ip ||
            '',
          selectedSession.protocol,
          event.remote_username ||
            selectedSession.remote_username ||
            '',
          event.type,
          event.category,
          event.source,
          event.success === null ||
          event.success === undefined
            ? ''
            : event.success
              ? 'SUCCESS'
              : 'FAILED',
          event.command || '',
          event.path || '',
          event.target || '',
          event.process || '',
          event.syscall || '',
          event.tty || '',
          event.audit_session ?? '',
          event.pid ?? '',
          event.ppid ?? '',
          event.auid ?? '',
          event.detail || '',
          event.raw_detail || '',
        ]
      )


    const csv =
      [
        headers.map(
          csvEscape
        ).join(','),

        ...rows.map(
          row =>
            row.map(
              csvEscape
            ).join(',')
        ),
      ].join('\r\n')


    /*
     * UTF-8 BOM makes the CSV friendlier
     * when opened directly in Microsoft Excel.
     */

    const blob =
      new Blob(
        [
          '\uFEFF',
          csv,
        ],
        {
          type:
            'text/csv;charset=utf-8',
        }
      )


    const url =
      URL.createObjectURL(
        blob
      )


    const now =
      new Date()

    const stamp =
      now
        .toISOString()
        .replace(
          /[:.]/g,
          '-'
        )


    const link =
      document.createElement(
        'a'
      )

    link.href = url

    link.download =
      `aksara-session-${selectedSession.id}-all-events-${stamp}.csv`


    document.body.appendChild(
      link
    )

    link.click()

    link.remove()

    URL.revokeObjectURL(
      url
    )
  }


  /*
   * =====================================================
   * SELECTED SESSION PROTOCOL
   * =====================================================
   *
   * Session Activity supports multiple remote protocols.
   * Keep protocol-specific presentation decisions in the
   * frontend without changing the underlying audit data.
   */
  const selectedProtocol =
    (
      selectedSession?.protocol ||
      activityData?.session?.protocol ||
      'SSH'
    ).toUpperCase()

  const isRdpSession =
    selectedProtocol === 'RDP'


  const getEventTitle = (
    event: ActivityEvent
  ) => {

    const protocol =
      (
        selectedSession?.protocol ||
        'SSH'
      ).toUpperCase()

    switch (
      event.type.toUpperCase()
    ) {

      case 'SESSION_STARTED':
        return (
          `Remote ${protocol} session established`
        )

      case 'SESSION_ENDED':
        return (
          `Remote ${protocol} session closed`
        )

      case 'COMMAND_EXECUTED':
        return (
          event.command ||
          'Command executed'
        )

      default:
        return (
          event.path ||
          event.target ||
          event.command ||
          event.detail ||
          event.type
        )

    }

  }


  const getEventSubtitle = (
    event: ActivityEvent
  ) => {

    const parts: string[] =
      []

    if (
      event.process &&
      event.process !==
        event.path
    ) {
      parts.push(
        event.process
      )
    }

    if (event.syscall) {
      parts.push(
        event.syscall
      )
    }

    if (event.tty) {
      parts.push(
        event.tty
      )
    }

    if (
      event.success === true
    ) {
      parts.push(
        'SUCCESS'
      )
    }

    if (
      event.success === false
    ) {
      parts.push(
        'FAILED'
      )
    }

    return parts.join(
      ' · '
    )

  }


  const getCategoryCode = (
    category: string
  ) => {

    switch (
      category.toUpperCase()
    ) {

      case 'SESSION':
        return 'S'

      case 'COMMAND':
        return '>_'

      case 'FILE':
        return 'F'

      case 'IDENTITY':
        return 'ID'

      case 'PACKAGE':
        return 'PK'

      case 'SERVICE':
        return 'SV'

      case 'CONTAINER':
        return 'CT'

      case 'NETWORK':
        return 'NW'

      case 'SECURITY':
        return 'SC'

      case 'PROCESS':
        return 'P'

      default:
        return '•'

    }

  }


  return (
    <>

      <header
        className="sessions-v3-header"
      >

        <div>

          <div
            className="sessions-v3-eyebrow"
          >
            Sessions
          </div>

          <h1>
            Remote Session Activity
          </h1>

          <p>
            Centralized remote access
            monitoring, session history
            and privileged activity audit.
          </p>

        </div>


        <button
          type="button"
          className="sessions-v3-refresh"

          onClick={() =>
            loadSessions()
          }
        >

          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M20 6v5h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <path
              d="M18.4 16.5A8 8 0 1 1 19 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          Refresh

        </button>

      </header>


      <section
        className="sessions-v3-summary"
      >

        <div
          className={`sessions-v3-summary-card sessions-v3-kpi-total ${
            statusFilter === 'ALL'
              ? 'selected'
              : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatusFilter('ALL')
            setPage(1)
          }}
        >

          <div className="sessions-v3-summary-icon">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M4 7h16M4 12h16M4 17h10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

          </div>

          <div className="sessions-v3-summary-content">

            <span>
              Total Sessions
            </span>

            <strong>
              {rangeSessions.length}
            </strong>

            <small>
              {rangeLabel}
            </small>

          </div>

        </div>


        <div
          className={`sessions-v3-summary-card sessions-v3-kpi-active ${
            statusFilter === 'ACTIVE'
              ? 'selected'
              : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatusFilter('ACTIVE')
            setPage(1)
          }}
        >

          <div className="sessions-v3-summary-icon active">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="3"
                fill="currentColor"
              />

              <path
                d="M5.6 8.5a7.5 7.5 0 0 0 0 7M18.4 8.5a7.5 7.5 0 0 1 0 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />

              <path
                d="M3 6a11 11 0 0 0 0 12M21 6a11 11 0 0 1 0 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

          </div>

          <div className="sessions-v3-summary-content">

            <span>
              Active Sessions
            </span>

            <strong>
              {activeCount}
            </strong>

            <small>
              Live connections
            </small>

          </div>

        </div>


        <div
          className={`sessions-v3-summary-card sessions-v3-kpi-closed ${
            statusFilter === 'CLOSED'
              ? 'selected'
              : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatusFilter('CLOSED')
            setPage(1)
          }}
        >

          <div className="sessions-v3-summary-icon">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <path
                d="m8.5 12 2.2 2.2 4.8-4.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

          </div>

          <div className="sessions-v3-summary-content">

            <span>
              Closed Sessions
            </span>

            <strong>
              {closedCount}
            </strong>

            <small>
              Normal session closure
            </small>

          </div>

        </div>


        <div
          className={`sessions-v3-summary-card sessions-v3-kpi-terminated ${
            statusFilter === 'TERMINATED'
              ? 'selected'
              : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatusFilter('TERMINATED')
            setPage(1)
          }}
        >

          <div className="sessions-v3-summary-icon">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <path
                d="M9 9l6 6M15 9l-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

          </div>

          <div className="sessions-v3-summary-content">

            <span>
              Terminated
            </span>

            <strong>
              {terminatedCount}
            </strong>

            <small>
              Administrative termination
            </small>

          </div>

        </div>

      </section>


      <section
        className="sessions-v3-panel"
      >

        <div
          className="sessions-v3-panel-head"
        >

          <div>

            <h2>
              Session History
            </h2>

            <p>
              Remote connections across
              managed infrastructure.
            </p>

          </div>


          <div
            className="sessions-v3-range-wrap"
          >

            <div
              className="sessions-v3-range"
            >

              {(
                [
                  [
                    '1D',
                    '1 Day',
                  ],
                  [
                    '7D',
                    '7 Days',
                  ],
                  [
                    '30D',
                    '30 Days',
                  ],
                ] as const
              ).map(
                (
                  [
                    value,
                    label,
                  ]
                ) => (

                  <button
                    key={value}

                    type="button"

                    className={
                      sessionRange ===
                        value
                        ? 'active'
                        : ''
                    }

                    onClick={() =>
                      setSessionRange(
                        value
                      )
                    }
                  >
                    {label}
                  </button>

                )
              )}

            </div>


            <span
              className="sessions-v3-result-pill"
            >
              {filteredSessions.length}
              {' '}
              sessions
            </span>

          </div>

        </div>


        <div
          className="sessions-v3-toolbar"
        >

          <div
            className="sessions-v3-search"
          >

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
              type="text"

              value={search}

              placeholder=
                "Search session, user, target, IP..."

              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
            />

          </div>


          <div
            className="sessions-v3-filters"
          >

            <select
              value={
                protocolFilter
              }

              onChange={
                event =>
                  setProtocolFilter(
                    event.target
                      .value as
                      ProtocolFilter
                  )
              }
            >
              <option value="ALL">
                All Protocols
              </option>

              <option value="SSH">
                SSH
              </option>

              <option value="RDP">
                RDP
              </option>

              <option value="VNC">
                VNC
              </option>
            </select>


            <select
              value={
                statusFilter
              }

              onChange={
                event =>
                  setStatusFilter(
                    event.target
                      .value as
                      StatusFilter
                  )
              }
            >
              <option value="ALL">
                All Status
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="CLOSED">
                Closed
              </option>

              <option value="TERMINATED">
                Terminated
              </option>
            </select>


            <select
              value={
                pageSize
              }

              onChange={
                event =>
                  setPageSize(
                    Number(
                      event.target.value
                    )
                  )
              }
            >
              <option value={10}>
                10 per page
              </option>

              <option value={25}>
                25 per page
              </option>

              <option value={50}>
                50 per page
              </option>
            </select>

          </div>

        </div>


        {error && (

          <div
            className="sessions-v3-error"
          >
            {error}
          </div>

        )}


        {loading ? (

          <div
            className="sessions-v3-empty"
          >
            Loading sessions...
          </div>

        ) :
        filteredSessions.length ===
          0 ? (

          <div
            className="sessions-v3-empty"
          >

            <strong>
              No sessions found
            </strong>

            <span>
              Try adjusting search,
              status, protocol or
              date range.
            </span>

          </div>

        ) : (

          <>

            <div
              className="sessions-v3-table"
            >

              <div
                className="sessions-v3-table-head"
              >
                <span>Session</span>
                <span>AKSARA User</span>
                <span>Remote Target</span>
                <span>Started</span>
                <span>Duration</span>
                <span>Status</span>
                <span>Action</span>
              </div>


              {paginatedSessions.map(
                session => {

                  const status =
                    session.status
                      .toUpperCase()

                  return (

                    <div
                      className="sessions-v3-row"

                      key={
                        session.id
                      }
                    >

                      <div
                        className="sessions-v3-session-cell"
                      >

                        <strong>
                          {formatSessionId(
                            session
                          )}
                        </strong>

                        <span>
                          {session.protocol}
                        </span>

                      </div>


                      <div
                        className="sessions-v3-user-cell"
                      >

                        <div
                          className="sessions-v3-avatar"
                        >
                          {(
                            session.username ||
                            'U'
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>


                        <div>

                          <strong>
                            {session.username ||
                              `User ${session.user_id}`}
                          </strong>

                        </div>

                      </div>


                      <div
                        className="sessions-v3-target-cell"
                      >

                        <strong>
                          {session.server_name ||
                            `Server ${session.server_id}`}
                        </strong>

                        <small>
                          {session.remote_username ||
                            '-'}
                          {' · '}
                          {session.protocol}
                        </small>

                      </div>


                      <div
                        className="sessions-v3-start-cell"
                      >

                        <strong>
                          {formatDate(
                            session.started_at
                          )}
                        </strong>

                        {status ===
                          'CLOSED' &&
                          session.ended_at && (

                          <small>
                            Ended{' '}
                            {formatTime(
                              session.ended_at
                            )}
                          </small>

                        )}

                      </div>


                      <div
                        className="sessions-v3-duration-cell"
                      >
                        {formatDuration(
                          getDurationSeconds(
                            session
                          )
                        )}
                      </div>


                      <div>

                        <span
                          className={
                            `sessions-v3-status ${status.toLowerCase()}`
                          }
                        >
                          <i />
                          {status}
                        </span>

                      </div>


                      <div
                        className="sessions-v3-action"
                      >

                        <button
                          type="button"

                          onClick={() =>
                            openActivity(
                              session
                            )
                          }
                        >
                          View Activity
                        </button>

                        {status ===
                          'ACTIVE' &&
                          session.protocol
                            .toUpperCase() ===
                            'RDP' && (
                          <button
                            type="button"
                            onClick={() =>
                              openTerminateModal(
                                session
                              )
                            }
                          >
                            Terminate
                          </button>
                        )}

                      </div>

                    </div>

                  )

                }
              )}

            </div>


            <div
              className="sessions-v3-pagination"
            >

              <span>
                Showing{' '}
                <strong>
                  {resultStart}
                </strong>
                {'–'}
                <strong>
                  {resultEnd}
                </strong>
                {' of '}
                <strong>
                  {filteredSessions.length}
                </strong>
              </span>


              <div>

                <button
                  type="button"

                  disabled={
                    safePage <= 1
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
                  ‹
                </button>


                <span>
                  Page{' '}
                  <strong>
                    {safePage}
                  </strong>
                  {' of '}
                  <strong>
                    {totalPages}
                  </strong>
                </span>


                <button
                  type="button"

                  disabled={
                    safePage >=
                    totalPages
                  }

                  onClick={() =>
                    setPage(
                      current =>
                        Math.min(
                          totalPages,
                          current + 1
                        )
                    )
                  }
                >
                  ›
                </button>

              </div>

            </div>

          </>

        )}

      </section>


      {terminateTarget && (

        <div
          className="sessions-v4-terminate-overlay"

          onMouseDown={
            event => {

              if (
                event.target ===
                event.currentTarget
              ) {
                closeTerminateModal()
              }

            }
          }
        >

          <div
            className="sessions-v4-terminate-modal"
          >

            <div
              className="sessions-v4-terminate-icon"
            >
              !
            </div>


            <div
              className="sessions-v4-terminate-heading"
            >

              <span>
                ADMINISTRATIVE ACTION
              </span>

              <h2>
                Terminate Session
              </h2>

              <p>
                Disconnect this active RDP
                session immediately.
              </p>

            </div>


            <div
              className="sessions-v4-terminate-session"
            >

              <div>
                <span>Session</span>
                <strong>
                  {formatSessionId(
                    terminateTarget
                  )}
                </strong>
              </div>

              <div>
                <span>User</span>
                <strong>
                  {terminateTarget.username ||
                    `User ${terminateTarget.user_id}`}
                </strong>
              </div>

              <div>
                <span>Target</span>
                <strong>
                  {terminateTarget.server_name ||
                    `Server ${terminateTarget.server_id}`}
                </strong>
              </div>

              <div>
                <span>Protocol</span>
                <strong>
                  {terminateTarget.protocol}
                </strong>
              </div>

            </div>


            <label
              className="sessions-v4-terminate-reason"
            >

              <span>
                Termination Reason
              </span>

              <textarea
                value={terminateReason}

                rows={3}

                maxLength={500}

                autoFocus

                disabled={
                  terminateBusy
                }

                onChange={
                  event => {
                    setTerminateReason(
                      event.target.value
                    )

                    if (terminateError) {
                      setTerminateError('')
                    }
                  }
                }
              />

              <small>
                This reason will be retained
                in the session audit trail.
              </small>

            </label>


            {terminateError && (

              <div
                className="sessions-v4-terminate-error"
              >
                {terminateError}
              </div>

            )}


            <div
              className="sessions-v4-terminate-actions"
            >

              <button
                type="button"

                disabled={
                  terminateBusy
                }

                onClick={
                  closeTerminateModal
                }
              >
                Cancel
              </button>


              <button
                type="button"

                className="danger"

                disabled={
                  terminateBusy ||
                  !terminateReason.trim()
                }

                onClick={
                  confirmTerminateSession
                }
              >
                {terminateBusy
                  ? 'Terminating...'
                  : 'Terminate Session'}
              </button>

            </div>

          </div>

        </div>

      )}


      {selectedSession && (

        <div
          className="sessions-v3-activity-overlay"

          onMouseDown={
            event => {

              if (
                event.target ===
                event.currentTarget
              ) {
                closeActivity()
              }

            }
          }
        >

          <div
            className="sessions-v3-activity-modal"
          >

            <div
              className="sessions-v3-activity-header"
            >

              <div>

                <div
                  className="sessions-v3-activity-kicker"
                >
                  Session
                  {' · '}
                  {formatSessionId(
                    selectedSession
                  )}
                </div>

                <div
                  className="sessions-v3-activity-title-row"
                >

                  <h2>
                    Session Activity
                  </h2>

                  <span
                    className={
                      `sessions-v3-status ${selectedSession.status.toLowerCase()}`
                    }
                  >
                    <i />

                    {selectedSession.status
                      .toUpperCase()}
                  </span>

                </div>

                <p>
                  Complete remote access,
                  command and system change
                  audit trail.
                </p>

              </div>


              <button
                type="button"

                className="sessions-v3-activity-close"

                aria-label=
                  "Close session activity"

                onClick={
                  closeActivity
                }
              >
                ×
              </button>

            </div>


            <div
              className="sessions-v3-route-card"
            >

              <div
                className="sessions-v3-route-identity"
              >

                <div
                  className="sessions-v3-route-avatar"
                >
                  {(
                    selectedSession.username ||
                    'U'
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>


                <div>

                  <span>
                    AKSARA USER
                  </span>

                  <strong>
                    {selectedSession.username ||
                      `User ${selectedSession.user_id}`}
                  </strong>

                  <small>
                    {selectedSession.source_ip ||
                      'Unknown source IP'}
                  </small>

                </div>

              </div>


              <div
                className="sessions-v3-route-arrow"
              >
                <span />
                →
                <span />
              </div>


              <div
                className="sessions-v3-route-identity target"
              >

                <div
                  className="sessions-v3-route-avatar target"
                >
                  S
                </div>

                <div>

                  <span>
                    REMOTE TARGET
                  </span>

                  <strong>
                    {selectedSession.remote_username ||
                      '-'}
                    @
                    {selectedSession.server_name ||
                      `Server ${selectedSession.server_id}`}
                  </strong>

                  <small>
                    {selectedSession.protocol}
                    {' remote session'}
                  </small>

                </div>

              </div>

            </div>


            <div
              className={`sessions-v3-meta-grid ${
                isRdpSession
                  ? 'rdp-compact'
                  : ''
              }`}
            >

              <div>
                <span>Source IP</span>
                <strong>
                  {selectedSession.source_ip ||
                    '-'}
                </strong>
              </div>

              <div>
                <span>Protocol</span>
                <strong>
                  {selectedSession.protocol}
                </strong>
              </div>

              {isRdpSession ? (
                <>
                  <div>
                    <span>Remote User</span>
                    <strong>
                      {activityData
                        ?.session
                        ?.remote_username ||
                        selectedSession
                          .remote_username ||
                        '-'}
                    </strong>
                  </div>

                  <div>
                    <span>Target</span>
                    <strong>
                      {activityData
                        ?.session
                        ?.server_name ||
                        selectedSession
                          .server_name ||
                        '-'}
                    </strong>
                  </div>

                  <div>
                    <span>Target IP</span>
                    <strong>
                      {activityData
                        ?.session
                        ?.server_ip ||
                        '-'}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {selectedSession.status ||
                        activityData
                          ?.session
                          ?.status ||
                        '-'}
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span>TTY</span>
                    <strong>
                      {activityData
                        ?.session
                        ?.tty ||
                        selectedSession.tty ||
                        '-'}
                    </strong>
                  </div>

                  <div>
                    <span>Audit Session</span>
                    <strong>
                      {activityData
                        ?.session
                        ?.audit_session ??
                        selectedSession
                          .audit_session ??
                        '-'}
                    </strong>
                  </div>

                  <div>
                    <span>Shell PID</span>
                    <strong>
                      {activityData
                        ?.session
                        ?.remote_shell_pid ??
                        selectedSession
                          .remote_shell_pid ??
                        '-'}
                    </strong>
                  </div>
                </>
              )}

              <div>
                <span>Duration</span>
                <strong>
                  {formatDuration(
                    getDurationSeconds(
                      selectedSession
                    )
                  )}
                </strong>
              </div>

            </div>


            {isRdpSession &&
            selectedSession.status
              .toUpperCase() ===
              'TERMINATED' &&
            activityData?.session
              ?.termination && (

              <div
                className="sessions-v5-termination-strip"
              >

                <div>
                  <span>
                    Terminated By
                  </span>

                  <strong>
                    {activityData
                      .session
                      .termination
                      .terminated_by ||
                      '-'}
                  </strong>
                </div>


                <div>
                  <span>
                    Reason
                  </span>

                  <strong>
                    {activityData
                      .session
                      .termination
                      .reason ||
                      'Administrative termination'}
                  </strong>
                </div>


                <div>
                  <span>
                    Terminated At
                  </span>

                  <strong>
                    {formatTime(
                      activityData
                        .session
                        .termination
                        .terminated_at
                    )}
                  </strong>
                </div>

              </div>

            )}


            {activityData && (

              <>
                <div
                  className={`sessions-v3-activity-stats sessions-v4-activity-stats ${
                    isRdpSession
                      ? 'rdp-hidden'
                      : ''
                  }`}
                >

                  {isRdpSession ? (
                    <>
                      <div>
                        <span>Started</span>
                        <strong>
                          {formatTime(
                            selectedSession.started_at
                          )}
                        </strong>
                        <small>
                          Session start
                        </small>
                      </div>

                      <div>
                        <span>Ended</span>
                        <strong>
                          {formatTime(
                            selectedSession.ended_at
                          )}
                        </strong>
                        <small>
                          Session end
                        </small>
                      </div>

                      <div>
                        <span>AKSARA User</span>
                        <strong>
                          {selectedSession.username ||
                            '-'}
                        </strong>
                        <small>
                          Authorized user
                        </small>
                      </div>

                      <div>
                        <span>Session Events</span>
                        <strong>
                          {activityData
                            .summary
                            .total_events}
                        </strong>
                        <small>
                          Retained events
                        </small>
                      </div>

                      <div>
                        <span>End State</span>
                        <strong>
                          {selectedSession.status ||
                            activityData
                              .session
                              .status ||
                            '-'}
                        </strong>
                        <small>
                          Session status
                        </small>
                      </div>

                      <div>
                        <span>Recording</span>
                        <strong>
                          Not enabled
                        </strong>
                        <small>
                          Session capture
                        </small>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span>Important</span>
                        <strong>
                          {importantActivityEvents.length}
                        </strong>
                        <small>
                          Relevant activity
                        </small>
                      </div>

                      <div>
                        <span>Commands</span>
                        <strong>
                          {activityData
                            .summary
                            .commands}
                        </strong>
                        <small>
                          Shell commands
                        </small>
                      </div>

                      <div>
                        <span>File Changes</span>
                        <strong>
                          {activityData
                            .summary
                            .files}
                        </strong>
                        <small>
                          Recorded changes
                        </small>
                      </div>

                      <div>
                        <span>Identity</span>
                        <strong>
                          {activityData
                            .summary
                            .identity}
                        </strong>
                        <small>
                          User & group
                        </small>
                      </div>

                      <div>
                        <span>Services</span>
                        <strong>
                          {activityData
                            .summary
                            .services}
                        </strong>
                        <small>
                          Service events
                        </small>
                      </div>

                      <div>
                        <span>Forensic Events</span>
                        <strong>
                          {activityData
                            .summary
                            .total_events}
                        </strong>
                        <small>
                          Raw retained data
                        </small>
                      </div>
                    </>
                  )}

                </div>


                <div
                  className="sessions-v4-audit-scope"
                >
                  <div
                    className="sessions-v4-audit-scope-icon"
                  >
                    A
                  </div>

                  <div>
                    <strong>
                      {isRdpSession
                        ? 'RDP Session Audit'
                        : 'Investigation view'}
                    </strong>

                    <span>
                      {isRdpSession
                        ? 'Remote desktop session lifecycle and retained access events.'
                        : 'Important activity removes background OS noise while preserving all raw events for forensic review.'}
                    </span>
                  </div>

                  <div
                    className="sessions-v4-audit-scope-count"
                  >
                    <strong>
                      {activityData.summary.total_events}
                    </strong>

                    <span>
                      retained events
                    </span>
                  </div>
                </div>
              </>

            )}


            <div
              className="sessions-v3-activity-controls"
            >

              <div
                className="sessions-v3-activity-search"
              >

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
                    activitySearch
                  }

                  placeholder={
                    isRdpSession
                      ? 'Search RDP session events...'
                      : 'Search command, file, user, process, syscall...'
                  }

                  onChange={
                    event =>
                      setActivitySearch(
                        event.target.value
                      )
                  }
                />

              </div>


              <div
                className="sessions-v3-activity-actions"
              >

                {selectedSession.status
                  .toUpperCase() ===
                  'ACTIVE' && (

                  <span
                    className="sessions-v3-live"
                  >
                    <i />
                    Live
                  </span>

                )}


                <button
                  type="button"

                  className=
                    "sessions-v4-download-events"

                  disabled={
                    !activityData ||
                    activityData.events.length === 0
                  }

                  onClick={
                    downloadAllEvents
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3v11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <path
                      d="m8 10 4 4 4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M5 19h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>

                  Download All Events
                </button>


                <button
                  type="button"

                  onClick={() =>
                    loadSessionTimeline(
                      selectedSession.id
                    )
                  }
                >
                  Refresh
                </button>

              </div>

            </div>


            <div
              className="sessions-v3-filterbar"
            >

              <div
                className="sessions-v3-filter-pills"
              >

                {(isRdpSession
                  ? ACTIVITY_FILTERS.filter(
                      item =>
                        item.value === 'IMPORTANT' ||
                        item.value === 'ALL'
                    )
                  : ACTIVITY_FILTERS
                ).map(
                  item => (

                    <button
                      type="button"

                      key={
                        item.value
                      }

                      className={
                        activityFilter ===
                          item.value
                          ? 'active'
                          : ''
                      }

                      onClick={() =>
                        setActivityFilter(
                          item.value
                        )
                      }
                    >
                      {isRdpSession &&
                      item.value === 'IMPORTANT'
                        ? 'Session Events'
                        : item.label}
                    </button>

                  )
                )}

              </div>


              <div
                className="sessions-v4-forensic-controls"
              >

                <span
                  className="sessions-v4-scope-label"
                >
                  {isRdpSession
                    ? activityFilter === 'ALL'
                      ? 'All session events'
                      : 'Session audit'
                    : activityFilter === 'IMPORTANT'
                      ? 'Operational audit'
                      : activityFilter === 'ALL'
                        ? 'Forensic audit'
                        : 'Filtered audit'}
                </span>


                {activityFilter === 'ALL' &&
                !isRdpSession && (

                  <label
                    className="sessions-v3-process-toggle"
                  >
                    <input
                      type="checkbox"

                      checked={
                        showProcesses
                      }

                      onChange={
                        event =>
                          setShowProcesses(
                            event.target
                              .checked
                          )
                      }
                    />

                    <span />

                    Include processes
                  </label>

                )}

              </div>

            </div>


            <div
              className="sessions-v3-activity-body"
            >

              {activityError && (

                <div
                  className="sessions-v3-activity-error"
                >
                  {activityError}
                </div>

              )}


              {activityLoading ? (

                <div
                  className="sessions-v3-activity-empty"
                >
                  Loading session
                  activity...
                </div>

              ) :
              !activityData ? (

                <div
                  className="sessions-v3-activity-empty"
                >
                  No activity data
                  available.
                </div>

              ) :
              filteredActivityEvents
                .length === 0 ? (

                <div
                  className="sessions-v3-activity-empty"
                >

                  <strong>
                    No matching events
                  </strong>

                  <span>
                    Change the activity
                    filters or search term.
                  </span>

                </div>

              ) : (

                <div
                  className="sessions-v3-timeline"
                >

                  {filteredActivityEvents.map(
                    event => {

                      const category =
                        (
                          event.category ||
                          'SYSTEM'
                        ).toLowerCase()

                      const subtitle =
                        getEventSubtitle(
                          event
                        )

                      return (

                        <div
                          className={
                            `sessions-v3-event ${category}`
                          }

                          key={
                            `${event.source}-${event.source_id}-${event.type}`
                          }
                        >

                          <div
                            className="sessions-v3-event-time"
                          >
                            {formatTime(
                              event.time
                            )}
                          </div>


                          <div
                            className="sessions-v3-event-track"
                          >

                            <div
                              className={
                                `sessions-v3-event-icon ${category}`
                              }
                            >
                              {getCategoryCode(
                                event.category
                              )}
                            </div>

                          </div>


                          <div
                            className="sessions-v3-event-card"
                          >

                            <div
                              className="sessions-v3-event-top"
                            >

                              <div
                                className="sessions-v3-event-labels"
                              >

                                <span
                                  className={
                                    `sessions-v3-event-type ${category}`
                                  }
                                >
                                  {event.type
                                    .replaceAll(
                                      '_',
                                      ' '
                                    )}
                                </span>


                                <span
                                  className="sessions-v3-event-source"
                                >
                                  {event.source}
                                </span>

                              </div>


                              {event.success !==
                                null &&
                                event.success !==
                                undefined && (

                                <span
                                  className={
                                    `sessions-v3-event-result ${
                                      event.success
                                        ? 'success'
                                        : 'failed'
                                    }`
                                  }
                                >
                                  {event.success
                                    ? 'Success'
                                    : 'Failed'}
                                </span>

                              )}

                            </div>


                            {event.type ===
                              'COMMAND_EXECUTED' ? (

                              <code
                                className="sessions-v3-command"
                              >
                                <span>$</span>
                                {event.command ||
                                  event.detail ||
                                  '-'}
                              </code>

                            ) : (

                              <strong
                                className="sessions-v3-event-title"
                              >
                                {getEventTitle(
                                  event
                                )}
                              </strong>

                            )}


                            {event.type ===
                              'SESSION_STARTED' && (

                              <p
                                className="sessions-v3-event-description"
                              >
                                {selectedSession.username ||
                                  `User ${selectedSession.user_id}`}
                                {' connected to '}
                                {selectedSession.server_name ||
                                  `Server ${selectedSession.server_id}`}
                                {' as '}
                                {selectedSession.remote_username ||
                                  '-'}
                                .
                              </p>

                            )}


                            {event.type ===
                              'SESSION_ENDED' && (

                              <p
                                className="sessions-v3-event-description"
                              >
                                Remote session
                                completed after{' '}
                                {formatDuration(
                                  getDurationSeconds(
                                    selectedSession
                                  )
                                )}
                                .
                              </p>

                            )}


                            {subtitle && (

                              <div
                                className="sessions-v3-event-meta"
                              >
                                {subtitle}
                              </div>

                            )}


                            {event.remote_username &&
                              event.category !==
                                'SESSION' && (

                              <div
                                className="sessions-v3-event-user"
                              >
                                Remote user:{' '}
                                <strong>
                                  {event.remote_username}
                                </strong>
                              </div>

                            )}


                            {event.raw_detail && (

                              <details
                                className="sessions-v3-event-details"
                              >

                                <summary>
                                  Technical details
                                </summary>

                                <pre>
                                  {event.raw_detail}
                                </pre>

                              </details>

                            )}

                          </div>

                        </div>

                      )

                    }
                  )}

                </div>

              )}

            </div>


            <div
              className="sessions-v3-activity-footer"
            >

              <div>

                <strong>
                  {
                    filteredActivityEvents
                      .length
                  }
                </strong>
                {' displayed of '}
                <strong>
                  {activityData
                    ?.events
                    .length || 0}
                </strong>
                {' retained events'}

                {activityFilter ===
                  'IMPORTANT' && (

                  <span>
                    {' · '}
                    Showing operationally
                    relevant activity
                  </span>

                )}

                {activityFilter ===
                  'ALL' &&
                  !showProcesses &&
                  (
                    activityData
                      ?.summary
                      .processes || 0
                  ) > 0 && (

                  <span>
                    {' · '}
                    {activityData
                      ?.summary
                      .processes}
                    {' process events hidden'}
                  </span>

                )}

              </div>



            </div>

          </div>

        </div>

      )}

    </>
  )
}


export default SessionsPage
