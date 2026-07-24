import logging
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import AnalyticsSession, AnalyticsEvent
from foods.models import Food, Category

logger = logging.getLogger(__name__)
User = get_user_model()


def parse_device_type(user_agent_str):
    """
    Simple parser to detect device type from user agent.
    Returns: 'mobile', 'tablet', or 'desktop'
    """
    if not user_agent_str:
        return AnalyticsSession.DEVICE_DESKTOP

    ua = user_agent_str.lower()
    
    # Common tablet indicators
    if 'ipad' in ua or ('android' in ua and 'mobile' not in ua) or 'tablet' in ua:
        return AnalyticsSession.DEVICE_TABLET
        
    # Common mobile indicators
    if any(m in ua for m in ['iphone', 'android', 'phone', 'ipod', 'mobile', 'blackberry', 'webos']):
        return AnalyticsSession.DEVICE_MOBILE
        
    return AnalyticsSession.DEVICE_DESKTOP


def get_or_create_session(session_key, user=None, user_agent='', ip_address=''):
    """
    Get or create an AnalyticsSession.
    Guards against admin users (returns None if user is admin).
    """
    if user and (user.is_staff or user.is_superuser):
        return None

    session, created = AnalyticsSession.objects.get_or_create(
        session_key=session_key,
        defaults={
            'user': user,
            'device_type': parse_device_type(user_agent),
            'user_agent': user_agent[:512] if user_agent else '',
            'started_at': timezone.now()
        }
    )

    # If the session was anonymous but now we have a authenticated user, update it
    if not session.user and user:
        session.user = user
        session.save(update_fields=['user', 'last_seen_at'])
    else:
        # Keep track of last activity
        session.save(update_fields=['last_seen_at'])

    return session


def merge_session(session_key, user):
    """
    Associate an anonymous session with a logged-in user.
    """
    if user and (user.is_staff or user.is_superuser):
        return None

    try:
        session = AnalyticsSession.objects.get(session_key=session_key)
        if not session.user:
            session.user = user
            session.save(update_fields=['user', 'last_seen_at'])
            return session
    except AnalyticsSession.DoesNotExist:
        # If session doesn't exist, it will be created on the next event
        pass
    return None


def record_event(session_key, event_type, user=None, page_path='', food_id=None, 
                 category_id=None, search_term='', time_on_page=None, extra=None,
                 user_agent='', ip_address=''):
    """
    Core function to record an analytics event.
    Ensures that administrator activity is completely excluded.
    """
    # Guard: Never track admins
    if user and (user.is_staff or user.is_superuser):
        return None

    if event_type not in AnalyticsEvent.VALID_EVENT_TYPES:
        logger.warning(f"Invalid event type: {event_type}")
        return None

    # Retrieve or create session
    session = get_or_create_session(
        session_key=session_key, 
        user=user, 
        user_agent=user_agent, 
        ip_address=ip_address
    )
    if not session:
        return None

    # Resolve food
    food = None
    if food_id:
        try:
            food = Food.objects.get(id=food_id)
        except Food.DoesNotExist:
            pass

    # Resolve category
    category = None
    if category_id:
        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            pass

    # Record event
    event = AnalyticsEvent.objects.create(
        session=session,
        event_type=event_type,
        page_path=page_path[:255] if page_path else '',
        food=food,
        category=category,
        search_term=search_term[:255] if search_term else '',
        time_on_page=time_on_page,
        extra=extra or {}
    )
    return event
