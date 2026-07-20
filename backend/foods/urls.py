from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryList, FoodList, FoodDetail, FoodReview, AdminCategoryViewSet, AdminFoodViewSet

router = DefaultRouter()
router.register(r'admin/manage/categories', AdminCategoryViewSet, basename='admin-category')
router.register(r'admin/manage/foods', AdminFoodViewSet, basename='admin-food')

urlpatterns = [
    path('categories/', CategoryList.as_view(), name='category_list'),
    path('menu/', FoodList.as_view(), name='food_list'),
    path('menu/<int:pk>/', FoodDetail.as_view(), name='food_detail'),
    path('menu/<int:pk>/review/', FoodReview.as_view(), name='food_review'),
    path('', include(router.urls)),
]
