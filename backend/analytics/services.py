from django.contrib.auth import get_user_model
from foods.models import Food, Category
from .models import AnalyticsEvent

User = get_user_model()

def track_event(
    event_type: str,
    user: User = None,
    food: Food = None,
    category: Category = None,
    search_keyword: str = None,
    ip_address: str = None,
    page_path: str = None,
    device_type: str = 'Unknown',
    session_id: str = None,
    metadata: dict = None
) -> AnalyticsEvent:
    """
    Core service to record an analytics event.
    """
    if metadata is None:
        metadata = {}

    return AnalyticsEvent.objects.create(
        event_type=event_type,
        user=user,
        food=food,
        category=category,
        search_keyword=search_keyword,
        ip_address=ip_address,
        page_path=page_path,
        device_type=device_type,
        session_id=session_id,
        metadata=metadata
    )
