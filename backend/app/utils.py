import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Configure Google AI
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def extract_pdf_details(pdf_path: str):
    """
    Extract bid details from PDF using Google Gemini AI with regex fallback
    """
    details = {
        "bid_number": None,
        "bid_end_date": None,
        "item_category": None,
        "subject": None
    }

    # Try AI Extraction first if API key is available
    if api_key:
        try:
            print("DEBUG: Attempting AI extraction with Gemini...")
            model = genai.GenerativeModel('gemini-2.0-flash') # or 'gemini-pro-vision' for multi-modal
            
            # Read PDF text using pdfplumber for AI context
            text_context = ""
            with pdfplumber.open(pdf_path) as pdf:
                for i in range(min(5, len(pdf.pages))): # Scan first 5 pages
                    page_text = pdf.pages[i].extract_text()
                    if page_text:
                        text_context += page_text + "\n"

            prompt = f"""
            You are an expert at parsing GeM (Government e-Marketplace) tender documents.
            Extract the following details from the provided text context of a tender PDF:
            - Bid Number (Format: GEM/YYYY/X/#######)
            - Bid End Date/Time (Format: DD-MM-YYYY HH:MM:SS)
            - Item Category (Full name)
            - Subject (A concise summary of the tender in exactly 10 words)

            Return the data in STRICT JSON format like this:
            {{
                "bid_number": "...",
                "bid_end_date": "...",
                "item_category": "...",
                "subject": "..."
            }}

            Tender Text Context:
            {text_context[:10000]} 
            """

            response = model.generate_content(prompt)
            ai_data = json.loads(response.text.replace('```json', '').replace('```', '').strip())
            
            details["bid_number"] = ai_data.get("bid_number")
            details["item_category"] = ai_data.get("item_category")
            details["subject"] = ai_data.get("subject")
            
            if ai_data.get("bid_end_date"):
                try:
                    details["bid_end_date"] = datetime.strptime(ai_data["bid_end_date"], "%d-%m-%Y %H:%M:%S")
                except:
                    pass
            
            if details["bid_number"]:
                print(f"DEBUG: AI extracted details successfully: {details['bid_number']}")
                return details
        except Exception as e:
            print(f"DEBUG: AI extraction failed, falling back to regex: {e}")

    # Fallback to Regex and pdfplumber
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for i in range(min(2, len(pdf.pages))):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    text += page_text + "\n"
            
            if not text:
                return details

            # 1. Extract Bid Number
            bid_no_match = re.search(r"Bid Number(?:\s*/\s*िबड संख्या)?\s*[:\.]?\s*(GEM/[^\s\n\r]+)", text, re.IGNORECASE)
            if not bid_no_match:
                bid_no_match = re.search(r"(GEM/\d{4}/[A-Z]/\d+)", text)
            if bid_no_match:
                details["bid_number"] = bid_no_match.group(1).strip()

            # 2. Extract End Date
            end_date_match = re.search(r"Bid End Date/Time(?:\s*/\s*िबड समाप्ति तिथि/समय)?\s*(\d{2}-\d{2}-\d{4}\s*\d{2}:\d{2}:\d{2})", text, re.IGNORECASE)
            if end_date_match:
                try:
                    details["bid_end_date"] = datetime.strptime(end_date_match.group(1), "%d-%m-%Y %H:%M:%S")
                except:
                    pass

            # 3. Extract Item Category
            item_cat_match = re.search(r"Item Category(?:\s*/\s*मद श्रेणी)?\s*(.*)", text, re.IGNORECASE)
            if item_cat_match:
                full_category = item_cat_match.group(1).strip()
                details["item_category"] = full_category
                words = full_category.split()
                details["subject"] = " ".join(words[:10]) + ("..." if len(words) > 10 else "")
            
            if not details["bid_number"]:
                filename = os.path.basename(pdf_path)
                if filename.startswith("GEM"):
                    details["bid_number"] = filename.split('.')[0]

    except Exception as e:
        print(f"DEBUG: Error in fallback extraction: {e}")

    return details

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

