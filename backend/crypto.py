import json
from eth_account import Account
from eth_account.messages import encode_defunct

def verify_signature(payload: dict, signature: str, expected_address: str) -> bool:
    """
    Verifies that a JSON payload was signed by the expected Ethereum address.
    
    1. Deterministically serialize the payload (sort keys, no spaces).
    2. Hash with standard Ethereum message prefix using encode_defunct.
    3. Recover the address and compare.
    """
    try:
        # Deterministic JSON serialization
        message_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
        message_encoded = encode_defunct(text=message_str)
        recovered_address = Account.recover_message(message_encoded, signature=signature)
        
        return recovered_address.lower() == expected_address.lower()
    except Exception as e:
        print(f"Signature verification failed: {e}")
        return False
