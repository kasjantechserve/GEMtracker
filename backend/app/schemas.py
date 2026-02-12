from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class ChecklistItemBase(BaseModel):
    name: str
    code: str
    is_ready: bool = False
    is_submitted: bool = False

class ChecklistItemUpdate(BaseModel):
    is_ready: Optional[bool] = None
    is_submitted: Optional[bool] = None

class ChecklistItem(ChecklistItemBase):
    id: int
    tender_id: int

    model_config = ConfigDict(from_attributes=True)

class TenderBase(BaseModel):
    bid_number: str
    bid_end_date: Optional[datetime] = None
    item_category: Optional[str] = None
    subject: Optional[str] = None
    nickname: Optional[str] = None
    file_path: Optional[str] = None

class TenderUpdate(BaseModel):
    nickname: Optional[str] = None

class TenderCreate(TenderBase):
    pass

class Tender(TenderBase):
    id: int
    created_at: datetime
    items: List[ChecklistItem] = []

    model_config = ConfigDict(from_attributes=True)
