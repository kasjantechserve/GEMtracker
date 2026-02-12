"""
Supabase Client Configuration
Initializes Supabase client for backend API operations
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for admin operations

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase credentials. Check your .env file.")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_supabase_client() -> Client:
    """Returns the Supabase client instance"""
    return supabase
