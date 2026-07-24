from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .serializers import EventTrackSerializer, SessionStartSerializer, SessionMergeSerializer
from .services import record_event, get_or_create_session, merge_session
from .selectors import get_dashboard_stats


class AnalyticsDashboardView(APIView):
    """
    Dashboard API View for fetching calculated stats.
    Requires administrator permissions.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', 'daily')
        stats = get_dashboard_stats(period)
        return Response(stats, status=status.HTTP_200_OK)


class EventTrackView(APIView):
    """
    Post endpoint to log behavioral events from the frontend.
    Allows any visitor (anonymous or logged-in).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EventTrackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        user = request.user if request.user and request.user.is_authenticated else None
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Capture client IP address if available
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR', '')

        event = record_event(
            session_key=validated_data['session_key'],
            event_type=validated_data['event_type'],
            user=user,
            page_path=validated_data['page_path'],
            food_id=validated_data['food_id'],
            category_id=validated_data['category_id'],
            search_term=validated_data['search_term'],
            time_on_page=validated_data['time_on_page'],
            extra=validated_data['extra'],
            user_agent=user_agent,
            ip_address=ip_address
        )

        # 204 No Content is standard for pixel/analytics events, or 201 if created
        if event:
            return Response({'ok': True, 'id': event.id}, status=status.HTTP_201_CREATED)
        else:
            # Silent discard if it was an admin action or couldn't be recorded
            return Response({'ok': True, 'ignored': True}, status=status.HTTP_200_OK)


class SessionStartView(APIView):
    """
    Post endpoint to initialize or resume a user session.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SessionStartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        user = request.user if request.user and request.user.is_authenticated else None
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        session = get_or_create_session(
            session_key=validated_data['session_key'],
            user=user,
            user_agent=user_agent
        )

        if session:
            return Response({
                'session_key': session.session_key,
                'device_type': session.device_type,
                'started_at': session.started_at
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({'ignored': True}, status=status.HTTP_200_OK)


class SessionMergeView(APIView):
    """
    Post endpoint to associate an anonymous session with a logged-in user.
    Called immediately after successful login.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SessionMergeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        session = merge_session(
            session_key=validated_data['session_key'],
            user=request.user
        )

        if session:
            return Response({'merged': True}, status=status.HTTP_200_OK)
        else:
            return Response({'merged': False, 'ignored': True}, status=status.HTTP_200_OK)
