from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartListCreateView, CartDeleteView, OrderListCreateView, OrderDetailView, WishlistListCreateView, WishlistDeleteView, AdminOrderViewSet, OrderReviewView

router = DefaultRouter()
router.register(r'admin/manage', AdminOrderViewSet, basename='admin-order')

urlpatterns = [
    path('cart/', CartListCreateView.as_view(), name='cart_list'),
    path('cart/<int:pk>/', CartDeleteView.as_view(), name='cart_delete'),
    path('wishlist/', WishlistListCreateView.as_view(), name='wishlist_list'),
    path('wishlist/<int:pk>/', WishlistDeleteView.as_view(), name='wishlist_delete'),
    path('', OrderListCreateView.as_view(), name='order_list'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order_detail'),
    path('<int:pk>/review/', OrderReviewView.as_view(), name='order_review'),
    path('', include(router.urls)),
]
