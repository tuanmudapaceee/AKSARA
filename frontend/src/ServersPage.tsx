import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import ServerGroupsModal from './ServerGroupsModal'


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


type ServerGroup = {
  id: number
  name: string
  description?: string | null
  created_at?: string | null
}


type ServerForm = {
  name: string
  hostname: string
  ip_address: string
  operating_system: string
  protocol: string
  port: number
  description: string
  group_id: string
  is_active: boolean
}


type Props = {
  token: string
  onUnauthorized: () => void

  onConnectSSH: (
    server: Server
  ) => void

  onConnectRDP: (
    server: Server
  ) => void
}


const defaultForm: ServerForm = {
  name: '',
  hostname: '',
  ip_address: '',
  operating_system: '',
  protocol: 'SSH',
  port: 22,
  description: '',
  group_id: '',
  is_active: true,
}



type OsFamily =
  | 'ubuntu'
  | 'windows'
  | 'debian'
  | 'redhat'
  | 'rocky'
  | 'linux'
  | 'unknown'


const getOsFamily = (
  operatingSystem?: string | null
): OsFamily => {

  const value =
    (
      operatingSystem ||
      ''
    ).toLowerCase()

  if (
    value.includes(
      'ubuntu'
    )
  ) {
    return 'ubuntu'
  }

  if (
    value.includes(
      'windows'
    ) ||
    value.includes(
      'microsoft'
    )
  ) {
    return 'windows'
  }

  if (
    value.includes(
      'debian'
    )
  ) {
    return 'debian'
  }

  if (
    value.includes(
      'red hat'
    ) ||
    value.includes(
      'rhel'
    ) ||
    value.includes(
      'centos'
    )
  ) {
    return 'redhat'
  }

  if (
    value.includes(
      'rocky'
    ) ||
    value.includes(
      'alma'
    )
  ) {
    return 'rocky'
  }

  if (
    value.includes(
      'linux'
    )
  ) {
    return 'linux'
  }

  return 'unknown'
}


function OsLogo({
  operatingSystem,
}: {
  operatingSystem?: string | null
}) {

  const family =
    getOsFamily(
      operatingSystem
    )

  const iconFile =
    family === 'unknown'
      ? 'linux'
      : family

  const label =
    family === 'ubuntu'
      ? 'Ubuntu'
      : family === 'windows'
        ? 'Windows'
        : family === 'debian'
          ? 'Debian'
          : family === 'redhat'
            ? 'Red Hat'
            : family === 'rocky'
              ? 'Rocky Linux'
              : 'Linux'

  return (
    <span
      className={
        `servers-v2-os-logo ${family}`
      }
      title={label}
    >
      <img
        src={
          `/os-icons/${iconFile}.svg`
        }
        alt=""
        aria-hidden="true"
      />
    </span>
  )
}


function ServersPage({
  token,
  onUnauthorized,
  onConnectSSH,
  onConnectRDP,
}: Props) {

  const [
    servers,
    setServers,
  ] = useState<Server[]>([])

  const [
    statuses,
    setStatuses,
  ] = useState<ServerStatus[]>([])

  const [
    groups,
    setGroups,
  ] = useState<ServerGroup[]>([])


  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('ALL')

  const [
    protocolFilter,
    setProtocolFilter,
  ] = useState('ALL')

  const [
    groupFilter,
    setGroupFilter,
  ] = useState('ALL')


  const [
    message,
    setMessage,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')


  const [
    showForm,
    setShowForm,
  ] = useState(false)

  const [
    showGroups,
    setShowGroups,
  ] = useState(false)


  const [
    editingServer,
    setEditingServer,
  ] = useState<Server | null>(
    null
  )


  const [
    form,
    setForm,
  ] = useState<ServerForm>(
    defaultForm
  )


  const [
    saving,
    setSaving,
  ] = useState(false)


  const [
    openActionMenuId,
    setOpenActionMenuId,
  ] = useState<number | null>(
    null
  )


  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<Server | null>(
    null
  )

  const [
    deleting,
    setDeleting,
  ] = useState(false)


  /*
   * =====================================================
   * API
   * =====================================================
   */

  const authFetch = (
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


  const loadServers = async (
    silent = false
  ) => {

    if (!silent) {
      setLoading(true)
    }

    try {

      const response =
        await authFetch(
          '/api/servers/'
        )


      if (
        response.status === 401
      ) {
        onUnauthorized()
        return
      }


      if (!response.ok) {
        throw new Error(
          'Failed to load servers'
        )
      }


      const data =
        await response.json()


      setServers(
        Array.isArray(data)
          ? data
          : []
      )


      setError('')

    } catch {

      if (!silent) {
        setError(
          'Unable to load server data.'
        )
      }

    } finally {

      if (!silent) {
        setLoading(false)
      }

    }

  }


  const loadStatuses =
    async () => {

      try {

        const response =
          await authFetch(
            '/api/monitoring/status'
          )


        if (
          response.status === 401
        ) {
          onUnauthorized()
          return
        }


        if (!response.ok) {
          return
        }


        const data =
          await response.json()


        setStatuses(
          Array.isArray(data)
            ? data
            : []
        )

      } catch {
        // silent refresh
      }

    }


  const loadGroups =
    async () => {

      try {

        const response =
          await authFetch(
            '/api/server-groups/'
          )


        if (
          response.status === 401
        ) {
          onUnauthorized()
          return
        }


        if (!response.ok) {
          return
        }


        const data =
          await response.json()


        setGroups(
          Array.isArray(data)
            ? data
            : []
        )

      } catch {
        // silent
      }

    }


  const loadAll = async () => {

    await Promise.all([
      loadServers(),
      loadStatuses(),
      loadGroups(),
    ])

  }


  useEffect(() => {

    loadAll()


    const interval =
      window.setInterval(
        () => {

          if (
            !document.hidden
          ) {
            loadServers(true)
            loadStatuses()
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


  useEffect(() => {

    if (!showForm) {
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

  }, [showForm])


  /*
   * =====================================================
   * SERVER ACTION MENU
   * =====================================================
   */

  useEffect(() => {

    if (
      openActionMenuId === null
    ) {
      return
    }


    const handleActionMenuPointerDown =
      (
        event: PointerEvent
      ) => {

        const target =
          event.target

        if (
          target instanceof Element &&
          target.closest(
            '[data-server-action-menu]'
          )
        ) {
          return
        }

        setOpenActionMenuId(
          null
        )

      }


    const handleActionMenuKeyDown =
      (
        event: KeyboardEvent
      ) => {

        if (
          event.key === 'Escape'
        ) {
          setOpenActionMenuId(
            null
          )
        }

      }


    const closeActionMenu =
      () => {

        setOpenActionMenuId(
          null
        )

      }


    document.addEventListener(
      'pointerdown',
      handleActionMenuPointerDown
    )

    document.addEventListener(
      'keydown',
      handleActionMenuKeyDown
    )

    window.addEventListener(
      'resize',
      closeActionMenu
    )

    window.addEventListener(
      'scroll',
      closeActionMenu,
      true
    )


    return () => {

      document.removeEventListener(
        'pointerdown',
        handleActionMenuPointerDown
      )

      document.removeEventListener(
        'keydown',
        handleActionMenuKeyDown
      )

      window.removeEventListener(
        'resize',
        closeActionMenu
      )

      window.removeEventListener(
        'scroll',
        closeActionMenu,
        true
      )

    }

  }, [
    openActionMenuId,
  ])


  /*
   * =====================================================
   * HELPERS
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


  const getGroupName = (
    groupId?: number | null
  ) => {

    if (!groupId) {
      return 'No Group'
    }


    return (
      groups.find(
        group =>
          group.id ===
          groupId
      )?.name ||
      'Unknown Group'
    )

  }


  const getServerStatus = (
    server: Server
  ) => {

    if (!server.is_active) {
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
      return '-'
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


    return `${hours}h ago`

  }


  /*
   * =====================================================
   * FILTER
   * =====================================================
   */

  const filteredServers =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase()


        return servers.filter(
          server => {

            const status =
              getServerStatus(
                server
              )


            const groupName =
              getGroupName(
                server.group_id
              )


            const matchesSearch =
              !keyword ||
              [
                server.name,
                server.hostname,
                server.ip_address,
                server.operating_system,
                server.protocol,
                server.description,
                groupName,
                status,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(keyword)


            const matchesStatus =
              statusFilter ===
                'ALL' ||
              status ===
                statusFilter


            const protocol =
              (
                server.protocol ||
                ''
              ).toUpperCase()


            const matchesProtocol =
              protocolFilter ===
                'ALL' ||
              protocol ===
                protocolFilter


            const matchesGroup =
              groupFilter ===
                'ALL' ||
              (
                groupFilter ===
                  'NONE' &&
                !server.group_id
              ) ||
              server.group_id
                ?.toString() ===
                groupFilter


            return (
              matchesSearch &&
              matchesStatus &&
              matchesProtocol &&
              matchesGroup
            )

          }
        )

      },
      [
        servers,
        statuses,
        groups,
        search,
        statusFilter,
        protocolFilter,
        groupFilter,
      ]
    )


  /*
   * =====================================================
   * FORM
   * =====================================================
   */

  const openAddForm = () => {

    setEditingServer(null)

    setForm({
      ...defaultForm,
    })

    setMessage('')
    setError('')

    setShowForm(true)

  }


  const openEditForm = (
    server: Server
  ) => {

    setEditingServer(
      server
    )


    setForm({
      name:
        server.name,

      hostname:
        server.hostname ||
        '',

      ip_address:
        server.ip_address,

      operating_system:
        server.operating_system ||
        '',

      protocol:
        server.protocol
          .toUpperCase(),

      port:
        server.port,

      description:
        server.description ||
        '',

      group_id:
        server.group_id
          ?.toString() ||
        '',

      is_active:
        server.is_active,
    })


    setMessage('')
    setError('')

    setShowForm(true)

  }


  const closeForm = () => {

    setShowForm(false)

    setEditingServer(null)

    setForm({
      ...defaultForm,
    })

    setSaving(false)

  }


  const handleProtocolChange = (
    protocol: string
  ) => {

    let defaultPort =
      form.port


    if (
      protocol === 'SSH'
    ) {
      defaultPort = 22
    }


    if (
      protocol === 'RDP'
    ) {
      defaultPort = 3389
    }


    if (
      protocol === 'VNC'
    ) {
      defaultPort = 5900
    }


    setForm({
      ...form,
      protocol,
      port: defaultPort,
    })

  }


  const validateForm = () => {

    if (
      !form.name.trim()
    ) {
      setError(
        'Server name is required.'
      )

      return false
    }


    if (
      !form.ip_address.trim()
    ) {
      setError(
        'IP address is required.'
      )

      return false
    }


    if (
      !form.port ||
      form.port < 1 ||
      form.port > 65535
    ) {
      setError(
        'Port must be between 1 and 65535.'
      )

      return false
    }


    return true

  }


  const saveServer = async (
    event: React.FormEvent
  ) => {

    event.preventDefault()


    if (
      !validateForm()
    ) {
      return
    }


    setSaving(true)

    setError('')
    setMessage('')


    const payload:
      Record<string, unknown> = {

      name:
        form.name.trim(),

      hostname:
        form.hostname.trim() ||
        null,

      ip_address:
        form.ip_address.trim(),

      operating_system:
        form.operating_system
          .trim() ||
        null,

      protocol:
        form.protocol
          .toUpperCase(),

      port:
        Number(
          form.port
        ),

      description:
        form.description.trim() ||
        null,

      group_id:
        form.group_id !== ''
          ? Number(
              form.group_id
            )
          : null,
    }


    if (
      editingServer
    ) {
      payload.is_active =
        form.is_active
    }


    try {

      const url =
        editingServer
          ? `/api/servers/${editingServer.id}`
          : '/api/servers/'


      const method =
        editingServer
          ? 'PUT'
          : 'POST'


      const response =
        await authFetch(
          url,
          {
            method,

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        )


      if (
        response.status === 401
      ) {
        onUnauthorized()
        return
      }


      const data =
        await response.json()


      if (!response.ok) {

        let detail =
          data.detail ||
          'Failed to save server.'


        if (
          Array.isArray(
            data.detail
          )
        ) {
          detail =
            data.detail
              .map(
                (
                  item: {
                    msg?: string
                  }
                ) =>
                  item.msg ||
                  'Validation error'
              )
              .join(', ')
        }


        setError(
          detail
        )

        return
      }


      closeForm()


      setMessage(
        editingServer
          ? 'Server updated successfully.'
          : 'Server added successfully.'
      )


      window.setTimeout(
        () => {
          setMessage('')
        },
        3000
      )


      await loadAll()

    } catch {

      setError(
        'Unable to save server.'
      )

    } finally {

      setSaving(false)

    }

  }


  /*
   * =====================================================
   * ACTIVATE / DEACTIVATE
   * =====================================================
   */

  const deactivateServer =
    async (
      server: Server
    ) => {

      const confirmed =
        window.confirm(
          `Deactivate server "${server.name}"?\n\n` +
          `${server.ip_address}:${server.port}\n\n` +
          'Session history will remain available.'
        )


      if (!confirmed) {
        return
      }


      setError('')
      setMessage('')


      try {

        const response =
          await authFetch(
            `/api/servers/${server.id}`,
            {
              method:
                'DELETE',
            }
          )


        if (
          response.status === 401
        ) {
          onUnauthorized()
          return
        }


        const data =
          await response.json()


        if (!response.ok) {

          setError(
            data.detail ||
            'Failed to deactivate server.'
          )

          return
        }


        setMessage(
          `${server.name} has been deactivated.`
        )


        window.setTimeout(
          () => {
            setMessage('')
          },
          3000
        )


        await loadAll()

      } catch {

        setError(
          'Unable to deactivate server.'
        )

      }

    }


  const activateServer =
    async (
      server: Server
    ) => {

      setError('')
      setMessage('')


      try {

        const response =
          await authFetch(
            `/api/servers/${server.id}`,
            {
              method:
                'PUT',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  is_active:
                    true,
                }),
            }
          )


        if (
          response.status === 401
        ) {
          onUnauthorized()
          return
        }


        const data =
          await response.json()


        if (!response.ok) {

          setError(
            data.detail ||
            'Failed to activate server.'
          )

          return
        }


        setMessage(
          `${server.name} has been activated.`
        )


        window.setTimeout(
          () => {
            setMessage('')
          },
          3000
        )


        await loadAll()

      } catch {

        setError(
          'Unable to activate server.'
        )

      }

    }


  /*
   * =====================================================
   * PERMANENT DELETE SERVER
   * =====================================================
   */

  const openDeleteModal = (
    server: Server
  ) => {

    setDeleteTarget(
      server
    )

    setError('')
    setMessage('')

  }


  const closeDeleteModal = () => {

    if (deleting) {
      return
    }

    setDeleteTarget(null)

  }


  const permanentlyDeleteServer =
    async () => {

      if (!deleteTarget) {
        return
      }

      setDeleting(true)

      setError('')
      setMessage('')


      try {

        const server =
          deleteTarget

        const response =
          await authFetch(
            `/api/servers/${server.id}/permanent`,
            {
              method:
                'DELETE',
            }
          )


        if (
          response.status === 401
        ) {
          onUnauthorized()
          return
        }


        const data =
          await response.json()


        if (!response.ok) {

          setError(
            data.detail ||
            'Failed to permanently delete server.'
          )

          return
        }


        setDeleteTarget(null)


        setMessage(
          `${server.name} was permanently deleted.`
        )


        window.setTimeout(
          () => {
            setMessage('')
          },
          3000
        )


        await loadAll()


      } catch {

        setError(
          'Unable to permanently delete server.'
        )

      } finally {

        setDeleting(false)

      }

    }


  /*
   * =====================================================
   * SUMMARY
   * =====================================================
   */

  const totalServers =
    servers.length


  const activeServers =
    servers.filter(
      server =>
        server.is_active
    ).length


  const onlineServers =
    servers.filter(
      server =>
        server.is_active &&
        getStatus(
          server.id
        )?.status
          ?.toUpperCase() ===
          'ONLINE'
    ).length


  const offlineServers =
    servers.filter(
      server =>
        server.is_active &&
        getStatus(
          server.id
        )?.status
          ?.toUpperCase() ===
          'OFFLINE'
    ).length


  const availability =
    activeServers > 0
      ? Math.round(
          (
            onlineServers /
            activeServers
          ) * 100
        )
      : 0


  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <>

      <section className="servers-v3-hero">

        <div className="servers-v3-hero-copy">

          <div className="servers-v3-eyebrow">
            Servers
          </div>

          <h1>
            Infrastructure Inventory
          </h1>

          <p>
            Manage registered infrastructure targets,
            platforms, groups and access configuration.
          </p>

        </div>


        <div className="servers-v3-hero-actions">

          <div className="servers-v3-inventory-health">

            <span />

            <div>
              <strong>
                {activeServers} active targets
              </strong>

              <small>
                {totalServers} managed servers
              </small>
            </div>

          </div>


          <button
            type="button"
            className="servers-v2-secondary-button"
            onClick={() =>
              setShowGroups(true)
            }
          >
            Manage Groups
          </button>


          <button
            type="button"
            className="servers-v2-primary-button"
            onClick={openAddForm}
          >
            Add Server
          </button>

        </div>

      </section>


      {/*
       * =================================================
       * SUMMARY STRIP
       * =================================================
       */}

      <section className="servers-v2-summary">

        <div>

          <span>
            Total Servers
          </span>

          <strong>
            {totalServers}
          </strong>

          <small>
            Managed endpoints
          </small>

        </div>


        <div>

          <span>
            Active
          </span>

          <strong>
            {activeServers}
          </strong>

          <small>
            Available targets
          </small>

        </div>


        <div>

          <span>
            Online
          </span>

          <strong className="positive">
            {onlineServers}
          </strong>

          <small>
            Responding normally
          </small>

        </div>


        <div>

          <span>
            Offline
          </span>

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
            {offlineServers === 0
              ? 'No incidents'
              : 'Requires attention'}
          </small>

        </div>


        <div className="servers-v2-availability">

          <span>
            Availability
          </span>

          <strong>
            {availability}%
          </strong>

          <div>
            <i
              style={{
                width:
                  `${availability}%`,
              }}
            />
          </div>

        </div>

      </section>


      {/*
       * =================================================
       * INVENTORY
       * =================================================
       */}

      <section className="servers-v2-panel">

        <div className="servers-v2-panel-heading">

          <div>

            <h2>
              Server Inventory
            </h2>

            <p>
              Managed infrastructure
              endpoints and access targets.
            </p>

          </div>


          <div className="servers-v2-count">

            {filteredServers.length}

            {' '}

            {filteredServers.length === 1
              ? 'server'
              : 'servers'}

          </div>

        </div>


        <div className="servers-v2-toolbar">

          <div className="servers-v2-search">

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

              value={
                search
              }

              placeholder="Search server, hostname, IP..."

              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
            />

          </div>


          <div className="servers-v2-filters">

            <select
              value={
                groupFilter
              }

              onChange={
                event =>
                  setGroupFilter(
                    event.target.value
                  )
              }
            >

              <option value="ALL">
                All Groups
              </option>

              <option value="NONE">
                No Group
              </option>


              {groups.map(
                group => (

                  <option
                    key={
                      group.id
                    }

                    value={
                      group.id
                    }
                  >
                    {group.name}
                  </option>

                )
              )}

            </select>


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



          </div>

        </div>


        {message && (

          <div className="server-success-message">
            {message}
          </div>

        )}


        {error && (

          <div className="server-error-message">
            {error}
          </div>

        )}


        {loading ? (

          <div className="loading">
            Loading servers...
          </div>

        ) : filteredServers.length ===
        0 ? (

          <div className="servers-v2-empty">

            <strong>
              No servers found
            </strong>

            <span>
              Try adjusting your search
              or filters.
            </span>

          </div>

        ) : (

          <div className="servers-v2-table-wrapper">

            <div className="servers-v2-table-head">

              <span>
                Server
              </span>

              <span>
                Group
              </span>

              <span>
                Address
              </span>

              <span>
                Platform
              </span>

              <span>
                Access
              </span>

              <span>
                Health
              </span>

              <span>
                Action
              </span>

            </div>


            <div className="servers-v2-table-body">

              {filteredServers.map(
                server => {

                  const monitor =
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
                    (
                      protocol === 'SSH' ||
                      protocol === 'RDP'
                    )


                  return (

                    <div
                      className="servers-v2-row"

                      key={
                        server.id
                      }
                    >

                      <div className="servers-v2-server-cell">

                        <span
                          className={
                            `servers-v2-state ${status.toLowerCase()}`
                          }
                        />


                        <div>

                          <strong>
                            {server.name}
                          </strong>


                          <span>
                            {server.hostname ||
                              server.description ||
                              'Managed Server'}
                          </span>

                        </div>

                      </div>


                      <div>

                        <span className="servers-v2-group">
                          {getGroupName(
                            server.group_id
                          )}
                        </span>

                      </div>


                      <div className="servers-v2-address">

                        <strong>
                          {server.ip_address}
                        </strong>

                        <span>
                          Port {server.port}
                        </span>

                      </div>


                      <div className="servers-v2-platform">

                        <OsLogo
                          operatingSystem={
                            server.operating_system
                          }
                        />

                        <div className="servers-v2-platform-copy">

                          <strong>
                            {server.operating_system ||
                              'Unknown OS'}
                          </strong>

                          {server.description && (

                            <span>
                              {server.description}
                            </span>

                          )}

                        </div>

                      </div>


                      <div className="servers-v2-access">

                        <span className="servers-v2-protocol">
                          {server.protocol.toUpperCase()}
                        </span>

                        <span>
                          :{server.port}
                        </span>

                      </div>


                      <div className="servers-v2-health">

                        <span
                          className={
                            `servers-v2-health-badge ${status.toLowerCase()}`
                          }
                        >
                          <i />

                          {status}
                        </span>


                        <small>
                          {server.is_active &&
                          monitor
                            ?.response_time_ms !=
                            null
                            ? formatLatency(
                                monitor.response_time_ms
                              )
                            : '-'}
                        </small>


                        {monitor?.last_check && (

                          <em>
                            {formatRelativeTime(
                              monitor.last_check
                            )}
                          </em>

                        )}

                      </div>


                      <div className="servers-v2-actions">

                        {(protocol === 'SSH' ||
                          protocol === 'RDP') && (

                          <button
                            type="button"

                            className="servers-v2-connect"

                            disabled={
                              !canConnect
                            }

                            onClick={() => {

                              if (
                                protocol === 'RDP'
                              ) {
                                onConnectRDP(
                                  server
                                )
                                return
                              }

                              onConnectSSH(
                                server
                              )
                            }}
                          >
                            Connect
                          </button>

                        )}


                        <div
                          className="servers-v2-more"

                          data-server-action-menu
                        >

                          <button
                            type="button"

                            className={
                              `servers-v2-more-trigger ${
                                openActionMenuId ===
                                  server.id
                                  ? 'active'
                                  : ''
                              }`
                            }

                            aria-label={
                              `Actions for ${server.name}`
                            }

                            aria-haspopup="menu"

                            aria-expanded={
                              openActionMenuId ===
                              server.id
                            }

                            onClick={
                              event => {

                                event.stopPropagation()

                                setOpenActionMenuId(
                                  current =>
                                    current ===
                                    server.id
                                      ? null
                                      : server.id
                                )

                              }
                            }
                          >
                            <span />
                            <span />
                            <span />
                          </button>


                          {openActionMenuId ===
                            server.id && (

                            <div
                              className="servers-v2-more-menu"

                              role="menu"
                            >

                              <button
                                type="button"

                                role="menuitem"

                                onClick={() => {

                                  setOpenActionMenuId(
                                    null
                                  )

                                  openEditForm(
                                    server
                                  )

                                }}
                              >
                                Edit Server
                              </button>


                              {server.is_active ? (

                                <button
                                  type="button"

                                  role="menuitem"

                                  className="danger"

                                  onClick={() => {

                                    setOpenActionMenuId(
                                      null
                                    )

                                    deactivateServer(
                                      server
                                    )

                                  }}
                                >
                                  Deactivate
                                </button>

                              ) : (

                                <button
                                  type="button"

                                  role="menuitem"

                                  className="positive"

                                  onClick={() => {

                                    setOpenActionMenuId(
                                      null
                                    )

                                    activateServer(
                                      server
                                    )

                                  }}
                                >
                                  Activate
                                </button>

                              )}


                              <div
                                className="servers-v2-menu-divider"
                              />


                              <button
                                type="button"

                                role="menuitem"

                                className="permanent-delete"

                                onClick={() => {

                                  setOpenActionMenuId(
                                    null
                                  )

                                  openDeleteModal(
                                    server
                                  )

                                }}
                              >
                                Delete Server
                              </button>

                            </div>

                          )}

                        </div>

                      </div>

                    </div>

                  )

                }
              )}

            </div>

          </div>

        )}

      </section>


      {deleteTarget && (

        <div
          className="modal-overlay delete-server-overlay"
        >

          <div
            className="delete-server-modal delete-server-modal-v3"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-server-title"
          >

            <div className="delete-server-header-v3">

              <div>
                <h2 id="delete-server-title">
                  Delete Server
                </h2>

                <p>
                  Delete{' '}
                  <strong>
                    {deleteTarget.name}
                  </strong>
                  ?
                </p>
              </div>

              <button
                type="button"
                className="server-modal-close"
                disabled={deleting}
                onClick={closeDeleteModal}
              >
                ×
              </button>

            </div>


            <div className="delete-server-body-v3">

              <div className="delete-server-target-v3">

                <span>
                  Target
                </span>

                <strong>
                  {deleteTarget.ip_address}
                  :
                  {deleteTarget.port}
                </strong>

              </div>

              <p>
                This permanently removes the server
                and its related AKSARA records.
                This action cannot be undone.
              </p>

            </div>


            <div className="delete-server-actions">

              <button
                type="button"
                className="delete-server-cancel"
                disabled={deleting}
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-server-submit"
                disabled={deleting}
                onClick={
                  permanentlyDeleteServer
                }
              >
                {deleting
                  ? 'Deleting...'
                  : 'Delete'}
              </button>

            </div>

          </div>

        </div>

      )}


      {/*
       * =================================================
       * ADD / EDIT MODAL
       * =================================================
       */}

      {showForm && (

        <div className="modal-overlay">

          <div className="server-form-modal">

            <div className="server-form-header">

              <div>

                <h2>
                  {editingServer
                    ? 'Edit Server'
                    : 'Add Server'}
                </h2>

                <p>
                  {editingServer
                    ? 'Update remote access target configuration.'
                    : 'Register a new server in AKSARA.'}
                </p>

              </div>


              <button
                className="server-modal-close"
                type="button"
                onClick={
                  closeForm
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                saveServer
              }

              className="server-form"
            >

              <div className="server-form-grid">

                <label>
                  Server Name *

                  <input
                    type="text"

                    placeholder="LINUX-APP-01"

                    value={
                      form.name
                    }

                    onChange={
                      event =>
                        setForm({
                          ...form,

                          name:
                            event.target.value,
                        })
                    }
                  />
                </label>


                <label>
                  Hostname

                  <input
                    type="text"

                    placeholder="app01.local"

                    value={
                      form.hostname
                    }

                    onChange={
                      event =>
                        setForm({
                          ...form,

                          hostname:
                            event.target.value,
                        })
                    }
                  />
                </label>


                <label>
                  IP Address *

                  <input
                    type="text"

                    placeholder="172.20.100.66"

                    value={
                      form.ip_address
                    }

                    onChange={
                      event =>
                        setForm({
                          ...form,

                          ip_address:
                            event.target.value,
                        })
                    }
                  />
                </label>


                <label>
                  Operating System

                  <input
                    type="text"

                    placeholder="Ubuntu Server 24.04"

                    value={
                      form.operating_system
                    }

                    onChange={
                      event =>
                        setForm({
                          ...form,

                          operating_system:
                            event.target.value,
                        })
                    }
                  />
                </label>


                <label>
                  Protocol *

                  <select
                    value={
                      form.protocol
                    }

                    onChange={
                      event =>
                        handleProtocolChange(
                          event.target.value
                        )
                    }
                  >

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
                </label>


                <label>
                  Port *

                  <input
                    type="number"

                    min="1"
                    max="65535"

                    value={
                      form.port
                    }

                    onChange={
                      event =>
                        setForm({
                          ...form,

                          port:
                            Number(
                              event.target.value
                            ),
                        })
                    }
                  />
                </label>


                <label>
                  Server Group

                  <select
                    value={
                      form.group_id
                    }

                    onChange={
                      event =>
                        setForm({
                          ...form,

                          group_id:
                            event.target.value,
                        })
                    }
                  >

                    <option value="">
                      No Group
                    </option>


                    {groups.map(
                      group => (

                        <option
                          key={
                            group.id
                          }

                          value={
                            group.id
                          }
                        >
                          {group.name}
                        </option>

                      )
                    )}

                  </select>
                </label>


                {editingServer && (

                  <label>
                    Access Status

                    <select
                      value={
                        form.is_active
                          ? 'active'
                          : 'inactive'
                      }

                      onChange={
                        event =>
                          setForm({
                            ...form,

                            is_active:
                              event.target
                                .value ===
                              'active',
                          })
                      }
                    >

                      <option value="active">
                        Enabled
                      </option>

                      <option value="inactive">
                        Disabled
                      </option>

                    </select>
                  </label>

                )}

              </div>


              <label>
                Description

                <textarea
                  rows={4}

                  placeholder="Production application server"

                  value={
                    form.description
                  }

                  onChange={
                    event =>
                      setForm({
                        ...form,

                        description:
                          event.target.value,
                      })
                  }
                />
              </label>


              {error && (

                <div className="server-error-message">
                  {error}
                </div>

              )}


              <div className="modal-actions">

                <button
                  type="button"

                  className="cancel-button"

                  onClick={
                    closeForm
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"

                  className="connect-button"

                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Saving...'
                    : editingServer
                      ? 'Save Changes'
                      : 'Add Server'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {showGroups && (

        <ServerGroupsModal
          token={
            token
          }

          onUnauthorized={
            onUnauthorized
          }

          onClose={() =>
            setShowGroups(
              false
            )
          }

          onChanged={
            loadGroups
          }
        />

      )}

    </>
  )
}


export default ServersPage