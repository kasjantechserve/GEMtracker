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
    elements.append(Paragraph("GEMtracker v2.0", title_style))
    elements.append(Paragraph("Professional Project Documentation", heading1_style))
    elements.append(Spacer(1, 20))
    
    # Executive Summary
    elements.append(Paragraph("Executive Summary", heading1_style))
    elements.append(Paragraph(
        "<b>GEMtracker</b> is a cloud-native, enterprise-ready web application designed to "
        "streamline and automate the management of government tender bids from GeM "
        "(Government e-Marketplace). It eliminates manual drudgery through a centralized, "
        "real-time dashboard and automated analytics.",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    # Core Features
    elements.append(Paragraph("Core Features", heading1_style))
    
    # Feature 1
    elements.append(Paragraph("1. Smart PDF Extraction & Analytics", heading2_style))
    elements.append(Paragraph(
        "The application uses advanced parsing to extract critical 'DNA' from GeM tender PDFs instantly:",
        body_style
    ))
    features_data = [
        ["Bid Identification", "Bid Number (e.g., GEM/2026/B/7132339)"],
        ["Deadline Management", "Automatic extraction of Bid End Date"],
        ["Metadata Tagging", "Item Category and Item Subject extraction"],
        ["A.I. Summarization", "10-word summary for quick scanning"]
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
    elements.append(Paragraph("2. Real-Time Multi-User Dashboard", heading2_style))
    elements.append(Paragraph(
        "A mission-control interface built for speed and collaboration:<br/>"
        "• <b>Live Sync</b>: Tenders and checklist updates appear instantly across screens<br/>"
        "• <b>Visual Countdown</b>: Real-time 'Time Remaining' badges (Green/Red)<br/>"
        "• <b>Responsive Sidebar</b>: Categorized view of active vs. expired tenders<br/>"
        "• <b>Company Isolation</b>: Secure barriers ensure data privacy and security<br/>"
        "• <b>Smart Sorting</b>: Active tenders prioritized by submission deadline",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    # Feature 3
    elements.append(Paragraph("3. 28-Point Compliance Command Center", heading2_style))
    elements.append(Paragraph(
        "Every tender automatically initializes a professional compliance checklist:<br/>"
        "• <b>Dual Tracking</b>: 'Ready' (prepared) and 'Submitted' (uploaded) statuses<br/>"
        "• <b>Standardized List</b>: Pre-configured for EMD, PAN, GST, Manufacturer Authorization, Audit Statements, and 23+ more<br/>"
        "• <b>Progress Tracking</b>: Visual representation of tender readiness and team effort.",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    # Feature 4
    elements.append(Paragraph("4. Advanced Data & Document Management", heading2_style))
    elements.append(Paragraph(
        "• <b>Secure Auth</b>: High-level security via Supabase (JWT Tokens)<br/>"
        "• <b>Centralized Templates</b>: 1-click downloads for standardized formats<br/>"
        "• <b>Original PDF Retrieval</b>: Access documents anytime, anywhere<br/>"
        "• <b>Nickname System</b>: Custom labels for quick project identification",
        body_style
    ))
    
    elements.append(PageBreak())
    
    # Technical Architecture
    elements.append(Paragraph("Technical Architecture", heading1_style))
    
    elements.append(Paragraph("Frontend (User Interface)", heading2_style))
    elements.append(Paragraph(
        "• <b>Framework</b>: Next.js 16 (Vercel-optimized)<br/>"
        "• <b>Platform</b>: Hosted on <b>Vercel</b> for 99.9% uptime<br/>"
        "• <b>Styling</b>: Vanilla CSS & Tailwind (Custom High-Contrast Theme)<br/>"
        "• <b>Real-time</b>: Postgres CDC integration for instant UI updates",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Backend (Process Engine)", heading2_style))
    elements.append(Paragraph(
        "• <b>Framework</b>: FastAPI (Python 3.12)<br/>"
        "• <b>Engine</b>: Render Web Service hosting<br/>"
        "• <b>PDF Processing</b>: Proprietary logic built on pdfplumber<br/>"
        "• <b>Persistence</b>: Supabase Storage Buckets for document safety",
        body_style
    ))
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Database (Core Brain)", heading2_style))
    elements.append(Paragraph(
        "• <b>Platform</b>: Supabase (PostgreSQL Agent)<br/>"
        "• <b>Security</b>: Row Level Security (RLS) for enterprise-grade privacy<br/>"
        "• <b>Auth</b>: Built-in secure user registration and session management<br/>"
        "• <b>Scalability</b>: Global Postgres infrastructure",
        body_style
    ))
    
    elements.append(PageBreak())
    
    # Key Advantages
    elements.append(Paragraph("Key Advantages", heading1_style))
    advantages_data = [
        ["✓ Zero Manual Entry", "No more typing from PDF to Excel"],
        ["✓ Global Team Sync", "Centralized real-time coordination"],
        ["✓ Deadline Security", "Color-coded alerts prevent missed bids"],
        ["✓ Compliance First", "28 points of verification in every workflow"],
        ["✓ 100% Cloud-Native", "Access from any device, anywhere"],
        ["✓ Secure Auth", "JWT-protected data and company barriers"]
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
    
    # Technology Stack
    elements.append(Paragraph("Technology Stack", heading1_style))
    tech_data = [
        ["Frontend", "Next.js 16.x, React, TypeScript, Tailwind CSS, Vercel"],
        ["Backend", "Python 3.12, FastAPI, Supabase-Py, pdfplumber, Render"],
        ["Database", "PostgreSQL (Cloud), Supabase Auth, Supabase Realtime"]
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
    
    # Market Impact
    elements.append(Paragraph("Market Position", heading1_style))
    elements.append(Paragraph(
        "<b>Why GEMtracker v2.0 Wins:</b><br/>"
        "• <b>Automated Discovery</b>: Finds details in seconds, not minutes.<br/>"
        "• <b>Team Transparency</b>: Zero ambiguity on document status.<br/>"
        "• <b>Frictionless Scale</b>: Works for 1 user or a team of 100.<br/>"
        "• <b>Zero Cost Overhead</b>: Deployed on enterprise-grade free/low-cost tiers.<br/>"
        "• <b>Customization</b>: Built for the specific nuances of Indian GeM bids.",
        body_style
    ))
    
    elements.append(PageBreak())
    
    # Conclusion
    elements.append(Paragraph("Conclusion", heading1_style))
    elements.append(Paragraph(
        "GEMtracker v2.0 is a professional-grade solution that transforms GeM tender "
        "management from a chaotic manual process into a streamlined, automated, and "
        "collaborative workflow. By leveraging modern cloud technology and real-time "
        "data synchronization, it empowers businesses to focus on winning bids rather "
        "than managing paperwork. It represents a state-of-the-art implementation "
        "of the FastAPI, Next.js, and Supabase stack.<br/><br/>"
        "The system is now fully live, secure, and ready for high-volume tender tracking.",
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
        "<b>Cloud URLs:</b> ge-mtracker.vercel.app | gemtracker.onrender.com<br/>"
        "<b>Tech:</b> Python, FastAPI, Next.js, Supabase, PostgreSQL<br/>"
        "<b>Status:</b> Production Live ✅",
        footer_style
    ))
    
    # Build PDF
    doc.build(elements)
    print(f"✅ PDF created successfully: {pdf_file}")
    print(f"📄 Location: {os.path.abspath(pdf_file)}")

if __name__ == "__main__":
    create_pdf()
