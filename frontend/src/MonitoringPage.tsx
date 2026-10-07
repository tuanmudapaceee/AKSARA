import {
  useEffect,
  useMemo,
  useRef,
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


type MonitoringHistory = {
  id: number
  server_id: number
  status: string
  response_time_ms?: number | null
  checked_at: string
}


type LiveLatencyPoint = {
  timestamp: string
  value: number
}


type Props = {
  token: string
  servers: Server[]
  statuses: ServerStatus[]
  onUnauthorized: () => void
  onRefresh: () => Promise<void> | void
}


type MonitoringState =
  | 'ONLINE'
  | 'OFFLINE'
  | 'UNKNOWN'


type ChartMode =
  | 'LIVE'
  | 'HISTORY'


const HISTORY_LIMIT = 120
const HISTORY_CHART_POINTS = 60
const TIMELINE_POINTS = 60
const HISTORY_REFRESH_MS = 5000
const LIVE_MAX_POINTS = 60


function MonitoringPage({
  token,
  servers,
  statuses,
  onUnauthorized,
  onRefresh,
}: Props) {

  const [search, setSearch] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState('ALL')

  const [protocolFilter, setProtocolFilter] =
    useState('ALL')

  const [checking, setChecking] =
    useState(false)

  const [selectedServerId, setSelectedServerId] =
    useState<number | null>(null)

  const [history, setHistory] =
    useState<MonitoringHistory[]>([])

  const [historyLoading, setHistoryLoading] =
    useState(false)

  const [chartMode, setChartMode] =
    useState<ChartMode>('LIVE')

  const [liveLatency, setLiveLatency] =
    useState<LiveLatencyPoint[]>([])

  const lastLiveCheckRef =
    useRef<string | null>(null)


  /*
   * =====================================================
   * STATUS MAP
   * =====================================================
   */

  const statusMap =
    useMemo(() => {

      const map =
        new Map<number, ServerStatus>()

      statuses.forEach(item => {
        map.set(
          item.server_id,
          item
        )
      })

      return map

    }, [statuses])


  const getStatus = (
    serverId: number
  ) => {
    return statusMap.get(
      serverId
    )
  }


  const getNormalizedStatus = (
    serverId: number
  ): MonitoringState => {

    const value =
      getStatus(serverId)
        ?.status
        ?.toUpperCase()

    if (value === 'ONLINE') {
      return 'ONLINE'
    }

    if (value === 'OFFLINE') {
      return 'OFFLINE'
    }

    return 'UNKNOWN'
  }


  /*
   * =====================================================
   * SELECTED SERVER
   * =====================================================
   */

  useEffect(() => {

    if (servers.length === 0) {
      setSelectedServerId(null)
      return
    }

    const exists =
      selectedServerId !== null &&
      servers.some(
        server =>
          server.id ===
          selectedServerId
      )

    if (!exists) {
      setSelectedServerId(
        servers[0].id
      )
    }

  }, [
    servers,
    selectedServerId,
  ])


  const selectedServer =
    useMemo(
      () =>
        servers.find(
          server =>
            server.id ===
            selectedServerId
        ) || null,
      [
        servers,
        selectedServerId,
      ]
    )


  const selectedStatus =
    selectedServer
      ? getStatus(
          selectedServer.id
        )
      : undefined


  const selectedState:
    MonitoringState =
      selectedServer
        ? getNormalizedStatus(
            selectedServer.id
          )
        : 'UNKNOWN'


  /*
   * =====================================================
   * RESET LIVE BUFFER
   * =====================================================
   */

  useEffect(() => {

    setLiveLatency([])
    lastLiveCheckRef.current = null

  }, [selectedServerId])


  /*
   * =====================================================
   * CAPTURE LIVE LATENCY
   * =====================================================
   *
   * statuses comes from the live ServerStatus table.
   * Every new last_check becomes one browser-only point.
   *
   * Nothing extra is written to PostgreSQL.
   */

  useEffect(() => {

    if (
      !selectedServer ||
      !selectedStatus ||
      selectedState !== 'ONLINE' ||
      selectedStatus.response_time_ms === null ||
      selectedStatus.response_time_ms === undefined ||
      !selectedStatus.last_check
    ) {
      return
    }

    if (
      lastLiveCheckRef.current ===
      selectedStatus.last_check
    ) {
      return
    }

    lastLiveCheckRef.current =
      selectedStatus.last_check

    const point: LiveLatencyPoint = {
      timestamp:
        selectedStatus.last_check,
      value:
        selectedStatus.response_time_ms,
    }

    setLiveLatency(previous => [
      ...previous,
      point,
    ].slice(-LIVE_MAX_POINTS))

  }, [
    selectedServer,
    selectedStatus?.last_check,
    selectedStatus?.response_time_ms,
    selectedState,
  ])


  /*
   * =====================================================
   * HISTORY
   * =====================================================
   */

  const loadHistory =
    async (
      serverId: number,
      silent = false
    ) => {

      if (!silent) {
        setHistoryLoading(true)
      }

      try {

        const response =
          await fetch(
            `/api/monitoring/history/${serverId}?limit=${HISTORY_LIMIT}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          )

        if (response.status === 401) {
          onUnauthorized()
          return
        }

        if (!response.ok) {
          throw new Error(
            'Failed to load monitoring history'
          )
        }

        const data =
          await response.json()

        const items:
          MonitoringHistory[] =
          Array.isArray(data)
            ? data
            : []

        setHistory(
          [...items].reverse()
        )

      } catch (error) {

        console.error(
          'Monitoring history failed:',
          error
        )

      } finally {

        if (!silent) {
          setHistoryLoading(false)
        }

      }
    }


  useEffect(() => {

    if (selectedServerId === null) {
      setHistory([])
      return
    }

    loadHistory(
      selectedServerId
    )

    const interval =
      window.setInterval(
        () => {

          if (!document.hidden) {
            loadHistory(
              selectedServerId,
              true
            )
          }

        },
        HISTORY_REFRESH_MS
      )

    return () => {
      window.clearInterval(interval)
    }

  }, [
    selectedServerId,
    token,
  ])


  /*
   * =====================================================
   * SUMMARY
   * =====================================================
   */

  const totalServers =
    servers.length


  const onlineServers =
    servers.filter(
      server =>
        getNormalizedStatus(
          server.id
        ) === 'ONLINE'
    ).length


  const offlineServers =
    servers.filter(
      server =>
        getNormalizedStatus(
          server.id
        ) === 'OFFLINE'
    ).length


  const currentAvailability =
    totalServers > 0
      ? (
          onlineServers /
          totalServers
        ) * 100
      : 0


  const averageLatency =
    useMemo(() => {

      const values =
        servers
          .map(server => {

            const state =
              getStatus(
                server.id
              )

            if (
              getNormalizedStatus(
                server.id
              ) !== 'ONLINE'
            ) {
              return null
            }

            return (
              state
                ?.response_time_ms ??
              null
            )

          })
          .filter(
            (
              value
            ): value is number =>
              value !== null &&
              Number.isFinite(value)
          )

      if (values.length === 0) {
        return null
      }

      return (
        values.reduce(
          (total, value) =>
            total + value,
          0
        ) /
        values.length
      )

    }, [
      servers,
      statusMap,
    ])


  /*
   * =====================================================
   * FILTER
   * =====================================================
   */

  const filteredServers =
    useMemo(() => {

      const keyword =
        search
          .trim()
          .toLowerCase()

      return servers.filter(
        server => {

          const status =
            getNormalizedStatus(
              server.id
            )

          const matchesStatus =
            statusFilter === 'ALL' ||
            status === statusFilter

          const protocol =
            (
              server.protocol ||
              ''
            ).toUpperCase()

          const matchesProtocol =
            protocolFilter === 'ALL' ||
            protocol === protocolFilter

          const text =
            [
              server.name,
              server.hostname || '',
              server.ip_address,
              server.operating_system || '',
              server.protocol || '',
            ]
              .join(' ')
              .toLowerCase()

          return (
            matchesStatus &&
            matchesProtocol &&
            (
              !keyword ||
              text.includes(keyword)
            )
          )

        }
      )

    }, [
      servers,
      statusMap,
      search,
      statusFilter,
      protocolFilter,
    ])


  /*
   * =====================================================
   * HISTORICAL DATA
   * =====================================================
   */

  const latencyHistory =
    useMemo(
      () =>
        history.filter(
          item =>
            item.status
              .toUpperCase() ===
              'ONLINE' &&
            item.response_time_ms !==
              null &&
            item.response_time_ms !==
              undefined &&
            Number.isFinite(
              item.response_time_ms
            )
        ),
      [history]
    )


  const historicalChart =
    useMemo(
      () =>
        latencyHistory.slice(
          -HISTORY_CHART_POINTS
        ),
      [latencyHistory]
    )


  const timelineHistory =
    useMemo(
      () =>
        history.slice(
          -TIMELINE_POINTS
        ),
      [history]
    )


  /*
   * =====================================================
   * ACTIVE CHART DATA
   * =====================================================
   */

  const chartValues =
    useMemo(() => {

      if (chartMode === 'LIVE') {
        return liveLatency.map(
          item => ({
            timestamp:
              item.timestamp,
            value:
              item.value,
          })
        )
      }

      return historicalChart.map(
        item => ({
          timestamp:
            item.checked_at,
          value:
            item.response_time_ms ?? 0,
        })
      )

    }, [
      chartMode,
      liveLatency,
      historicalChart,
    ])


  const latencyValues =
    chartValues
      .map(item => item.value)
      .filter(
        value =>
          Number.isFinite(value)
      )


  const chartAverage =
    latencyValues.length > 0
      ? (
          latencyValues.reduce(
            (total, value) =>
              total + value,
            0
          ) /
          latencyValues.length
        )
      : null


  const chartPeak =
    latencyValues.length > 0
      ? Math.max(
          ...latencyValues
        )
      : null


  const chartMinimum =
    latencyValues.length > 0
      ? Math.min(
          ...latencyValues
        )
      : null


  const currentLatency =
    selectedState === 'ONLINE'
      ? (
          selectedStatus
            ?.response_time_ms ??
          null
        )
      : null


  /*
   * =====================================================
   * AVAILABILITY
   * =====================================================
   */

  const historyOnline =
    timelineHistory.filter(
      item =>
        item.status
          .toUpperCase() ===
        'ONLINE'
    ).length


  const historyAvailability =
    timelineHistory.length > 0
      ? (
          historyOnline /
          timelineHistory.length
        ) * 100
      : null


  /*
   * =====================================================
   * FORMATTERS
   * =====================================================
   */

  const formatRelativeTime = (
    value?: string | null
  ) => {

    if (!value) {
      return 'Never'
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

    if (seconds < 10) {
      return 'Just now'
    }

    if (seconds < 60) {
      return `${seconds}s ago`
    }

    const minutes =
      Math.floor(
        seconds / 60
      )

    if (minutes < 60) {
      return `${minutes}m ago`
    }

    const hours =
      Math.floor(
        minutes / 60
      )

    if (hours < 24) {
      return `${hours}h ago`
    }

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone:
          'Asia/Jakarta',
      }
    ).format(date)
  }


  const formatChartTime = (
    value?: string | null
  ) => {

    if (!value) {
      return ''
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        hour: '2-digit',
        minute: '2-digit',
        second:
          chartMode === 'LIVE'
            ? '2-digit'
            : undefined,
        hour12: false,
        timeZone:
          'Asia/Jakarta',
      }
    ).format(date)
  }


  const formatDateTime = (
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
        timeZone:
          'Asia/Jakarta',
      }
    ).format(date)
  }


  /*
   * =====================================================
   * SVG CHART
   * =====================================================
   */

  const latencyPoints =
    useMemo(() => {

      if (chartValues.length === 0) {
        return ''
      }

      const width = 700
      const height = 180

      const topPadding = 18
      const bottomPadding = 18

      const maxValue =
        Math.max(
          1,
          ...chartValues.map(
            item =>
              item.value
          )
        )

      const minValue =
        Math.min(
          ...chartValues.map(
            item =>
              item.value
          )
        )

      const range =
        Math.max(
          0.2,
          maxValue - minValue
        )

      const visualMin =
        Math.max(
          0,
          minValue -
          range * 0.25
        )

      const visualMax =
        maxValue +
        range * 0.25

      const visualRange =
        Math.max(
          0.1,
          visualMax - visualMin
        )

      return chartValues
        .map(
          (
            item,
            index
          ) => {

            const x =
              chartValues.length === 1
                ? width / 2
                : (
                    index /
                    (
                      chartValues.length -
                      1
                    )
                  ) * width

            const normalized =
              (
                item.value -
                visualMin
              ) /
              visualRange

            const drawableHeight =
              height -
              topPadding -
              bottomPadding

            const y =
              topPadding +
              (
                1 - normalized
              ) *
              drawableHeight

            return `${x},${y}`

          }
        )
        .join(' ')

    }, [chartValues])


  const chartStart =
    chartValues[0]
      ?.timestamp


  const chartMiddle =
    chartValues[
      Math.floor(
        chartValues.length / 2
      )
    ]?.timestamp


  const chartEnd =
    chartValues[
      chartValues.length - 1
    ]?.timestamp


  /*
   * =====================================================
   * MANUAL CHECK
   * =====================================================
   */

  const runAllChecks =
    async () => {

      if (checking) {
        return
      }

      setChecking(true)

      try {

        const response =
          await fetch(
            '/api/monitoring/check-all',
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          )

        if (response.status === 401) {
          onUnauthorized()
          return
        }

        if (!response.ok) {
          throw new Error(
            'Monitoring check failed'
          )
        }

        await response.json()

        await onRefresh()

        if (
          selectedServerId !== null
        ) {
          await loadHistory(
            selectedServerId,
            true
          )
        }

      } catch (error) {

        console.error(
          'Monitoring check failed:',
          error
        )

      } finally {

        setChecking(false)

      }
    }


  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="monitoring-page">

      <section
        className="remote-v3-hero monitoring-v4-hero"
      >

        <div className="remote-v3-hero-copy">

          <div className="remote-v3-eyebrow">
            Monitoring
          </div>

          <h1>
            Infrastructure Health
          </h1>

          <p>
            Real-time infrastructure availability,
            connectivity and latency monitoring.
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
                  ? 'Infrastructure healthy'
                  : 'Infrastructure needs attention'}
              </strong>

              <small>
                {onlineServers} of {totalServers}
                {' '}targets online
              </small>
            </div>
          </div>


          <button
            type="button"
            className="remote-v3-refresh"
            disabled={checking}
            onClick={runAllChecks}
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

            {checking
              ? 'Checking...'
              : 'Check Now'}
          </button>

        </div>

      </section>


      <section className="monitoring-v3-summary">

        <div>
          <span>Total Targets</span>
          <strong>{totalServers}</strong>
          <small>Monitored infrastructure</small>
        </div>

        <div>
          <span>Online</span>
          <strong className="positive">
            {onlineServers}
          </strong>
          <small>Reachable targets</small>
        </div>

        <div>
          <span>Offline</span>
          <strong
            className={
              offlineServers > 0
                ? 'negative'
                : ''
            }
          >
            {offlineServers}
          </strong>
          <small>
            {offlineServers > 0
              ? 'Requires attention'
              : 'No active outage'}
          </small>
        </div>

        <div>
          <span>Avg Latency</span>
          <strong>
            {averageLatency !== null
              ? `${averageLatency.toFixed(2)} ms`
              : '-'}
          </strong>
          <small>Online targets</small>
        </div>

      </section>


      <section className="monitoring-v3-server-panel">

        <div className="monitoring-v3-server-heading">

          <div>
            <h2>
              Server Monitoring
            </h2>

            <p>
              Select a server to inspect
              current health and latency.
            </p>
          </div>

          <div className="monitoring-server-count">
            <strong>
              {filteredServers.length}
            </strong>
            <span>
              {' '}of {totalServers} servers
            </span>
          </div>

        </div>


        <div className="monitoring-v3-toolbar">

          <div className="monitoring-v3-search">

            <span>⌕</span>

            <input
              value={search}
              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
              placeholder="Search server, hostname, IP or OS..."
            />

          </div>


          <select
            value={protocolFilter}
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
          </select>


          <select
            value={statusFilter}
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
          </select>

        </div>


        <div className="monitoring-v3-table-head">

          <span>Server</span>
          <span>Address</span>
          <span>Protocol</span>
          <span>Status</span>
          <span>Latency</span>
          <span>Last Check</span>

        </div>


        <div className="monitoring-v3-table-body">

          {filteredServers.length === 0 ? (

            <div className="monitoring-v3-chart-empty">
              No servers match the
              current filter.
            </div>

          ) : (

            filteredServers.map(
              server => {

                const state =
                  getStatus(
                    server.id
                  )

                const status =
                  getNormalizedStatus(
                    server.id
                  )

                const selected =
                  server.id ===
                  selectedServerId

                return (
                  <button
                    type="button"
                    key={server.id}
                    className={
                      `monitoring-v3-server-row ${
                        selected
                          ? 'selected'
                          : ''
                      }`
                    }
                    onClick={() =>
                      setSelectedServerId(
                        server.id
                      )
                    }
                  >

                    <div className="monitoring-v3-server-name">

                      <span
                        className={
                          `monitoring-v3-dot ${status.toLowerCase()}`
                        }
                      />

                      <div>
                        <strong>
                          {server.name}
                        </strong>

                        <span>
                          {server.hostname ||
                            server.operating_system ||
                            'Managed Server'}
                        </span>
                      </div>

                    </div>


                    <div className="monitoring-v3-address">

                      <strong>
                        {server.ip_address}
                      </strong>

                      <span>
                        Port {server.port}
                      </span>

                    </div>


                    <div>
                      <span className="monitoring-v3-protocol">
                        {server.protocol.toUpperCase()}
                      </span>
                    </div>


                    <div>
                      <span
                        className={
                          `monitoring-v3-status ${status.toLowerCase()}`
                        }
                      >
                        <i />
                        {status}
                      </span>
                    </div>


                    <div className="monitoring-v3-latency">
                      <strong>
                        {status === 'ONLINE' &&
                        state
                          ?.response_time_ms !=
                          null
                          ? `${state.response_time_ms.toFixed(2)} ms`
                          : '-'}
                      </strong>
                    </div>


                    <div className="monitoring-v3-last-check">
                      {formatRelativeTime(
                        state?.last_check
                      )}
                    </div>

                  </button>
                )

              }
            )

          )}

        </div>

      </section>


      {selectedServer && (

        <section
          className="monitoring-v4-selected-health"
        >

          <div
            className="monitoring-v4-selected-title"
          >
            <div>
              <span>
                Selected Target
              </span>

              <strong>
                {selectedServer.name}
              </strong>

              <small>
                {selectedServer.hostname ||
                  selectedServer.operating_system ||
                  'Managed target'}
              </small>
            </div>

            <span
              className={
                `monitoring-v3-status ${selectedState.toLowerCase()}`
              }
            >
              <i />
              {selectedState}
            </span>
          </div>


          <div
            className="monitoring-v4-selected-metrics"
          >

            <div>
              <span>Status</span>
              <strong>
                {selectedState}
              </strong>
            </div>

            <div>
              <span>Latency</span>
              <strong>
                {selectedState === 'ONLINE' &&
                selectedStatus?.response_time_ms != null
                  ? `${selectedStatus.response_time_ms.toFixed(2)} ms`
                  : '-'}
              </strong>
            </div>

            <div>
              <span>Last Check</span>
              <strong>
                {formatRelativeTime(
                  selectedStatus?.last_check
                )}
              </strong>
            </div>

            <div>
              <span>Last Online</span>
              <strong>
                {formatRelativeTime(
                  selectedStatus?.last_online
                )}
              </strong>
            </div>

            <div>
              <span>Address</span>
              <strong>
                {selectedServer.ip_address}
                :
                {selectedServer.port}
              </strong>
            </div>

          </div>

        </section>

      )}


      <section className="monitoring-v3-chart-grid">

        <div className="monitoring-v3-chart-card">

          <div className="monitoring-v3-chart-header">

            <div>

              <div className="monitoring-title-row">

                <h2>
                  Latency Trend
                </h2>

                {chartMode === 'LIVE' && (
                  <span className="monitoring-live-badge">
                    <i />
                    LIVE
                  </span>
                )}

              </div>

              <p>
                {selectedServer
                  ? selectedServer.name
                  : 'Select a server'}
              </p>

            </div>


            <div className="monitoring-chart-actions">

              <div className="monitoring-chart-mode">

                <button
                  type="button"
                  className={
                    chartMode === 'LIVE'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setChartMode('LIVE')
                  }
                >
                  Live
                </button>

                <button
                  type="button"
                  className={
                    chartMode === 'HISTORY'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setChartMode('HISTORY')
                  }
                >
                  History
                </button>

              </div>


              <div className="monitoring-v3-chart-metrics">

                <div>
                  <span>Current</span>
                  <strong>
                    {currentLatency !== null
                      ? `${currentLatency.toFixed(2)} ms`
                      : '-'}
                  </strong>
                </div>

                <div>
                  <span>Average</span>
                  <strong>
                    {chartAverage !== null
                      ? `${chartAverage.toFixed(2)} ms`
                      : '-'}
                  </strong>
                </div>

                <div>
                  <span>Peak</span>
                  <strong>
                    {chartPeak !== null
                      ? `${chartPeak.toFixed(2)} ms`
                      : '-'}
                  </strong>
                </div>

              </div>

            </div>

          </div>


          <div className="monitoring-v3-chart-area">

            {(
              chartMode === 'HISTORY' &&
              historyLoading
            ) ? (

              <div className="monitoring-v3-chart-empty">
                Loading monitoring history...
              </div>

            ) : !selectedServer ? (

              <div className="monitoring-v3-chart-empty">
                Select a server to inspect
                latency.
              </div>

            ) : chartValues.length === 0 ? (

              <div className="monitoring-v3-chart-empty">

                {chartMode === 'LIVE'
                  ? 'Collecting live latency samples...'
                  : 'No historical latency samples available.'}

              </div>

            ) : (

              <>

                <svg
                  viewBox="0 0 700 200"
                  preserveAspectRatio="none"
                  className="monitoring-v3-latency-chart"
                >

                  <line
                    x1="0"
                    y1="45"
                    x2="700"
                    y2="45"
                  />

                  <line
                    x1="0"
                    y1="100"
                    x2="700"
                    y2="100"
                  />

                  <line
                    x1="0"
                    y1="155"
                    x2="700"
                    y2="155"
                  />

                  <polyline
                    points={latencyPoints}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />

                </svg>


                <div className="monitoring-v3-chart-axis">

                  <span>
                    {formatChartTime(
                      chartStart
                    )}
                  </span>

                  <span>
                    {formatChartTime(
                      chartMiddle
                    )}
                  </span>

                  <span>
                    {formatChartTime(
                      chartEnd
                    )}
                  </span>

                </div>

              </>

            )}

          </div>


          <div className="monitoring-v3-chart-footer">

            <span>
              Mode{' '}
              <strong>
                {chartMode === 'LIVE'
                  ? 'Live'
                  : 'History'}
              </strong>
            </span>

            <span>
              Min{' '}
              <strong>
                {chartMinimum !== null
                  ? `${chartMinimum.toFixed(2)} ms`
                  : '-'}
              </strong>
            </span>

            <span>
              Avg{' '}
              <strong>
                {chartAverage !== null
                  ? `${chartAverage.toFixed(2)} ms`
                  : '-'}
              </strong>
            </span>

            <span>
              Max{' '}
              <strong>
                {chartPeak !== null
                  ? `${chartPeak.toFixed(2)} ms`
                  : '-'}
              </strong>
            </span>

            <span>
              Samples{' '}
              <strong>
                {chartValues.length}
              </strong>
            </span>

          </div>

        </div>


        <div className="monitoring-v3-chart-card availability">

          <div className="monitoring-v3-chart-header">

            <div>
              <h2>
                Availability History
              </h2>
              <p>
                Last {timelineHistory.length}
                {' '}recorded health samples.
              </p>
            </div>

            <div className="monitoring-v3-uptime">
              <strong>
                {historyAvailability !== null
                  ? `${historyAvailability.toFixed(1)}%`
                  : '-'}
              </strong>
              <span>
                recorded uptime
              </span>
            </div>

          </div>


          <div className="monitoring-v3-availability-grid">

            {historyLoading ? (

              <div className="monitoring-v3-chart-empty">
                Loading availability history...
              </div>

            ) : timelineHistory.length === 0 ? (

              <div className="monitoring-v3-chart-empty">
                No availability history.
              </div>

            ) : (

              timelineHistory.map(
                item => {

                  const status =
                    (
                      item.status ||
                      'UNKNOWN'
                    ).toUpperCase()

                  return (
                    <span
                      key={item.id}
                      className={
                        `monitoring-v3-availability-block ${status.toLowerCase()}`
                      }
                      title={
                        `${formatDateTime(
                          item.checked_at
                        )} · ${status}`
                      }
                    />
                  )

                }
              )

            )}

          </div>


          <div className="monitoring-v3-availability-legend">

            <span>
              <i className="online" />
              Online
            </span>

            <span>
              <i className="offline" />
              Offline
            </span>

            <span>
              <i className="unknown" />
              Unknown
            </span>

          </div>


          {selectedServer && (

            <div className="monitoring-v3-selected-status">

              <span
                className={
                  `monitoring-v3-selected-dot ${selectedState.toLowerCase()}`
                }
              />

              <div>
                <strong>
                  {selectedServer.name}
                </strong>

                <span>
                  {selectedServer.ip_address}
                  {' : '}
                  {selectedServer.port}
                  {' · '}
                  {selectedServer.protocol.toUpperCase()}
                </span>
              </div>


              <div className="monitoring-v3-selected-current">

                <strong>
                  {selectedState}
                </strong>

                <span>
                  {formatRelativeTime(
                    selectedStatus
                      ?.last_check
                  )}
                </span>

              </div>

            </div>

          )}


          <div className="monitoring-v3-chart-footer">

            <span>
              Fleet Online{' '}
              <strong>
                {currentAvailability.toFixed(0)}%
              </strong>
            </span>

            <span>
              Last Online{' '}
              <strong>
                {formatRelativeTime(
                  selectedStatus
                    ?.last_online
                )}
              </strong>
            </span>

            <span>
              Samples{' '}
              <strong>
                {timelineHistory.length}
              </strong>
            </span>

          </div>

        </div>

      </section>


    </div>
  )
}


export default MonitoringPage