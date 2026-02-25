import google.generativeai as genai
import os
import json
import re
import pdfplumber
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configure Google AI
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def extract_pdf_details(pdf_path: str):
    """
    Extract bid details from PDF using fast regex matching with AI fallback.
    """
    details = {
        "bid_number": None,
        "bid_end_date": None,
        "item_category": None,
        "subject": None
    }

    # 1. FAST REGEX SCAN (Directly read first 2 pages)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            # Limit to 2 pages for GeM - 99% of info is here
            for i in range(min(2, len(pdf.pages))):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    text += page_text + "\n"
            
            if text:
                # Extract Bid Number - GeM Format specific
                bid_no_match = re.search(r"Bid Number(?:\s*/\s*िबड संख्या)?\s*[:\.]?\s*(GEM/\d{4}/[A-Z]/\d+)", text, re.IGNORECASE)
                if bid_no_match:
                    details["bid_number"] = bid_no_match.group(1).strip()

                # Extract End Date
                end_date_match = re.search(r"Bid End Date/Time(?:\s*/\s*िबड समाप्ति तिथि/समय)?\s*(\d{2}-\d{2}-\d{4}\s*\d{2}:\d{2}:\d{2})", text, re.IGNORECASE)
                if end_date_match:
                    try:
                        details["bid_end_date"] = datetime.strptime(end_date_match.group(1), "%d-%m-%Y %H:%M:%S")
                    except:
                        pass

                # Extract Item Category
                item_cat_match = re.search(r"Item Category(?:\s*/\s*मद श्रेणी)?\s*(.*)", text, re.IGNORECASE)
                if item_cat_match:
                    details["item_category"] = item_cat_match.group(1).strip()
    except Exception as e:
        print(f"DEBUG: Fast regex scan failed: {e}")

    # 2. AI FALLBACK (Only if regex missed critical info)
    if not details.get("bid_number") and api_key:
        try:
            print("DEBUG: Regex missed Bid Number. Attempting AI extraction with Gemini...")
            model = genai.GenerativeModel('gemini-1.5-flash') # Ultra-fast model
            
            # Use same text context already extracted for efficiency
            prompt = f"""
            Extract GeM Bid Number, End Date (DD-MM-YYYY HH:MM:SS), and Item Category.
            Return ONLY clean JSON.
            Text: {text[:5000]}
            """

            response = model.generate_content(prompt)
            ai_data = json.loads(response.text.replace('```json', '').replace('```', '').strip())
            
            if not details["bid_number"]: details["bid_number"] = ai_data.get("bid_number")
            if not details["item_category"]: details["item_category"] = ai_data.get("item_category")
            if not details["bid_end_date"] and ai_data.get("bid_end_date"):
                try:
                    details["bid_end_date"] = datetime.strptime(ai_data["bid_end_date"], "%d-%m-%Y %H:%M:%S")
                except:
                    pass
        except Exception as e:
            print(f"DEBUG: AI fallback failed: {e}")

    # Fallback to filename if still nothing
    if not details["bid_number"]:
        filename = os.path.basename(pdf_path)
        if filename.startswith("GEM"):
            details["bid_number"] = filename.split('.')[0]

    # Generate subject if category exists
    if details["item_category"] and not details["subject"]:
        words = details["item_category"].split()
        details["subject"] = " ".join(words[:10]) + ("..." if len(words) > 10 else "")

    return details

def extract_details_from_image(image_bytes: bytes):
    """
    Extract bid details from a GeM portal screenshot using Gemini AI.
    """
    if not api_key:
        raise Exception("Google API Key not configured")

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Construct prompt for GeM screenshot analysis
        prompt = """
        Analyze this screenshot from the GeM (Government e-Marketplace) portal.
        Extract a list of all bids/tenders shown in the image.
        For each bid, look for:
        1. Bid Number (format: GEM/year/B/number)
        2. Status (e.g., Technical Evaluation, Financial Evaluation, Bid Award, Evaluation)
        3. Bid/RA Status (e.g., Active)
        4. Any specific results mentioned (e.g., Disqualified, Technically Qualified)

        Return the data as a clean JSON array of objects with these keys: 
        "bid_number", "evaluation_status", "ra_status", "result_details".
        If "Technical Evaluation" is highlighted/active in the progress bar, set evaluation_status to "Technical Evaluation".
        If "Financial Evaluation" is active, set evaluation_status to "Financial Evaluation".
        If "Bid Award" is active, set evaluation_status to "Awarded".
        
        ONLY return the JSON array.
        """

        # Gemini 1.5 Flash supports image inputs directly
        response = model.generate_content([
            prompt,
            {"mime_type": "image/png", "data": image_bytes}
        ])
        
        # Clean and parse JSON
        json_text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(json_text)
    except Exception as e:
        print(f"DEBUG: Image extraction failed: {e}")
        raise e

def generate_checklist(tender_id: int):
    # Hardcoded checklist as per requirements
    checklist_data = [
        {"code": "F-1", "name": "Bidder's General Information"},
        {"code": "F-2", "name": "Proforma of Bank Guarantee for Earnest Money"},
        {"code": "F-2A", "name": "Proforma of Declaration for Bid Security"},
        {"code": "F-2B", "name": "Fixed Deposit Receipt as EMD"},
        {"code": "F-2C", "name": "Proforma of Insurance Surety Bond for Earnest Money"},
        {"code": "F-3", "name": "Letter of Authority"},
        {"code": "F-4", "name": "Proforma of Bank Guarantee for Contract Performance Security"},
        {"code": "F-4A", "name": "Fixed Deposit Receipt as CPS"},
        {"code": "F-4B", "name": "Proforma of Insurance Surety Bond for Security Deposit"},
        {"code": "F-5", "name": "Agreed Terms & Conditions"},
        {"code": "F-6", "name": "Acknowledgement Cum Consent Letter"},
        {"code": "F-7", "name": "Bidder’s Experience"},
        {"code": "F-8", "name": "Check List"},
        {"code": "F-8B", "name": "Check List for BEC Qualifying Documents"},
        {"code": "F-9", "name": "Format for Certificate from Bank (if working capital inadequate)"},
        {"code": "F-10", "name": "Format for CA Certificate for Financial Capability"},
        {"code": "F-11", "name": "Bidder's Queries for Pre-Bid Meeting"},
        {"code": "F-12", "name": "E-Banking Format"},
        {"code": "F-13", "name": "Integrity Pact"},
        {"code": "F-14", "name": "FAQs"},
        {"code": "F-15", "name": "Undertaking regarding E-Invoice (GST Laws)"},
        {"code": "F-16", "name": "No Claim Certificate format"},
        {"code": "DOC-1", "name": "Bid Document (Signed)"},
        {"code": "DOC-2", "name": "GeM Document (Signed)"},
        {"code": "DOC-3", "name": "SOR (Schedule of Rates) Quoted"},
        {"code": "DOC-4", "name": "SOR Filled"},
        {"code": "DOC-5", "name": "Experience Certificate"},
        {"code": "DOC-6", "name": "Company Binder 1 Copy"},
    ]
    return checklist_data

