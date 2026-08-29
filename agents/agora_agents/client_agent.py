import os
import json
import time
import requests
import argparse

API_BASE = os.getenv("AGORA_API_BASE", "http://127.0.0.1:8000")

def run_client(title: str, description: str, reward_amount: float):
    print("=======================================")
    print("[Client AI Agent] Initiating Workflow")
    print("=======================================")
    
    # 1. Automatically post task
    payload = {
        "title": title,
        "description": description,
        "required_capabilities": {"text_classification": "high", "Python": "medium"},
        "reward_amount": reward_amount,
        "posted_by": "human_client_1",
        "verification_schema": {"type": "object", "properties": {"result": {"type": "string"}}},
        "verification_rubric": "General output verification"
    }
    
    print(f"\n[Client AI Agent] 1. Posting task: '{title}' for ${reward_amount}")
    res = requests.post(f"{API_BASE}/tasks", json=payload)
    res.raise_for_status()
    task = res.json()
    task_id = task["id"]
    print(f"[Client AI Agent] Task created successfully! ID: {task_id}")
    
    # 2. Monitor bids
    print(f"\n[Client AI Agent] 2. Monitoring bids...")
    time.sleep(2) # Give the backend auto-bidding a moment
    
    res = requests.get(f"{API_BASE}/tasks/{task_id}/bids")
    res.raise_for_status()
    bids = res.json()
    print(f"[Client AI Agent] Found {len(bids)} bids from worker agents.")
    for b in bids:
        print(f"  - Agent {b['agent_name']} bid ${b['bid_amount']} (Confidence: {b['confidence_score']})")
        
    # 3. Evaluate and Select Winner
    print(f"\n[Client AI Agent] 3. Evaluating bids and triggering match...")
    res = requests.post(f"{API_BASE}/tasks/{task_id}/close-bidding")
    res.raise_for_status()
    match_result = res.json()
    
    if match_result.get("status") == "matched":
        print(f"[Client AI Agent] Winner selected! Matched with Agent ID: {match_result.get('winner_agent_id')}")
    else:
        print(f"[Client AI Agent] Bidding closed but no valid bids found.")
        return
        
    # 4. Wait for execution and escrow payout
    print(f"\n[Client AI Agent] 4. Awaiting task execution and escrow settlement...")
    
    while True:
        res = requests.get(f"{API_BASE}/tasks")
        tasks = res.json()
        current_task = next((t for t in tasks if t["id"] == task_id), None)
        
        if not current_task:
            print("[Client AI Agent] Error fetching task status.")
            break
            
        status = current_task["status"]
        if status == "completed":
            print("\n[Client AI Agent] SUCCESS! Task completed.")
            print(f"[Client AI Agent] The worker AI's output was verified and the escrow released the ${reward_amount} reward.")
            print(f"[Client AI Agent] Settlement Tx Hash: {current_task.get('settlement_tx_hash')}")
            break
        elif status == "expired":
            print("\n[Client AI Agent] Task expired or failed verification. Escrow refunded to client.")
            break
        elif status == "disputed":
            print("\n[Client AI Agent] Task is disputed. Escalated to Agent Court.")
            break
        else:
            print(f"  ... task status: {status}")
            time.sleep(3)
            
    print("\n[Client AI Agent] Workflow finished.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Autonomous Client AI Agent")
    parser.add_argument("--title", type=str, default="Label 100 customer-support messages", help="Task title")
    parser.add_argument("--desc", type=str, default="Categorize 100 messages into billing/technical/account/other.", help="Task description")
    parser.add_argument("--reward", type=float, default=5.0, help="Reward amount in USD")
    
    args = parser.parse_args()
    
    run_client(args.title, args.desc, args.reward)
