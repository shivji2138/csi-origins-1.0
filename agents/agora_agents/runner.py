import os
import json
import requests
import argparse
from dotenv import load_dotenv

# Optional LLM integration
try:
    from langchain.chat_models import ChatOpenAI
    from langchain.schema import SystemMessage, HumanMessage
    HAS_LLM = True
except ImportError:
    HAS_LLM = False

load_dotenv()

API_BASE = os.getenv("AGORA_API_BASE", "http://127.0.0.1:8000")

class AgentRunner:
    def __init__(self, agent_id: str, persona_path: str):
        self.agent_id = agent_id
        
        with open(persona_path, 'r') as f:
            self.persona = json.load(f)
            
    def fetch_task(self, task_id: str):
        # We need a way to fetch a specific task.
        # Main.py has `GET /tasks` but not `GET /tasks/{task_id}` directly, 
        # so let's fetch all and filter, or just hit /tasks and find it.
        # Wait, Phase 2 page.tsx noted this too. 
        res = requests.get(f"{API_BASE}/tasks")
        res.raise_for_status()
        tasks = res.json()
        for t in tasks:
            if t["id"] == task_id:
                return t
        raise ValueError(f"Task {task_id} not found")
        
    def generate_output(self, task: dict) -> str:
        prompt = (
            f"Task Title: {task['title']}\n"
            f"Description: {task['description']}\n"
            f"Verification Rubric: {task.get('verification_rubric', 'N/A')}\n"
            f"Expected JSON Schema: {json.dumps(task.get('verification_schema', {}))}\n\n"
            f"Please complete the task strictly adhering to the schema and rubric."
        )
        
        # Try to use OpenAI if key is present
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if HAS_LLM and openai_key:
            print("Running task using LLM (OpenAI)...")
            chat = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0.2)
            messages = [
                SystemMessage(content=self.persona['system_prompt']),
                HumanMessage(content=prompt)
            ]
            response = chat(messages)
            return response.content
        else:
            print("No LLM configured. Generating mock output based on schema.")
            # Fallback mock generator
            schema = task.get("verification_schema", {})
            mock_output = {}
            if "properties" in schema:
                for key, prop in schema["properties"].items():
                    prop_type = prop.get("type", "string")
                    if prop_type == "string":
                        mock_output[key] = f"Mocked string for {key} completed by {self.persona['name']}"
                    elif prop_type == "number":
                        mock_output[key] = 42
                    elif prop_type == "boolean":
                        mock_output[key] = True
                    else:
                        mock_output[key] = "Mock value"
            else:
                mock_output = {"result": f"Mock output from {self.persona['name']}"}
                
            return json.dumps(mock_output, indent=2)

    def submit_task(self, task_id: str, output_content: str):
        payload = {
            "agent_id": self.agent_id,
            "output_content": output_content
        }
        res = requests.post(f"{API_BASE}/tasks/{task_id}/submit", json=payload)
        res.raise_for_status()
        return res.json()

    def run(self, task_id: str):
        print(f"[{self.persona['name']}] Fetching task {task_id}...")
        task = self.fetch_task(task_id)
        
        if task['status'] != 'matched':
            print(f"Warning: Task status is {task['status']}, not 'matched'. Submission might fail.")
            
        print(f"[{self.persona['name']}] Generating output...")
        output_content = self.generate_output(task)
        print(f"[{self.persona['name']}] Output generated:\n{output_content}")
        
        print(f"[{self.persona['name']}] Submitting to AGORA...")
        submission = self.submit_task(task_id, output_content)
        
        print(f"[{self.persona['name']}] Submission successful! Hash: {submission['output_hash']}")
        return submission

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run AGORA Agent")
    parser.add_argument("--agent-id", required=True, help="Agent UUID")
    parser.add_argument("--persona", required=True, help="Path to persona JSON config")
    parser.add_argument("--task-id", required=True, help="Task UUID to execute")
    
    args = parser.parse_args()
    
    runner = AgentRunner(agent_id=args.agent_id, persona_path=args.persona)
    runner.run(args.task_id)
