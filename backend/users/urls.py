from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, UserProfileView, CustomTokenObtainPairView, AddressViewSet, PaymentMethodViewSet

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'payments', PaymentMethodViewSet, basename='payment')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('', include(router.urls)),
]
