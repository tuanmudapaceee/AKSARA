import Guacamole from 'guacamole-common-js'


type SetupRDPInputOptions = {
  client: any
  display: any
  displayElement: HTMLElement
}


type RDPInputController = {
  destroy: () => void
}


export function setupRDPInput({
  client,
  display,
  displayElement,
}: SetupRDPInputOptions): RDPInputController {

  /*
   * =====================================================
   * KEYBOARD
   * =====================================================
   *
   * Keep keyboard attached to document.
   *
   * This is the current stable AKSARA behavior
   * and must not be changed during refactor.
   */

  const keyboard: any =
    new (
      Guacamole as any
    ).Keyboard(
      document
    )


  keyboard.onkeydown =
    (keysym: number) => {

      client.sendKeyEvent(
        1,
        keysym
      )

      return false
    }


  keyboard.onkeyup =
    (keysym: number) => {

      client.sendKeyEvent(
        0,
        keysym
      )
    }


  /*
   * =====================================================
   * MOUSE
   * =====================================================
   */

  const mouse: any =
    new (
      Guacamole as any
    ).Mouse(
      displayElement
    )


  const sendMouse =
    (state: any) => {

      /*
       * Guacamole.Mouse coordinates follow the
       * visually-scaled display.
       *
       * Convert the pointer back to native
       * remote-desktop coordinates.
       */

      const scale =
        display.getScale?.() || 1


      const adjustedState = {
        ...state,

        x:
          Math.round(
            state.x / scale
          ),

        y:
          Math.round(
            state.y / scale
          ),
      }


      client.sendMouseState(
        adjustedState
      )
    }


  mouse.onmousemove =
    sendMouse

  mouse.onmousedown =
    sendMouse

  mouse.onmouseup =
    sendMouse


  /*
   * =====================================================
   * CLEANUP
   * =====================================================
   */

  const destroy =
    () => {

      keyboard.onkeydown =
        null

      keyboard.onkeyup =
        null


      mouse.onmousemove =
        null

      mouse.onmousedown =
        null

      mouse.onmouseup =
        null
    }


  return {
    destroy,
  }
}
