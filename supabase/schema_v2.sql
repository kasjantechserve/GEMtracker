-- ============================================
-- GEMtracker Supabase Database Schema (Clean Setup)
-- ============================================
-- IMPORTANT: This script will DROP existing tables 
-- and recreate them. Use this for a fresh setup.
-- ============================================

-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS auto_create_checklist ON tenders;
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tenders_updated_at ON tenders;
DROP TRIGGER IF EXISTS update_checklist_items_updated_at ON checklist_items;
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;

DROP FUNCTION IF EXISTS create_default_checklist() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop existing tables (in order of dependencies)
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS tenders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS templates CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. COMPANIES TABLE
-- ============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. USERS TABLE (extends Supabase Auth)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member', -- 'admin' or 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. TENDERS TABLE
-- ============================================
CREATE TABLE tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Extracted PDF Data
    bid_number VARCHAR(255) NOT NULL,
    bid_end_date TIMESTAMP WITH TIME ZONE,
    item_category TEXT,
    subject VARCHAR(500), -- 10-word summary
    
    -- Custom Fields
    nickname VARCHAR(255),
    file_path TEXT, -- Supabase Storage path
    status VARCHAR(50) DEFAULT 'active', -- 'active' or 'expired'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, bid_number)
);

CREATE INDEX idx_tenders_company_id ON tenders(company_id);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_bid_end_date ON tenders(bid_end_date);

-- ============================================
-- 4. CHECKLIST_ITEMS TABLE
-- ============================================
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    
    -- Checklist Data
    code VARCHAR(50) NOT NULL, -- e.g., "EMD", "GST", "PAN"
    name VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL,
    
    -- Status Fields
    is_ready BOOLEAN DEFAULT false,
    is_submitted BOOLEAN DEFAULT false,
    document_url TEXT, -- Uploaded document link
    
    notes TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checklist_tender_id ON checklist_items(tender_id);

-- ============================================
-- 5. TEMPLATES TABLE (Document Repository)
-- ============================================
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., "Financial", "Technical", "Legal"
    file_path TEXT NOT NULL, -- Supabase Storage path
    file_type VARCHAR(50), -- e.g., "docx", "pdf", "xlsx"
    
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    download_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RLS ENABLEMENT
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

CREATE POLICY "Users can view their own company" ON companies FOR SELECT USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Admins can update their company" ON companies FOR UPDATE USING (id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view company members" ON users FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can add users to their company" ON users FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view company tenders" ON tenders FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can create tenders" ON tenders FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can update company tenders" ON tenders FOR UPDATE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can delete company tenders" ON tenders FOR DELETE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view company checklist items" ON checklist_items FOR SELECT USING (tender_id IN (SELECT id FROM tenders WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())));
CREATE POLICY "Users can create checklist items" ON checklist_items FOR INSERT WITH CHECK (tender_id IN (SELECT id FROM tenders WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())));
CREATE POLICY "Users can update checklist items" ON checklist_items FOR UPDATE USING (tender_id IN (SELECT id FROM tenders WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())));

CREATE POLICY "Authenticated users can view public templates" ON templates FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');
CREATE POLICY "Admins can upload templates" ON templates FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins can update templates" ON templates FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON tenders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION create_default_checklist() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO checklist_items (tender_id, code, name, display_order) VALUES
        (NEW.id, 'EMD', 'Earnest Money Deposit (EMD)', 1),
        (NEW.id, 'GST', 'GST Registration Certificate', 2),
        (NEW.id, 'PAN', 'PAN Card', 3),
        (NEW.id, 'MFG_AUTH', 'Manufacturer Authorization Certificate', 4),
        (NEW.id, 'TECH_SPEC', 'Technical Specifications Compliance', 5),
        (NEW.id, 'SAMPLE', 'Sample (if applicable)', 6),
        (NEW.id, 'CATALOGUE', 'Product Catalogue/Brochure', 7),
        (NEW.id, 'WARRANTY', 'Warranty/AMC Details', 8),
        (NEW.id, 'CERT_INCORP', 'Certificate of Incorporation', 9),
        (NEW.id, 'MSME', 'MSME Certificate (if applicable)', 10),
        (NEW.id, 'ISO', 'ISO Certification (if required)', 11),
        (NEW.id, 'AUDIT_STMT', 'Audited Financial Statements', 12),
        (NEW.id, 'BANK_SOLVENCY', 'Bank Solvency Certificate', 13),
        (NEW.id, 'IT_RETURN', 'Income Tax Returns (last 3 years)', 14),
        (NEW.id, 'TURNOVER', 'Turnover Certificate', 15),
        (NEW.id, 'PERFORM_SEC', 'Performance Security (if applicable)', 16),
        (NEW.id, 'PAST_EXP', 'Past Experience/Order Copies', 17),
        (NEW.id, 'CLIENT_LIST', 'Client List with Contact Details', 18),
        (NEW.id, 'WORK_ORDER', 'Similar Work Order Copies', 19),
        (NEW.id, 'COMPLETION_CERT', 'Work Completion Certificates', 20),
        (NEW.id, 'TECH_STAFF', 'Technical Staff Details', 21),
        (NEW.id, 'INFRA', 'Infrastructure Details', 22),
        (NEW.id, 'QUALITY_CERT', 'Quality Certification Documents', 23),
        (NEW.id, 'COMPLIANCE', 'Statutory Compliance Certificates', 24),
        (NEW.id, 'UNDERTAKING', 'Undertaking on Letter Head', 25),
        (NEW.id, 'POWER_ATTY', 'Power of Attorney (if applicable)', 26),
        (NEW.id, 'PRICE_BID', 'Price Bid in Required Format', 27),
        (NEW.id, 'OTHER', 'Other Documents as per Tender', 28);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_checklist AFTER INSERT ON tenders FOR EACH ROW EXECUTE FUNCTION create_default_checklist();
