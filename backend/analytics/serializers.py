from rest_framework import serializers
from .models import AnalyticsEvent


class EventTrackSerializer(serializers.Serializer):
    session_key   = serializers.CharField(max_length=64)
    event_type    = serializers.ChoiceField(choices=AnalyticsEvent.EVENT_CHOICES)
    page_path     = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    food_id       = serializers.IntegerField(required=False, allow_null=True, default=None)
    category_id   = serializers.IntegerField(required=False, allow_null=True, default=None)
    search_term   = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    time_on_page  = serializers.IntegerField(required=False, allow_null=True, default=None)
    extra         = serializers.JSONField(required=False, default=dict)


class SessionStartSerializer(serializers.Serializer):
    session_key   = serializers.CharField(max_length=64)


class SessionMergeSerializer(serializers.Serializer):
    session_key   = serializers.CharField(max_length=64)
