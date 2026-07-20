"""
PostHog SDK singleton.

Initialised in AnalyticsConfig.ready(). Import `posthog_client` from here
to capture events across the project.
"""

posthog_client = None
