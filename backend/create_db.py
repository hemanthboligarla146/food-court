import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    conn = psycopg2.connect(
        dbname='postgres',
        user='postgres',
        password='@he252002mantH',
        host='127.0.0.1',
        port='5432'
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'food_court'")
    exists = cursor.fetchone()
    
    if not exists:
        cursor.execute('CREATE DATABASE food_court')
        print("Database 'food_court' created successfully.")
    else:
        print("Database 'food_court' already exists.")
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
