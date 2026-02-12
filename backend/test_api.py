import requests
import os

BASE_URL = "http://127.0.0.1:8000"

# Path to the PDF
PDF_PATH = r"C:\Users\kasja\Desktop\gem bid\UPSAD\GeM-Bidding-8117850.pdf"

def test_upload():
    if not os.path.exists(PDF_PATH):
        print(f"File not found: {PDF_PATH}")
        return

    print("Uploading PDF...")
    with open(PDF_PATH, "rb") as f:
        files = {"file": f}
        response = requests.post(f"{BASE_URL}/upload/", files=files)
    
    if response.status_code == 200:
        data = response.json()
        print("Upload Successful!")
        print(f"Bid Number: {data.get('bid_number')}")
        print(f"End Date: {data.get('bid_end_date')}")
        print(f"Category: {data.get('item_category')}")
        print(f"Subject: {data.get('subject')}")
        print(f"Checklist Items Created: {len(data.get('items', []))}")
    else:
        print(f"Upload Failed: {response.text}")

def test_list():
    print("Listing Tenders...")
    response = requests.get(f"{BASE_URL}/tenders/")
    if response.status_code == 200:
        tenders = response.json()
        print(f"Found {len(tenders)} tenders.")
        for t in tenders:
            print(f"- {t['bid_number']} (Subject: {t.get('subject')}) (Nickname: {t.get('nickname')})")
            
            # Test update nickname
            update_res = requests.put(f"{BASE_URL}/tenders/{t['id']}", json={"nickname": "My Test Tender"})
            print(f"  -> Updated Nickname: {update_res.json().get('nickname')}")
        return tenders
    else:
        print(f"List Failed: {response.text}")
        return []

def test_backup():
    print("\nTesting Backup Download...")
    response = requests.get(f"{BASE_URL}/backup")
    if response.status_code == 200:
        print("Backup downloaded successfully.")
        with open("backup_test.db", "wb") as f:
            f.write(response.content)
        print("Saved to backup_test.db")
    else:
        print(f"Backup failed: {response.text}")

def test_download(tender_id):
    print(f"\nTesting PDF Download for Tender {tender_id}...")
    response = requests.get(f"{BASE_URL}/tenders/{tender_id}/download")
    if response.status_code == 200:
        print("PDF downloaded successfully.")
    elif response.status_code == 404:
        print("PDF not found (expected for old tenders or no file).")
    else:
        print(f"Download failed: {response.status_code}")

if __name__ == "__main__":
    # test_upload() # Skip upload as we have data now
    tenders = test_list()
    test_backup()
    if tenders and len(tenders) > 0:
        test_download(tenders[0]['id'])
