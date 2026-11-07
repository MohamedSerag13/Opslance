"""Structured logging (structlog) with request-ID correlation.

Every log line carries the request id when handling a request; the same id is
returned to clients in the X-Request-ID response header so a support ticket can
be traced to exactly one request's log entries across services.

Set LOG_FORMAT=json (the compose default) for machine-parseable output; unset
or LOG_FORMAT=console renders human-friendly lines for local development.
"""
import logging
import os
import uuid
from contextvars import ContextVar

import structlog

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


def new_request_id() -> str:
    return uuid.uuid4().hex[:16]


def setup_logging() -> None:
    log_format = os.getenv("LOG_FORMAT", "console")
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    numeric_level = getattr(logging, level, logging.INFO)

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]
    renderer = (
        structlog.processors.JSONRenderer()
        if log_format == "json"
        else structlog.dev.ConsoleRenderer()
    )

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(numeric_level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Route stdlib logging (uvicorn, sqlalchemy) through structlog so
    # production logs stay uniform JSON.
    class _StdlibHandler(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            logger = structlog.get_logger(record.name)
            method = getattr(logger, record.levelname.lower(), logger.info)
            method(record.getMessage())

    root = logging.getLogger()
    root.handlers = [_StdlibHandler()]
    root.setLevel(numeric_level)


def get_logger(name: str = "app"):
    return structlog.get_logger(name)
