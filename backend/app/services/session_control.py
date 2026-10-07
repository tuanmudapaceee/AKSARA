import json

import redis.asyncio as redis

from app.core.config import settings


CHANNEL_PREFIX = "aksara:session-control:"


def session_channel(
    session_id: int,
) -> str:
    return (
        f"{CHANNEL_PREFIX}"
        f"{session_id}"
    )


async def publish_terminate(
    session_id: int,
    *,
    terminated_by: int,
    reason: str,
) -> int:
    """
    Publish an administrative termination request.

    Returns the number of Redis subscribers which
    received the message.
    """

    client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )

    payload = json.dumps({
        "action": "TERMINATE",
        "session_id": session_id,
        "terminated_by": terminated_by,
        "reason": reason,
    })

    try:
        return await client.publish(
            session_channel(session_id),
            payload,
        )

    finally:
        await client.aclose()


async def wait_for_termination(
    session_id: int,
):
    """
    Wait for a TERMINATE command for one live
    AKSARA session.

    The caller owns the returned pubsub object and
    must close it when the session finishes.
    """

    client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )

    pubsub = client.pubsub()

    try:
        await pubsub.subscribe(
            session_channel(session_id)
        )

        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1.0,
            )

            if not message:
                continue

            try:
                payload = json.loads(
                    message["data"]
                )
            except (
                TypeError,
                ValueError,
                KeyError,
            ):
                continue

            if (
                payload.get("action")
                == "TERMINATE"
            ):
                return payload

    finally:
        try:
            await pubsub.unsubscribe(
                session_channel(session_id)
            )
        except Exception:
            pass

        await pubsub.aclose()
        await client.aclose()
