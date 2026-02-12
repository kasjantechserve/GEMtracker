"""
GEMtracker Documentation PDF Generator
Converts PROJECT_DOCUMENTATION.md to a professional PDF
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
import os

def create_pdf():
    # Create PDF
    pdf_file = "GEMtracker_Documentation.pdf"
    doc = SimpleDocTemplate(pdf_file, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading1_style = ParagraphStyle(
        'CustomHeading1',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#3b82f6'),
        spaceAfter=10,
        spaceBefore=10,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        alignment=TA_JUSTIFY,
        spaceAfter=12
    )
    
    # Title
    elements.append(Paragraph("GEMtracker", title_style))
    elements.append(Paragraph("Project Documentation", heading1_style))
    elements.append(Spacer(1, 20))
    
    # Executive Summary
    elements.append(Paragraph("Executive Summary", heading1_style))
    elements.append(Paragraph(
        "<b>GEMtracker</b> is a complete web application for managing government tender bids from GeM "
        "(Government e-Marketplace). It automates the tedious process of tracking bid deadlines and "
        "compliance requirements.",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    # Core Features
    elements.append(Paragraph("Core Features", heading1_style))
    
    # Feature 1
    elements.append(Paragraph("1. Smart PDF Processing", heading2_style))
    elements.append(Paragraph(
        "The application automatically extracts critical information from GeM tender PDFs:",
        body_style
    ))
    features_data = [
        ["Bid Number", "e.g., GEM/2026/B/7132339"],
        ["Bid End Date", "Deadline extraction"],
        ["Item Category", "Tender description"],
        ["Short Subject", "10-word summary"]
    ]
    feature_table = Table(features_data, colWidths=[2*inch, 3.5*inch])
    feature_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#3b82f6'))
    ]))
    elements.append(feature_table)
    elements.append(Spacer(1, 12))
    
    # Feature 2
    elements.append(Paragraph("2. Dashboard & Organization", heading2_style))
    elements.append(Paragraph(
        "Professional dashboard featuring:<br/>"
        "• <b>Tender List</b>: Left sidebar with all tenders<br/>"
        "• <b>Custom Nicknames</b>: Rename tenders for easier identification<br/>"
        "• <b>Time Remaining</b>: Visual countdown (e.g., '5d 3h left')<br/>"
        "• <b>Status Indicators</b>: Green for active, red for expired<br/>"
        "• <b>Smart Sorting</b>: Active tenders first (by deadline), expired last",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    # Feature 3
    elements.append(Paragraph("3. 28-Point Compliance Checklist", heading2_style))
    elements.append(Paragraph(
        "Every tender includes a comprehensive checklist with dual status tracking:<br/>"
        "• <b>Ready?</b> - Document is prepared<br/>"
        "• <b>Submitted?</b> - Document uploaded to GeM<br/><br/>"
        "Standard checklist includes: EMD, Manufacturer Authorization, GST Certificate, "
        "PAN Card, Technical Specifications, Financial Documents, and 22+ additional items.",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    # Feature 4
    elements.append(Paragraph("4. Data Management", heading2_style))
    elements.append(Paragraph(
        "• <b>Backup Download</b>: Export entire database<br/>"
        "• <b>PDF Download</b>: Retrieve original tender documents<br/>"
        "• <b>Nickname System</b>: Custom friendly names for tenders",
        body_style
    ))
    
    elements.append(PageBreak())
    
    # Technical Architecture
    elements.append(Paragraph("Technical Architecture", heading1_style))
    
    elements.append(Paragraph("Frontend (User Interface)", heading2_style))
    elements.append(Paragraph(
        "• <b>Framework</b>: Next.js (React-based)<br/>"
        "• <b>Styling</b>: Tailwind CSS for responsive design<br/>"
        "• <b>Build</b>: Compiled to static files (HTML/CSS/JS)<br/>"
        "• <b>Features</b>: Modern, fast, mobile-responsive",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Backend (Server)", heading2_style))
    elements.append(Paragraph(
        "• <b>Framework</b>: FastAPI (Python)<br/>"
        "• <b>Database</b>: SQLite for portable data storage<br/>"
        "• <b>PDF Processing</b>: pdfplumber library<br/>"
        "• <b>API</b>: RESTful endpoints for all operations",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Deployment: Single-Service Architecture", heading2_style))
    elements.append(Paragraph(
        "• Frontend compiled into backend<br/>"
        "• Single server deployment<br/>"
        "• No CORS complexity<br/>"
        "• One URL for everything<br/>"
        "• Simplified deployment process",
        body_style
    ))
    
    elements.append(PageBreak())
    
    # Key Advantages
    elements.append(Paragraph("Key Advantages", heading1_style))
    advantages_data = [
        ["✓ Time-Saving", "Eliminates manual data entry"],
        ["✓ Deadline Management", "Never miss a bid deadline"],
        ["✓ Compliance Tracking", "Structured checklist system"],
        ["✓ Portable", "SQLite allows easy backup"],
        ["✓ Simple Deployment", "One command local, one service cloud"],
        ["✓ Cost-Effective", "Free and open-source"]
    ]
    advantages_table = Table(advantages_data, colWidths=[2*inch, 3.5*inch])
    advantages_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#22c55e'))
    ]))
    elements.append(advantages_table)
    elements.append(Spacer(1, 12))
    
    # Deployment Options
    elements.append(Paragraph("Deployment Options", heading1_style))
    
    elements.append(Paragraph("Local Deployment", heading2_style))
    elements.append(Paragraph(
        "<font face='Courier'>cd GEMtracker/backend<br/>python run_backend.py</font><br/><br/>"
        "Access at: <b>http://localhost:8000</b>",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Cloud Deployment (Render)", heading2_style))
    elements.append(Paragraph(
        "1. Push code to GitHub<br/>"
        "2. Create Web Service on Render<br/>"
        "3. Point to 'backend' directory<br/>"
        "4. Automatic deployment",
        body_style
    ))
    
    elements.append(PageBreak())
    
    # Technology Stack
    elements.append(Paragraph("Technology Stack", heading1_style))
    tech_data = [
        ["Frontend", "Next.js 16.x, React, TypeScript, Tailwind CSS, Axios"],
        ["Backend", "Python 3.9+, FastAPI, SQLAlchemy, pdfplumber, Uvicorn"],
        ["Database", "SQLite (development), PostgreSQL (production)"]
    ]
    tech_table = Table(tech_data, colWidths=[1.5*inch, 4*inch])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#f59e0b'))
    ]))
    elements.append(tech_table)
    elements.append(Spacer(1, 20))
    
    # Market Position
    elements.append(Paragraph("Market Position", heading1_style))
    elements.append(Paragraph(
        "<b>Traditional Solutions:</b><br/>"
        "• Spreadsheets: Manual, error-prone, no automation<br/>"
        "• Enterprise Software: Expensive, complex, overkill<br/><br/>"
        "<b>GEMtracker Advantage:</b><br/>"
        "• Automated extraction<br/>"
        "• Professional interface<br/>"
        "• Simple enough for individuals<br/>"
        "• Scalable for businesses<br/>"
        "• Free and customizable",
        body_style
    ))
    elements.append(Spacer(1, 20))
    
    # Use Cases
    elements.append(Paragraph("Use Cases", heading1_style))
    elements.append(Paragraph(
        "1. <b>Individual Vendors</b>: Track personal tender bids<br/>"
        "2. <b>Small Businesses</b>: Manage multiple concurrent bids<br/>"
        "3. <b>Procurement Teams</b>: Coordinate compliance documentation<br/>"
        "4. <b>Consultants</b>: Offer as a managed service",
        body_style
    ))
    
    elements.append(PageBreak())
    
    # Conclusion
    elements.append(Paragraph("Conclusion", heading1_style))
    elements.append(Paragraph(
        "GEMtracker represents a modern, efficient solution for government tender bid management. "
        "By combining automated PDF extraction, intelligent organization, and comprehensive compliance "
        "tracking, it significantly reduces manual effort while improving deadline adherence and "
        "documentation completeness.<br/><br/>"
        "The single-service architecture ensures easy deployment and maintenance, making it accessible "
        "for users ranging from individual vendors to procurement teams.",
        body_style
    ))
    elements.append(Spacer(1, 20))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(
        "<b>Built with:</b> Python, FastAPI, Next.js, React, SQLite<br/>"
        "<b>License:</b> Open Source<br/>"
        "<b>Deployment:</b> Local or Cloud (Render, Railway, etc.)",
        footer_style
    ))
    
    # Build PDF
    doc.build(elements)
    print(f"✅ PDF created successfully: {pdf_file}")
    print(f"📄 Location: {os.path.abspath(pdf_file)}")

if __name__ == "__main__":
    create_pdf()
