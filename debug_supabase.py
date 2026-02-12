
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials in backend/.env")
    exit(1)

supabase = create_client(url, key)

def check_user(email):
    print(f"\n--- Checking user: {email} ---")
    
    # Check public.users
    try:
        res = supabase.table("users").select("*").eq("email", email).execute()
        if res.data:
            print(f"✅ Found in public.users: {res.data[0]}")
            p_uid = res.data[0]['id']
        else:
            print(f"❌ NOT found in public.users")
            p_uid = None
    except Exception as e:
        print(f"❌ Error checking public.users: {e}")
        p_uid = None

    # Check companies
    try:
        res = supabase.table("companies").select("*").execute()
        if res.data:
            print(f"✅ Found {len(res.data)} companies:")
            for c in res.data:
                print(f"   - {c['name']} (ID: {c['id']})")
            
            # Verify linkage
            if p_uid:
                user_res = supabase.table("users").select("company_id").eq("id", p_uid).single().execute()
                u_cid = user_res.data['company_id']
                if any(c['id'] == u_cid for c in res.data):
                    print(f"✅ User's company_id {u_cid} MATCHES a company!")
                else:
                    print(f"❌ User's company_id {u_cid} does NOT match any company!")
        else:
            print(f"❌ No companies found")
    except Exception as e:
        print(f"❌ Error checking companies: {e}")

    # Check Storage
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print(f"✅ Found {len(bucket_names)} storage buckets: {bucket_names}")
        if 'tender-pdfs' in bucket_names:
            print(f"✅ 'tender-pdfs' bucket EXISTS.")
        else:
            print(f"❌ 'tender-pdfs' bucket is MISSING!")
    except Exception as e:
        print(f"❌ Error checking storage: {e}")

if __name__ == "__main__":
    check_user("user1@gemtracker.com")
