import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from foods.models import Category, Food

def seed_data():
    print("Seeding database...")
    
    # Create categories
    categories = [
        {'name': 'Pizza', 'description': 'Freshly baked pizzas'},
        {'name': 'Burger', 'description': 'Juicy and delicious burgers'},
        {'name': 'Biryani', 'description': 'Authentic and aromatic biryanis'},
        {'name': 'Desserts', 'description': 'Sweet treats to end your meal'},
        {'name': 'Drinks', 'description': 'Refreshing beverages'}
    ]
    
    cat_objs = {}
    for cat_data in categories:
        cat, created = Category.objects.get_or_create(name=cat_data['name'])
        cat_objs[cat.name] = cat
        
    # Create foods
    foods_data = [
        {
            'name': 'Cheese Pizza',
            'category': cat_objs['Pizza'],
            'description': 'Delicious cheese pizza made with fresh ingredients and 100% real cheese.',
            'price': 7.49,
            'is_available': True,
            'is_featured': True,
            'is_trending': True
        },
        {
            'name': 'Chicken Burger',
            'category': cat_objs['Burger'],
            'description': 'Crispy chicken patty with fresh lettuce and mayo.',
            'price': 5.99,
            'is_available': True,
            'is_featured': True
        },
        {
            'name': 'Veg Biryani',
            'category': cat_objs['Biryani'],
            'description': 'Aromatic rice dish cooked with fresh vegetables and spices.',
            'price': 6.99,
            'is_available': True,
            'is_trending': True
        },
        {
            'name': 'Hakka Noodles',
            'category': cat_objs['Pizza'], # Just putting it somewhere
            'description': 'Stir-fried noodles with vegetables.',
            'price': 6.49,
            'is_available': True
        },
        {
            'name': 'Paneer Tikka',
            'category': cat_objs['Pizza'],
            'description': 'Marinated paneer cubes grilled to perfection.',
            'price': 7.49,
            'is_available': True
        },
        {
            'name': 'Chocolate Cake',
            'category': cat_objs['Desserts'],
            'description': 'Rich and moist chocolate cake.',
            'price': 4.99,
            'is_available': True,
            'is_featured': True
        },
        {
            'name': 'Chicken Biryani',
            'category': cat_objs['Biryani'],
            'description': 'Authentic dum biryani with tender chicken pieces.',
            'price': 8.99,
            'is_available': True,
            'is_featured': True,
            'is_trending': True
        },
        {
            'name': 'Coca Cola',
            'category': cat_objs['Drinks'],
            'description': 'Chilled Coca Cola can.',
            'price': 1.99,
            'is_available': True
        }
    ]
    
    for fd in foods_data:
        Food.objects.get_or_create(name=fd['name'], defaults=fd)
        
    print(f"Successfully seeded {len(categories)} categories and {len(foods_data)} food items.")

if __name__ == '__main__':
    seed_data()
