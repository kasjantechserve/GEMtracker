# ☁️ GEMtracker Cloud Setup & Deployment Guide

This guide will take you from local development to a fully hosted "Cloud" application that anyone on your team can access.

---

## Part 1: Finalize Cloud Database (Supabase)
Before deploying, we must fix the user account link we were working on. 

### 1. The "Ultimate Force" SQL Fix
Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/bkhgaugwdlesgrrnvfs/sql/new) and run this **one last time**. This version is designed to bypass all errors.

```sql
-- 1. Remove and Recreate the users table correctly
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- We link this manually to avoid Auth check errors
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member'
);

-- 2. Insert your account (CRITICAL: Use your IDs from before)
INSERT INTO public.users (id, company_id, email, full_name, role)
VALUES (
  '433c73cc-b830-4525-8af6-8afac0314ae0', -- Your User UID
  'f867e3c4-f8b5-4869-8a36-0f29b5cff358', -- Your Company ID
  'kasjantechserve@gmail.com', 
  'Admin', 
  'admin'
);

-- 3. Now add the security link to the Auth table
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

---

## Part 2: Deploying the Backend (API)
We will use **Render** or **Railway** (Both offer free tiers).

### 1. Prepare for Cloud
- Your code is already using `.env` variables, which is perfect.
- You have `requirements_supabase.txt`.

### 2. Steps to Deploy on Render.com
1. Create a free account on [Render.com](https://render.com).
2. Click **"New +"** -> **"Web Service"**.
3. Connect your GitHub repository.
4. Set these settings:
   - **Environment:** `Python`
   - **Build Command:** `pip install -r backend/requirements_supabase.txt`
   - **Start Command:** `cd backend && uvicorn app.main_supabase:app --host 0.0.0.0 --port $PORT`
5. Click **"Advanced"** -> **"Add Environment Variable"**:
   - `SUPABASE_URL` = (Your Project URL)
   - `SUPABASE_SERVICE_KEY` = (Your Service Role Key)
6. Click **Deploy**.

---

## Part 3: Deploying the Frontend (UI)
We will use **Vercel** (Best for Next.js).

### 1. Steps to Deploy on Vercel
1. Create a free account on [Vercel.com](https://vercel.com).
2. Click **"Add New"** -> **"Project"**.
3. Import your GitHub repository.
4. **Edit Project Settings**:
   - **Root Directory:** Set to `frontend`
5. **Add Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Your Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Your Anon Key)
6. Click **Deploy**.

---

## Part 4: Connect the Two
Once your backend is live on Render, it will give you a URL (like `https://gemtracker-api.onrender.com`).

1. Go to your **Vercel Settings**.
2. Add a new Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-render-url.com`
3. Redeploy the frontend.

---

## ✅ You are officially in the Cloud!
Now you can send your Vercel URL to your coworkers, and they can login using the credentials you created.

### 🛠️ Need help?
If the SQL in Part 1 fails, please take a screenshot of the error. We must finish that before moving to Part 2!
