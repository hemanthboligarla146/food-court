from django.urls import path
from .views import AnalyticsDashboardView, EventTrackView, SessionStartView, SessionMergeView

urlpatterns = [
    path('dashboard/',      AnalyticsDashboardView.as_view(), name='analytics_dashboard'),
    path('event/',          EventTrackView.as_view(),          name='analytics_event'),
    path('session/start/',  SessionStartView.as_view(),        name='analytics_session_start'),
    path('session/merge/',  SessionMergeView.as_view(),        name='analytics_session_merge'),
]
