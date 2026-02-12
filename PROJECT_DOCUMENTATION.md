# GEMtracker - Project Documentation

## Executive Summary

**GEMtracker** is a complete web application for managing government tender bids from GeM (Government e-Marketplace). It automates the tedious process of tracking bid deadlines and compliance requirements.

---

## Core Features

### 1. Smart PDF Processing 📄
The application automatically extracts critical information from GeM tender PDFs:
- **Bid Number** (e.g., GEM/2026/B/7132339)
- **Bid End Date** (deadline)
- **Item Category** (tender description)
- **Short Subject** (10-word summary)

### 2. Dashboard & Organization 📊
Professional dashboard featuring:
- **Tender List**: Left sidebar with all tenders
- **Custom Nicknames**: Rename tenders for easier identification
- **Time Remaining**: Visual countdown (e.g., "5d 3h left")
- **Status Indicators**: Green for active, red for expired
- **Smart Sorting**: Active tenders first (by deadline), expired last

### 3. 28-Point Compliance Checklist ✅
Every tender includes a comprehensive checklist with dual status tracking:
- **Ready?** - Document is prepared
- **Submitted?** - Document uploaded to GeM

Standard checklist items include:
- EMD (Earnest Money Deposit)
- Manufacturer Authorization Certificate
- GST Registration Certificate
- PAN Card
- Technical Specifications
- Financial Documents
- 22+ additional compliance items

### 4. Data Management 💾
- **Backup Download**: Export entire database
- **PDF Download**: Retrieve original tender documents
- **Nickname System**: Custom friendly names for tenders

---

## Technical Architecture

### Frontend (User Interface)
- **Framework**: Next.js (React-based)
- **Styling**: Tailwind CSS for responsive design
- **Build**: Compiled to static files (HTML/CSS/JS)
- **Features**: Modern, fast, mobile-responsive

### Backend (Server)
- **Framework**: FastAPI (Python)
- **Database**: SQLite for portable data storage
- **PDF Processing**: pdfplumber library
- **API**: RESTful endpoints for all operations

### Deployment Strategy: Single-Service Architecture 🚀
- Frontend compiled into backend
- Single server deployment
- No CORS complexity
- One URL for everything
- Simplified deployment process

---

## User Workflow

```
1. Upload Tender PDF
        ↓
2. Automatic Information Extraction
        ↓
3. Tender Entry Created with Checklist
        ↓
4. Track Progress (Mark items Ready/Submitted)
        ↓
5. Download Backups & Original PDFs
```

**Example Usage:**
1. Receive new tender PDF from GeM
2. Upload to GEMtracker
3. System creates tender entry with extracted details
4. Work through compliance checklist
5. Monitor deadline countdown
6. Mark items as ready and submitted

---

## Project Structure

```
GEMtracker/
├── backend/
│   ├── app/
│   │   ├── main.py         # API routes & server
│   │   ├── models.py       # Database schema
│   │   ├── utils.py        # PDF extraction
│   │   ├── schemas.py      # Data validation
│   │   └── database.py     # DB connection
│   ├── static/             # Frontend files (auto-generated)
│   ├── uploads/            # Uploaded PDFs
│   ├── gemtracker.db       # SQLite database
│   ├── run_backend.py      # Server launcher
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── page.tsx    # Main dashboard
│   │   └── components/
│   │       └── Checklist.tsx # Checklist component
│   ├── package.json        # Node dependencies
│   └── next.config.ts      # Build configuration
└── build_deploy.py         # Deployment build script
```

---

## Key Advantages

✅ **Time-Saving**: Eliminates manual data entry  
✅ **Deadline Management**: Never miss a bid deadline  
✅ **Compliance Tracking**: Structured checklist system  
✅ **Portable**: SQLite allows easy backup and migration  
✅ **Simple Deployment**: One command local, one service cloud  
✅ **Cost-Effective**: Free and open-source

---

## Deployment Options

### Local Deployment
```bash
cd GEMtracker/backend
python run_backend.py
```
Access at: `http://localhost:8000`

### Cloud Deployment (Render)
1. Push code to GitHub
2. Create Web Service on Render
3. Point to `backend` directory
4. Automatic deployment

---

## Technology Stack

**Frontend:**
- Next.js 16.x
- React
- TypeScript
- Tailwind CSS
- Axios

**Backend:**
- Python 3.9+
- FastAPI
- SQLAlchemy
- pdfplumber
- Uvicorn

**Database:**
- SQLite (development)
- PostgreSQL (production-ready)

---

## Market Position

**Traditional Solutions:**
- **Spreadsheets**: Manual, error-prone, no automation
- **Enterprise Software**: Expensive, complex, overkill

**GEMtracker Advantage:**
- Automated extraction
- Professional interface
- Simple enough for individuals
- Scalable for businesses
- Free and customizable

---

## Use Cases

1. **Individual Vendors**: Track personal tender bids
2. **Small Businesses**: Manage multiple concurrent bids
3. **Procurement Teams**: Coordinate compliance documentation
4. **Consultants**: Offer as a managed service

---

## Future Enhancement Possibilities

- Email notifications for approaching deadlines
- Multi-user support with role-based access
- Advanced analytics and reporting
- Integration with GeM APIs
- Document template management
- Bid history and success rate tracking
- Mobile app version

---

## Conclusion

GEMtracker represents a modern, efficient solution for government tender bid management. By combining automated PDF extraction, intelligent organization, and comprehensive compliance tracking, it significantly reduces manual effort while improving deadline adherence and documentation completeness.

The single-service architecture ensures easy deployment and maintenance, making it accessible for users ranging from individual vendors to procurement teams.

---

**Built with:** Python, FastAPI, Next.js, React, SQLite  
**License:** Open Source  
**Deployment:** Local or Cloud (Render, Railway, etc.)
