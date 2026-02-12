"""OpenTelemetry + Azure Application Insights integration for Social AI Studio.

Provides distributed tracing for the agent pipeline, tool invocations,
and FastAPI request handling.  Traces appear in:
  - Azure Application Insights → End-to-end transaction view
  - Microsoft Foundry → Observability → Traces

Usage:
    from src.telemetry import setup_telemetry, get_tracer
    setup_telemetry()               # call ONCE before FastAPI init
    tracer = get_tracer()
    with tracer.start_as_current_span("my_operation"):
        ...
"""

import logging
import os

from opentelemetry import trace
from opentelemetry.trace import Tracer

logger = logging.getLogger(__name__)

# Module-level tracer (lazy-initialized)
_tracer: Tracer | None = None

# Service metadata
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "social-ai-studio")
from src import __version__

SERVICE_VERSION = __version__

# Whether telemetry has been initialized
_initialized = False


def setup_telemetry() -> None:
    """Configure OpenTelemetry with Azure Monitor exporter.

    Must be called **before** FastAPI is instantiated so that
    auto-instrumentation can hook into ASGI and HTTP libraries.

    Safe to call multiple times — only initializes once.
    """
    global _initialized
    if _initialized:
        return

    conn_str = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "")

    if not conn_str:
        logger.info("APPLICATIONINSIGHTS_CONNECTION_STRING not set — telemetry disabled (traces will not be exported)")
        _initialized = True
        return

    try:
        from azure.monitor.opentelemetry import configure_azure_monitor
        from opentelemetry.sdk.resources import Resource

        resource = Resource.create(
            {
                "service.name": SERVICE_NAME,
                "service.version": SERVICE_VERSION,
            }
        )

        configure_azure_monitor(
            connection_string=conn_str,
            resource=resource,
            enable_live_metrics=True,
        )

        # Enable agent-framework-core instrumentation if available
        try:
            from agent_framework.observability import enable_instrumentation

            enable_instrumentation()
            logger.info("agent-framework-core OTel instrumentation enabled")
        except (ImportError, AttributeError):
            logger.debug("agent-framework-core instrumentation not available")

        _initialized = True
        logger.info("OpenTelemetry configured → Azure Monitor (service=%s)", SERVICE_NAME)

    except ImportError:
        logger.warning("azure-monitor-opentelemetry not installed — run: uv add azure-monitor-opentelemetry")
        _initialized = True
    except Exception as e:
        logger.warning("Telemetry setup failed: %s", e)
        _initialized = True


def get_tracer(name: str = "social_ai_studio.agent") -> Tracer:
    """Get an OpenTelemetry tracer instance.

    Args:
        name: Tracer name (used as the instrumentation scope).

    Returns:
        OpenTelemetry Tracer.
    """
    global _tracer
    if _tracer is None:
        _tracer = trace.get_tracer(name, SERVICE_VERSION)
    return _tracer
