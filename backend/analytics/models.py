from django.db import models
from django.conf import settings
from foods.models import Food, Category

class AnalyticsEvent(models.Model):
    EVENT_TYPES = (
        ('VISIT', 'Website Visit'),
        ('REGISTER', 'User Registration'),
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('SEARCH', 'Search'),
        ('FOOD_VIEW', 'Food View'),
        ('FOOD_CLICK', 'Food Click'),
        ('ADD_CART', 'Add to Cart'),
        ('REMOVE_CART', 'Remove from Cart'),
        ('CHECKOUT', 'Checkout'),
        ('ORDER', 'Order Placement'),
        ('REVIEW', 'Review Submission'),
        ('CONTACT', 'Contact Form Submission'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    food = models.ForeignKey(Food, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    search_keyword = models.CharField(max_length=200, blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    page_path = models.CharField(max_length=255, blank=True, null=True)
    device_type = models.CharField(max_length=20, choices=(('Mobile', 'Mobile'), ('Desktop', 'Desktop'), ('Tablet', 'Tablet'), ('Unknown', 'Unknown')), default='Unknown')
    session_id = models.CharField(max_length=100, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} at {self.created_at}"
