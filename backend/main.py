from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import hashlib
import uuid
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from eth_account import Account
import secrets
from datetime import datetime
import reputation

from database import engine, Base, SessionLocal
import models
import schemas
import blockchain

from dotenv import load_dotenv
import os
import sys

# Load env variables
base_backend_dir = os.path.dirname(os.path.abspath(__file__))
root_project_dir = os.path.dirname(base_backend_dir)
load_dotenv(os.path.join(root_project_dir, "agents", ".env"))
load_dotenv(os.path.join(base_backend_dir, ".env"))
load_dotenv(os.path.join(root_project_dir, ".env"))

def _run_worker_thread(task_id: str, agent_id: str, persona_path: str):
    try:
        agents_dir = os.path.join(root_project_dir, "agents")
        if agents_dir not in sys.path:
            sys.path.insert(0, agents_dir)
        from agora_agents.runner import AgentRunner
        runner = AgentRunner(agent_id=agent_id, persona_path=persona_path)
        runner.run(task_id)
    except Exception as e:
        print(f"[!] Worker background thread error for task {task_id}: {e}")

def launch_worker_agent(task_id: str, agent_id: str, agent_name: str):
    """Autonomously launches the worker agent in the background."""
    import threading
    persona_path = os.path.abspath(os.path.join(root_project_dir, "agents", "agora_agents", "personas", f"{agent_name}.json"))
    
    if not os.path.exists(persona_path):
        persona_path = os.path.abspath(os.path.join(root_project_dir, "agents", "agora_agents", "personas", "CodeReviewAgent.json"))
        
    print(f"[*] Autonomously launching worker agent '{agent_name}' ({agent_id}) for Task {task_id}...")
    t = threading.Thread(target=_run_worker_thread, args=(task_id, agent_id, persona_path), daemon=True)
    t.start()

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

# Load embedding model
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text: str) -> list[float]:
    # Returns the embedding as a list of floats
    return embedding_model.encode(text).tolist()

def seed_default_agents_if_empty():
    """Seeds the agent personas from JSON files if database is empty."""
    db = SessionLocal()
    try:
        count = db.query(models.Agent).count()
        if count == 0:
            print("[*] Seeding default agent personas...")
            personas_dir = os.path.abspath(os.path.join(root_project_dir, "agents", "agora_agents", "personas"))
            import glob
            persona_files = glob.glob(os.path.join(personas_dir, "*.json"))
            for pf in persona_files:
                with open(pf, "r", encoding="utf-8") as f:
                    persona = json.load(f)
                
                priv = secrets.token_hex(32)
                private_key = "0x" + priv
                account = Account.from_key(private_key)
                
                cap_str = json.dumps(persona.get("capability_manifest", {}))
                embedding = get_embedding(cap_str)
                
                agent = models.Agent(
                    id=str(uuid.uuid4()),
                    name=persona.get("name", "WorkerAgent"),
                    capability_manifest=persona.get("capability_manifest", {}),
                    wallet_address=account.address,
                    private_key=private_key,
                    balance=100.0,
                    staked_amount=0.0,
                    required_collateral_pct=1.0,
                    embedding=embedding
                )
                db.add(agent)
            db.commit()
            print(f"[+] Successfully seeded {len(persona_files)} agent personas.")
    except Exception as e:
        print(f"[!] Error seeding agents: {e}")
    finally:
        db.close()

seed_default_agents_if_empty()

app = FastAPI(title="AGORA API")

# Allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/agents", response_model=schemas.AgentResponse)
def create_agent(agent: schemas.AgentCreate, db: Session = Depends(get_db)):
    agent_id = str(uuid.uuid4())
    
    # Generate real Ethereum wallet
    priv = secrets.token_hex(32)
    private_key = "0x" + priv
    account = Account.from_key(private_key)
    wallet_address = account.address
    
    # Compute embedding for agent capabilities
    cap_str = json.dumps(agent.capability_manifest)
    embedding = get_embedding(cap_str)
    
    new_agent = models.Agent(
        id=agent_id,
        name=agent.name,
        capability_manifest=agent.capability_manifest,
        wallet_address=wallet_address,
        private_key=private_key,
        balance=100.0,
        staked_amount=0.0,
        required_collateral_pct=1.0,
        embedding=embedding
    )
    
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent

@app.get("/agents", response_model=List[schemas.AgentResponse])
def get_agents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    agents = db.query(models.Agent).offset(skip).limit(limit).all()
    return agents

@app.get("/agents/{agent_id}/reputation-history", response_model=List[schemas.ReputationEventResponse])
def get_reputation_history(agent_id: str, db: Session = Depends(get_db)):
    events = db.query(models.ReputationEvent).filter(
        models.ReputationEvent.agent_id == agent_id
    ).order_by(models.ReputationEvent.created_at.asc()).all()
    return events

@app.post("/agents/simulate-epoch")
def simulate_epoch(db: Session = Depends(get_db)):
    """
    Applies the temporal decay factor (lambda = 0.95) to all agents to simulate time passing.
    """
    agents = db.query(models.Agent).all()
    for agent in agents:
        agent.reputation_score = reputation.LAMBDA_DECAY * agent.reputation_score
        
        # Tie required_collateral_pct to reputation_score here
        pct = 1.0 - (agent.reputation_score * 0.09)
        agent.required_collateral_pct = max(0.1, min(1.0, pct))
        
    db.commit()
    return {"status": "success", "message": "Epoch simulated, reputation decayed"}

@app.get("/agents/{agent_id}", response_model=schemas.AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@app.post("/tasks", response_model=schemas.TaskResponse)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    task_id = str(uuid.uuid4())
    
    # Compute embedding for task description and capabilities
    task_text = f"{task.title} {task.description} {json.dumps(task.required_capabilities)}"
    embedding = get_embedding(task_text)
    
    # Blockchain Integration
    deadline_ts = int(task.submission_deadline.timestamp()) if task.submission_deadline else int(datetime.utcnow().timestamp()) + 86400
    fund_tx = blockchain.create_and_fund(task_id, deadline_ts, task.reward_amount)
    
    new_task = models.Task(
        id=task_id,
        title=task.title,
        description=task.description,
        required_capabilities=task.required_capabilities,
        reward_amount=task.reward_amount,
        posted_by=task.posted_by,
        embedding=embedding,
        verification_schema=task.verification_schema,
        verification_rubric=task.verification_rubric,
        hidden_test_cases=task.hidden_test_cases,
        bidding_deadline=task.bidding_deadline,
        submission_deadline=task.submission_deadline,
        fund_tx_hash=fund_tx
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Auto-Bidding Logic
    # Automatically generate bids from the top 3 matching agents to simulate a live marketplace
    try:
        import random
        matches = get_task_matches(task_id, db)
        for match in matches[:3]:
            # Generate a competitive bid slightly below the reward amount
            bid_amt = round(random.uniform(task.reward_amount * 0.5, task.reward_amount * 0.9), 2)
            conf = min(0.99, round(match.get("similarity_score", 0.8) + random.uniform(0, 0.1), 2))
            
            auto_bid = schemas.BidCreate(
                agent_id=match["id"],
                bid_amount=bid_amt,
                confidence_score=conf
            )
            place_bid(task_id, auto_bid, db)
            
        # Automatically close bidding and match the task (Client Agent Automation & triggers worker launch)
        match_res = close_bidding(task_id, db)
        
        # Refresh the task to return the updated status
        db.refresh(new_task)
                
    except Exception as e:
        print(f"Auto-bidding failed: {e}")
        
    return new_task

@app.get("/tasks", response_model=List[schemas.TaskResponse])
def get_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tasks = db.query(models.Task).offset(skip).limit(limit).all()
    return tasks

@app.get("/tasks/{task_id}", response_model=schemas.TaskResponse)
def get_task_by_id(task_id: str, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.get("/tasks/{task_id}/matches", response_model=List[schemas.AgentMatchResponse])
def get_task_matches(task_id: str, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not task.embedding:
        raise HTTPException(status_code=400, detail="Task has no embedding")
        
    agents = db.query(models.Agent).all()
    
    matches = []
    task_emb = np.array(task.embedding)
    task_norm = np.linalg.norm(task_emb)
    if task_norm == 0:
        task_norm = 1.0
        
    for agent in agents:
        if not agent.embedding:
            continue
        agent_emb = np.array(agent.embedding)
        agent_norm = np.linalg.norm(agent_emb)
        if agent_norm == 0:
            agent_norm = 1.0
            
        similarity = np.dot(task_emb, agent_emb) / (task_norm * agent_norm)
        
        # Convert model to dict to include similarity_score
        agent_dict = agent.__dict__.copy()
        agent_dict["similarity_score"] = float(similarity)
        matches.append(agent_dict)
        
    # Sort matches by similarity score descending
    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    
    # Return top 10
    return matches[:10]

@app.post("/tasks/{task_id}/bids", response_model=schemas.BidResponse)
def place_bid(task_id: str, bid: schemas.BidCreate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.status != "open":
        raise HTTPException(status_code=400, detail="Task is not open for bidding")
        
    agent = db.query(models.Agent).filter(models.Agent.id == bid.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    required_stake = 0.05 * bid.bid_amount
    available_balance = agent.balance - agent.staked_amount
    
    if available_balance < required_stake:
        raise HTTPException(status_code=400, detail=f"Insufficient available balance to cover stake of {required_stake}")
        
    # Commit stake
    agent.staked_amount += required_stake
    
    new_bid = models.Bid(
        id=str(uuid.uuid4()),
        task_id=task_id,
        agent_id=agent.id,
        bid_amount=bid.bid_amount,
        confidence_score=bid.confidence_score,
        stake_committed=required_stake
    )
    
    db.add(new_bid)
    db.commit()
    db.refresh(new_bid)
    db.refresh(agent)
    return new_bid

@app.get("/tasks/{task_id}/bids")
def get_task_bids(task_id: str, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    bids = db.query(models.Bid).filter(models.Bid.task_id == task_id).all()
    result = []
    for bid in bids:
        agent = db.query(models.Agent).filter(models.Agent.id == bid.agent_id).first()
        bid_dict = bid.__dict__.copy()
        bid_dict["agent_name"] = agent.name if agent else "Unknown"
        result.append(bid_dict)
        
    return result

@app.post("/tasks/{task_id}/close-bidding")
def close_bidding(task_id: str, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.status != "open":
        raise HTTPException(status_code=400, detail="Task is already closed")
        
    bids = db.query(models.Bid).filter(models.Bid.task_id == task_id).all()
    if not bids:
        return {"status": "no_bids", "task": task}
        
    best_score = -1.0
    winner_bid = None
    
    # Evaluate bids
    for bid in bids:
        agent = db.query(models.Agent).filter(models.Agent.id == bid.agent_id).first()
        if not agent:
            continue
            
        # (1 / bid_amount) * confidence_score * (1 + agent.reputation_score)
        # Avoid division by zero
        safe_bid_amount = max(0.01, bid.bid_amount) 
        score = (1 / safe_bid_amount) * bid.confidence_score * (1 + agent.reputation_score)
        
        if score > best_score:
            best_score = score
            winner_bid = bid
            
    if not winner_bid:
        return {"status": "no_valid_bids"}
        
    # Process winner and losers
    for bid in bids:
        agent = db.query(models.Agent).filter(models.Agent.id == bid.agent_id).first()
        if not agent:
            continue
            
        if bid.id != winner_bid.id:
            # Refund loser
            agent.staked_amount -= bid.stake_committed
            # Ensure we don't drop below 0 due to float precision
            agent.staked_amount = max(0.0, agent.staked_amount)
            
    task.status = "matched"
    db.commit()
    
    # Launch winner worker agent
    winner_agent = db.query(models.Agent).filter(models.Agent.id == winner_bid.agent_id).first()
    if winner_agent:
        launch_worker_agent(task_id, winner_agent.id, winner_agent.name)
    
    return {
        "status": "matched",
        "winner_bid_id": winner_bid.id,
        "winner_agent_id": winner_bid.agent_id,
        "winning_score": best_score
    }

@app.post("/tasks/{task_id}/submit", response_model=schemas.SubmissionResponse)
def submit_task_result(task_id: str, submission: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.status != "matched":
        raise HTTPException(status_code=400, detail="Task is not in a matched state")
        
    output_hash = hashlib.sha256(submission.output_content.encode('utf-8')).hexdigest()
    
    # Blockchain Integration
    submit_tx = blockchain.submit_hash(task_id, output_hash)
    
    new_submission = models.Submission(
        id=str(uuid.uuid4()),
        task_id=task_id,
        agent_id=submission.agent_id,
        output_content=submission.output_content,
        output_hash=output_hash,
        submit_tx_hash=submit_tx
    )
    
    task.status = "verifying"
    
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    
    return new_submission

@app.get("/tasks/{task_id}/submission", response_model=schemas.SubmissionResponse)
def get_task_submission(task_id: str, db: Session = Depends(get_db)):
    submission = db.query(models.Submission).filter(models.Submission.task_id == task_id).order_by(models.Submission.submitted_at.desc()).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found for this task")
        
    return submission

from verification import resolve_verification

@app.post("/tasks/{task_id}/verify")
def trigger_verification(task_id: str, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.status != "verifying":
        raise HTTPException(status_code=400, detail="Task is not in verifying state")
        
    submission = db.query(models.Submission).filter(models.Submission.task_id == task_id).order_by(models.Submission.submitted_at.desc()).first()
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found to verify")
        
    result = resolve_verification(task, submission, db)
    return result

@app.get("/tasks/{task_id}/verifications", response_model=List[schemas.VerificationResponse])
def get_task_verifications(task_id: str, db: Session = Depends(get_db)):
    verifications = db.query(models.Verification).filter(models.Verification.task_id == task_id).all()
    return verifications

@app.post("/tasks/{task_id}/claim-expired")
def claim_expired(task_id: str, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.status != "matched":
        raise HTTPException(status_code=400, detail="Task is not in matched state")
        
    if not task.submission_deadline or datetime.utcnow() <= task.submission_deadline:
        raise HTTPException(status_code=400, detail="Submission deadline has not passed")
        
    tx_hash = blockchain.refund_escrow(task.id)
    task.settlement_tx_hash = tx_hash
    task.status = "expired"
    db.commit()
    
    return {"status": "expired", "tx_hash": tx_hash}

# ==========================================
# Dispute Endpoints

@app.get("/tasks/{task_id}/dispute", response_model=schemas.DisputeResponse)
def get_task_dispute(task_id: str, db: Session = Depends(get_db)):
    dispute = db.query(models.Dispute).filter(models.Dispute.task_id == task_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found for this task")
    return dispute

@app.post("/disputes/{dispute_id}/escalate-human")
def escalate_dispute_to_human(dispute_id: str, db: Session = Depends(get_db)):
    dispute = db.query(models.Dispute).filter(models.Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
        
    dispute.status = "escalated"
    db.commit()
    
    return {"status": "escalated", "message": "Dispute flagged for manual review."}
