import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Terminal,
} from '@xterm/xterm'

import {
  FitAddon,
} from '@xterm/addon-fit'

import '@xterm/xterm/css/xterm.css'


type Props = {
  serverId: number
  serverName: string
  token: string
  sshUsername: string
  sshPassword: string
  minimized: boolean
  onMinimize: () => void
  onClose: () => void
}


function SSHTerminal({
  serverId,
  serverName,
  token,
  sshUsername,
  sshPassword,
  minimized,
  onMinimize,
  onClose,
}: Props) {

  const terminalRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const [
    status,
    setStatus,
  ] = useState(
    'Connecting...'
  )


  const [
    fullscreen,
    setFullscreen,
  ] = useState(false)


  useEffect(() => {

    const terminalElement =
      terminalRef.current

    if (!terminalElement) {
      return
    }


    const terminal =
      new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'monospace',
        convertEol: true,
        scrollback: 5000,
      })


    const fitAddon =
      new FitAddon()


    terminal.loadAddon(
      fitAddon
    )


    terminal.open(
      terminalElement
    )


    setTimeout(
      () => {

        fitAddon.fit()

        terminal.focus()

      },
      100
    )


    const protocol =
      window.location.protocol ===
      'https:'
        ? 'wss'
        : 'ws'


    const wsUrl =
      `${protocol}://${window.location.host}` +
      `/ws/ssh/${serverId}` +
      `?token=${encodeURIComponent(token)}`


    const socket =
      new WebSocket(
        wsUrl
      )


    const sendInput = (
      data: string
    ) => {

      if (
        socket.readyState !==
        WebSocket.OPEN
      ) {
        return
      }


      socket.send(
        JSON.stringify({
          type: 'input',
          data,
        })
      )

    }


    socket.onopen =
      () => {

        setStatus(
          'Authenticating...'
        )


        socket.send(
          JSON.stringify({
            username:
              sshUsername,

            password:
              sshPassword,
          })
        )

      }


    socket.onmessage =
      event => {

        try {

          const message =
            JSON.parse(
              event.data
            )


          if (
            message.type ===
            'connected'
          ) {

            setStatus(
              'Connected'
            )

            terminal.focus()

          }


          if (
            message.type ===
            'output'
          ) {

            terminal.write(
              message.data
            )

          }


          if (
            message.type ===
            'error'
          ) {

            setStatus(
              'Error'
            )

            terminal.writeln(
              ''
            )

            terminal.writeln(
              `[AKSARA] ${message.message}`
            )

          }

        } catch {

          terminal.write(
            event.data
          )

        }

      }


    socket.onclose =
      () => {

        setStatus(
          'Disconnected'
        )

        terminal.writeln(
          ''
        )

        terminal.writeln(
          '[AKSARA] SSH session disconnected.'
        )

      }


    socket.onerror =
      () => {

        setStatus(
          'Connection Error'
        )

      }


    /*
     * =====================================================
     * NORMAL TERMINAL INPUT
     * =====================================================
     */

    /*
     * =====================================================
     * WINDOWS / PUTTY STYLE KEYBOARD CLIPBOARD
     * =====================================================
     *
     * Prevent xterm from converting Ctrl+V into a
     * terminal control character.
     *
     * Returning false leaves the event to the browser,
     * allowing a normal paste event to be generated.
     */

    terminal.attachCustomKeyEventHandler(
      event => {

        const key =
          event.key.toLowerCase()

        if (
          event.type === 'keydown' &&
          event.ctrlKey &&
          !event.altKey &&
          key === 'v'
        ) {
          return false
        }


        if (
          event.type === 'keydown' &&
          event.ctrlKey &&
          event.shiftKey &&
          key === 'c' &&
          terminal.hasSelection()
        ) {
          return false
        }


        return true
      }
    )


    /*
     * =====================================================
     * PUTTY STYLE AUTO COPY ON SELECT
     * =====================================================
     */

    const selectionSubscription =
      terminal.onSelectionChange(
        () => {

          const selectedText =
            terminal.getSelection()

          if (!selectedText) {
            return
          }


          void copySelection()

        }
      )


    const inputSubscription =
      terminal.onData(
        data => {

          sendInput(
            data
          )

        }
      )


    /*
     * =====================================================
     * PUTTY STYLE CLIPBOARD
     * =====================================================
     *
     * Supported:
     *
     * Ctrl+Shift+C
     *   Copy selected terminal text.
     *
     * Ctrl+Shift+V
     * Ctrl+V
     *   Paste text / multi-line scripts.
     *
     * Right click
     *   Secure context:
     *     paste directly.
     *
     *   Plain HTTP:
     *     keep browser context menu available so
     *     the user can select Paste.
     */


    const copyTextFallback =
      (
        value: string
      ) => {

        const textarea =
          document.createElement(
            'textarea'
          )

        textarea.value =
          value

        textarea.style.position =
          'fixed'

        textarea.style.left =
          '-9999px'

        textarea.style.top =
          '-9999px'

        textarea.setAttribute(
          'readonly',
          ''
        )

        document.body.appendChild(
          textarea
        )

        textarea.select()

        try {

          document.execCommand(
            'copy'
          )

        } finally {

          document.body.removeChild(
            textarea
          )

        }

      }


    const copySelection =
      async () => {

        const selectedText =
          terminal.getSelection()

        if (!selectedText) {
          return
        }


        try {

          if (
            window.isSecureContext &&
            navigator.clipboard
          ) {

            await navigator.clipboard
              .writeText(
                selectedText
              )

          } else {

            copyTextFallback(
              selectedText
            )

          }

        } catch {

          copyTextFallback(
            selectedText
          )

        }

      }


    /*
     * Capture browser paste BEFORE xterm processes it.
     *
     * This is intentionally based on ClipboardEvent
     * instead of navigator.clipboard.readText(), so
     * Ctrl+V / Ctrl+Shift+V can still work when AKSARA
     * is accessed through plain HTTP.
     */

    const handlePaste =
      (
        event: ClipboardEvent
      ) => {

        const text =
          event.clipboardData
            ?.getData(
              'text/plain'
            )

        if (!text) {
          return
        }


        event.preventDefault()
        event.stopPropagation()

        terminal.focus()


        /*
         * Send clipboard contents as terminal input.
         *
         * Multi-line shell scripts are preserved.
         */

        const normalizedText =
          text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n+$/, '')

        sendInput(
          normalizedText
        )

      }


    /*
     * Ctrl+Shift+C behaves like a terminal client.
     */

    const handleTerminalKeyDown =
      (
        event: KeyboardEvent
      ) => {

        const key =
          event.key
            .toLowerCase()


        if (
          event.ctrlKey &&
          event.shiftKey &&
          key === 'c'
        ) {

          const selectedText =
            terminal.getSelection()

          if (!selectedText) {
            return
          }


          event.preventDefault()
          event.stopPropagation()

          void copySelection()

          return
        }


        /*
         * Do NOT intercept Ctrl+V / Ctrl+Shift+V.
         *
         * Let the browser create a real paste event.
         * handlePaste() above will forward the data
         * into the SSH WebSocket.
         */

      }


    /*
     * Right-click paste.
     *
     * navigator.clipboard requires a secure browser
     * context on most browsers.
     *
     * Therefore:
     *
     * HTTPS / localhost:
     *     right-click immediately pastes.
     *
     * HTTP:
     *     normal browser context menu remains available,
     *     allowing the user to click Paste.
     */

    const handleContextMenu =
      async (
        event: MouseEvent
      ) => {

        terminal.focus()


        if (
          !window.isSecureContext ||
          !navigator.clipboard
        ) {

          /*
           * IMPORTANT:
           *
           * Do not call preventDefault().
           *
           * Browser context menu must remain available
           * so Paste can be selected manually.
           */

          return
        }


        event.preventDefault()


        try {

          const clipboardText =
            await navigator.clipboard
              .readText()


          if (!clipboardText) {
            return
          }


          sendInput(
            clipboardText
          )


        } catch (error) {

          /*
           * Clipboard permission may still be denied.
           *
           * Do not write clipboard contents to logs.
           */

          console.warn(
            'AKSARA direct clipboard paste unavailable',
            error
          )

        }

      }


    terminalElement.addEventListener(
      'paste',
      handlePaste,
      true
    )


    terminalElement.addEventListener(
      'keydown',
      handleTerminalKeyDown,
      true
    )


    terminalElement.addEventListener(
      'contextmenu',
      handleContextMenu
    )


    /*
     * =====================================================
     * RESIZE
     * =====================================================
     */

    const handleResize =
      () => {

        fitAddon.fit()


        if (
          socket.readyState ===
          WebSocket.OPEN
        ) {

          socket.send(
            JSON.stringify({
              type: 'resize',
              cols: terminal.cols,
              rows: terminal.rows,
            })
          )

        }

      }


    window.addEventListener(
      'resize',
      handleResize
    )


    return () => {

      selectionSubscription.dispose()

      inputSubscription.dispose()


      terminalElement
        .removeEventListener(
          'paste',
          handlePaste,
          true
        )


      terminalElement
        .removeEventListener(
          'keydown',
          handleTerminalKeyDown,
          true
        )


      terminalElement
        .removeEventListener(
          'contextmenu',
          handleContextMenu
        )


      window.removeEventListener(
        'resize',
        handleResize
      )


      socket.close()

      terminal.dispose()

    }

  }, [
    serverId,
    token,
    sshUsername,
    sshPassword,
  ])


  /*
   * =====================================================
   * LOCK BACKGROUND SCROLL WHILE SSH IS OPEN
   * =====================================================
   */

  useEffect(() => {

    /*
     * Minimized:
     * allow AKSARA page to scroll normally.
     */

    if (minimized) {
      return
    }


    const previousOverflow =
      document.body.style.overflow

    const previousHtmlOverflow =
      document.documentElement.style.overflow


    document.body.style.overflow =
      'hidden'

    document.documentElement.style.overflow =
      'hidden'


    return () => {

      document.body.style.overflow =
        previousOverflow

      document.documentElement.style.overflow =
        previousHtmlOverflow

    }

  }, [minimized])


  const refreshTerminalSize =
    () => {

      window.setTimeout(
        () => {

          window.dispatchEvent(
            new Event(
              'resize'
            )
          )

        },
        120
      )

    }


  const handleMinimize =
    () => {

      onMinimize()

    }


  const handleFullscreen =
    () => {

      setFullscreen(
        current =>
          !current
      )

      refreshTerminalSize()

    }


  return (
    <div
      className={
        `terminal-overlay ${
          minimized
            ? 'is-minimized'
            : ''
        }`
      }
    >

      <div
        className={
          `terminal-window ${
            fullscreen
              ? 'is-fullscreen'
              : ''
          }`
        }
      >

        <div className="terminal-header">

          <div>

            <strong>
              {serverName}
            </strong>

            <span>
              {status}
            </span>

          </div>


          <div
            className="terminal-window-actions"
          >

            <button
              type="button"
              className="terminal-window-button"
              title="Minimize"
              aria-label="Minimize SSH session"
              onClick={handleMinimize}
            >
              —
            </button>


            <button
              type="button"
              className="terminal-window-button"
              title={
                fullscreen
                  ? 'Restore'
                  : 'Full Screen'
              }
              aria-label={
                fullscreen
                  ? 'Restore terminal window'
                  : 'Full screen terminal'
              }
              onClick={handleFullscreen}
            >
              {fullscreen
                ? '❐'
                : '⛶'}
            </button>


            <button
              type="button"
              className="terminal-close"
              title="Close session"
              onClick={onClose}
            >
              Close
            </button>

          </div>

        </div>


        <div
          ref={terminalRef}
          className="terminal-body"
        />

      </div>


    </div>
  )

}


export default SSHTerminal