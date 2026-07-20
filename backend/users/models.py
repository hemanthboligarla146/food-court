from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Professional registration fields
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    
    def __str__(self):
        return self.username

class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    title = models.CharField(max_length=50, default='Home') # Home, Work, etc
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"

class PaymentMethod(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    card_type = models.CharField(max_length=50, default='Visa') # Visa, Mastercard
    last_four_digits = models.CharField(max_length=4)
    expiry_date = models.CharField(max_length=5) # MM/YY
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.card_type} ending in {self.last_four_digits} - {self.user.username}"
