import { useEffect, useState } from 'react'

type ServerGroup = {
  id: number
  name: string
  description?: string | null
  created_at?: string | null
}

type Props = {
  token: string
  onClose: () => void
  onUnauthorized: () => void
  onChanged: () => void
}

function ServerGroupsModal({
  token,
  onClose,
  onUnauthorized,
  onChanged,
}: Props) {
  const [groups, setGroups] = useState<ServerGroup[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)

  const [editingGroup, setEditingGroup] =
    useState<ServerGroup | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [saving, setSaving] = useState(false)

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<ServerGroup | null>(null)

  const [
    deleting,
    setDeleting,
  ] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const authFetch = (
    url: string,
    options: RequestInit = {}
  ) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    })
  }

  const loadGroups = async () => {
    setLoading(true)

    try {
      const response = await authFetch(
        '/api/server-groups/'
      )

      if (response.status === 401) {
        onUnauthorized()
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.detail ||
          'Failed to load server groups.'
        )
        return
      }

      setGroups(
        Array.isArray(data)
          ? data
          : []
      )

      setError('')
    } catch {
      setError(
        'Unable to load server groups.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])


  useEffect(() => {

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

  }, [])

  const openAddForm = () => {
    setEditingGroup(null)
    setName('')
    setDescription('')
    setMessage('')
    setError('')
    setShowForm(true)
  }

  const openEditForm = (
    group: ServerGroup
  ) => {
    setEditingGroup(group)
    setName(group.name)
    setDescription(
      group.description || ''
    )
    setMessage('')
    setError('')
    setShowForm(true)
  }

  const closeGroupForm = () => {
    setShowForm(false)
    setEditingGroup(null)
    setName('')
    setDescription('')
    setSaving(false)
    setError('')
  }

  const saveGroup = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (!name.trim()) {
      setError(
        'Group name is required.'
      )
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const url = editingGroup
        ? `/api/server-groups/${editingGroup.id}`
        : '/api/server-groups/'

      const method = editingGroup
        ? 'PUT'
        : 'POST'

      const response = await authFetch(
        url,
        {
          method,
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name:
              name.trim(),
            description:
              description.trim() || null,
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
        let detail =
          data.detail ||
          'Failed to save server group.'

        if (
          Array.isArray(data.detail)
        ) {
          detail =
            data.detail
              .map(
                (item: {
                  msg?: string
                }) =>
                  item.msg ||
                  'Validation error'
              )
              .join(', ')
        }

        setError(detail)
        return
      }

      setShowForm(false)
      setEditingGroup(null)
      setName('')
      setDescription('')

      setMessage(
        editingGroup
          ? 'Server group updated successfully.'
          : 'Server group created successfully.'
      )

      await loadGroups()

      onChanged()
    } catch {
      setError(
        'Unable to save server group.'
      )
    } finally {
      setSaving(false)
    }
  }

  const openDeleteGroup = (
    group: ServerGroup
  ) => {
    setDeleteTarget(group)
    setMessage('')
    setError('')
  }


  const closeDeleteGroup = () => {
    if (deleting) {
      return
    }

    setDeleteTarget(null)
  }


  const deleteGroup = async () => {

    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    setMessage('')
    setError('')

    try {

      const response = await authFetch(
        `/api/server-groups/${deleteTarget.id}`,
        {
          method: 'DELETE',
        }
      )

      if (response.status === 401) {
        onUnauthorized()
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        setError(
          data.detail ||
          'Failed to delete server group.'
        )
        return
      }

      setMessage(
        `${deleteTarget.name} deleted successfully.`
      )

      setDeleteTarget(null)

      await loadGroups()

      onChanged()

    } catch {

      setError(
        'Unable to delete server group.'
      )

    } finally {

      setDeleting(false)

    }
  }

  return (
    <>
      {/* MAIN SERVER GROUPS MODAL */}

      <div className="modal-overlay">
        <div className="server-groups-modal">

          <div className="server-groups-header">
            <div>
              <h2>
                Server Groups
              </h2>

              <p>
                Organize servers by environment,
                function or security zone.
              </p>
            </div>

            <button
              type="button"
              className="server-modal-close"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="server-groups-toolbar">

            <div className="server-groups-count">
              <strong>
                {groups.length}
              </strong>

              <span>
                {groups.length === 1
                  ? ' group'
                  : ' groups'}
              </span>
            </div>

            <button
              type="button"
              className="connect-button"
              onClick={openAddForm}
            >
              + Add Group
            </button>
          </div>

          {message && (
            <div className="server-success-message">
              {message}
            </div>
          )}

          {!showForm && error && (
            <div className="server-error-message">
              {error}
            </div>
          )}

          {loading ? (
            <div className="server-groups-loading">
              Loading server groups...
            </div>
          ) : groups.length === 0 ? (
            <div className="server-groups-empty">

              <strong>
                No Server Groups
              </strong>

              <span>
                Create your first server group
                to organize server inventory.
              </span>

              <button
                type="button"
                className="connect-button"
                onClick={openAddForm}
              >
                + Add Group
              </button>

            </div>
          ) : (
            <div className="server-groups-list">

              {groups.map((group) => (
                <div
                  className="server-group-row"
                  key={group.id}
                >

                  <div className="server-group-left">

                    <div className="server-group-icon">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
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
                        <path d="M7 7h.01" />
                        <path d="M7 17h.01" />
                        <path d="M11 7h6" />
                        <path d="M11 17h6" />
                      </svg>
                    </div>

                    <div className="server-group-info">

                      <strong>
                        {group.name}
                      </strong>

                      <span>
                        {group.description ||
                          'No description'}
                      </span>

                    </div>

                  </div>

                  <div className="server-group-actions">

                    <button
                      type="button"
                      className="server-action-edit"
                      onClick={() =>
                        openEditForm(group)
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="server-action-deactivate"
                      onClick={() =>
                        openDeleteGroup(
                          group
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

          <div className="server-groups-footer">

            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              Close
            </button>

          </div>

        </div>
      </div>


      {/* DELETE GROUP MODAL */}

      {deleteTarget && (

        <div className="server-group-delete-overlay">

          <div className="server-group-delete-card">

            <div className="server-group-delete-header">

              <div>
                <h3>
                  Delete Group
                </h3>

                <p>
                  Delete
                  {' '}
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
                onClick={closeDeleteGroup}
              >
                ×
              </button>

            </div>


            <div className="server-group-delete-body">

              <p>
                This action is only available
                when no server is using this group.
              </p>

            </div>


            <div className="server-group-delete-actions">

              <button
                type="button"
                className="cancel-button"
                disabled={deleting}
                onClick={closeDeleteGroup}
              >
                Cancel
              </button>

              <button
                type="button"
                className="server-group-delete-submit"
                disabled={deleting}
                onClick={deleteGroup}
              >
                {deleting
                  ? 'Deleting...'
                  : 'Delete'}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ADD / EDIT GROUP MODAL */}

      {showForm && (
        <div className="server-group-form-overlay">

          <div className="server-group-form-card">

            <div className="server-group-form-header">

              <div>
                <h3>
                  {editingGroup
                    ? 'Edit Group'
                    : 'Add Group'}
                </h3>

                <p>
                  {editingGroup
                    ? 'Update server group information.'
                    : 'Create a new server group.'}
                </p>
              </div>

              <button
                type="button"
                className="server-modal-close"
                onClick={closeGroupForm}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={saveGroup}
              className="server-group-form"
            >

              <label>
                Group Name *

                <input
                  type="text"
                  placeholder="Production"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  autoFocus
                />
              </label>

              <label>
                Description

                <textarea
                  rows={4}
                  placeholder="Production servers"
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                />
              </label>

              {error && (
                <div className="server-error-message">
                  {error}
                </div>
              )}

              <div className="server-group-form-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeGroupForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="connect-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingGroup
                      ? 'Save Changes'
                      : 'Add Group'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </>
  )
}

export default ServerGroupsModal