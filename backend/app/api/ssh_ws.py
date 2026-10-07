import asyncio
import base64
import re

from datetime import datetime, timezone

import asyncssh

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
)

from jose import jwt, JWTError

from app.core.config import settings
from app.core.client_ip import get_websocket_client_ip
from app.database import SessionLocal

from app.models.user import User
from app.models.server import Server
from app.models.session import Session as SSHSession
from app.models.session_command import SessionCommand
from app.models.server_activity_event import ServerActivityEvent

from app.services.access_control import can_access_server
from app.services.audit import create_audit_log


router = APIRouter(
    tags=["SSH WebSocket"]
)


# =========================================================
# COMMAND AUDIT CONFIG
# =========================================================

MAX_COMMAND_LENGTH = 4096


# Full-screen terminal applications (nano, vim, less, top, htop, etc.)
# normally switch xterm into an alternate screen buffer.
ALT_SCREEN_ENTER = (
    "\x1b[?1049h",
    "\x1b[?1047h",
    "\x1b[?47h",
)

ALT_SCREEN_EXIT = (
    "\x1b[?1049l",
    "\x1b[?1047l",
    "\x1b[?47l",
)


# Prompt yang kemungkinan meminta secret/password.
#
# Jika output terminal mendeteksi salah satu pola ini,
# input user berikutnya TIDAK akan disimpan ke command audit.
SENSITIVE_PROMPT_PATTERNS = (
    "password:",
    "password for ",
    "passphrase",
    "enter password",
    "current password",
    "new password",
    "retype password",
    "verification code",
    "one-time password",
    "otp:",
)



# =========================================================
# EXACT BASH SHELL TRACKING
# =========================================================

# Custom OSC channel used only between the remote Bash shell
# and AKSARA backend. It is stripped before output is forwarded
# to the browser.
AKSARA_OSC_RE = re.compile(
    r"\x1b\]777;AKSARA;([^;]*);([^;]*);([A-Za-z0-9+/=]*)\x07"
)


def build_bash_tracking_setup() -> str:
    """
    Install per-session Bash tracking.

    Goals:
    - store the command line as the user entered it after readline/TAB
      completion, but before Bash alias expansion;
    - keep the resulting working directory and exit status;
    - avoid the old one-command delay caused by reading history from
      PROMPT_COMMAND.

    The DEBUG trap runs when Bash is about to execute a command. At that
    moment the current interactive line has already been accepted and is
    available in Bash history, while alias expansion may already have changed
    BASH_COMMAND. Therefore we capture `history 1` inside DEBUG and report it
    later from PROMPT_COMMAND.

    Nothing is written permanently to the target VM.
    """
    return (
        " if [ -n \"${BASH_VERSION:-}\" ]; then"
        " _AKSARA_READY=0;"
        " _AKSARA_IN_PC=0;"
        " _AKSARA_CMD='';"
        " _AKSARA_HISTNUM='';"

        " _aksara_debug(){"
        " [ \"${_AKSARA_READY:-0}\" -eq 1 ] || return 0;"
        " [ \"${_AKSARA_IN_PC:-0}\" -eq 0 ] || return 0;"

        # HISTCMD identifies the current Bash history entry. Capture each
        # interactive line only once even if DEBUG fires multiple times for
        # aliases, pipelines, functions, or compound commands.
        " local _histnum=\"${HISTCMD:-}\";"
        " [ -n \"$_histnum\" ] || return 0;"
        " [ \"$_histnum\" != \"${_AKSARA_HISTNUM:-}\" ] || return 0;"

        " local _hist;"
        " _hist=$(builtin history 1 2>/dev/null);"

        # Remove Bash history's leading whitespace first, then remove
        # the numeric history index, then trim the remaining whitespace.
        #
        # Example:
        #   "  2000  ls" -> "2000  ls" -> " ls" -> "ls"
        #
        # Doing this in the opposite order leaves the history number
        # (e.g. "2000 ls") in the audit record.
        " _hist=${_hist#${_hist%%[![:space:]]*}};"
        " _hist=${_hist#*[[:space:]]};"
        " _hist=${_hist#${_hist%%[![:space:]]*}};"

        " [ -n \"$_hist\" ] || return 0;"
        " _AKSARA_CMD=\"$_hist\";"
        " _AKSARA_HISTNUM=\"$_histnum\";"
        " };"

        " _aksara_pc(){"
        " local _st=$?;"

        " if [ \"${_AKSARA_READY:-0}\" -eq 0 ]; then"
        " _AKSARA_READY=1;"
        " _AKSARA_CMD='';"
        " _AKSARA_HISTNUM=\"${HISTCMD:-}\";"
        " return 0;"
        " fi;"

        " _AKSARA_IN_PC=1;"
        " local _cmd=\"${_AKSARA_CMD:-}\";"
        " _AKSARA_CMD='';"

        " if [ -n \"$_cmd\" ]; then"
        " local _b64;"
        " _b64=$(printf '%s' \"$_cmd\" | base64 | tr -d '\\n');"
        " printf '\\033]777;AKSARA;%s;%s;%s\\007' \"$PWD\" \"$_st\" \"$_b64\";"
        " fi;"

        " _AKSARA_IN_PC=0;"
        " };"

        " trap '_aksara_debug' DEBUG;"
        " PROMPT_COMMAND=\"_aksara_pc${PROMPT_COMMAND:+;$PROMPT_COMMAND}\";"
        " fi;"
        " stty echo 2>/dev/null;"
        "\r"
    )


def extract_shell_events(
    data: str,
):
    """
    Strip AKSARA OSC telemetry from terminal output and return
    (clean_output, events).

    Each event is:
      {"command": str, "cwd": str, "exit_status": int|None}
    """
    events = []

    def repl(match):
        cwd = match.group(1)
        status_raw = match.group(2)
        encoded = match.group(3)

        try:
            command = base64.b64decode(
                encoded.encode("ascii"),
                validate=False,
            ).decode(
                "utf-8",
                errors="replace",
            )
        except Exception:
            command = ""

        try:
            exit_status = int(status_raw)
        except (TypeError, ValueError):
            exit_status = None

        events.append({
            "command": command.strip(),
            "cwd": cwd,
            "exit_status": exit_status,
        })

        return ""

    clean = AKSARA_OSC_RE.sub(repl, data)
    return clean, events


def authenticate_websocket(
    token: str,
):
    db = SessionLocal()

    try:
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[
                    settings.JWT_ALGORITHM
                ],
            )

            username = payload.get(
                "sub"
            )

            if not username:
                db.close()
                return None, None

        except JWTError:
            db.close()
            return None, None

        user = (
            db.query(User)
            .filter(
                User.username ==
                username
            )
            .first()
        )

        if (
            not user
            or not user.is_active
        ):
            db.close()
            return None, None

        return user, db

    except Exception:
        db.close()
        raise


# =========================================================
# COMMAND HELPERS
# =========================================================

def output_requests_secret(
    data: str,
) -> bool:
    """
    Detect common password / secret prompts.

    This is deliberately conservative:
    if terminal output looks like a password prompt,
    the next entered line won't be stored.
    """

    text = (
        data
        .lower()
        .strip()
    )

    return any(
        pattern in text
        for pattern
        in SENSITIVE_PROMPT_PATTERNS
    )


def detect_alt_screen(
    data: str,
    current_state: bool,
) -> bool:
    """
    Detect whether the remote terminal has entered or exited
    xterm's alternate screen buffer.

    This prevents keystrokes typed inside applications such as
    nano/vim/less/top from being falsely recorded as shell commands.
    """

    state = current_state

    for marker in ALT_SCREEN_ENTER:
        if marker in data:
            state = True

    for marker in ALT_SCREEN_EXIT:
        if marker in data:
            state = False

    return state


def normalize_command(
    command: str,
) -> str:
    """
    Normalize a shell command before storing it.
    """

    # Remove ANSI escape sequences.
    command = re.sub(
        r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])",
        "",
        command,
    )

    # Remove other non-printable control chars,
    # while preserving normal printable characters.
    command = "".join(
        char
        for char in command
        if (
            char.isprintable()
            or char == "\t"
        )
    )

    command = command.strip()

    if len(command) > MAX_COMMAND_LENGTH:
        command = (
            command[
                :MAX_COMMAND_LENGTH
            ]
        )

    return command


def redact_sensitive_command(
    command: str,
) -> str:
    """
    Redact several common credential patterns.

    This is an additional safety layer.
    It is NOT intended to replace password prompt detection.
    """

    patterns = [
        (
            r"(?i)(password\s*=\s*)(\S+)",
            r"\1[REDACTED]",
        ),
        (
            r"(?i)(passwd\s*=\s*)(\S+)",
            r"\1[REDACTED]",
        ),
        (
            r"(?i)(token\s*=\s*)(\S+)",
            r"\1[REDACTED]",
        ),
        (
            r"(?i)(secret\s*=\s*)(\S+)",
            r"\1[REDACTED]",
        ),
        (
            r"(?i)(api[_-]?key\s*=\s*)(\S+)",
            r"\1[REDACTED]",
        ),
        (
            r"(?i)(authorization:\s*bearer\s+)(\S+)",
            r"\1[REDACTED]",
        ),
    ]

    result = command

    for pattern, replacement in patterns:
        result = re.sub(
            pattern,
            replacement,
            result,
        )

    return result


def save_session_command(
    db,
    *,
    session_id: int,
    user_id: int,
    server_id: int,
    remote_username: str,
    command: str,
):
    """
    Save one completed shell command.

    Failure to save an audit command must NOT
    terminate the user's SSH session.
    """

    normalized = normalize_command(
        command
    )

    if not normalized:
        return

    normalized = (
        redact_sensitive_command(
            normalized
        )
    )

    try:
        record = SessionCommand(
            session_id=session_id,
            user_id=user_id,
            server_id=server_id,
            remote_username=
                remote_username,
            command=normalized,
            executed_at=(
                datetime.now(
                    timezone.utc
                )
            ),
        )

        db.add(record)
        db.commit()

    except Exception as exc:
        db.rollback()

        print(
            "AKSARA command audit "
            f"failed: {exc}"
        )


def save_server_activity_event(
    db,
    *,
    session_id: int,
    server_id: int,
    remote_username: str,
    event_type: str,
    path: str | None = None,
    command: str | None = None,
    process: str | None = None,
):
    """
    Save a server-side activity event generated directly by
    AKSARA shell integration.
    """
    try:
        record = ServerActivityEvent(
            session_id=session_id,
            server_id=server_id,
            remote_username=remote_username,
            event_type=event_type,
            path=path,
            command=command,
            process=process,
            success=True,
            event_time=datetime.now(timezone.utc),
        )

        db.add(record)
        db.commit()

    except Exception as exc:
        db.rollback()
        print(
            "AKSARA server activity save "
            f"failed: {exc}"
        )


# =========================================================
# SSH WEBSOCKET
# =========================================================

@router.websocket(
    "/ws/ssh/{server_id}"
)
async def ssh_websocket(
    websocket: WebSocket,
    server_id: int,
):
    token = (
        websocket
        .query_params
        .get("token")
    )

    if not token:
        await websocket.close(
            code=4401
        )
        return

    user, db = (
        authenticate_websocket(
            token
        )
    )

    if not user:
        await websocket.close(
            code=4401
        )
        return

    server = (
        db.query(Server)
        .filter(
            Server.id ==
            server_id
        )
        .first()
    )

    if not server:
        db.close()

        await websocket.close(
            code=4404
        )
        return


    # =====================================================
    # SERVER ACTIVE CHECK
    # =====================================================

    if not server.is_active:
        create_audit_log(
            db=db,
            action=
                "SSH_ACCESS_DENIED",
            user_id=user.id,
            resource_type="server",
            resource_id=server.id,
            source_ip=get_websocket_client_ip(
                websocket
            ),
            detail=(
                f"SSH access denied to "
                f"{server.name}: "
                f"server is disabled"
            ),
        )

        db.commit()
        db.close()

        await websocket.close(
            code=4403,
            reason=
                "Server is disabled",
        )

        return


    # =====================================================
    # RBAC / SERVER PERMISSION CHECK
    # =====================================================

    if not can_access_server(
        db,
        user,
        server,
        "SSH",
    ):
        create_audit_log(
            db=db,
            action=
                "SSH_ACCESS_DENIED",
            user_id=user.id,
            resource_type="server",
            resource_id=server.id,
            source_ip=get_websocket_client_ip(
                websocket
            ),
            detail=(
                f"SSH access denied to "
                f"{server.name}: "
                f"permission denied"
            ),
        )

        db.commit()
        db.close()

        await websocket.close(
            code=4403,
            reason="Access denied",
        )

        return


    await websocket.accept()


    ssh_conn = None
    process = None
    session_record = None


    source_ip = get_websocket_client_ip(
        websocket
    )


    try:
        # =================================================
        # RECEIVE SSH CREDENTIALS
        # =================================================

        credentials = (
            await websocket
            .receive_json()
        )

        ssh_username = (
            credentials.get(
                "username"
            )
        )

        ssh_password = (
            credentials.get(
                "password"
            )
        )


        if (
            not ssh_username
            or not ssh_password
        ):
            await websocket.send_json({
                "type": "error",
                "message":
                    "SSH credentials required",
            })

            return


        # =================================================
        # CONNECT TO TARGET SERVER
        # =================================================

        try:
            ssh_conn = (
                await asyncssh.connect(
                    server.ip_address,
                    port=server.port,
                    username=
                        ssh_username,
                    password=
                        ssh_password,
                    known_hosts=None,
                    login_timeout=10,
                )
            )

        except asyncssh.PermissionDenied:
            create_audit_log(
                db=db,
                action=
                    "SSH_AUTH_FAILED",
                user_id=user.id,
                resource_type="server",
                resource_id=server.id,
                source_ip=source_ip,
                detail=(
                    "SSH authentication "
                    "failed for remote user "
                    f"{ssh_username} "
                    f"on {server.name}"
                ),
            )

            db.commit()

            await websocket.send_json({
                "type": "error",
                "message":
                    "SSH authentication failed",
            })

            return


        except (
            asyncssh.ConnectionLost,
            asyncssh.DisconnectError,
            OSError,
        ) as exc:
            create_audit_log(
                db=db,
                action=
                    "SSH_CONNECTION_FAILED",
                user_id=user.id,
                resource_type="server",
                resource_id=server.id,
                source_ip=source_ip,
                detail=(
                    "SSH connection failed "
                    f"to {server.name}: "
                    f"{str(exc)}"
                ),
            )

            db.commit()

            await websocket.send_json({
                "type": "error",
                "message":
                    "Unable to connect "
                    "to SSH server",
            })

            return


        # =================================================
        # CREATE AKSARA SESSION
        # =================================================

        session_record = SSHSession(
            user_id=user.id,
            server_id=server.id,
            protocol="SSH",
            source_ip=source_ip,
            remote_username=
                ssh_username,
            started_at=(
                datetime.now(
                    timezone.utc
                )
            ),
            status="ACTIVE",
        )

        db.add(
            session_record
        )

        db.flush()


        create_audit_log(
            db=db,
            action=
                "SSH_SESSION_STARTED",
            user_id=user.id,
            resource_type="session",
            resource_id=
                session_record.id,
            source_ip=source_ip,
            detail=(
                "SSH session started "
                f"to {server.name} "
                f"as {ssh_username}"
            ),
        )


        db.commit()

        db.refresh(
            session_record
        )


        # =================================================
        # CREATE TERMINAL PROCESS
        # =================================================

        process = (
            await ssh_conn
            .create_process(
                term_type=
                    "xterm-256color",
                term_size=(
                    120,
                    40,
                ),
                # SSH PTY opcode 53 = ECHO (RFC 4254).
                # Keep echo disabled only during AKSARA's hidden
                # per-session shell bootstrap. The bootstrap runs
                # `stty echo` before returning control to the user.
                term_modes={
                    53: 0,
                },
            )
        )


        # Install exact command/CWD tracking for Bash sessions.
        # This is per-session only and does not modify ~/.bashrc.
        #
        # If the remote account uses a non-Bash shell, the command
        # is harmless but exact shell telemetry may not be available.
        process.stdin.write(
            build_bash_tracking_setup()
        )


        await websocket.send_json({
            "type": "connected",
            "server": server.name,
            "session_id":
                session_record.id,
        })


        # =================================================
        # COMMAND AUDIT STATE
        # =================================================

        command_buffer = ""

        sensitive_input = False

        # When an ESC-based interactive control
        # sequence is encountered, do not allow it
        # to pollute the shell command buffer.
        escape_sequence = False

        # True while a full-screen terminal application such as
        # nano/vim/less/top is active.
        in_alt_screen = False

        # If TAB/history/cursor editing is used, the browser-side
        # parser can no longer guarantee that command_buffer matches
        # the command which the shell actually executed.
        command_is_uncertain = False

        # Last working directory reported by Bash shell integration.
        last_shell_cwd = None


        # =================================================
        # SSH OUTPUT -> BROWSER
        # =================================================

        async def ssh_to_websocket():
            nonlocal sensitive_input
            nonlocal in_alt_screen
            nonlocal last_shell_cwd

            while True:
                data = (
                    await process.stdout.read(
                        1024
                    )
                )

                if not data:
                    break


                # Extract authoritative Bash command/CWD events
                # before terminal output is forwarded to the browser.
                data, shell_events = extract_shell_events(
                    data
                )

                for shell_event in shell_events:
                    shell_command = shell_event.get(
                        "command",
                        "",
                    )
                    shell_cwd = shell_event.get(
                        "cwd"
                    )

                    # Ignore our own per-session bootstrap line.
                    if (
                        shell_command
                        and "_aksara_pc" not in shell_command
                        and "PROMPT_COMMAND" not in shell_command
                    ):
                        save_session_command(
                            db,
                            session_id=session_record.id,
                            user_id=user.id,
                            server_id=server.id,
                            remote_username=ssh_username,
                            command=shell_command,
                        )

                    if shell_cwd:
                        if (
                            last_shell_cwd is not None
                            and shell_cwd != last_shell_cwd
                        ):
                            save_server_activity_event(
                                db,
                                session_id=session_record.id,
                                server_id=server.id,
                                remote_username=ssh_username,
                                event_type="DIRECTORY_CHANGED",
                                path=shell_cwd,
                                command=shell_command or None,
                            )

                        last_shell_cwd = shell_cwd


                # Track full-screen terminal applications.
                # Keystrokes entered while this state is active
                # must not be stored as shell commands.
                in_alt_screen = detect_alt_screen(
                    data,
                    in_alt_screen,
                )


                # Detect password / secret prompt.
                #
                # We intentionally do this before
                # forwarding to the browser.
                if output_requests_secret(
                    data
                ):
                    sensitive_input = True


                await websocket.send_json({
                    "type": "output",
                    "data": data,
                })


        # =================================================
        # BROWSER -> SSH
        # =================================================

        async def websocket_to_ssh():
            nonlocal command_buffer
            nonlocal sensitive_input
            nonlocal escape_sequence
            nonlocal in_alt_screen
            nonlocal command_is_uncertain

            while True:
                message = (
                    await websocket
                    .receive_json()
                )

                message_type = (
                    message.get(
                        "type"
                    )
                )


                if (
                    message_type ==
                    "input"
                ):
                    data = (
                        message.get(
                            "data",
                            ""
                        )
                    )


                    # Always send raw input to SSH.
                    #
                    # Command auditing must never
                    # interfere with terminal usage.
                    process.stdin.write(
                        data
                    )


                    # If a full-screen application such as nano/vim
                    # is active, these keystrokes are application input,
                    # not shell commands. Never store them as COMMAND.
                    if in_alt_screen:
                        continue


                    # If this is a known password
                    # prompt, we intentionally ignore
                    # typed characters until Enter.
                    if sensitive_input:
                        if (
                            "\r" in data
                            or "\n" in data
                        ):
                            sensitive_input = False
                            command_buffer = ""
                            command_is_uncertain = False
                            escape_sequence = False

                        continue


                    # Process input character-by-character
                    # because xterm may send multiple chars
                    # in one WebSocket message.
                    for char in data:

                        # -----------------------------
                        # ENTER
                        # -----------------------------

                        if char in (
                            "\r",
                            "\n",
                        ):
                            command = (
                                command_buffer
                            )

                            command_buffer = ""
                            escape_sequence = False


                            # Only save commands which the browser-side
                            # parser can reconstruct confidently.
                            #
                            # TAB completion, shell history and cursor
                            # editing can change the actual command line
                            # inside the remote shell. Linux auditd/agent
                            # will later provide the authoritative exec
                            # information for external programs.
                            # Exact commands are stored from Bash
                            # PROMPT_COMMAND telemetry in ssh_to_websocket().
                            # Do not save keyboard reconstruction here,
                            # otherwise commands would be duplicated and
                            # autocomplete/history could be inaccurate.
                            command_is_uncertain = False

                            continue


                        # -----------------------------
                        # TAB / SHELL AUTOCOMPLETE
                        #
                        # Once TAB is used, the remote shell may
                        # modify the line (e.g. "nano d<TAB>").
                        # The browser no longer knows the final argv.
                        # -----------------------------

                        if char == "\t":
                            command_is_uncertain = True
                            continue


                        # -----------------------------
                        # ESCAPE SEQUENCE
                        #
                        # Arrow keys, history, function keys,
                        # cursor movement and terminal controls.
                        # -----------------------------

                        if char == "\x1b":
                            escape_sequence = True
                            command_is_uncertain = True
                            continue


                        if escape_sequence:
                            # Most CSI sequences end
                            # with a letter or "~".
                            if (
                                char.isalpha()
                                or char == "~"
                            ):
                                escape_sequence = False

                            continue


                        # -----------------------------
                        # BACKSPACE
                        # -----------------------------

                        if char in (
                            "\x7f",
                            "\b",
                        ):
                            command_buffer = (
                                command_buffer[:-1]
                            )

                            continue


                        # -----------------------------
                        # CTRL+C
                        # -----------------------------

                        if char == "\x03":
                            command_buffer = ""
                            escape_sequence = False
                            command_is_uncertain = False

                            continue


                        # -----------------------------
                        # CTRL+U
                        # Clear current shell line
                        # -----------------------------

                        if char == "\x15":
                            command_buffer = ""
                            command_is_uncertain = False

                            continue


                        # -----------------------------
                        # CTRL+W
                        # Remove previous word
                        # -----------------------------

                        if char == "\x17":
                            command_buffer = (
                                command_buffer
                                .rstrip()
                            )

                            if " " in command_buffer:
                                command_buffer = (
                                    command_buffer
                                    .rsplit(
                                        " ",
                                        1
                                    )[0]
                                    + " "
                                )
                            else:
                                command_buffer = ""

                            continue


                        # -----------------------------
                        # PRINTABLE INPUT
                        # -----------------------------

                        if char.isprintable():
                            if (
                                len(
                                    command_buffer
                                ) <
                                MAX_COMMAND_LENGTH
                            ):
                                command_buffer += char


                elif (
                    message_type ==
                    "resize"
                ):
                    cols = (
                        message.get(
                            "cols",
                            120
                        )
                    )

                    rows = (
                        message.get(
                            "rows",
                            40
                        )
                    )


                    # Prevent invalid terminal values.
                    try:
                        cols = int(cols)
                        rows = int(rows)

                    except (
                        TypeError,
                        ValueError,
                    ):
                        cols = 120
                        rows = 40


                    cols = max(
                        20,
                        min(
                            cols,
                            500
                        )
                    )

                    rows = max(
                        5,
                        min(
                            rows,
                            300
                        )
                    )


                    process.change_terminal_size(
                        cols,
                        rows,
                    )


        # =================================================
        # RUN BOTH DIRECTIONS
        # =================================================

        output_task = (
            asyncio.create_task(
                ssh_to_websocket()
            )
        )

        input_task = (
            asyncio.create_task(
                websocket_to_ssh()
            )
        )


        done, pending = (
            await asyncio.wait(
                {
                    output_task,
                    input_task,
                },
                return_when=
                    asyncio.FIRST_COMPLETED,
            )
        )


        # If one side disconnects,
        # stop the other one as well.
        for task in pending:
            task.cancel()


        if pending:
            await asyncio.gather(
                *pending,
                return_exceptions=True,
            )


        # Propagate unexpected task exception.
        for task in done:
            try:
                task.result()

            except WebSocketDisconnect:
                pass


    except WebSocketDisconnect:
        pass


    except Exception as exc:
        print(
            "AKSARA SSH WebSocket "
            f"error: {exc}"
        )

        try:
            await websocket.send_json({
                "type": "error",
                "message":
                    "SSH session error",
            })

        except Exception:
            pass


    finally:
        # =================================================
        # CLOSE SSH PROCESS
        # =================================================

        if process:
            try:
                process.stdin.close()

            except Exception:
                pass


        # =================================================
        # CLOSE SSH CONNECTION
        # =================================================

        if ssh_conn:
            try:
                ssh_conn.close()

                await ssh_conn.wait_closed()

            except Exception:
                pass


        # =================================================
        # CLOSE AKSARA SESSION
        # =================================================

        if session_record:
            try:
                session_record.status = (
                    "CLOSED"
                )

                session_record.ended_at = (
                    datetime.now(
                        timezone.utc
                    )
                )


                create_audit_log(
                    db=db,
                    action=
                        "SSH_SESSION_ENDED",
                    user_id=user.id,
                    resource_type=
                        "session",
                    resource_id=
                        session_record.id,
                    source_ip=
                        source_ip,
                    detail=(
                        "SSH session ended "
                        f"to {server.name}"
                    ),
                )


                db.commit()


            except Exception as exc:
                print(
                    "AKSARA session close "
                    f"failed: {exc}"
                )

                db.rollback()


        # =================================================
        # CLOSE DATABASE SESSION
        # =================================================

        db.close()


        # =================================================
        # CLOSE WEBSOCKET
        # =================================================

        try:
            await websocket.close()

        except Exception:
            pass