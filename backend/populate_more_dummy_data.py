import os
import django
import random
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from foods.models import Category, Food

dummy_names = {
    'Pizza': ['Pepperoni Feast', 'Veggie Supreme', 'Margherita Extra', 'BBQ Chicken Pizza'],
    'Burger': ['Double Cheeseburger', 'Spicy Chicken Burger', 'Veggie Deluxe Burger', 'Mushroom Swiss Burger'],
    'Biryani': ['Mutton Biryani', 'Prawn Biryani', 'Egg Biryani', 'Special Chicken Biryani'],
    'Desserts': ['Strawberry Cheesecake', 'Chocolate Brownie', 'Vanilla Ice Cream', 'Tiramisu'],
    'Drinks': ['Mango Lassi', 'Cold Coffee', 'Lemon Iced Tea', 'Mojito'],
}

generic_names = ['Special', 'Delight', 'Supreme', 'Classic']

def populate():
    categories = Category.objects.all()
    for category in categories:
        names = dummy_names.get(category.name)
        if not names:
            names = [f"{category.name} {n}" for n in generic_names]
            
        for name in names:
            price = Decimal(random.uniform(5.0, 25.0)).quantize(Decimal('0.00'))
            Food.objects.get_or_create(
                name=name,
                category=category,
                defaults={
                    'description': f'A delicious {name} prepared with fresh ingredients.',
                    'price': price,
                    'is_available': True,
                    'is_featured': random.choice([True, False])
                }
            )
    print("Successfully added more dummy food items!")

if __name__ == '__main__':
    populate()
