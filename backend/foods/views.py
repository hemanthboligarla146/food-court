from rest_framework import generics, permissions, filters, viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Food, Review
from .serializers import CategorySerializer, FoodSerializer, ReviewSerializer

class CategoryList(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class FoodList(generics.ListAPIView):
    queryset = Food.objects.all()
    serializer_class = FoodSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_featured', 'is_trending']
    search_fields = ['name', 'description', 'category__name']
    ordering_fields = ['price', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Log search analytics if search param is present
        search_query = self.request.query_params.get('search', None)
        if search_query:
            user = self.request.user if self.request.user.is_authenticated else None
            # Search is tracked in frontend
        return queryset

class FoodDetail(generics.RetrieveAPIView):
    queryset = Food.objects.all()
    serializer_class = FoodSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        obj = super().get_object()
        # Log food view analytics
        user = self.request.user if self.request.user.is_authenticated else None
        # Food view tracked in frontend
        return obj

class FoodReview(generics.CreateAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        food_id = self.kwargs.get('pk')
        food = Food.objects.get(pk=food_id)
        serializer.save(user=self.request.user, food=food)
        
        # Review tracked in frontend

class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

class AdminFoodViewSet(viewsets.ModelViewSet):
    queryset = Food.objects.all().order_by('-created_at')
    serializer_class = FoodSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None
