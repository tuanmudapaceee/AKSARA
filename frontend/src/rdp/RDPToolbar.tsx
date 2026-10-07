type RDPToolbarProps = {
  serverName: string
  status: string
  connected: boolean
  isFullscreen: boolean
  onMinimize: () => void
  onFullscreen: () => void
  onDisconnect: () => void
}


export default function RDPToolbar({
  serverName,
  status,
  connected,
  isFullscreen,
  onMinimize,
  onFullscreen,
  onDisconnect,
}: RDPToolbarProps) {

  return (

    <div className="aksara-rdp-toolbar">

      <div className="aksara-rdp-toolbar-info">

        <div className="aksara-rdp-toolbar-icon">

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


        <div className="aksara-rdp-toolbar-copy">

          <div className="aksara-rdp-toolbar-title">

            <strong>
              {serverName}
            </strong>

            <span
              className={
                connected
                  ? 'connected'
                  : ''
              }
            >
              {status}
            </span>

          </div>

          <small>
            RDP Remote Session
          </small>

        </div>

      </div>


      <div className="aksara-rdp-toolbar-actions">

        <button
          type="button"
          className="aksara-rdp-action"
          aria-label="Minimize remote session"
          title="Minimize"
          onClick={onMinimize}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>


        <button
          type="button"
          className="aksara-rdp-action"
          aria-label={
            isFullscreen
              ? 'Exit fullscreen'
              : 'Enter fullscreen'
          }
          title={
            isFullscreen
              ? 'Exit Fullscreen'
              : 'Fullscreen'
          }
          onClick={onFullscreen}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >

            {isFullscreen ? (

              <>
                <path d="M9 9H4V4" />
                <path d="M15 9h5V4" />
                <path d="M9 15H4v5" />
                <path d="M15 15h5v5" />
              </>

            ) : (

              <>
                <path d="M8 3H3v5" />
                <path d="M16 3h5v5" />
                <path d="M8 21H3v-5" />
                <path d="M16 21h5v-5" />
              </>

            )}

          </svg>
        </button>


        <div className="aksara-rdp-toolbar-divider" />


        <button
          type="button"
          className="
            aksara-rdp-action
            aksara-rdp-action-danger
          "
          aria-label="Disconnect remote session"
          title="Disconnect"
          onClick={onDisconnect}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M12 3v9" />

            <path
              d="
                M7.05 5.55
                a8 8 0 1 0
                9.9 0
              "
            />
          </svg>
        </button>

      </div>

    </div>
  )
}
