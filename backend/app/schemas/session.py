from pydantic import BaseModel, Field


class SessionTerminateRequest(BaseModel):
    reason: str = Field(
        default="Administrative termination",
        min_length=1,
        max_length=500,
    )
