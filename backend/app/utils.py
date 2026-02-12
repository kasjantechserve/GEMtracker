import pdfplumber
import re
from datetime import datetime

def extract_pdf_details(pdf_path: str):
    details = {
        "bid_number": None,
        "bid_end_date": None,
        "item_category": None
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Extract text from the first two pages to be safe
            text = ""
            for i in range(min(2, len(pdf.pages))):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    text += page_text + "\n"
            
            if not text:
                print("DEBUG: No text extracted from PDF")
                return details

            # 1. Extract Bid Number
            # Patterns: 
            # - Bid Number: GEM/2025/B/6477908
            # - Bid No.: GEM/2025/B/6477908
            # - Bid Number / िबड संख्या : GEM/2025/B/6477908
            bid_no_match = re.search(r"Bid Number(?:\s*/\s*िबड संख्या)?\s*[:\.]?\s*(GEM/[^\s\n\r]+)", text, re.IGNORECASE)
            if not bid_no_match:
                # Fallback for GEM format
                bid_no_match = re.search(r"(GEM/\d{4}/[A-Z]/\d+)", text)
            
            if bid_no_match:
                details["bid_number"] = bid_no_match.group(1).strip()

            # 2. Extract End Date
            # Pattern: Bid End Date/Time 31-07-2025 17:00:00
            end_date_match = re.search(r"Bid End Date/Time(?:\s*/\s*िबड समाप्ति तिथि/समय)?\s*(\d{2}-\d{2}-\d{4}\s*\d{2}:\d{2}:\d{2})", text, re.IGNORECASE)
            if end_date_match:
                date_str = end_date_match.group(1)
                try:
                    details["bid_end_date"] = datetime.strptime(date_str, "%d-%m-%Y %H:%M:%S")
                except ValueError:
                    print(f"DEBUG: Failed to parse date: {date_str}")

            # 3. Extract Item Category
            item_cat_match = re.search(r"Item Category(?:\s*/\s*मद श्रेणी)?\s*(.*)", text, re.IGNORECASE)
            if item_cat_match:
                full_category = item_cat_match.group(1).strip()
                details["item_category"] = full_category
                # Generate short subject
                words = full_category.split()
                details["subject"] = " ".join(words[:10]) + ("..." if len(words) > 10 else "")
            
            # Use filename as fallback for bid number if all else fails (as last resort)
            if not details["bid_number"]:
                filename = os.path.basename(pdf_path)
                if filename.startswith("GEM"):
                    details["bid_number"] = filename.split('.')[0]

    except Exception as e:
        print(f"DEBUG: Error in extract_pdf_details: {e}")

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

