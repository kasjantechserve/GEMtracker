"""
FastAPI Main Application with Supabase Integration
Handles PDF upload, parsing, and real-time data management
"""
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import shutil
import os
import tempfile
from datetime import datetime
from .supabase_client import get_supabase_client
from . import utils

app = FastAPI(title="GEMtracker API", version="2.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get Supabase client
def get_client():
    return get_supabase_client()

# Dependency to verify JWT token and get user
async def get_current_user(authorization: str = Header(None)):
    """Verify Supabase JWT token and return user data"""
    print(f"DEBUG: Auth header received: {'Yes' if authorization else 'No'}")
    if not authorization or not authorization.startswith("Bearer "):
        print("DEBUG: Missing or invalid Bearer token")
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        client = get_client()
        # Verify the token
        user_response = client.auth.get_user(token)
        if not user_response:
            print("DEBUG: client.auth.get_user(token) returned None")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"DEBUG: Token verified for user ID: {user_response.user.id}")
        
        # Get user data from users table
        user_data = client.table("users").select("*").eq("id", user_response.user.id).single().execute()
        if not user_data.data:
            print(f"DEBUG: User {user_response.user.id} not found in public.users table")
            raise HTTPException(status_code=404, detail="User not found in database")
        
        print("DEBUG: User authenticated successfully")
        return user_data.data
    except Exception as e:
        print(f"DEBUG: Auth exception: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# ============================================
# TENDER ENDPOINTS
# ============================================

@app.post("/api/upload/")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and parse PDF tender document
    Extracts bid information and creates tender record in Supabase
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        print(f"DEBUG: Starting upload for {file.filename}")
        client = get_client()
        
        # 1. Save file temporarily for parsing
        # Use tempfile for Vercel/serverless compatibility
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"upload_{current_user['id']}_{file.filename}")
        print(f"DEBUG: Saving temp file to {temp_path}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Extract PDF data using pdfplumber
        print(f"DEBUG: Extracting PDF details...")
        try:
            details = utils.extract_pdf_details(temp_path)
            print(f"DEBUG: Extracted details: {details}")
        except Exception as e:
            print(f"DEBUG: PDF Extraction failed: {e}")
            if os.path.exists(temp_path): os.remove(temp_path)
            raise HTTPException(
                status_code=422, 
                detail=f"Unable to parse tender PDF. Please ensure it is a valid GeM bid document. Error: {str(e)}"
            )
        
        if not details.get("bid_number"):
            print("DEBUG: No bid number found in PDF")
            if os.path.exists(temp_path): os.remove(temp_path)
            raise HTTPException(
                status_code=400, 
                detail="Could not extract bid number from PDF. Please check if the document contains a valid GeM Bid Number."
            )
        
        # 3. Upload PDF to Supabase Storage
        storage_path = f"{current_user['company_id']}/{details['bid_number']}_{int(datetime.now().timestamp())}.pdf"
        print(f"DEBUG: Uploading to storage bucket 'tender-pdfs' at path: {storage_path}")
        
        try:
            with open(temp_path, 'rb') as f:
                storage_response = client.storage.from_('tender-pdfs').upload(
                    storage_path,
                    f,
                    file_options={"content-type": "application/pdf"}
                )
            print(f"DEBUG: Storage upload successful: {storage_response}")
        except Exception as e:
            print(f"DEBUG: Storage upload failed: {e}")
            if os.path.exists(temp_path): os.remove(temp_path)
            raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")
        
        # Clean up temp file
        if os.path.exists(temp_path): os.remove(temp_path)
        
        # 4. Determine status based on end date
        status = "active"
        if details.get("bid_end_date"):
            bid_end_date = details["bid_end_date"]
            if isinstance(bid_end_date, datetime) and bid_end_date < datetime.utcnow():
                status = "expired"
        
        # 5. Insert tender record into Supabase
        tender_data = {
            "company_id": current_user["company_id"],
            "uploaded_by": current_user["id"],
            "bid_number": details["bid_number"],
            "bid_end_date": details.get("bid_end_date").isoformat() if details.get("bid_end_date") else None,
            "item_category": details.get("item_category"),
            "subject": details.get("subject"),
            "file_path": storage_path,
            "status": status
        }
        print(f"DEBUG: Inserting tender data: {tender_data}")
        
        try:
            response = client.table("tenders").insert(tender_data).execute()
            if not response.data:
                print(f"DEBUG: Database insertion returned no data: {response}")
                raise HTTPException(status_code=500, detail="Failed to create tender record")
            
            print(f"DEBUG: Tender record created successfully: {response.data[0]['id']}")
            return {
                "message": "PDF uploaded successfully",
                "tender": response.data[0]
            }
        except Exception as e:
            print(f"DEBUG: Database insertion failed: {e}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Unexpected error in upload_pdf: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/upload-bulk/")
async def upload_bulk_pdfs(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and parse multiple PDF tender documents
    """
    results = []
    errors = []
    client = get_client()
    temp_dir = tempfile.gettempdir()

    for file in files:
        if not file.filename.endswith('.pdf'):
            errors.append(f"Skipped {file.filename}: Only PDF files are allowed")
            continue
            
        temp_path = None
        try:
            print(f"DEBUG: Processing bulk upload for {file.filename}")
            temp_path = os.path.join(temp_dir, f"bulk_{current_user['id']}_{int(datetime.now().timestamp())}_{file.filename}")
            
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Extract PDF data
            details = utils.extract_pdf_details(temp_path)
            
            if not details.get("bid_number"):
                errors.append(f"Failed to process {file.filename}: Could not extract bid number")
                if os.path.exists(temp_path): os.remove(temp_path)
                continue
            
            # Upload PDF to Supabase Storage
            storage_path = f"{current_user['company_id']}/{details['bid_number']}_{int(datetime.now().timestamp())}.pdf"
            
            with open(temp_path, 'rb') as f:
                client.storage.from_('tender-pdfs').upload(
                    storage_path,
                    f,
                    file_options={"content-type": "application/pdf"}
                )
            
            # Determine status
            status = "active"
            if details.get("bid_end_date"):
                bid_end_date = details["bid_end_date"]
                if isinstance(bid_end_date, datetime) and bid_end_date < datetime.utcnow():
                    status = "expired"
            
            # Insert tender record
            tender_data = {
                "company_id": current_user["company_id"],
                "uploaded_by": current_user["id"],
                "bid_number": details["bid_number"],
                "bid_end_date": details.get("bid_end_date").isoformat() if details.get("bid_end_date") else None,
                "item_category": details.get("item_category"),
                "subject": details.get("subject"),
                "file_path": storage_path,
                "status": status
            }
            
            response = client.table("tenders").insert(tender_data).execute()
            if response.data:
                results.append(response.data[0])
                
        except Exception as e:
            print(f"DEBUG: Error processing {file.filename}: {e}")
            errors.append(f"Error processing {file.filename}: {str(e)}")
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
    
    if not results and errors:
        raise HTTPException(status_code=400, detail="\n".join(errors))
        
    return {
        "message": f"Processed {len(results)} tenders successfully",
        "tenders": results,
        "errors": errors
    }

@app.post("/api/tenders/analyze-screenshot")
async def analyze_screenshot(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a GeM portal screenshot to extract and update tender statuses
    """
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    try:
        print(f"DEBUG: Analyzing screenshot {file.filename}")
        
        # Read image bytes
        image_bytes = await file.read()
        
        # Extract details using AI
        extracted_bids = utils.extract_details_from_image(image_bytes, file.content_type)
        print(f"DEBUG: Extracted {len(extracted_bids)} bids from screenshot")
        
        return {
            "message": "Screenshot analyzed successfully",
            "updates": extracted_bids
        }
    except Exception as e:
        print(f"DEBUG: Screenshot analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/tenders/")
async def get_tenders(current_user: dict = Depends(get_current_user)):
    """Get all tenders for the user's company"""
    try:
        client = get_client()
        
        # Fetch tenders with checklist items
        response = client.table("tenders")\
            .select("*, checklist_items(*)")\
            .eq("company_id", current_user["company_id"])\
            .order("bid_end_date", desc=False)\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tenders: {str(e)}")

@app.get("/api/tenders/{tender_id}")
async def get_tender(tender_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific tender with checklist items"""
    try:
        client = get_client()
        
        response = client.table("tenders")\
            .select("*, checklist_items(*)")\
            .eq("id", tender_id)\
            .eq("company_id", current_user["company_id"])\
            .single()\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Tender not found")
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tender: {str(e)}")

@app.put("/api/tenders/{tender_id}")
async def update_tender(
    tender_id: str,
    nickname: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update tender details (e.g., nickname)"""
    try:
        client = get_client()
        
        update_data = {}
        if nickname is not None:
            update_data["nickname"] = nickname
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        response = client.table("tenders")\
            .update(update_data)\
            .eq("id", tender_id)\
            .eq("company_id", current_user["company_id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Tender not found or update failed")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update tender: {str(e)}")

@app.delete("/api/tenders/{tender_id}")
async def delete_tender(tender_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a tender, its checklist items, and its PDF file from storage
    """
    try:
        client = get_client()
        
        # 1. Get tender details (to get storage path)
        tender_res = client.table("tenders")\
            .select("file_path")\
            .eq("id", tender_id)\
            .eq("company_id", current_user["company_id"])\
            .single()\
            .execute()
        
        if not tender_res.data:
            raise HTTPException(status_code=404, detail="Tender not found")
        
        file_path = tender_res.data.get("file_path")
        
        # 2. Delete from database (tenders and checklist_items via CASCADE)
        # Note: In Supabase, if CASCADE is set, checklist_items will be deleted automatically.
        # Based on schema_v2.sql, checklist_items has REFERENCES tenders(id) ON DELETE CASCADE.
        db_res = client.table("tenders")\
            .delete()\
            .eq("id", tender_id)\
            .eq("company_id", current_user["company_id"])\
            .execute()
        
        if not db_res.data:
            raise HTTPException(status_code=500, detail="Failed to delete tender record")
        
        # 3. Delete from storage if file_path exists
        if file_path:
            try:
                client.storage.from_('tender-pdfs').remove([file_path])
                print(f"DEBUG: Successfully deleted file from storage: {file_path}")
            except Exception as se:
                print(f"DEBUG: Warning: Failed to delete file from storage: {se}")
                # We don't raise here because the main record is already gone
        
        return {"message": "Tender deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Delete encounter error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete tender: {str(e)}")

# ============================================
# CHECKLIST ENDPOINTS
# ============================================

@app.put("/api/checklist/{item_id}")
async def update_checklist_item(
    item_id: str,
    is_ready: Optional[bool] = None,
    is_submitted: Optional[bool] = None,
    document_url: Optional[str] = None,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update checklist item status"""
    try:
        client = get_client()
        
        update_data = {"updated_by": current_user["id"]}
        if is_ready is not None:
            update_data["is_ready"] = is_ready
        if is_submitted is not None:
            update_data["is_submitted"] = is_submitted
        if document_url is not None:
            update_data["document_url"] = document_url
        if notes is not None:
            update_data["notes"] = notes
        
        response = client.table("checklist_items")\
            .update(update_data)\
            .eq("id", item_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Checklist item not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update checklist item: {str(e)}")

# ============================================
# TEMPLATE ENDPOINTS
# ============================================

@app.get("/api/templates/")
async def get_templates(current_user: dict = Depends(get_current_user)):
    """Get all public templates"""
    try:
        client = get_client()
        
        response = client.table("templates")\
            .select("*")\
            .eq("is_public", True)\
            .order("category")\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")

@app.get("/api/templates/{template_id}/download")
async def download_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Download a template file"""
    try:
        client = get_client()
        
        # Get template details
        template = client.table("templates").select("*").eq("id", template_id).single().execute()
        
        if not template.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Increment download count
        client.table("templates")\
            .update({"download_count": template.data["download_count"] + 1})\
            .eq("id", template_id)\
            .execute()
        
        # Get signed URL from Supabase Storage
        file_url = client.storage.from_('template-files').create_signed_url(
            template.data["file_path"],
            60  # URL valid for 60 seconds
        )
        
        return {"download_url": file_url['signedURL']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download template: {str(e)}")

# ============================================
# DOWNLOAD PDF ENDPOINT
# ============================================

@app.get("/api/tenders/{tender_id}/download")
async def download_tender_pdf(tender_id: str, current_user: dict = Depends(get_current_user)):
    """Download the original tender PDF"""
    try:
        client = get_client()
        
        # Get tender
        tender = client.table("tenders")\
            .select("file_path")\
            .eq("id", tender_id)\
            .eq("company_id", current_user["company_id"])\
            .single()\
            .execute()
        
        if not tender.data or not tender.data.get("file_path"):
            raise HTTPException(status_code=404, detail="Tender PDF not found")
        
        # Get signed URL
        file_url = client.storage.from_('tender-pdfs').create_signed_url(
            tender.data["file_path"],
            60  # URL valid for 60 seconds
        )
        
        return {"download_url": file_url['signedURL']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download PDF: {str(e)}")

@app.get("/api/checklist/{item_id}/download")
async def download_checklist_doc(item_id: str, current_user: dict = Depends(get_current_user)):
    """Download a compliance checklist document"""
    try:
        client = get_client()
        
        # Get checklist item
        item = client.table("checklist_items")\
            .select("document_url, tender_id")\
            .eq("id", item_id)\
            .single()\
            .execute()
        
        if not item.data or not item.data.get("document_url"):
            raise HTTPException(status_code=404, detail="Document not found")
            
        # Verify ownership via tender
        tender = client.table("tenders")\
            .select("company_id")\
            .eq("id", item.data["tender_id"])\
            .single()\
            .execute()
            
        if not tender.data or tender.data["company_id"] != current_user["company_id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        
        # Get signed URL (bucket name is compliance-docs as per prompt/setup)
        file_url = client.storage.from_('compliance-docs').create_signed_url(
            item.data["document_url"],
            60
        )
        
        return {"download_url": file_url['signedURL']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "GEMtracker API v2.0"}

# ============================================
# STATIC FILES (if needed)
# ============================================

static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

if os.path.exists(static_path):
    app.mount("/_next", StaticFiles(directory=os.path.join(static_path, "_next")), name="next")

# Catch-all route for SPA
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    if os.path.exists(os.path.join(static_path, full_path)) and os.path.isfile(os.path.join(static_path, full_path)):
        return FileResponse(os.path.join(static_path, full_path))
    
    if os.path.exists(os.path.join(static_path, "index.html")):
        return FileResponse(os.path.join(static_path, "index.html"))
    
    return JSONResponse({"error": "Frontend not found"}, status_code=404)
