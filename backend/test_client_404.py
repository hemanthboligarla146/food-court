import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import Client
from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()
u, _ = User.objects.get_or_create(username='test_user_address')
refresh = RefreshToken.for_user(u)
token = str(refresh.access_token)

c = Client(SERVER_NAME='localhost')

response = c.post('/api/users/addresses/', {'title': 'Home', 'street_address': '123 Test', 'city': 'Test', 'zip_code': '12345', 'is_default': False}, HTTP_AUTHORIZATION=f'Bearer {token}', content_type='application/json')
print("POST STATUS:", response.status_code)
print("POST CONTENT:", response.content.decode('utf-8'))
