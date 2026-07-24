from django.contrib import admin
from .models import AnalyticsSession, AnalyticsEvent


@admin.register(AnalyticsSession)
class AnalyticsSessionAdmin(admin.ModelAdmin):
    list_display = ('session_key', 'user', 'device_type', 'started_at', 'last_seen_at')
    list_filter  = ('device_type', 'started_at')
    search_fields = ('session_key', 'user__username')
    readonly_fields = ('session_key', 'started_at', 'last_seen_at')


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'page_path', 'session', 'food', 'created_at')
    list_filter  = ('event_type', 'created_at')
    search_fields = ('page_path', 'search_term', 'session__session_key')
    readonly_fields = ('created_at',)
