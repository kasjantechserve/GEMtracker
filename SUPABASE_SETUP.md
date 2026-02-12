# GEMtracker v2.0 - Supabase Multi-User Upgrade

## 🎯 What's New

- **Multi-User Support**: Role-based access (Admin/Member) with company-level isolation
- **Real-Time Updates**: Live dashboard updates when any user uploads or modifies tenders
- **PostgreSQL Database**: Scalable Supabase backend (free tier: 500MB)
- **Document Repository**: Centralized template storage for compliance formats
- **Authentication**: Secure Supabase Auth with JWT tokens
- **Row Level Security**: Data isolation between companies

---

## 📁 Project Structure

```
GEMtracker/
├── backend/
│   ├── app/
│   │   ├── main_supabase.py      # New FastAPI with Supabase
│   │   ├── supabase_client.py    # Supabase client config
│   │   └── utils.py               # PDF extraction (unchanged)
│   ├── requirements_supabase.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/page.tsx    # Authentication
│   │   │   ├── dashboard/page.tsx # Real-time dashboard
│   │   │   └── templates/page.tsx # Template repository
│   │   ├── components/
│   │   │   └── Auth/LoginForm.tsx
│   │   ├── hooks/
│   │   │   └── useRealtimeTenders.ts # Real-time hook
│   │   └── lib/
│   │       └── supabase/
│   │           ├── client.ts      # Browser client
│   │           └── server.ts      # Server client
│   ├── package_supabase.json
│   └── .env.local.example
└── supabase/
    └── schema.sql                 # Database schema
```

---

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region
4. Set database password (save it!)
5. Wait for project to initialize

### Step 2: Setup Database

1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of `supabase/schema.sql`
3. Paste and click **Run**
4. Verify tables created in **Table Editor**

### Step 3: Create Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Create three buckets:
   - `tender-pdfs` (Private)
   - `template-files` (Public)
   - `checklist-documents` (Private)

### Step 4: Configure Backend

1. Copy environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Get Supabase credentials from **Project Settings → API**:
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_SERVICE_KEY`: `service_role` key (keep secret!)

3. Update `backend/.env`:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

4. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements_supabase.txt
   ```

### Step 5: Configure Frontend

1. Copy environment variables:
   ```bash
   cp frontend/.env.local.example frontend/.env.local
   ```

2. Get Supabase credentials from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `anon` / `public` key

3. Update `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Install dependencies:
   ```bash
   cd frontend
   npm install @supabase/supabase-js @supabase/ssr lucide-react
   ```

### Step 6: Create First User

1. Go to **Authentication → Users** in Supabase
2. Click **Add User** → **Create new user**
3. Enter email and password
4. Click **Create User**

5. Manually insert company and link user:
   ```sql
   -- Insert company
   INSERT INTO companies (name) VALUES ('Your Company Name');

   -- Link user to company (replace IDs)
   INSERT INTO users (id, company_id, email, full_name, role)
   VALUES (
     'user-uuid-from-auth-users',
     'company-uuid-from-companies',
     'user@example.com',
     'Your Name',
     'admin'
   );
   ```

### Step 7: Run the Application

1. **Backend**:
   ```bash
   cd backend
   uvicorn app.main_supabase:app --reload --port 8000
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open `http://localhost:3000/login`

---

## 🧪 Testing Real-Time

1. Open two browser windows side-by-side
2. Log in with the same company account
3. In Window A: Upload a PDF
4. In Window B: Watch the tender appear instantly!

---

## 📊 Database Schema

### Tables
- **companies**: Organization data
- **users**: User profiles (extends Supabase Auth)
- **tenders**: Tender records with PDF data
- **checklist_items**: 28-point compliance checklist
- **templates**: Document repository

### Auto-Features
- 28 checklist items auto-created on tender insert
- Timestamps (`created_at`, `updated_at`) auto-updated
- Row Level Security enforces company isolation

---

## 🔐 Security

- **JWT Authentication**: All API requests require Bearer token
- **Row Level Security (RLS)**: Users only see their company's data
- **Service Key**: Backend uses service key for admin operations
- **Anon Key**: Frontend uses anon key (safe for public)

---

## 📦 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/` | Upload and parse PDF |
| GET | `/api/tenders/` | Get all company tenders |
| GET | `/api/tenders/{id}` | Get specific tender |
| PUT | `/api/tenders/{id}` | Update tender (nickname) |
| PUT | `/api/checklist/{id}` | Update checklist item |
| GET | `/api/templates/` | Get all public templates |
| GET | `/api/templates/{id}/download` | Download template |
| GET | `/api/tenders/{id}/download` | Download tender PDF |

---

## 🎨 Features

### Real-Time Dashboard
- Live tender list updates
- Color-coded deadline badges (Green = Safe, Red = Expired)
- Instant checklist status sync
- No page refresh needed

### Template Repository
- Categorized compliance formats
- One-click downloads
- Download count tracking
- Admin-only upload

### Multi-User
- Company-level isolation
- Role-based permissions (Admin/Member)
- Concurrent user support

---

## 🔧 Troubleshooting

### "Authentication failed"
- Check JWT token in browser DevTools → Network → Headers
- Verify Supabase API keys in environment files
- Ensure user exists in `users` table (not just `auth.users`)

### "No tenders showing"
- Verify user has `company_id` in `users` table
- Check RLS policies in **Table Editor → Policies**
- Inspect browser console for errors

### "Real-time not working"
- Verify Supabase Realtime is enabled (Project Settings → API → Realtime)
- Check browser console for subscription errors
- Ensure `company_id` filter matches in hook

---

## 🚀 Deployment

### Backend (Render/Railway)
1. Push code to GitHub
2. Create Web Service pointing to `backend/`
3. Add environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)
4. Deploy

### Frontend (Vercel/Netlify)
1. Push code to GitHub
2. Create new site pointing to `frontend/`
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy

---

## 📝 Next Steps

1. ✅ **Upload Sample Templates**: Add GST, PAN, Authorization formats to `template-files` bucket
2. ✅ **Invite Team Members**: Add users via Supabase Auth → Invite by Email
3. ✅ **Test Real-Time**: Try multi-window testing
4. ✅ **Customize Checklist**: Modify `create_default_checklist()` function if needed

---

**Built with:** Supabase, FastAPI, Next.js, PostgreSQL, Real-time Subscriptions  
**Version:** 2.0 (Multi-User)  
**License:** Open Source
