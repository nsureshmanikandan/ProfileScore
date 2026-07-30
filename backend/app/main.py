from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import structlog

from app.core.config import settings
from app.core.telemetry import setup_telemetry
from app.core.logging import setup_logging
from app.api.routes import analyze, resume


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger = structlog.get_logger(__name__)
    logger.info("profilescore_startup", version=settings.version, debug=settings.debug)
    yield
    logger.info("profilescore_shutdown")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

setup_telemetry(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(resume.router)


@app.get("/health")
def health():
    return {"status": "healthy", "version": settings.version, "service": settings.app_name}
