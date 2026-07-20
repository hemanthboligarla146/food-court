import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import Client
c = Client()
response = c.get('/api/users/addresses/')
print(response.status_code)
print(response.content)

response2 = c.post('/api/users/addresses/', {'title': 'Home', 'street_address': '123 Test', 'city': 'Test', 'zip_code': '12345', 'is_default': False})
print(response2.status_code)
print(response2.content)
