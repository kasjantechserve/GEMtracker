from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Tender(Base):
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    bid_number = Column(String, unique=True, index=True)
    bid_end_date = Column(DateTime)
    item_category = Column(String)
    subject = Column(String) # Short description
    nickname = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("ChecklistItem", back_populates="tender")

class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"))
    name = Column(String)
    code = Column(String) # e.g. F-1
    is_ready = Column(Boolean, default=False)
    is_submitted = Column(Boolean, default=False)

    tender = relationship("Tender", back_populates="items")
