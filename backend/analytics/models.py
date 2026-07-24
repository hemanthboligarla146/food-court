from django.db import models
from django.conf import settings
from foods.models import Food, Category


class AnalyticsSession(models.Model):
    """
    One row per browser session. Tracks both anonymous and authenticated visitors.
    Anonymous sessions are linked to a user after login via the merge endpoint.
    Admin users are NEVER stored here.
    """
    DEVICE_DESKTOP = 'desktop'
    DEVICE_MOBILE  = 'mobile'
    DEVICE_TABLET  = 'tablet'
    DEVICE_CHOICES = [
        (DEVICE_DESKTOP, 'Desktop'),
        (DEVICE_MOBILE,  'Mobile'),
        (DEVICE_TABLET,  'Tablet'),
    ]

    session_key   = models.CharField(max_length=64, unique=True, db_index=True)
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='analytics_sessions'
    )
    device_type   = models.CharField(max_length=16, choices=DEVICE_CHOICES, default=DEVICE_DESKTOP)
    user_agent    = models.CharField(max_length=512, blank=True)
    started_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    last_seen_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analytics_session'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'started_at']),
            models.Index(fields=['device_type']),
        ]

    def __str__(self):
        user_label = self.user.username if self.user_id else 'anon'
        return f'Session({user_label}, {self.device_type}, {self.started_at:%Y-%m-%d})'


class AnalyticsEvent(models.Model):
    """
    One row per user action.  Every dashboard widget reads from this table.
    Admin activity is NEVER written here — enforced at the view layer.
    """
    # ── funnel / navigation events ──────────────────────────────────────────
    EV_PAGE_VIEW        = 'page_view'
    EV_SESSION_START    = 'session_start'
    EV_USER_REGISTER    = 'user_register'
    EV_USER_LOGIN       = 'user_login'
    EV_USER_LOGOUT      = 'user_logout'

    # ── browsing events ─────────────────────────────────────────────────────
    EV_MENU_VISIT       = 'menu_visit'
    EV_CATEGORY_CLICK   = 'category_click'
    EV_FOOD_VIEW        = 'food_view'
    EV_FOOD_CLICK       = 'food_click'

    # ── cart / order events ─────────────────────────────────────────────────
    EV_ADD_TO_CART      = 'add_to_cart'
    EV_REMOVE_FROM_CART = 'remove_from_cart'
    EV_CART_VIEW        = 'cart_view'
    EV_CHECKOUT_START   = 'checkout_start'
    EV_PAYMENT_ATTEMPT  = 'payment_attempt'
    EV_PAYMENT_SUCCESS  = 'payment_success'
    EV_PAYMENT_FAILURE  = 'payment_failure'

    # ── search events ────────────────────────────────────────────────────────
    EV_SEARCH           = 'search'

    EVENT_CHOICES = [
        (EV_PAGE_VIEW,        'Page View'),
        (EV_SESSION_START,    'Session Start'),
        (EV_USER_REGISTER,    'User Register'),
        (EV_USER_LOGIN,       'User Login'),
        (EV_USER_LOGOUT,      'User Logout'),
        (EV_MENU_VISIT,       'Menu Visit'),
        (EV_CATEGORY_CLICK,   'Category Click'),
        (EV_FOOD_VIEW,        'Food View'),
        (EV_FOOD_CLICK,       'Food Click'),
        (EV_ADD_TO_CART,      'Add to Cart'),
        (EV_REMOVE_FROM_CART, 'Remove from Cart'),
        (EV_CART_VIEW,        'Cart View'),
        (EV_CHECKOUT_START,   'Checkout Start'),
        (EV_PAYMENT_ATTEMPT,  'Payment Attempt'),
        (EV_PAYMENT_SUCCESS,  'Payment Success'),
        (EV_PAYMENT_FAILURE,  'Payment Failure'),
        (EV_SEARCH,           'Search'),
    ]

    VALID_EVENT_TYPES = {e[0] for e in EVENT_CHOICES}

    session     = models.ForeignKey(
        AnalyticsSession,
        on_delete=models.CASCADE,
        related_name='events'
    )
    event_type  = models.CharField(max_length=40, choices=EVENT_CHOICES, db_index=True)
    page_path   = models.CharField(max_length=255, blank=True, db_index=True)
    food        = models.ForeignKey(
        Food, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='analytics_events'
    )
    category    = models.ForeignKey(
        Category, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='analytics_events'
    )
    search_term  = models.CharField(max_length=255, blank=True)
    time_on_page = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Seconds the user spent on this page (sent on page leave)'
    )
    extra        = models.JSONField(default=dict, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'analytics_event'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['session', 'event_type']),
            models.Index(fields=['food', 'event_type']),
            models.Index(fields=['page_path', 'created_at']),
        ]

    def __str__(self):
        return f'{self.event_type} | {self.page_path or "-"} | {self.created_at:%Y-%m-%d %H:%M}'
