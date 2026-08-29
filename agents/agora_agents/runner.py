import os
import sys
import json
import requests
import hashlib
import uuid
from datetime import datetime
import argparse
from dotenv import load_dotenv

# Ensure agora_agents, backend, and root packages can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.dirname(current_dir)
root_dir = os.path.dirname(agents_dir)
backend_dir = os.path.join(root_dir, "backend")

for p in [agents_dir, backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Load env variables from agents/.env, backend/.env, or root .env
load_dotenv(os.path.join(agents_dir, ".env"))
load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv(os.path.join(root_dir, ".env"))

from agora_agents.llm_client import generate_llm_response

API_BASE = os.getenv("AGORA_API_BASE", "http://127.0.0.1:8000")

class AgentRunner:
    def __init__(self, agent_id: str, persona_path: str, api_base: str = API_BASE):
        self.agent_id = agent_id
        self.api_base = api_base
        
        with open(persona_path, 'r', encoding='utf-8') as f:
            self.persona = json.load(f)

    def _get_db(self):
        try:
            from database import SessionLocal
            return SessionLocal()
        except Exception:
            return None
            
    def fetch_task(self, task_id: str) -> dict:
        # 1. Try HTTP REST API
        try:
            res = requests.get(f"{self.api_base}/tasks/{task_id}", timeout=5)
            if res.status_code == 200:
                return res.json()
        except Exception:
            pass
            
        try:
            res = requests.get(f"{self.api_base}/tasks", timeout=5)
            if res.status_code == 200:
                tasks = res.json()
                for t in tasks:
                    if t.get("id") == task_id:
                        return t
        except Exception:
            pass

        # 2. Local Database Direct Fallback
        db = self._get_db()
        if db:
            try:
                import models
                t = db.query(models.Task).filter(models.Task.id == task_id).first()
                if t:
                    return {
                        "id": t.id,
                        "title": t.title,
                        "description": t.description,
                        "required_capabilities": t.required_capabilities,
                        "reward_amount": t.reward_amount,
                        "status": t.status,
                        "posted_by": t.posted_by,
                        "verification_schema": t.verification_schema,
                        "verification_rubric": t.verification_rubric
                    }
            finally:
                db.close()
                
        raise ValueError(f"Task {task_id} not found on server {self.api_base} or local database.")
        
    def generate_output(self, task: dict) -> str:
        prompt = (
            f"Task Title: {task['title']}\n"
            f"Description: {task['description']}\n"
            f"Verification Rubric: {task.get('verification_rubric', 'General verification')}\n"
            f"Expected JSON Schema: {json.dumps(task.get('verification_schema', {}))}\n\n"
            f"Please complete this task comprehensively, fulfilling all requirements in the rubric and matching the expected JSON schema."
        )
        
        system_prompt = self.persona.get("system_prompt", "You are an autonomous AI worker agent.")
        schema = task.get("verification_schema", {})
        
        output = generate_llm_response(
            prompt=prompt,
            system_prompt=system_prompt,
            schema=schema,
            persona_name=self.persona.get("name", "WorkerAgent")
        )
        
        return output

    def submit_task(self, task_id: str, output_content: str) -> dict:
        # 1. Try HTTP REST API
        try:
            payload = {
                "agent_id": self.agent_id,
                "output_content": output_content
            }
            res = requests.post(f"{self.api_base}/tasks/{task_id}/submit", json=payload, timeout=10)
            if res.status_code == 200:
                return res.json()
        except Exception:
            pass

        # 2. Local Database Direct Fallback
        db = self._get_db()
        if db:
            try:
                import models
                import blockchain
                output_hash = hashlib.sha256(output_content.encode('utf-8')).hexdigest()
                submit_tx = blockchain.submit_hash(task_id, output_hash)
                
                sub = models.Submission(
                    id=str(uuid.uuid4()),
                    task_id=task_id,
                    agent_id=self.agent_id,
                    output_content=output_content,
                    output_hash=output_hash,
                    submit_tx_hash=submit_tx,
                    submitted_at=datetime.utcnow()
                )
                
                t = db.query(models.Task).filter(models.Task.id == task_id).first()
                if t:
                    t.status = "verifying"
                    
                db.add(sub)
                db.commit()
                db.refresh(sub)
                return {
                    "id": sub.id,
                    "task_id": sub.task_id,
                    "agent_id": sub.agent_id,
                    "output_content": sub.output_content,
                    "output_hash": sub.output_hash,
                    "submit_tx_hash": sub.submit_tx_hash
                }
            finally:
                db.close()
                
        raise RuntimeError("Failed to submit task deliverable via HTTP or Database.")

    def trigger_verification(self, task_id: str):
        # 1. Try HTTP REST API
        try:
            verify_res = requests.post(f"{self.api_base}/tasks/{task_id}/verify", timeout=25)
            if verify_res.status_code == 200:
                verif_data = verify_res.json()
                print(f"[{self.persona['name']}] Verification complete. Result: {verif_data.get('status')}")
                return verif_data
            else:
                print(f"[{self.persona['name']}] Verification endpoint status {verify_res.status_code}: {verify_res.text}")
        except Exception:
            pass

        # 2. Local Database Direct Fallback
        db = self._get_db()
        if db:
            try:
                import models
                import verification
                t = db.query(models.Task).filter(models.Task.id == task_id).first()
                sub = db.query(models.Submission).filter(models.Submission.task_id == task_id).order_by(models.Submission.submitted_at.desc()).first()
                if t and sub:
                    res = verification.resolve_verification(t, sub, db)
                    print(f"[{self.persona['name']}] Verification complete (Direct Engine). Result: {res.get('status')}")
                    return res
            finally:
                db.close()
                
        return None

    def run(self, task_id: str):
        print(f"[{self.persona['name']}] Fetching task {task_id}...")
        task = self.fetch_task(task_id)
        
        print(f"[{self.persona['name']}] Generating deliverable via Real AI Engine...")
        output_content = self.generate_output(task)
        print(f"[{self.persona['name']}] Output generated:\n{output_content}")
        
        print(f"[{self.persona['name']}] Submitting deliverable to AGORA protocol...")
        submission = self.submit_task(task_id, output_content)
        
        print(f"[{self.persona['name']}] Submission successful! Commitment Hash: {submission['output_hash']}")
        
        print(f"[{self.persona['name']}] Triggering Multi-Tier Verification Pipeline...")
        self.trigger_verification(task_id)
            
        return submission

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run AGORA Worker Agent")
    parser.add_argument("--agent-id", required=True, help="Agent UUID")
    parser.add_argument("--persona", required=True, help="Path to persona JSON config")
    parser.add_argument("--task-id", required=True, help="Task UUID to execute")
    parser.add_argument("--api-base", default=API_BASE, help="AGORA API Base URL")
    
    args = parser.parse_args()
    
    runner = AgentRunner(agent_id=args.agent_id, persona_path=args.persona, api_base=args.api_base)
    runner.run(args.task_id)
