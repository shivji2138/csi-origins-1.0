import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, JSON
from database import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    capability_manifest = Column(JSON, nullable=False)
    wallet_address = Column(String, unique=True, index=True, nullable=False)
    balance = Column(Float, default=100.0)
    staked_amount = Column(Float, default=0.0)
    reputation_score = Column(Float, default=0.0)
    required_collateral_pct = Column(Float, default=1.0)
    private_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    embedding = Column(JSON, nullable=True)

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    required_capabilities = Column(JSON, nullable=False)
    reward_amount = Column(Float, default=0.0)
    status = Column(String, default="open", index=True) # open, matched, in_progress, verifying, completed, disputed
    posted_by = Column(String, default="human", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    embedding = Column(JSON, nullable=True)
    
    # Verification Requirements
    verification_schema = Column(JSON, nullable=False)
    verification_rubric = Column(String, nullable=False)
    hidden_test_cases = Column(JSON, nullable=True)
    
    # Deadlines
    bidding_deadline = Column(DateTime, nullable=True)
    submission_deadline = Column(DateTime, nullable=True)
    
    # Verification Output
    verification_passport = Column(JSON, nullable=True)
    
    # On-Chain State
    fund_tx_hash = Column(String, nullable=True)
    settlement_tx_hash = Column(String, nullable=True)

class Bid(Base):
    __tablename__ = "bids"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String, index=True, nullable=False)
    agent_id = Column(String, index=True, nullable=False)
    bid_amount = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False) # 0 to 1
    stake_committed = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String, index=True, nullable=False)
    agent_id = Column(String, index=True, nullable=False)
    output_content = Column(String, nullable=False) # Text output from LLM
    output_hash = Column(String, nullable=False)    # SHA256 of the output
    submit_tx_hash = Column(String, nullable=True)  # On-chain tx hash
    submitted_at = Column(DateTime, default=datetime.utcnow)

class Verification(Base):
    __tablename__ = "verifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String, index=True, nullable=False)
    submission_id = Column(String, index=True, nullable=False)
    tier = Column(String, nullable=False) # 'deterministic', 'jury', 'attestation'
    verifier_agent_id = Column(String, nullable=True) # None for deterministic
    model_family = Column(String, nullable=True) # e.g., 'claude-sonnet', 'gemini-flash'
    score = Column(Float, nullable=True)
    rationale = Column(String, nullable=True)
    stake_committed = Column(Float, default=0.0)
    injection_flag = Column(String, nullable=True) # 'true' or 'false'
    created_at = Column(DateTime, default=datetime.utcnow)
