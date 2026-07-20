from rest_framework import serializers
from .models import Order, OrderItem, Cart, Wishlist
from foods.serializers import FoodSerializer

class CartSerializer(serializers.ModelSerializer):
    food_details = FoodSerializer(source='food', read_only=True)
    
    class Meta:
        model = Cart
        fields = ('id', 'user', 'food', 'food_details', 'size', 'quantity', 'created_at')
        read_only_fields = ('user',)

class WishlistSerializer(serializers.ModelSerializer):
    food_details = FoodSerializer(source='food', read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ('id', 'user', 'food', 'food_details', 'created_at')
        read_only_fields = ('user',)

class OrderItemSerializer(serializers.ModelSerializer):
    food_details = FoodSerializer(source='food', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ('id', 'order', 'food', 'food_details', 'size', 'quantity', 'price')
        read_only_fields = ('order',)

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = ('id', 'user', 'status', 'total_amount', 'delivery_fee', 'discount', 'address', 'payment_method', 'is_reviewed', 'created_at', 'items')
        read_only_fields = ('user', 'status', 'total_amount', 'is_reviewed')

class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = ('id', 'user', 'status', 'total_amount', 'delivery_fee', 'discount', 'address', 'payment_method', 'is_reviewed', 'created_at', 'items')
        read_only_fields = ('user', 'total_amount')
