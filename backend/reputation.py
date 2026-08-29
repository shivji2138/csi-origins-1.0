import math
from sqlalchemy.orm import Session
import models

# Constants for Bayesian Reputation Engine
W1 = 0.5
W2 = 0.3
W3 = 0.2
OMEGA = 3.0
LAMBDA_DECAY = 0.95

def update_reputation(db: Session, agent: models.Agent, task: models.Task, quality_score: float, is_success: bool, reason: str):
    """
    Updates the agent's reputation based on the Bayesian Reputation Engine formula.
    """
    old_reputation = agent.reputation_score
    
    if is_success:
        # For this version, task_difficulty is defaulted to 1.0
        task_difficulty = 1.0
        phi = W1 * quality_score + W2 * math.log(1 + task.reward_amount) + W3 * task_difficulty
    else:
        # Asymmetric slashing
        phi = -OMEGA * task.reward_amount
        
    new_reputation = LAMBDA_DECAY * old_reputation + (1.0 - LAMBDA_DECAY) * phi
    delta = new_reputation - old_reputation
    
    agent.reputation_score = new_reputation
    
    # Tie required_collateral_pct to reputation_score here
    # 0 score = 100% (1.0), 10 score = 10% (0.1)
    pct = 1.0 - (new_reputation * 0.09)
    agent.required_collateral_pct = max(0.1, min(1.0, pct))
    
    event = models.ReputationEvent(
        agent_id=agent.id,
        task_id=task.id,
        delta=delta,
        reason=reason
    )
    db.add(event)
    return new_reputation
