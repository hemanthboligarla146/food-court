from rest_framework import serializers
from .models import Category, Food, Review

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.first_name', read_only=True)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'user_name', 'rating', 'comment', 'created_at')
        read_only_fields = ('user',)

class FoodSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    
    class Meta:
        model = Food
        fields = ('id', 'name', 'category', 'category_name', 'description', 'price', 'image', 'is_available', 'is_featured', 'is_trending', 'has_3d_model', 'created_at', 'reviews')
