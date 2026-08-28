// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title AgoraEscrow
 * @dev Manages the task lifecycle (Funded -> Submitted -> Completed/Refunded/Expired)
 * loosely based on the ERC-8183 Agentic Commerce pattern, but with multi-tier attestation.
 */
contract AgoraEscrow {
    enum State { Open, Funded, Submitted, Completed, Refunded, Expired }

    struct Job {
        address requester;
        address payee;
        uint256 rewardAmount;
        uint256 submissionDeadline;
        State state;
        string deliverableHash;
        string attestationUID;
    }

    mapping(string => Job) public jobs;
    
    address public immutable agoraVerifier;
    
    // Reentrancy guard
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    event EscrowFunded(string taskId, uint256 amount, address requester, address payee, uint256 deadline);
    event HashSubmitted(string taskId, string deliverableHash);
    event EscrowReleased(string taskId, uint256 amount, address payeeAddress, string attestationUID);
    event EscrowRefunded(string taskId, uint256 amount, address requester);
    event EscrowExpiredAndRefunded(string taskId, uint256 amount, address requester);

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier onlyVerifier() {
        require(msg.sender == agoraVerifier, "AgoraEscrow: only verifier can call");
        _;
    }

    constructor(address _agoraVerifier) {
        agoraVerifier = _agoraVerifier;
        _status = _NOT_ENTERED;
    }

    function createAndFund(string memory taskId, uint256 submissionDeadline) external payable nonReentrant {
        require(jobs[taskId].state == State.Open, "AgoraEscrow: Job already exists");
        require(msg.value > 0, "AgoraEscrow: Reward must be greater than 0");
        require(submissionDeadline > block.timestamp, "AgoraEscrow: Deadline must be in the future");

        jobs[taskId] = Job({
            requester: msg.sender,
            payee: address(0), // Set at completion
            rewardAmount: msg.value,
            submissionDeadline: submissionDeadline,
            state: State.Funded,
            deliverableHash: "",
            attestationUID: ""
        });

        emit EscrowFunded(taskId, msg.value, msg.sender, address(0), submissionDeadline);
    }

    function submitHash(string memory taskId, string memory deliverableHash) external {
        Job storage job = jobs[taskId];
        require(job.state == State.Funded, "AgoraEscrow: Job is not Funded");
        require(block.timestamp <= job.submissionDeadline, "AgoraEscrow: Submission deadline passed");
        
        job.deliverableHash = deliverableHash;
        job.state = State.Submitted;

        emit HashSubmitted(taskId, deliverableHash);
    }

    function completeWithAttestation(string memory taskId, address payeeAddress, string memory attestationUID) external onlyVerifier nonReentrant {
        Job storage job = jobs[taskId];
        require(job.state == State.Submitted, "AgoraEscrow: Job is not Submitted");

        job.state = State.Completed;
        job.payee = payeeAddress;
        job.attestationUID = attestationUID;

        uint256 amount = job.rewardAmount;
        job.rewardAmount = 0; // prevent double spend

        (bool success, ) = job.payee.call{value: amount}("");
        require(success, "AgoraEscrow: Transfer failed");

        emit EscrowReleased(taskId, amount, job.payee, attestationUID);
    }

    function refundEscrow(string memory taskId) external onlyVerifier nonReentrant {
        Job storage job = jobs[taskId];
        // Can refund if Funded (and they decided to cancel via court) or Submitted (and failed verification)
        require(job.state == State.Funded || job.state == State.Submitted, "AgoraEscrow: Invalid state for refund");

        job.state = State.Refunded;

        uint256 amount = job.rewardAmount;
        job.rewardAmount = 0;

        (bool success, ) = job.requester.call{value: amount}("");
        require(success, "AgoraEscrow: Transfer failed");

        emit EscrowRefunded(taskId, amount, job.requester);
    }

    function claimExpiredRefund(string memory taskId) external nonReentrant {
        Job storage job = jobs[taskId];
        require(job.state == State.Funded, "AgoraEscrow: Job is not in Funded state");
        require(block.timestamp > job.submissionDeadline, "AgoraEscrow: Deadline has not passed");

        job.state = State.Expired;

        uint256 amount = job.rewardAmount;
        job.rewardAmount = 0;

        (bool success, ) = job.requester.call{value: amount}("");
        require(success, "AgoraEscrow: Transfer failed");

        emit EscrowExpiredAndRefunded(taskId, amount, job.requester);
    }
}
