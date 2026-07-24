from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Address, PaymentMethod

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'phone_number', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Extra Info', {'fields': ('phone_number', 'address', 'profile_picture')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profile Extra Info', {'fields': ('phone_number', 'address', 'profile_picture')}),
    )

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'street_address', 'city', 'zip_code', 'is_default')
    list_filter = ('is_default', 'title')
    search_fields = ('user__username', 'street_address')

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('user', 'card_type', 'last_four_digits', 'expiry_date', 'is_default')
    list_filter = ('is_default', 'card_type')
    search_fields = ('user__username', 'last_four_digits')

