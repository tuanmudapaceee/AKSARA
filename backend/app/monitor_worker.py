import time
from datetime import datetime, timezone
from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed,
)

from app.database import SessionLocal
from app.models.server import Server
from app.services.monitoring import (
    check_tcp,
    update_monitoring_result,
)


CHECK_INTERVAL = 3
HISTORY_INTERVAL = 60

TCP_TIMEOUT = 3

# Maximum simultaneous TCP checks.
# 32 is more than enough for the current environment
# and still allows AKSARA to grow.
MAX_WORKERS = 32


def run_monitoring():
    print(
        "AKSARA Monitoring Worker started",
        flush=True
    )

    print(
        f"Live check interval: "
        f"{CHECK_INTERVAL} seconds",
        flush=True
    )

    print(
        f"History interval: "
        f"{HISTORY_INTERVAL} seconds",
        flush=True
    )

    print(
        f"TCP timeout: "
        f"{TCP_TIMEOUT} seconds",
        flush=True
    )

    print(
        f"Parallel workers: "
        f"{MAX_WORKERS}",
        flush=True
    )

    # server_id -> monotonic timestamp
    last_history_save = {}

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as executor:

        while True:
            cycle_started = time.monotonic()

            db = SessionLocal()

            try:
                servers = (
                    db.query(Server)
                    .filter(
                        Server.is_active == True
                    )
                    .all()
                )

                print(
                    f"["
                    f"{datetime.now(timezone.utc).isoformat()}"
                    f"] "
                    f"Checking "
                    f"{len(servers)} server(s)",
                    flush=True
                )

                active_server_ids = {
                    server.id
                    for server in servers
                }

                #
                # Remove deleted/inactive servers
                # from history scheduler.
                #
                stale_ids = [
                    server_id
                    for server_id
                    in last_history_save
                    if server_id
                    not in active_server_ids
                ]

                for server_id in stale_ids:
                    last_history_save.pop(
                        server_id,
                        None
                    )

                #
                # ==========================================
                # PARALLEL TCP CHECK
                # ==========================================
                #
                # Only socket checks happen in threads.
                # SQLAlchemy session remains in main thread.
                #

                future_map = {}

                for server in servers:
                    future = executor.submit(
                        check_tcp,
                        server.ip_address,
                        server.port,
                        TCP_TIMEOUT
                    )

                    future_map[
                        future
                    ] = server

                check_results = {}

                for future in as_completed(
                    future_map
                ):
                    server = future_map[
                        future
                    ]

                    try:
                        success, response_time = (
                            future.result()
                        )

                    except Exception as exc:
                        success = False
                        response_time = None

                        print(
                            f"TCP CHECK ERROR "
                            f"{server.name}: "
                            f"{exc}",
                            flush=True
                        )

                    check_results[
                        server.id
                    ] = (
                        success,
                        response_time
                    )

                #
                # ==========================================
                # DATABASE UPDATE
                # ==========================================
                #

                for server in servers:
                    try:
                        result_data = (
                            check_results.get(
                                server.id
                            )
                        )

                        if result_data is None:
                            print(
                                f"ERROR no result for "
                                f"{server.name}",
                                flush=True
                            )

                            continue

                        (
                            success,
                            response_time
                        ) = result_data

                        now_monotonic = (
                            time.monotonic()
                        )

                        previous_history_time = (
                            last_history_save.get(
                                server.id
                            )
                        )

                        save_history = (
                            previous_history_time
                            is None
                            or (
                                now_monotonic
                                - previous_history_time
                            )
                            >= HISTORY_INTERVAL
                        )

                        result = (
                            update_monitoring_result(
                                db=db,
                                server=server,
                                success=success,
                                response_time=
                                    response_time,
                                save_history=
                                    save_history
                            )
                        )

                        if result.get(
                            "history_saved"
                        ):
                            last_history_save[
                                server.id
                            ] = time.monotonic()

                        latency = (
                            f"{result['response_time_ms']} ms"
                            if result[
                                "response_time_ms"
                            ] is not None
                            else "-"
                        )

                        history_marker = (
                            " [history]"
                            if result.get(
                                "history_saved"
                            )
                            else ""
                        )

                        change_marker = (
                            " [status changed]"
                            if result.get(
                                "status_changed"
                            )
                            else ""
                        )

                        print(
                            f"{server.name} "
                            f"{server.ip_address}:"
                            f"{server.port} "
                            f"{result['status']} "
                            f"{latency}"
                            f"{history_marker}"
                            f"{change_marker}",
                            flush=True
                        )

                    except Exception as exc:
                        db.rollback()

                        print(
                            f"ERROR updating "
                            f"{server.name}: "
                            f"{exc}",
                            flush=True
                        )

            except Exception as exc:
                db.rollback()

                print(
                    f"Monitoring error: "
                    f"{exc}",
                    flush=True
                )

            finally:
                db.close()

            #
            # ==========================================
            # CYCLE TIMING
            # ==========================================
            #

            elapsed = (
                time.monotonic()
                - cycle_started
            )

            print(
                f"Cycle completed in "
                f"{elapsed:.2f}s",
                flush=True
            )

            sleep_time = max(
                0,
                CHECK_INTERVAL - elapsed
            )

            if sleep_time > 0:
                time.sleep(
                    sleep_time
                )


if __name__ == "__main__":
    run_monitoring()