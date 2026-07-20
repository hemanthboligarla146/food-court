from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from foods.models import Food, Category
from .services import track_event
from .selectors import get_dashboard_stats
from .serializers import AnalyticsEventSerializer

class TrackEventView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AnalyticsEventSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Resolve foreign keys safely
            food = None
            if data.get('food_id'):
                food = Food.objects.filter(id=data['food_id']).first()
                
            category = None
            if data.get('category_id'):
                category = Category.objects.filter(id=data['category_id']).first()

            user = request.user if request.user.is_authenticated else None
            ip_address = request.META.get('REMOTE_ADDR')

            track_event(
                event_type=data['event_type'],
                user=user,
                food=food,
                category=category,
                search_keyword=data.get('search_keyword'),
                ip_address=ip_address,
                page_path=data.get('page_path'),
                device_type=data.get('device_type', 'Unknown'),
                session_id=data.get('session_id'),
                metadata=data.get('metadata', {})
            )
            
            return Response({'status': 'Event tracked successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DashboardAnalyticsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', 'daily')
        stats = get_dashboard_stats(period)
        return Response(stats)
