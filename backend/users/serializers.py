from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Address, PaymentMethod

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'address', 'profile_picture', 'is_staff')
        read_only_fields = ('id', 'username')

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            password = validated_data.pop('password')
            instance.set_password(password)
        return super().update(instance, validated_data)

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'address', 'profile_picture')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            address=validated_data.get('address', ''),
            profile_picture=validated_data.get('profile_picture', None)
        )
        return user

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ('id', 'title', 'street_address', 'city', 'zip_code', 'is_default')
        read_only_fields = ('id',)

    def create(self, validated_data):
        user = self.context['request'].user
        if validated_data.get('is_default'):
            Address.objects.filter(user=user).update(is_default=False)
        return Address.objects.create(user=user, **validated_data)
        
    def update(self, instance, validated_data):
        if validated_data.get('is_default'):
            Address.objects.filter(user=instance.user).update(is_default=False)
        return super().update(instance, validated_data)

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ('id', 'card_type', 'last_four_digits', 'expiry_date', 'is_default')
        read_only_fields = ('id',)

    def create(self, validated_data):
        user = self.context['request'].user
        if validated_data.get('is_default'):
            PaymentMethod.objects.filter(user=user).update(is_default=False)
        return PaymentMethod.objects.create(user=user, **validated_data)
        
    def update(self, instance, validated_data):
        if validated_data.get('is_default'):
            PaymentMethod.objects.filter(user=instance.user).update(is_default=False)
        return super().update(instance, validated_data)
