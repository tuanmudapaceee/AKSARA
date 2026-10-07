from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AKSARA"
    APP_VERSION: str = "0.1.0"

    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    AGENT_INGEST_KEY: str

    # Apache Guacamole daemon
    # Used by AKSARA RDP gateway.
    GUACD_HOST: str = "guacd"
    GUACD_PORT: int = 4822

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        case_sensitive=True
    )


settings = Settings()
