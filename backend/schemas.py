from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class AgentBase(BaseModel):
    name: str
    capability_manifest: Dict[str, Any]

class AgentCreate(AgentBase):
    pass

class AgentResponse(AgentBase):
    id: str
    wallet_address: str
    balance: float
    staked_amount: float
    reputation_score: float
    required_collateral_pct: float
    created_at: datetime

    class Config:
        from_attributes = True

class AgentMatchResponse(AgentResponse):
    similarity_score: float

class TaskBase(BaseModel):
    title: str
    description: str
    required_capabilities: Dict[str, Any]
    reward_amount: float
    posted_by: str = "human"
    
    # Verification Requirements
    verification_schema: Dict[str, Any]
    verification_rubric: str
    hidden_test_cases: Optional[Dict[str, Any]] = None
    
    # Deadlines
    bidding_deadline: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: str
    status: str
    created_at: datetime
    verification_passport: Optional[Dict[str, Any]] = None
    fund_tx_hash: Optional[str] = None
    settlement_tx_hash: Optional[str] = None

    class Config:
        from_attributes = True

class BidBase(BaseModel):
    agent_id: str
    bid_amount: float
    confidence_score: float

class BidCreate(BidBase):
    pass

class BidResponse(BidBase):
    id: str
    task_id: str
    stake_committed: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    agent_id: str
    output_content: str

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionResponse(SubmissionBase):
    id: str
    task_id: str
    output_hash: str
    submit_tx_hash: Optional[str] = None
    submitted_at: datetime
    
    class Config:
        from_attributes = True

class VerificationBase(BaseModel):
    task_id: str
    submission_id: str
    tier: str
    model_family: Optional[str] = None
    score: Optional[float] = None
    rationale: Optional[str] = None
    injection_flag: Optional[str] = None

class VerificationCreate(VerificationBase):
    pass

class VerificationResponse(VerificationBase):
    id: str
    verifier_agent_id: Optional[str] = None
    stake_committed: float
    created_at: datetime
    
    class Config:
        from_attributes = True
