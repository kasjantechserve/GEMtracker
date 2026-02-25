import google.generativeai as genai
import os
import json
import re
import pdfplumber
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

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
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i in range(min(2, len(pdf.pages))):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    text += page_text + "\n"
            
            if text:
                bid_no_match = re.search(r"Bid Number(?:\s*/\s*िबड संख्या)?\s*[:\.]?\s*(GEM/\d{4}/[A-Z]/\d+)", text, re.IGNORECASE)
                if bid_no_match:
                    details["bid_number"] = bid_no_match.group(1).strip()

                end_date_match = re.search(r"Bid End Date/Time(?:\s*/\s*िबड समाप्ति तिथि/समय)?\s*(\d{2}-\d{2}-\d{4}\s*\d{2}:\d{2}:\d{2})", text, re.IGNORECASE)
                if end_date_match:
                    try:
                        details["bid_end_date"] = datetime.strptime(end_date_match.group(1), "%d-%m-%Y %H:%M:%S")
                    except:
                        pass

                item_cat_match = re.search(r"Item Category(?:\s*/\s*मद श्रेणी)?\s*(.*)", text, re.IGNORECASE)
                if item_cat_match:
                    details["item_category"] = item_cat_match.group(1).strip()
    except Exception as e:
        print(f"DEBUG: Fast regex scan failed: {e}")

    dynamic_api_key = os.getenv("GOOGLE_API_KEY")
    if not details.get("bid_number") and dynamic_api_key:
        try:
            print("DEBUG: Regex missed Bid Number. Attempting AI extraction with Gemini...")
            genai.configure(api_key=dynamic_api_key)
            model = genai.GenerativeModel('gemini-1.5-flash') 
            
            prompt = f"""
            Extract GeM Bid Number, End Date (DD-MM-YYYY HH:MM:SS), and Item Category.
            Return ONLY clean JSON.
            Text: {text[:5000]}
            """

            response = model.generate_content(prompt)
            json_text = response.text.replace('```json', '').replace('```', '').strip()
            ai_data = json.loads(json_text)
            
            if not details["bid_number"]: details["bid_number"] = ai_data.get("bid_number")
            if not details["item_category"]: details["item_category"] = ai_data.get("item_category")
            if not details["bid_end_date"] and ai_data.get("bid_end_date"):
                try:
                    details["bid_end_date"] = datetime.strptime(ai_data["bid_end_date"], "%d-%m-%Y %H:%M:%S")
                except:
                    pass
        except Exception as e:
            print(f"DEBUG: AI fallback failed: {e}")

    if not details["bid_number"]:
        filename = os.path.basename(pdf_path)
        if filename.startswith("GEM"):
            details["bid_number"] = filename.split('.')[0]

    if details["item_category"] and not details["subject"]:
        words = details["item_category"].split()
        details["subject"] = " ".join(words[:10]) + ("..." if len(words) > 10 else "")

    return details

def extract_details_from_image(image_bytes: bytes, mime_type: str = "image/png"):
    """
    Extract bid details from a GeM portal screenshot using Gemini AI.
    """
    dynamic_api_key = os.getenv("GOOGLE_API_KEY")
    if not dynamic_api_key:
        print("DEBUG: CRITICAL - GOOGLE_API_KEY is missing from environment")
        raise Exception("Google API Key not configured on server. Please add it to Render Environment Variables.")

    try:
        # Prompt for GeM screenshot analysis
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
        
        ONLY return the JSON array. Do not include any markdown formatting like ```json.
        """

        # Try different model identifiers and API versions for maximum compatibility
        response = None
        # Use REST for more consistent behavior on Render
        genai.configure(api_key=dynamic_api_key, transport='rest')
        
        # We try explicit model names. The library handles v1/v1beta internally 
        # but defaulting to v1 for 1.5-flash is preferred.
        for name in ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'models/gemini-1.5-flash']:
            try:
                print(f"DEBUG: Backend attempting AI with model: {name}")
                model = genai.GenerativeModel(name)
                response = model.generate_content([
                    prompt,
                    {"mime_type": mime_type, "data": image_bytes}
                ])
                if response and response.text:
                    break
            except Exception as e:
                print(f"DEBUG: Backend model {name} failed: {str(e)}")
                continue
        
        if not response:
            raise Exception("No Gemini model variants worked on the server. Please use the Browser-Based fallback.")

        # Clean and parse JSON
        json_text = response.text
        if "```" in json_text:
            json_text = json_text.split("```")[1]
            if json_text.startswith("json"):
                json_text = json_text[4:]
        
        json_text = json_text.strip()
        print(f"DEBUG: Backend AI raw response: {json_text[:200]}...")
        
        return json.loads(json_text)
    except Exception as e:
        print(f"DEBUG: Backend Image extraction failed: {str(e)}")
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg:
            error_msg = "Invalid Google API Key on server."
        elif "API key not found" in error_msg:
            error_msg = "Google API Key not found on server."
        
        raise Exception(f"AI Extraction failed: {error_msg}")

def generate_checklist(tender_id: int):
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
