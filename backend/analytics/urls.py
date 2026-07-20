from django.urls import path
from .views import DashboardAnalyticsView, TrackEventView

urlpatterns = [
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard_analytics'),
    path('track/', TrackEventView.as_view(), name='track_analytics'),
]
