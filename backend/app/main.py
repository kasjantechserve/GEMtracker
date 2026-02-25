from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from . import models, schemas, database, utils

app = FastAPI()

# Mount API routes below...

# Create tables
models.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/upload/", response_model=schemas.Tender)
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Save file
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract details
    details = utils.extract_pdf_details(file_path)
    if not details.get("bid_number"):
        raise HTTPException(status_code=400, detail="Could not extract Bid Number from PDF")

    # Create Tender
    db_tender = models.Tender(
        bid_number=details["bid_number"],
        bid_end_date=details.get("bid_end_date"),
        item_category=details.get("item_category"),
        subject=details.get("subject"),
        file_path=file_path
    )
    db.add(db_tender)
    db.commit()
    db.refresh(db_tender)

    # Generate Checklist
    checklist_data = utils.generate_checklist(db_tender.id)
    for item in checklist_data:
        db_item = models.ChecklistItem(
            tender_id=db_tender.id,
            name=item["name"],
            code=item["code"]
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_tender)
    return db_tender

@app.post("/upload-bulk/", response_model=List[schemas.Tender])
async def upload_bulk_pdfs(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []
    errors = []
    
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    for file in files:
        try:
            file_path = os.path.join(upload_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Extract details
            details = utils.extract_pdf_details(file_path)
            if not details.get("bid_number"):
                errors.append(f"Failed to process {file.filename}: Could not extract Bid Number")
                continue

            # Create Tender
            db_tender = models.Tender(
                bid_number=details["bid_number"],
                bid_end_date=details.get("bid_end_date"),
                item_category=details.get("item_category"),
                subject=details.get("subject"),
                file_path=file_path
            )
            db.add(db_tender)
            db.commit()
            db.refresh(db_tender)

            # Generate Checklist
            checklist_data = utils.generate_checklist(db_tender.id)
            for item in checklist_data:
                db_item = models.ChecklistItem(
                    tender_id=db_tender.id,
                    name=item["name"],
                    code=item["code"]
                )
                db.add(db_item)
            
            db.commit()
            db.refresh(db_tender)
            results.append(db_tender)
        except Exception as e:
            errors.append(f"Error processing {file.filename}: {str(e)}")
            continue
            
    if not results and errors:
        raise HTTPException(status_code=400, detail="\n".join(errors))
        
    return results

@app.get("/tenders/{tender_id}/download")
def download_pdf(tender_id: int, db: Session = Depends(get_db)):
    db_tender = db.query(models.Tender).filter(models.Tender.id == tender_id).first()
    if not db_tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    if not db_tender.file_path or not os.path.exists(db_tender.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(path=db_tender.file_path, filename=os.path.basename(db_tender.file_path), media_type='application/pdf')

@app.get("/tenders/", response_model=List[schemas.Tender])
def read_tenders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    from datetime import datetime
    now = datetime.utcnow()
    
    # Fetch all (or limit) - sorting in memory for simplicity with SQLite/Custom logic
    # Optimization: For large datasets, use SQL CASE WHEN
    tenders = db.query(models.Tender).all()
    
    active = sorted([t for t in tenders if t.bid_end_date and t.bid_end_date >= now], key=lambda x: x.bid_end_date)
    expired = sorted([t for t in tenders if t.bid_end_date and t.bid_end_date < now], key=lambda x: x.bid_end_date, reverse=True)
    none_dates = [t for t in tenders if not t.bid_end_date]
    
    return active + expired + none_dates

@app.put("/checklist/{item_id}", response_model=schemas.ChecklistItem)
def update_checklist_item(item_id: int, item: schemas.ChecklistItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.is_ready is not None:
        db_item.is_ready = item.is_ready
    if item.is_submitted is not None:
        db_item.is_submitted = item.is_submitted
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/tenders/{tender_id}", response_model=schemas.Tender)
def update_tender(tender_id: int, tender_update: schemas.TenderUpdate, db: Session = Depends(get_db)):
    db_tender = db.query(models.Tender).filter(models.Tender.id == tender_id).first()
    if not db_tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    if tender_update.nickname is not None:
        db_tender.nickname = tender_update.nickname
    
    db.commit()
    db.refresh(db_tender)
    return db_tender

@app.get("/backup")
def get_backup():
    file_path = "gemtracker.db"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Database file not found")
    
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return FileResponse(path=file_path, filename=f"gemtracker_backup_{timestamp}.db", media_type='application/octet-stream')

# Mount Static Files (MUST be at the very end, after all API routes)
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

if os.path.exists(static_path):
    app.mount("/_next", StaticFiles(directory=os.path.join(static_path, "_next")), name="next")
else:
    print(f"Warning: Static path {static_path} not found. Frontend will not be served.")

# Catch-all route for SPA (MUST be the very last route)
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Check if file exists in static
    if os.path.exists(os.path.join(static_path, full_path)) and os.path.isfile(os.path.join(static_path, full_path)):
        return FileResponse(os.path.join(static_path, full_path))
    
    # Otherwise return index.html for SPA routing
    if os.path.exists(os.path.join(static_path, "index.html")):
        return FileResponse(os.path.join(static_path, "index.html"))
    
    return JSONResponse({"error": "Frontend not found"}, status_code=404)
