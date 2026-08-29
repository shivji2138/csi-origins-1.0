import uuid
from datetime import datetime
from sqlalchemy.orm import Session
import models
import reputation
import blockchain
import random

# Fixed protocol appeal deposit
DEFAULT_APPEAL_DEPOSIT = 50.0

def initiate_dispute(task: models.Task, db: Session):
    """
    Creates a new dispute when a task verification fails or hits high variance.
    Selects 3 high-reputation jurors.
    """
    submission = db.query(models.Submission).filter(models.Submission.task_id == task.id).first()
    submitter_id = submission.agent_id if submission else None
    
    # Query top agents by reputation, excluding submitter
    query = db.query(models.Agent)
    if submitter_id:
        query = query.filter(models.Agent.id != submitter_id)
        
    agents = query.order_by(models.Agent.reputation_score.desc()).all()
    
    # Take top 20% (min 3 if possible)
    pool_size = max(3, int(len(agents) * 0.2))
    eligible_agents = agents[:pool_size]
    
    # Select 3 jurors
    if len(eligible_agents) >= 3:
        jurors = random.sample(eligible_agents, 3)
    else:
        jurors = eligible_agents # Might be less than 3 in tiny testing environments
        
    jury_ids = [j.id for j in jurors]
    
    dispute = models.Dispute(
        id=str(uuid.uuid4()),
        task_id=task.id,
        status="open",
        jury_agent_ids=jury_ids,
        appeal_deposit=DEFAULT_APPEAL_DEPOSIT
    )
    db.add(dispute)
    db.commit()
    
    # In a real async system, we'd queue the trial. We'll execute it immediately here for demo.
    execute_jury_trial(dispute, task, db)

def execute_jury_trial(dispute: models.Dispute, task: models.Task, db: Session):
    """
    Mocks/simulates the LLM juror voting based on the task and prior verification.
    """
    jurors = db.query(models.Agent).filter(models.Agent.id.in_(dispute.jury_agent_ids)).all()
    
    verdicts = []
    votes_for_submitter = 0
    votes_against_submitter = 0
    
    for juror in jurors:
        # Simulate LLM reviewing the evidence.
        # We will mock a randomized vote based on the task's tier 1 failure or variance.
        vote = "submitter_loses" if random.random() < 0.6 else "submitter_wins"
        
        if vote == "submitter_wins":
            votes_for_submitter += 1
            reasoning = f"Juror {juror.name}: After reviewing the rubric and the Tier 1 deterministic scan results, I find the submission meets the core requirements despite the minor variance in the initial jury. The submitter successfully delivered the requested functionality."
        else:
            votes_against_submitter += 1
            reasoning = f"Juror {juror.name}: The submission clearly violates the schema requirements and the core logic requested in the rubric. The initial automated flag was correct. I vote to slash the submitter's stake."
            
        verdicts.append({
            "agent_id": juror.id,
            "vote": vote,
            "reasoning": reasoning
        })
        
    dispute.verdicts = verdicts
    
    # Majority vote
    if votes_for_submitter > votes_against_submitter:
        dispute.final_verdict = "submitter_wins"
    elif votes_against_submitter > votes_for_submitter:
        dispute.final_verdict = "submitter_loses"
    else:
        # Deadlock (e.g. 1-1-1 or missing jurors)
        dispute.status = "escalated"
        db.commit()
        return
        
    resolve_dispute(dispute, task, db)

def resolve_dispute(dispute: models.Dispute, task: models.Task, db: Session):
    dispute.status = "resolved"
    dispute.resolved_at = datetime.utcnow()
    
    submission = db.query(models.Submission).filter(models.Submission.task_id == task.id).first()
    submitter = db.query(models.Agent).filter(models.Agent.id == submission.agent_id).first() if submission else None
    
    if dispute.final_verdict == "submitter_wins":
        task.status = "completed"
        # Submitter won. Give them a reputation boost and release escrow.
        if submitter:
            reputation.update_reputation(db, submitter, task, quality_score=1.0, is_success=True, reason="dispute_won")
            
        # Settle
        payee_address = submitter.wallet_address if submitter else "0x0000000000000000000000000000000000000000"
        tx_hash = blockchain.complete_with_attestation(task.id, payee_address, "dispute-court-attestation")
        task.settlement_tx_hash = tx_hash
        
    elif dispute.final_verdict == "submitter_loses":
        task.status = "failed"
        # Submitter lost. Heavy reputation slash and forfeit deposit/stake.
        if submitter:
            reputation.update_reputation(db, submitter, task, quality_score=0.0, is_success=False, reason="dispute_lost")
            
        # Settle (refund requester)
        tx_hash = blockchain.refund_escrow(task.id)
        task.settlement_tx_hash = tx_hash
        
    db.commit()
