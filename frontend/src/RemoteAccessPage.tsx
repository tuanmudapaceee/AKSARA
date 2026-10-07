import {
  useEffect,
  useMemo,
  useState,
} from 'react'


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


type RemoteAccessPageProps = {
  token: string
  onUnauthorized: () => void
  onConnectSSH: (
    server: Server
  ) => void
  onConnectRDP: (
    server: Server
  ) => void
}


type ViewMode =
  | 'grid'
  | 'compact'


export default function RemoteAccessPage({
  token,
  onUnauthorized,
  onConnectSSH,
  onConnectRDP,
}: RemoteAccessPageProps) {

  const [
    servers,
    setServers,
  ] = useState<Server[]>([])

  const [
    statuses,
    setStatuses,
  ] = useState<ServerStatus[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    protocolFilter,
    setProtocolFilter,
  ] = useState('ALL')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('ALL')

  const [
    sortBy,
    setSortBy,
  ] = useState('NAME')

  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>(
    'grid'
  )

  const [
    error,
    setError,
  ] = useState('')


  const authFetch = async (
    url: string
  ) => {

    const response =
      await fetch(
        url,
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

      throw new Error(
        'Session expired'
      )
    }


    return response

  }


  const loadData = async (
    silent = false
  ) => {

    if (!silent) {
      setLoading(true)
      setError('')
    }


    try {

      const [
        serverResponse,
        statusResponse,
      ] = await Promise.all([
        authFetch(
          '/api/servers/'
        ),

        authFetch(
          '/api/monitoring/status'
        ),
      ])


      if (!serverResponse.ok) {

        const data =
          await serverResponse.json()

        throw new Error(
          data.detail ||
          'Failed to load servers'
        )

      }


      const serverData =
        await serverResponse.json()


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


      setServers(
        Array.isArray(serverData)
          ? serverData
          : []
      )


      setStatuses(
        statusData
      )


      setError('')

    } catch (err) {

      if (!silent) {

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load remote access data'
        )

      }

    } finally {

      if (!silent) {
        setLoading(false)
      }

    }

  }


  useEffect(() => {

    loadData()


    const interval =
      window.setInterval(
        () => {

          if (
            !document.hidden
          ) {
            loadData(
              true
            )
          }

        },
        5000
      )


    return () => {
      window.clearInterval(
        interval
      )
    }

  }, [token])


  const getStatus = (
    serverId: number
  ) => {

    return statuses.find(
      item =>
        item.server_id ===
        serverId
    )

  }


  const getServerStatus = (
    server: Server
  ) => {

    if (
      !server.is_active
    ) {
      return 'DISABLED'
    }


    return (
      getStatus(
        server.id
      )?.status ||
      'UNKNOWN'
    ).toUpperCase()

  }


  const formatLatency = (
    value?: number | null
  ) => {

    if (
      value === null ||
      value === undefined
    ) {
      return '—'
    }


    return `${value.toFixed(2)} ms`

  }


  const formatRelativeTime = (
    value?: string | null
  ) => {

    if (!value) {
      return 'Not checked'
    }


    const date =
      new Date(value)


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '—'
    }


    const seconds =
      Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            date.getTime()
          ) / 1000
        )
      )


    if (
      seconds < 10
    ) {
      return 'Just now'
    }


    if (
      seconds < 60
    ) {
      return `${seconds}s ago`
    }


    const minutes =
      Math.floor(
        seconds / 60
      )


    if (
      minutes < 60
    ) {
      return `${minutes}m ago`
    }


    const hours =
      Math.floor(
        minutes / 60
      )


    if (
      hours < 24
    ) {
      return `${hours}h ago`
    }


    const days =
      Math.floor(
        hours / 24
      )


    return `${days}d ago`

  }


  const totalServers =
    servers.length


  const onlineServers =
    servers.filter(
      server =>
        getServerStatus(
          server
        ) === 'ONLINE'
    ).length


  const offlineServers =
    servers.filter(
      server =>
        getServerStatus(
          server
        ) === 'OFFLINE'
    ).length


  const sshServers =
    servers.filter(
      server =>
        server.protocol
          .toUpperCase() ===
        'SSH'
    ).length


  const rdpServers =
    servers.filter(
      server =>
        server.protocol
          .toUpperCase() ===
        'RDP'
    ).length


  const remoteProtocols =
    [
      sshServers > 0
        ? 'SSH'
        : null,

      rdpServers > 0
        ? 'RDP'
        : null,
    ].filter(Boolean).length


  const readyServers =
    servers.filter(
      server => {
        const protocol =
          server.protocol
            .toUpperCase()

        return (
          server.is_active &&
          getServerStatus(
            server
          ) === 'ONLINE' &&
          (
            protocol === 'SSH' ||
            protocol === 'RDP'
          )
        )
      }
    ).length


  const responseTimes =
    statuses
      .map(
        status =>
          status.response_time_ms
      )
      .filter(
        (
          value
        ): value is number =>
          typeof value === 'number'
      )


  const averageLatency =
    responseTimes.length > 0
      ? (
          responseTimes.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          responseTimes.length
        ).toFixed(2)
      : '0.00'


  const availability =
    totalServers > 0
      ? Math.round(
          (
            onlineServers /
            totalServers
          ) * 100
        )
      : 0


  const filteredServers =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase()


        const filtered =
          servers.filter(
            server => {

              const status =
                getServerStatus(
                  server
                )


              const protocol =
                (
                  server.protocol ||
                  ''
                ).toUpperCase()


              const matchSearch =
                !keyword ||
                [
                  server.name,
                  server.hostname,
                  server.ip_address,
                  server.operating_system,
                  server.description,
                ]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase()
                  .includes(keyword)


              const matchProtocol =
                protocolFilter ===
                  'ALL' ||
                protocol ===
                  protocolFilter


              const matchStatus =
                statusFilter ===
                  'ALL' ||
                status ===
                  statusFilter


              return (
                matchSearch &&
                matchProtocol &&
                matchStatus
              )

            }
          )


        return filtered.sort(
          (
            a,
            b
          ) => {

            if (
              sortBy ===
              'LATENCY'
            ) {

              const latencyA =
                getStatus(
                  a.id
                )?.response_time_ms ??
                Number.MAX_SAFE_INTEGER


              const latencyB =
                getStatus(
                  b.id
                )?.response_time_ms ??
                Number.MAX_SAFE_INTEGER


              return (
                latencyA -
                latencyB
              )

            }


            if (
              sortBy ===
              'STATUS'
            ) {

              return (
                getServerStatus(a)
                  .localeCompare(
                    getServerStatus(b)
                  )
              )

            }


            return (
              a.name.localeCompare(
                b.name
              )
            )

          }
        )

      },
      [
        servers,
        statuses,
        search,
        protocolFilter,
        statusFilter,
        sortBy,
      ]
    )


  return (
    <div className="remote-v3-page">

      <section className="remote-v3-hero">

        <div className="remote-v3-hero-copy">

          <div className="remote-v3-eyebrow">
            Remote Access
          </div>

          <h1>
            Connect to Infrastructure
          </h1>

          <p>
            Securely connect to assigned
            infrastructure from one centralized
            AKSARA workspace.
          </p>

        </div>


        <div className="remote-v3-hero-actions">

          <div
            className={
              `remote-v3-readiness ${
                offlineServers === 0
                  ? 'healthy'
                  : 'degraded'
              }`
            }
          >
            <span />

            <div>
              <strong>
                {offlineServers === 0
                  ? 'Access environment healthy'
                  : 'Some targets need attention'}
              </strong>

              <small>
                {readyServers} of {totalServers}
                {' '}
                targets ready
              </small>
            </div>
          </div>


          <button
            type="button"
            className="remote-v3-refresh"
            onClick={() =>
              loadData()
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
                d="M4 18v-5h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M18.5 9A7 7 0 0 0 6 6.5L4 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="M5.5 15A7 7 0 0 0 18 17.5l2-2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            Refresh
          </button>

        </div>

      </section>


      <section className="remote-v3-summary">

        <article>
          <span className="remote-v3-summary-icon server">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="6" rx="2" />
              <rect x="3" y="14" width="18" height="6" rx="2" />
              <circle cx="7" cy="7" r="1" />
              <circle cx="7" cy="17" r="1" />
            </svg>
          </span>

          <div>
            <span>
              Assigned Targets
            </span>

            <strong>
              {totalServers}
            </strong>

            <small>
              Infrastructure available to you
            </small>
          </div>
        </article>


        <article>
          <span className="remote-v3-summary-icon online">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 2.5 2.5L16 9" />
            </svg>
          </span>

          <div>
            <span>
              Ready to Connect
            </span>

            <strong>
              {readyServers}
            </strong>

            <small>
              {availability}% availability
            </small>
          </div>
        </article>


        <article>
          <span className="remote-v3-summary-icon latency">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12h4l2-6 4 12 2-6h6" />
            </svg>
          </span>

          <div>
            <span>
              Average Latency
            </span>

            <strong>
              {averageLatency}
              <small> ms</small>
            </strong>

            <small>
              Current response average
            </small>
          </div>
        </article>


        <article>
          <span className="remote-v3-summary-icon protocol">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="m7 9 3 3-3 3" />
              <path d="M13 15h4" />
            </svg>
          </span>

          <div>
            <span>
              Remote Protocols
            </span>

            <strong>
              {remoteProtocols}
            </strong>

            <small>
              SSH {sshServers} · RDP {rdpServers}
            </small>
          </div>
        </article>

      </section>


      <section className="remote-v3-workspace">

        <div className="remote-v3-workspace-heading">

          <div>

            <span className="remote-v3-workspace-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h10" />
              </svg>
            </span>

            <div>
              <h2>
                Infrastructure Access
              </h2>

              <p>
                Select a reachable target to
                start a secure remote session.
              </p>
            </div>

          </div>


          <div className="remote-v3-workspace-tools">

            <span className="remote-v3-target-count">
              {filteredServers.length}
              {' '}
              {filteredServers.length === 1
                ? 'target'
                : 'targets'}
            </span>


            <div className="remote-v3-view-toggle">

              <button
                type="button"
                className={
                  viewMode === 'grid'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setViewMode(
                    'grid'
                  )
                }
                title="Grid view"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </button>


              <button
                type="button"
                className={
                  viewMode === 'compact'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setViewMode(
                    'compact'
                  )
                }
                title="Compact view"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M5 7h14" />
                  <path d="M5 12h14" />
                  <path d="M5 17h14" />
                </svg>
              </button>

            </div>

          </div>

        </div>


        <div className="remote-v3-toolbar">

          <div className="remote-v3-search">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path
                d="m20 20-3.5-3.5"
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
              placeholder="Search server, hostname, IP, OS or description..."
            />


            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}

          </div>


          <div className="remote-v3-filters">

            <select
              value={
                protocolFilter
              }
              onChange={
                event =>
                  setProtocolFilter(
                    event.target.value
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
                    event.target.value
                  )
              }
            >
              <option value="ALL">
                All Status
              </option>

              <option value="ONLINE">
                Online
              </option>

              <option value="OFFLINE">
                Offline
              </option>

              <option value="UNKNOWN">
                Unknown
              </option>

              <option value="DISABLED">
                Disabled
              </option>
            </select>


            <select
              value={
                sortBy
              }
              onChange={
                event =>
                  setSortBy(
                    event.target.value
                  )
              }
            >
              <option value="NAME">
                Sort: Name
              </option>

              <option value="LATENCY">
                Sort: Latency
              </option>

              <option value="STATUS">
                Sort: Status
              </option>
            </select>

          </div>

        </div>


        {error && (
          <div className="remote-v3-error">
            {error}
          </div>
        )}


        {loading ? (

          <div className="remote-v3-loading">
            Loading infrastructure access...
          </div>

        ) : filteredServers.length ===
        0 ? (

          <div className="remote-v3-empty">

            <div className="remote-v3-empty-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="16" height="6" rx="2" />
                <rect x="4" y="14" width="16" height="6" rx="2" />
              </svg>
            </div>

            <strong>
              No infrastructure available
            </strong>

            <span>
              No servers match your current
              access scope or filters.
            </span>

            <button
              type="button"
              onClick={() => {
                setSearch('')
                setProtocolFilter(
                  'ALL'
                )
                setStatusFilter(
                  'ALL'
                )
                setSortBy(
                  'NAME'
                )
              }}
            >
              Reset Filters
            </button>

          </div>

        ) : (

          <div
            className={
              `remote-v3-grid ${
                viewMode ===
                  'compact'
                  ? 'compact'
                  : ''
              }`
            }
          >

            {filteredServers.map(
              server => {

                const serverStatus =
                  getStatus(
                    server.id
                  )


                const status =
                  getServerStatus(
                    server
                  )


                const protocol =
                  server.protocol
                    .toUpperCase()


                const canConnect =
                  server.is_active &&
                  status ===
                    'ONLINE' &&
                  (
                    protocol ===
                      'SSH' ||
                    protocol ===
                      'RDP'
                  )


                return (
                  <article
                    className={
                      `remote-v3-card ${status.toLowerCase()}`
                    }
                    key={
                      server.id
                    }
                  >

                    <div className="remote-v3-card-top">

                      <div className="remote-v3-server-identity">

                        <span className="remote-v3-server-icon">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="6" rx="2" />
                            <rect x="3" y="14" width="18" height="6" rx="2" />
                            <circle cx="7" cy="7" r="1" />
                            <circle cx="7" cy="17" r="1" />
                          </svg>
                        </span>


                        <div>
                          <h3>
                            {server.name}
                          </h3>

                          <span>
                            {server.hostname ||
                              server.operating_system ||
                              'Managed Server'}
                          </span>
                        </div>

                      </div>


                      <span
                        className={
                          `remote-v3-status ${status.toLowerCase()}`
                        }
                      >
                        <i />

                        {status}
                      </span>

                    </div>


                    <div className="remote-v3-address">

                      <span>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="6" cy="12" r="2.5" />
                          <circle cx="18" cy="6" r="2.5" />
                          <circle cx="18" cy="18" r="2.5" />
                          <path d="M8.5 11L15.5 7" />
                          <path d="M8.5 13L15.5 17" />
                        </svg>
                      </span>

                      <div>
                        <small>
                          Address
                        </small>

                        <strong>
                          {server.ip_address}
                          <em>
                            :{server.port}
                          </em>
                        </strong>
                      </div>

                    </div>


                    <div className="remote-v3-meta">

                      <div>
                        <span>
                          Protocol
                        </span>

                        <strong>
                          {protocol}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Response
                        </span>

                        <strong>
                          {formatLatency(
                            serverStatus
                              ?.response_time_ms
                          )}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Last Check
                        </span>

                        <strong>
                          {formatRelativeTime(
                            serverStatus
                              ?.last_check
                          )}
                        </strong>
                      </div>

                    </div>


                    <div className="remote-v3-card-footer">

                      <div className="remote-v3-description">
                        {server.description ||
                          server.operating_system ||
                          'Managed infrastructure target'}
                      </div>


                      <div className="remote-v3-connect-area">

                        <button
                          type="button"
                          className="remote-v3-connect"
                          disabled={
                            !canConnect
                          }
                          onClick={() => {

                            if (
                              protocol ===
                              'SSH'
                            ) {
                              onConnectSSH(
                                server
                              )
                              return
                            }

                            if (
                              protocol ===
                              'RDP'
                            ) {
                              onConnectRDP(
                                server
                              )
                            }

                          }}
                        >
                          <span>
                            {canConnect
                              ? 'Connect'
                              : (
                                  protocol ===
                                    'SSH' ||
                                  protocol ===
                                    'RDP'
                                )
                                ? 'Unavailable'
                                : 'Coming Soon'}
                          </span>

                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="m14 7 5 5-5 5" />
                          </svg>
                        </button>

                      </div>

                    </div>

                  </article>
                )

              }
            )}

          </div>

        )}

      </section>

    </div>
  )
}
