from typing import Optional

from pydantic import BaseModel, field_validator


ALLOWED_PROTOCOLS = {
    "SSH",
    "RDP",
    "VNC",
}


class ServerCreate(BaseModel):
    name: str
    hostname: Optional[str] = None
    ip_address: str
    operating_system: Optional[str] = None
    protocol: str
    port: int
    description: Optional[str] = None
    group_id: Optional[int] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str):
        value = value.strip()

        if not value:
            raise ValueError(
                "Server name is required"
            )

        return value

    @field_validator("ip_address")
    @classmethod
    def validate_ip_address(
        cls,
        value: str
    ):
        import ipaddress

        value = value.strip()

        try:
            ipaddress.ip_address(value)
        except ValueError:
            raise ValueError(
                "Invalid IP address"
            )

        return value

    @field_validator("protocol")
    @classmethod
    def validate_protocol(
        cls,
        value: str
    ):
        value = value.upper().strip()

        if value not in ALLOWED_PROTOCOLS:
            raise ValueError(
                "Protocol must be SSH, RDP or VNC"
            )

        return value

    @field_validator("port")
    @classmethod
    def validate_port(
        cls,
        value: int
    ):
        if value < 1 or value > 65535:
            raise ValueError(
                "Port must be between 1 and 65535"
            )

        return value


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    operating_system: Optional[str] = None
    protocol: Optional[str] = None
    port: Optional[int] = None
    description: Optional[str] = None
    group_id: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(
        cls,
        value: Optional[str]
    ):
        if value is None:
            return value

        value = value.strip()

        if not value:
            raise ValueError(
                "Server name cannot be empty"
            )

        return value

    @field_validator("ip_address")
    @classmethod
    def validate_ip_address(
        cls,
        value: Optional[str]
    ):
        if value is None:
            return value

        import ipaddress

        value = value.strip()

        try:
            ipaddress.ip_address(value)
        except ValueError:
            raise ValueError(
                "Invalid IP address"
            )

        return value

    @field_validator("protocol")
    @classmethod
    def validate_protocol(
        cls,
        value: Optional[str]
    ):
        if value is None:
            return value

        value = value.upper().strip()

        if value not in ALLOWED_PROTOCOLS:
            raise ValueError(
                "Protocol must be SSH, RDP or VNC"
            )

        return value

    @field_validator("port")
    @classmethod
    def validate_port(
        cls,
        value: Optional[int]
    ):
        if value is None:
            return value

        if value < 1 or value > 65535:
            raise ValueError(
                "Port must be between 1 and 65535"
            )

        return value


class ServerResponse(BaseModel):
    id: int
    name: str
    hostname: Optional[str] = None
    ip_address: str
    operating_system: Optional[str] = None
    protocol: str
    port: int
    description: Optional[str] = None
    group_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True