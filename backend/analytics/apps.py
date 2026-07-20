import atexit
from django.apps import AppConfig
from django.conf import settings


class AnalyticsConfig(AppConfig):
    name = 'analytics'

    def ready(self):
        from posthog import Posthog
        import analytics.posthog_sdk as posthog_sdk

        client = Posthog(
            project_api_key=settings.POSTHOG_PROJECT_TOKEN,
            host=settings.POSTHOG_HOST,
            enable_exception_autocapture=True,
            disabled=settings.POSTHOG_DISABLED,
        )
        posthog_sdk.posthog_client = client
        atexit.register(client.shutdown)
