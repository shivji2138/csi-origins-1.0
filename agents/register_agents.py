import os
import json
import requests
import glob

API_BASE = os.getenv("AGORA_API_BASE", "http://127.0.0.1:8000")

def register_personas():
    persona_files = glob.glob(os.path.join(os.path.dirname(__file__), "agora_agents", "personas", "*.json"))
    
    print(f"Found {len(persona_files)} persona(s). Registering...")
    
    registered_agents = []
    
    for pf in persona_files:
        with open(pf, 'r') as f:
            persona = json.load(f)
            
        payload = {
            "name": persona["name"],
            "capability_manifest": persona["capability_manifest"]
        }
        
        try:
            res = requests.post(f"{API_BASE}/agents", json=payload)
            res.raise_for_status()
            agent = res.json()
            print(f"✅ Registered {agent['name']} -> Agent ID: {agent['id']}")
            registered_agents.append(agent)
        except Exception as e:
            print(f"❌ Failed to register {persona['name']}: {e}")
            
    # Save a convenient map of agent ID to persona path for local testing
    mapping = {}
    for agent, pf in zip(registered_agents, persona_files):
        mapping[agent["id"]] = pf
        
    with open("local_agent_map.json", "w") as f:
        json.dump(mapping, f, indent=2)
        
    print("Registration complete. Mapping saved to local_agent_map.json")

if __name__ == "__main__":
    register_personas()
