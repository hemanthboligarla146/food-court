from rest_framework import serializers

class AnalyticsEventSerializer(serializers.Serializer):
    event_type = serializers.CharField(max_length=50)
    food_id = serializers.IntegerField(required=False, allow_null=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    search_keyword = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    page_path = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True)
    device_type = serializers.CharField(max_length=20, required=False, default='Unknown')
    session_id = serializers.CharField(max_length=100, required=False, allow_null=True)
    metadata = serializers.JSONField(required=False, default=dict)
