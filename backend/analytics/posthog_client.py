import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

POSTHOG_PERSONAL_API_KEY = getattr(settings, 'POSTHOG_PERSONAL_API_KEY', None)
POSTHOG_PROJECT_ID = getattr(settings, 'POSTHOG_PROJECT_ID', None)
POSTHOG_API_URL = getattr(settings, 'POSTHOG_API_URL', 'https://us.i.posthog.com')

def query_posthog(query_dict):
    """
    Query PostHog using their /api/projects/:id/query endpoint.
    If credentials are missing, silently returns None to allow safe fallback.
    """
    if not POSTHOG_PERSONAL_API_KEY or not POSTHOG_PROJECT_ID:
        return None
        
    url = f"{POSTHOG_API_URL}/api/projects/{POSTHOG_PROJECT_ID}/query/"
    headers = {
        "Authorization": f"Bearer {POSTHOG_PERSONAL_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, headers=headers, json={"query": query_dict}, timeout=5)
        if response.status_code == 200:
            return response.json()
        logger.error(f"PostHog API Error: {response.status_code} {response.text}")
    except Exception as e:
        logger.error(f"PostHog Connection Error: {str(e)}")
        
    return None

def fetch_posthog_funnel(date_from='-7d'):
    """Fetch user journey funnel from PostHog"""
    query = {
        "kind": "Funnel",
        "date_from": date_from,
        "series": [
            {"kind": "EventsNode", "event": "$pageview"},
            {"kind": "EventsNode", "event": "Food Click"},
            {"kind": "EventsNode", "event": "Add to Cart"},
            {"kind": "EventsNode", "event": "Checkout Started"}
        ]
    }
    return query_posthog(query)

def fetch_posthog_pageviews(date_from='-7d'):
    """Fetch pageview breakdowns"""
    query = {
        "kind": "EventsQuery",
        "select": ["properties.$current_url", "count()"],
        "where": [f"timestamp >= '{date_from}'"],
        "event": "$pageview"
    }
    return query_posthog(query)
