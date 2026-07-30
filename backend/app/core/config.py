from pydantic_settings import BaseSettings
from pathlib import Path

# Always resolve .env relative to this file (backend/app/core/config.py → backend/.env)
_ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    app_name: str = "ProfileScore API"
    version: str = "1.0.0"
    debug: bool = False

    # LLM provider: "azure" | "gemini"
    llm_provider: str = "azure"

    # Azure OpenAI
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""     # e.g. https://<resource>.openai.azure.com/
    azure_openai_deployment: str = "gpt-5-mini"
    azure_openai_api_version: str = "2024-12-01-preview"

    # Google Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Set to False on corporate networks with SSL inspection proxies (e.g. Accenture)
    ssl_verify: bool = False

    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    otel_enabled: bool = True
    otel_service_name: str = "profilescore-backend"
    log_level: str = "INFO"

    class Config:
        env_file = str(_ENV_FILE)
        case_sensitive = False


settings = Settings()
