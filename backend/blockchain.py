import os
import json
from web3 import Web3
from eth_account import Account
import time

# Load configuration
RPC_URL = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
PRIVATE_KEY = os.getenv("BACKEND_PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("AGORA_ESCROW_ADDRESS")

# To prevent crashing during local development without a real contract
MOCK_BLOCKCHAIN = not PRIVATE_KEY or not CONTRACT_ADDRESS

if not MOCK_BLOCKCHAIN:
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    account = Account.from_key(PRIVATE_KEY)
    w3.eth.default_account = account.address
    
    with open(os.path.join(os.path.dirname(__file__), "AgoraEscrowABI.json")) as f:
        abi = json.load(f)
        
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)
else:
    print("WARNING: Blockchain integration running in MOCK mode (missing keys/address).")

def _mock_tx(method_name, task_id):
    # Simulate a realistic transaction delay and return a mock hash
    print(f"[MOCK CHAIN] Executing {method_name} for Task {task_id}...")
    time.sleep(1)
    return "0x" + os.urandom(32).hex()

def _send_transaction(tx_func, value=0):
    if MOCK_BLOCKCHAIN:
        raise Exception("Cannot send tx in mock mode")
        
    tx = tx_func.build_transaction({
        'from': account.address,
        'value': w3.to_wei(value, 'ether') if value > 0 else 0,
        'nonce': w3.eth.get_transaction_count(account.address),
        # Basic fee estimation for Base Sepolia
        'gas': 500000, 
        'maxFeePerGas': w3.to_wei(2, 'gwei'),
        'maxPriorityFeePerGas': w3.to_wei(1, 'gwei'),
    })
    
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    
    # Wait for receipt to confirm it mined
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt.status != 1:
        raise Exception("Transaction reverted")
        
    return tx_hash.hex()

def create_and_fund(task_id: str, submission_deadline: int, reward_amount_eth: float) -> str:
    """
    Locks the reward funds in the smart contract.
    Returns the transaction hash.
    """
    if MOCK_BLOCKCHAIN:
        return _mock_tx("createAndFund", task_id)
        
    func = contract.functions.createAndFund(task_id, int(submission_deadline))
    return _send_transaction(func, value=reward_amount_eth)

def submit_hash(task_id: str, deliverable_hash: str) -> str:
    """
    Registers the submission hash on-chain.
    Returns the transaction hash.
    """
    if MOCK_BLOCKCHAIN:
        return _mock_tx("submitHash", task_id)
        
    func = contract.functions.submitHash(task_id, deliverable_hash)
    return _send_transaction(func)

def complete_with_attestation(task_id: str, payee_address: str, attestation_uid: str) -> str:
    """
    Completes the task and releases funds to the worker.
    Returns the transaction hash.
    """
    if MOCK_BLOCKCHAIN:
        return _mock_tx("completeWithAttestation", task_id)
        
    payee = Web3.to_checksum_address(payee_address)
    func = contract.functions.completeWithAttestation(task_id, payee, attestation_uid)
    return _send_transaction(func)

def refund_escrow(task_id: str) -> str:
    """
    Refunds the requester after a dispute.
    Returns the transaction hash.
    """
    if MOCK_BLOCKCHAIN:
        return _mock_tx("refundEscrow", task_id)
        
    func = contract.functions.refundEscrow(task_id)
    return _send_transaction(func)

def claim_expired_refund(task_id: str) -> str:
    """
    Claims the refund for an expired task.
    Returns the transaction hash.
    """
    if MOCK_BLOCKCHAIN:
        return _mock_tx("claimExpiredRefund", task_id)
        
    func = contract.functions.claimExpiredRefund(task_id)
    return _send_transaction(func)
