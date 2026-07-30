from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

from app.core.config import settings


def setup_telemetry(app=None):
    if not settings.otel_enabled:
        return

    resource = Resource.create({"service.name": settings.otel_service_name, "service.version": "1.0.0"})

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    otlp_exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint, insecure=True)
    tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_exporter = OTLPMetricExporter(endpoint=settings.otel_exporter_otlp_endpoint, insecure=True)
    reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=10000)
    meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
    metrics.set_meter_provider(meter_provider)

    if app:
        FastAPIInstrumentor.instrument_app(app)
        HTTPXClientInstrumentor().instrument()


def get_tracer(name: str = "profilescore"):
    return trace.get_tracer(name)


def get_meter(name: str = "profilescore"):
    return metrics.get_meter(name)
