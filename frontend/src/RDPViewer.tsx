import {
  useEffect,
  useRef,
  useState,
} from 'react'

import Guacamole from 'guacamole-common-js'
import RDPToolbar from './rdp/RDPToolbar'
import useRDPResize from './rdp/useRDPResize'
import { setupRDPInput } from './rdp/rdpInput'


type RDPViewerProps = {
  serverId: number
  serverName: string
  token: string
  username: string
  password: string
  domain: string
  onMinimize: () => void
  onClose: () => void
}


function encodeInstruction(
  ...elements: unknown[]
) {
  return (
    elements
      .map(element => {
        const value =
          String(element)

        return (
          `${value.length}.${value}`
        )
      })
      .join(',') +
    ';'
  )
}


export default function RDPViewer({
  serverId,
  serverName,
  token,
  username,
  password,
  domain,
  onMinimize,
  onClose,
}: RDPViewerProps) {

  const displayRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const socketRef =
    useRef<WebSocket | null>(
      null
    )

  const clientRef =
    useRef<any>(null)

  const tunnelRef =
    useRef<any>(null)

  const guacDisplayRef =
    useRef<any>(null)

  const remoteClipboardRef =
    useRef('')

  const [
    status,
    setStatus,
  ] = useState(
    'Connecting...'
  )

  const [
    connected,
    setConnected,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')



  const [
    isDraggingFile,
    setIsDraggingFile,
  ] = useState(false)



  const {
    isFullscreen,
    toggleFullscreen,
  } = useRDPResize({
    connected,
    displayRef,
    guacDisplayRef,
    clientRef,
  })



  useEffect(() => {

    let disposed = false


    /*
     * =====================================================
     * GUACAMOLE IMAGE DECODER WORKAROUND
     * =====================================================
     *
     * guacamole-common-js prefers createImageBitmap().
     *
     * If createImageBitmap() rejects a Guacamole image,
     * Display.drawBlob() may leave a blocked display task
     * in the queue indefinitely.
     *
     * Temporarily disable createImageBitmap so Guacamole
     * uses its Image/DataURI fallback path instead.
     */

    const originalCreateImageBitmap =
      (
        window as any
      ).createImageBitmap

    if (
      typeof originalCreateImageBitmap ===
        'function'
    ) {


      Object.defineProperty(
        window,
        'createImageBitmap',
        {
          configurable: true,
          writable: true,
          value: undefined,
        }
      )
    }


    const parser: any =
      new (
        Guacamole as any
      ).Parser()


    /*
     * =====================================================
     * CUSTOM AKSARA GUACAMOLE TUNNEL
     * =====================================================
     */

    const tunnel: any =
      new (
        Guacamole as any
      ).Tunnel()

    tunnelRef.current =
      tunnel


    tunnel.sendMessage =
      (...elements: unknown[]) => {

        const socket =
          socketRef.current

        if (
          !socket ||
          socket.readyState !==
            WebSocket.OPEN
        ) {
          return
        }

        socket.send(
          encodeInstruction(
            ...elements
          )
        )
      }


    tunnel.connect =
      () => {

        const scheme =
          window.location.protocol ===
          'https:'
            ? 'wss'
            : 'ws'

        const url =
          `${scheme}://` +
          `${window.location.host}` +
          `/ws/rdp/${serverId}` +
          `?token=${encodeURIComponent(token)}`

        const socket =
          new WebSocket(
            url
          )

        socketRef.current =
          socket

        let guacamoleMode =
          false


        socket.onopen =
          () => {

            if (disposed) {
              socket.close()
              return
            }

            setStatus(
              'Authenticating...'
            )
          }


        socket.onmessage =
          event => {

            if (
              disposed ||
              typeof event.data !==
                'string'
            ) {
              return
            }


            /*
             * =============================================
             * AKSARA JSON HANDSHAKE
             * =============================================
             */

            if (
              !guacamoleMode
            ) {

              try {

                const message =
                  JSON.parse(
                    event.data
                  )


                if (
                  message.type ===
                  'ready'
                ) {

                  setStatus(
                    'Connecting to Windows...'
                  )

                  const stage =
                    displayRef.current

                  const width =
                    Math.max(
                      1024,
                      stage?.clientWidth ||
                        window.innerWidth
                    )

                  const height =
                    Math.max(
                      768,
                      stage?.clientHeight ||
                        window.innerHeight
                    )

                  socket.send(
                    JSON.stringify({
                      username,
                      password,
                      domain,
                      width,
                      height,
                      dpi: 96,
                    })
                  )

                  return
                }


                if (
                  message.type ===
                  'connected'
                ) {

                  guacamoleMode =
                    true

                  setConnected(
                    true
                  )

                  setStatus(
                    'Connected'
                  )

                  tunnel.setState(
                    (
                      Guacamole as any
                    ).Tunnel.State.OPEN
                  )

                  return
                }


                if (
                  message.type ===
                  'error'
                ) {

                  setError(
                    message.message ||
                    'RDP connection failed'
                  )

                  setStatus(
                    'Connection failed'
                  )

                  return
                }

              }
              catch {
                return
              }

              return
            }


            /*
             * =============================================
             * GUACAMOLE INSTRUCTION
             * =============================================
             */

            parser.receive(
              event.data
            )
          }


        socket.onerror =
          () => {

            if (disposed) {
              return
            }

            setError(
              'RDP WebSocket connection failed'
            )

            setStatus(
              'Connection error'
            )
          }


        socket.onclose =
          () => {

            if (disposed) {
              return
            }

            setConnected(
              false
            )

            setStatus(
              'Disconnected'
            )

            tunnel.setState(
              (
                Guacamole as any
              ).Tunnel.State.CLOSED
            )
          }
      }


    /*
     * =====================================================
     * GUACAMOLE PARSER
     * =====================================================
     */

    parser.oninstruction =
      (
        opcode: string,
        parameters: string[]
      ) => {

        /*
         * Guacamole.Parser may reuse its parameter array.
         * Forward a stable copy to Guacamole.Client.
         */
        if (
          tunnel.oninstruction
        ) {

          tunnel.oninstruction(
            opcode,
            [...parameters]
          )
        }
      }


    tunnel.disconnect =
      () => {

        const socket =
          socketRef.current

        if (
          socket &&
          (
            socket.readyState ===
              WebSocket.OPEN ||
            socket.readyState ===
              WebSocket.CONNECTING
          )
        ) {

          try {
            socket.close()
          }
          catch {
            // Ignore WebSocket cleanup race.
          }
        }
      }


    /*
     * =====================================================
     * GUACAMOLE CLIENT
     * =====================================================
     */

    const client: any =
      new (
        Guacamole as any
      ).Client(
        tunnel
      )

    clientRef.current =
      client


    /*
     * =====================================================
     * GUACAMOLE DISPLAY
     * =====================================================
     */

    const display: any =
      client.getDisplay()

    guacDisplayRef.current =
      display


    /*
     * TEMP DIAGNOSTIC:
     *
     * This wraps the actual Display.resize() instance.
     * If Guacamole.Client receives a "size" instruction,
     * this log MUST appear.
     */

      /*
       * =====================================================
       * TEMP DIAGNOSTIC: DISPLAY FLUSH
       * =====================================================
       */

      const originalDisplayFlush =
        display.flush.bind(
          display
        )

      let framebufferFixed =
        false

      display.flush =
        (
          callback?: () => void,
          timestamp?: number,
          logicalFrames?: number
        ) => {

          const wrappedCallback =
            () => {

              /*
               * Fix the main framebuffer z-index once.
               * After it is found, no further DOM search
               * is necessary on subsequent frames.
               */
              if (!framebufferFixed) {

                const displayElement =
                  display.getElement()

                const canvases =
                  Array.from(
                    displayElement.querySelectorAll(
                      'canvas'
                    )
                  ) as HTMLCanvasElement[]

                const framebuffer =
                  canvases.find(
                    (
                      canvas:
                        HTMLCanvasElement
                    ) =>
                      canvas.width > 500 &&
                      canvas.height > 500
                  )

                if (framebuffer) {

                  framebuffer.style.setProperty(
                    'z-index',
                    '0',
                    'important'
                  )

                  framebufferFixed =
                    true
                }
              }

              if (callback) {
                callback()
              }
            }

          return originalDisplayFlush(
            wrappedCallback,
            timestamp,
            logicalFrames
          )
        }


    const displayElement =
      display.getElement()

    displayElement.classList.add(
      'aksara-rdp-display'
    )

      const displayContainer =
        displayRef.current

      if (!displayContainer) {
        throw new Error(
          'RDP display container is not available'
        )
      }

      /*
       * Keep exactly one Guacamole display in this viewer.
       * This also handles React StrictMode development mounts.
       */
      displayContainer.replaceChildren()

      displayContainer.appendChild(
        displayElement
      )


    client.onerror =
      (clientError: any) => {

        if (disposed) {
          return
        }

        console.error(
          'AKSARA RDP CLIENT ERROR',
          clientError
        )

        setError(
          clientError?.message ||
          'RDP client error'
        )
      }


    /*
     * =====================================================
     * AKSARA RDP CLIPBOARD
     * =====================================================
     *
     * Text clipboard only.
     *
     * Local -> Remote:
     * Browser paste event is forwarded through the
     * Guacamole clipboard stream.
     *
     * Remote -> Local:
     * Clipboard updates from Windows are received through
     * client.onclipboard and synchronized to the browser
     * clipboard when permission allows.
     */

    const sendClipboardToRemote =
      (clipboardText: string) => {

        if (
          typeof client.createClipboardStream !==
            'function'
        ) {
          return
        }

        try {

          const stream =
            client.createClipboardStream(
              'text/plain'
            )

          const writer =
            new (
              Guacamole as any
            ).StringWriter(
              stream
            )

          writer.sendText(
            clipboardText
          )

          writer.sendEnd()

        }
        catch (clipboardError) {

          console.warn(
            'AKSARA RDP clipboard send failed',
            clipboardError
          )

        }
      }


    /*
     * Windows / Remote -> Browser
     */
    client.onclipboard =
      (
        stream: any,
        mimetype: string
      ) => {

        const type =
          (
            mimetype ||
            ''
          ).toLowerCase()

        if (
          !type.startsWith(
            'text/'
          )
        ) {
          return
        }

        const reader =
          new (
            Guacamole as any
          ).StringReader(
            stream
          )

        let clipboardText =
          ''

        reader.ontext =
          (chunk: string) => {

            clipboardText +=
              chunk
          }

        reader.onend =
          () => {

            remoteClipboardRef.current =
              clipboardText

            /*
             * navigator.clipboard requires a secure
             * browser context and may be denied by
             * browser permissions.
             */
            if (
              navigator.clipboard &&
              typeof navigator.clipboard.writeText ===
                'function'
            ) {

              navigator.clipboard
                .writeText(
                  clipboardText
                )
                .catch(
                  () => {
                    /*
                     * Keep the text in
                     * remoteClipboardRef as fallback.
                     */
                  }
                )
            }
          }
      }


    /*
     * Browser / Local -> Windows
     */
    const handleBrowserPaste =
      (event: ClipboardEvent) => {

        if (disposed) {
          return
        }

        const clipboard =
          event.clipboardData

        if (!clipboard) {
          return
        }

        const clipboardText =
          clipboard.getData(
            'text/plain'
          )

        /*
         * Even an empty string is a valid clipboard value.
         */
        event.preventDefault()

        sendClipboardToRemote(
          clipboardText
        )
      }


    displayContainer.addEventListener(
      'paste',
      handleBrowserPaste,
      true
    )


    /*
     * Ctrl+V / Cmd+V fallback.
     *
     * Guacamole.Keyboard captures keyboard input globally,
     * therefore the normal browser "paste" event may not
     * always fire while the remote desktop has focus.
     */
    const sendRemotePasteShortcut =
      () => {

        /*
         * X11 keysyms used by Guacamole:
         * Control_L = 0xFFE3
         * v         = 0x0076
         */
        client.sendKeyEvent(
          1,
          0xFFE3
        )

        client.sendKeyEvent(
          1,
          0x0076
        )

        client.sendKeyEvent(
          0,
          0x0076
        )

        client.sendKeyEvent(
          0,
          0xFFE3
        )
      }


    const handleClipboardShortcut =
      async (
        event: KeyboardEvent
      ) => {

        const modifier =
          event.ctrlKey ||
          event.metaKey

        if (
          !modifier ||
          event.key.toLowerCase() !==
            'v'
        ) {
          return
        }


        /*
         * Only intercept Ctrl+V if browser Clipboard API
         * is actually available.
         */
        if (
          !navigator.clipboard ||
          typeof navigator.clipboard.readText !==
            'function'
        ) {
          return
        }


        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()


        try {

          const clipboardText =
            await navigator.clipboard
              .readText()

          sendClipboardToRemote(
            clipboardText
          )


          /*
           * Allow the Guacamole clipboard stream to reach
           * Windows before sending Ctrl+V to the remote app.
           */
          window.setTimeout(
            sendRemotePasteShortcut,
            100
          )

        }
        catch (clipboardError) {

          console.warn(
            'AKSARA RDP clipboard read denied',
            clipboardError
          )

        }
      }


    displayContainer.addEventListener(
      'keydown',
      handleClipboardShortcut,
      true
    )


    /*
     * =====================================================
     * FILE DOWNLOAD
     * RDP -> Laptop
     * =====================================================
     */

    client.onfile =
      (
        stream: any,
        mimetype: string,
        filename: string
      ) => {

        const reader =
          new (
            Guacamole as any
          ).BlobReader(
            stream,
            mimetype ||
              'application/octet-stream'
          )

        reader.onend =
          () => {

            const blob =
              reader.getBlob()

            const url =
              URL.createObjectURL(
                blob
              )

            const anchor =
              document.createElement(
                'a'
              )

            anchor.href =
              url

            anchor.download =
              filename ||
              'download'

            anchor.style.display =
              'none'

            document.body.appendChild(
              anchor
            )

            anchor.click()

            anchor.remove()

            window.setTimeout(
              () => {

                URL.revokeObjectURL(
                  url
                )

              },
              1000
            )

          }
      }


    /*
     * =====================================================
     * KEYBOARD + MOUSE INPUT
     * =====================================================
     */

    const inputController =
      setupRDPInput({
        client,
        display,
        displayElement,
      })


    /*
     * =====================================================
     * START CONNECTION
     * =====================================================
     */

    tunnel.setState(
      (
        Guacamole as any
      ).Tunnel.State.CONNECTING
    )

    client.connect()


    /*
     * =====================================================
     * CLEANUP
     * =====================================================
     */

    return () => {

      disposed = true

      inputController.destroy()

      client.onclipboard =
        null

      client.onfile =
        null

      displayContainer.removeEventListener(
        'paste',
        handleBrowserPaste,
        true
      )

      remoteClipboardRef.current =
        ''


      try {
        client.disconnect()
      }
      catch {
        // Ignore cleanup race.
      }


      try {

        const socket =
          socketRef.current

        if (
          socket &&
          (
            socket.readyState ===
              WebSocket.OPEN ||
            socket.readyState ===
              WebSocket.CONNECTING
          )
        ) {
          socket.close()
        }

      }
      catch {
        // Ignore cleanup race.
      }


        /*
         * Remove this exact Guacamole display instance.
         */
        if (
          displayElement.parentNode
        ) {
          displayElement.remove()
        }


      clientRef.current =
        null

      tunnelRef.current =
        null

      socketRef.current =
        null

      guacDisplayRef.current =
        null


      /*
       * Restore browser createImageBitmap().
       */

      if (
        typeof originalCreateImageBitmap ===
          'function'
      ) {

        Object.defineProperty(
          window,
          'createImageBitmap',
          {
            configurable: true,
            writable: true,
            value:
              originalCreateImageBitmap,
          }
        )
      }
    }

  }, [
    serverId,
    token,
    username,
    password,
    domain,
  ])


  /*
   * =====================================================
   * LOCK BACKGROUND PAGE SCROLL WHILE RDP IS OPEN
   * =====================================================
   *
   * The RDP viewer is fixed to the viewport, but the
   * AKSARA page behind it may still be taller than the
   * viewport. Lock document scrolling only while this
   * component is mounted.
   */
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


  /*
   * =====================================================
   * DISCONNECT
   * =====================================================
   */

  const disconnect =
    () => {

      try {
        clientRef.current
          ?.disconnect()
      }
      finally {
        onClose()
      }
    }


  /*
   * =====================================================
   * FILE UPLOAD
   * Laptop -> AKSARA Drive
   * =====================================================
   */

  const uploadFileToRemote =
    (
      file: File
    ) => {

      const client =
        clientRef.current

      if (!client) {
        return
      }

      try {


        const stream =
          client.createFileStream(
            file.type ||
              'application/octet-stream',
            file.name
          )

        const writer =
          new (
            Guacamole as any
          ).BlobWriter(
            stream
          )

        writer.oncomplete =
          () => {

            writer.sendEnd()

          }

        writer.onerror =
          () => {

          }

        writer.sendBlob(
          file
        )

      }
      catch (error) {

        console.error(
          'AKSARA RDP upload failed',
          error
        )

      }
    }


  const handleFileDragOver =
    (
      event:
        React.DragEvent<HTMLDivElement>
    ) => {

      event.preventDefault()

      if (
        event.dataTransfer.types
          .includes('Files')
      ) {

        event.dataTransfer.dropEffect =
          'copy'

        setIsDraggingFile(
          true
        )
      }
    }


  const handleFileDragLeave =
    (
      event:
        React.DragEvent<HTMLDivElement>
    ) => {

      if (
        event.currentTarget ===
        event.target
      ) {

        setIsDraggingFile(
          false
        )
      }
    }


  const handleFileDrop =
    (
      event:
        React.DragEvent<HTMLDivElement>
    ) => {

      event.preventDefault()
      event.stopPropagation()

      setIsDraggingFile(
        false
      )

      const files =
        Array.from(
          event.dataTransfer.files
        )

      if (!files.length) {
        return
      }

      for (
        const file of files
      ) {

        uploadFileToRemote(
          file
        )
      }
    }


  /*
   * =====================================================
   * VIEW
   * =====================================================
   */

  return (

    <div
      className="aksara-rdp-viewer"
      onDragEnter={
        handleFileDragOver
      }
      onDragOver={
        handleFileDragOver
      }
      onDragLeave={
        handleFileDragLeave
      }
      onDrop={
        handleFileDrop
      }
    >

      <RDPToolbar
        serverName={serverName}
        status={status}
        connected={connected}
        isFullscreen={isFullscreen}
        onMinimize={onMinimize}
        onFullscreen={toggleFullscreen}
        onDisconnect={disconnect}
      />


      {isDraggingFile && (

        <div className="aksara-rdp-drop-overlay">

          <div className="aksara-rdp-drop-box">

            <strong>
              Drop file to AKSARA RDP
            </strong>

            <span>
              File will be uploaded to
              AKSARA Drive
            </span>

          </div>

        </div>

      )}


      {error && (

        <div className="aksara-rdp-error">
          {error}
        </div>

      )}


      <div
        ref={
          displayRef
        }
        className="aksara-rdp-stage"
        tabIndex={0}
      />

    </div>

  )
}
