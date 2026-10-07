import {
  useEffect,
  useRef,
  useState,
} from 'react'


type MutableRef<T> = {
  current: T
}


type UseRDPResizeOptions = {
  connected: boolean

  displayRef:
    MutableRef<HTMLDivElement | null>

  guacDisplayRef:
    MutableRef<any>

  clientRef:
    MutableRef<any>
}


type RemoteSize = {
  width: number
  height: number
}


export default function useRDPResize({
  connected,
  displayRef,
  guacDisplayRef,
  clientRef,
}: UseRDPResizeOptions) {

  const [
    isFullscreen,
    setIsFullscreen,
  ] = useState(false)


  const resizeTimerRef =
    useRef<number | null>(
      null
    )


  const refitTimerRef =
    useRef<number | null>(
      null
    )


  const lastRemoteSizeRef =
    useRef<RemoteSize | null>(
      null
    )


  const fullscreenTransitionRef =
    useRef(false)


  const fullscreenSettleTimerRef =
    useRef<number | null>(
      null
    )


  /*
   * =====================================================
   * STAGE VISIBILITY
   * =====================================================
   */

  const getVisibleStage =
    () => {

      const stage =
        displayRef.current

      if (!stage) {
        return null
      }


      /*
       * Important for minimized sessions.
       *
       * When the session host uses display:none,
       * clientWidth/clientHeight become zero.
       *
       * Do not resize Windows to the fallback
       * 640x480 while the session is minimized.
       */
      if (
        stage.clientWidth <= 0 ||
        stage.clientHeight <= 0
      ) {
        return null
      }


      return stage
    }


  /*
   * =====================================================
   * LOCAL DISPLAY FIT
   * =====================================================
   */

  const fitRDPDisplay =
    () => {

      const stage =
        getVisibleStage()

      const display =
        guacDisplayRef.current

      if (
        !stage ||
        !display
      ) {
        return
      }


      const remoteWidth =
        display.getWidth()

      const remoteHeight =
        display.getHeight()

      if (
        !remoteWidth ||
        !remoteHeight
      ) {
        return
      }


      const style =
        window.getComputedStyle(
          stage
        )

      const horizontalPadding =
        parseFloat(
          style.paddingLeft || '0'
        ) +
        parseFloat(
          style.paddingRight || '0'
        )

      const verticalPadding =
        parseFloat(
          style.paddingTop || '0'
        ) +
        parseFloat(
          style.paddingBottom || '0'
        )


      const availableWidth =
        Math.max(
          0,
          stage.clientWidth -
            horizontalPadding
        )

      const availableHeight =
        Math.max(
          0,
          stage.clientHeight -
            verticalPadding
        )


      if (
        availableWidth <= 0 ||
        availableHeight <= 0
      ) {
        return
      }


      const scale =
        Math.min(
          availableWidth /
            remoteWidth,

          availableHeight /
            remoteHeight
        )


      const finalScale =
        Math.min(
          Math.max(
            scale,
            0.1
          ),
          2
        )


      display.scale(
        finalScale
      )
    }


  /*
   * =====================================================
   * REMOTE RESIZE
   * =====================================================
   */

  const resizeRemoteToStage =
    () => {

      const stage =
        getVisibleStage()

      const client =
        clientRef.current

      if (
        !stage ||
        !client
      ) {
        return
      }


      const style =
        window.getComputedStyle(
          stage
        )

      const horizontalPadding =
        parseFloat(
          style.paddingLeft || '0'
        ) +
        parseFloat(
          style.paddingRight || '0'
        )

      const verticalPadding =
        parseFloat(
          style.paddingTop || '0'
        ) +
        parseFloat(
          style.paddingBottom || '0'
        )


      const width =
        Math.floor(
          stage.clientWidth -
            horizontalPadding
        )

      const height =
        Math.floor(
          stage.clientHeight -
            verticalPadding
        )


      if (
        width < 320 ||
        height < 240
      ) {
        return
      }


      /*
       * Do not send the same resolution repeatedly.
       */
      const previous =
        lastRemoteSizeRef.current

      if (
        previous &&
        previous.width === width &&
        previous.height === height
      ) {

        fitRDPDisplay()

        return
      }


      lastRemoteSizeRef.current = {
        width,
        height,
      }


      if (
        typeof client.sendSize ===
          'function'
      ) {

        try {

          client.sendSize(
            width,
            height
          )

        }
        catch (error) {

          console.warn(
            'AKSARA RDP resize failed',
            error
          )
        }
      }


      /*
       * One immediate local fit.
       */
      window.requestAnimationFrame(
        fitRDPDisplay
      )


      /*
       * One delayed refit after the new RDP
       * framebuffer has had time to arrive.
       *
       * Previously there were several delayed
       * refits extending to 1500 ms.
       */
      if (
        refitTimerRef.current !==
        null
      ) {

        window.clearTimeout(
          refitTimerRef.current
        )
      }


      refitTimerRef.current =
        window.setTimeout(
          () => {

            fitRDPDisplay()

            refitTimerRef.current =
              null

          },
          280
        )
    }


  /*
   * =====================================================
   * LIGHTWEIGHT LOCAL FIT
   * =====================================================
   */

  const runFitSequence =
    () => {

      window.requestAnimationFrame(
        fitRDPDisplay
      )

      window.setTimeout(
        fitRDPDisplay,
        80
      )
    }


  /*
   * =====================================================
   * DEBOUNCED REMOTE RESIZE
   * =====================================================
   */

  const scheduleRemoteResize =
    (
      delay = 220
    ) => {

      if (
        resizeTimerRef.current !==
        null
      ) {

        window.clearTimeout(
          resizeTimerRef.current
        )
      }


      resizeTimerRef.current =
        window.setTimeout(
          () => {

            resizeRemoteToStage()

            resizeTimerRef.current =
              null

          },
          delay
        )
    }


  /*
   * =====================================================
   * VIEWPORT OBSERVER
   * =====================================================
   */

  useEffect(() => {

    const stage =
      displayRef.current

    if (!stage) {
      return
    }


    const observer =
      new ResizeObserver(
        () => {

          /*
           * If minimized, stage is zero-sized.
           * Ignore the event completely.
           */
          if (
            stage.clientWidth <= 0 ||
            stage.clientHeight <= 0
          ) {
            return
          }


          runFitSequence()

          if (
            !fullscreenTransitionRef.current &&
            !document.fullscreenElement
          ) {

            scheduleRemoteResize(
              180
            )
          }
        }
      )


    observer.observe(
      stage
    )


    const handleWindowResize =
      () => {

        if (
          stage.clientWidth <= 0 ||
          stage.clientHeight <= 0
        ) {
          return
        }


        /*
         * Always keep the existing framebuffer fitted.
         */
        runFitSequence()


        /*
         * Normal browser resize may update the remote
         * resolution.
         *
         * During fullscreen transition we intentionally
         * keep the remote framebuffer unchanged.
         */
        if (
          !fullscreenTransitionRef.current &&
          !document.fullscreenElement
        ) {

          scheduleRemoteResize(
            180
          )
        }
      }


    window.addEventListener(
      'resize',
      handleWindowResize
    )


    const handleFullscreenChange =
      () => {

        const stageElement =
          displayRef.current

        const fullscreen =
          !!stageElement &&
          document.fullscreenElement ===
            stageElement


        setIsFullscreen(
          fullscreen
        )


        /*
         * Phase 1:
         *
         * Keep the existing framebuffer during the
         * browser fullscreen transition.
         *
         * This makes enter/exit fullscreen feel
         * immediate and smooth.
         */
        fullscreenTransitionRef.current =
          true


        if (
          resizeTimerRef.current !==
          null
        ) {

          window.clearTimeout(
            resizeTimerRef.current
          )

          resizeTimerRef.current =
            null
        }


        if (
          fullscreenSettleTimerRef.current !==
          null
        ) {

          window.clearTimeout(
            fullscreenSettleTimerRef.current
          )

          fullscreenSettleTimerRef.current =
            null
        }


        /*
         * Immediately scale the existing framebuffer
         * to the new browser viewport.
         */
        window.requestAnimationFrame(
          fitRDPDisplay
        )


        window.setTimeout(
          fitRDPDisplay,
          60
        )


        window.setTimeout(
          fitRDPDisplay,
          180
        )


        /*
         * Phase 2:
         *
         * After the browser transition has completely
         * settled, resize the actual Windows desktop.
         *
         * Fullscreen gets slightly more settle time
         * than returning to the normal viewer.
         */
        const settleDelay =
          fullscreen
            ? 650
            : 500


        fullscreenSettleTimerRef.current =
          window.setTimeout(
            () => {

              resizeRemoteToStage()

              fullscreenTransitionRef.current =
                false

              fullscreenSettleTimerRef.current =
                null

            },
            settleDelay
          )
      }


    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange
    )


    if (connected) {

      runFitSequence()

      scheduleRemoteResize(
        180
      )
    }


    return () => {

      observer.disconnect()


      window.removeEventListener(
        'resize',
        handleWindowResize
      )


      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      )


      if (
        resizeTimerRef.current !==
        null
      ) {

        window.clearTimeout(
          resizeTimerRef.current
        )

        resizeTimerRef.current =
          null
      }


      if (
        refitTimerRef.current !==
        null
      ) {

        window.clearTimeout(
          refitTimerRef.current
        )

        refitTimerRef.current =
          null
      }


      if (
        fullscreenSettleTimerRef.current !==
        null
      ) {

        window.clearTimeout(
          fullscreenSettleTimerRef.current
        )

        fullscreenSettleTimerRef.current =
          null
      }


      fullscreenTransitionRef.current =
        false
    }

  }, [
    connected,
  ])


  /*
   * =====================================================
   * FULLSCREEN
   * =====================================================
   */

  const toggleFullscreen =
    async () => {

      const stage =
        getVisibleStage()

      if (!stage) {
        return
      }


      try {

        if (
          document.fullscreenElement ===
            stage
        ) {

          await document
            .exitFullscreen()

          /*
           * fullscreenchange handles resize.
           */
          return
        }


        await stage
          .requestFullscreen()


        /*
         * fullscreenchange handles resize.
         */

      }
      catch (error) {

        console.warn(
          'AKSARA RDP fullscreen failed',
          error
        )
      }
    }


  return {
    isFullscreen,
    toggleFullscreen,
  }
}
