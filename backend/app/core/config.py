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

    # Azure OpenAI (v1 endpoint — use standard OpenAI client with base_url)
    azure_openai_api_key: str = ""
    azure_openai_base_url: str = "https://agentforgeai-resource.services.ai.azure.com/openai/v1"
    azure_openai_model: str = "gpt-5.4-mini"

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
