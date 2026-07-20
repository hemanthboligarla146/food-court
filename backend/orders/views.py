from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from .models import Order, OrderItem, Cart, Wishlist
from .serializers import OrderSerializer, CartSerializer, WishlistSerializer, AdminOrderSerializer
from analytics.services import track_event
from foods.models import Review
from rest_framework.views import APIView

class CartListCreateView(generics.ListCreateAPIView):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        food = serializer.validated_data['food']
        # The size is automatically picked up from validated_data because it is in the serializer fields
        cart_item = serializer.save(user=self.request.user)
        
        track_event(
            user=self.request.user,
            event_type='ADD_CART',
            food=food,
            category=food.category,
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

class CartDeleteView(generics.DestroyAPIView):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        food = instance.food
        super().perform_destroy(instance)
        
        track_event(
            user=self.request.user,
            event_type='REMOVE_CART',
            food=food,
            category=food.category if food else None,
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        # We need to calculate total amount from cart items based on sizes
        cart_items = Cart.objects.filter(user=request.user)
        if not cart_items.exists():
            return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        total_food_amount = 0
        for item in cart_items:
            multiplier = 0.8 if item.size == 'Small' else (1.2 if item.size == 'Large' else 1.0)
            item_price = float(item.food.price) * multiplier
            total_food_amount += item_price * item.quantity

        delivery_fee = request.data.get('delivery_fee', 0)
        discount = request.data.get('discount', 0)
        total_amount = total_food_amount + float(delivery_fee) - float(discount)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save(user=request.user, total_amount=total_amount)
        
        for item in cart_items:
            multiplier = 0.8 if item.size == 'Small' else (1.2 if item.size == 'Large' else 1.0)
            item_price = float(item.food.price) * multiplier
            OrderItem.objects.create(
                order=order,
                food=item.food,
                size=item.size,
                quantity=item.quantity,
                price=item_price
            )
        
        cart_items.delete()
        
        track_event(
            user=request.user,
            event_type='ORDER',
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

class WishlistListCreateView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        food = serializer.validated_data['food']
        # Check if already in wishlist
        if Wishlist.objects.filter(user=self.request.user, food=food).exists():
            return # Don't duplicate
        serializer.save(user=self.request.user)

class WishlistDeleteView(generics.DestroyAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)

class AdminOrderViewSet(viewsets.ModelViewSet):
    serializer_class = AdminOrderSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Order.objects.all().order_by('-created_at')

class OrderReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if order.status != 'Completed':
            return Response({"detail": "You can only review completed orders."}, status=status.HTTP_400_BAD_REQUEST)
            
        if order.is_reviewed:
            return Response({"detail": "This order has already been reviewed."}, status=status.HTTP_400_BAD_REQUEST)
            
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not rating:
            return Response({"detail": "Rating is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get unique foods in this order
        foods = set([item.food for item in order.items.all() if item.food])
        
        reviews_created = 0
        for food in foods:
            # Create a review for each food
            review = Review.objects.create(
                user=request.user,
                food=food,
                rating=rating,
                comment=comment
            )
            if review:
                reviews_created += 1
                track_event(
                    user=request.user,
                    event_type='REVIEW',
                    food=food,
                    category=food.category,
                    ip_address=request.META.get('REMOTE_ADDR')
                )
                
        if reviews_created > 0:
            order.is_reviewed = True
            order.save()
            
        return Response({"detail": f"Successfully reviewed {reviews_created} items."}, status=status.HTTP_201_CREATED)
