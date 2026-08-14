// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract DeInsure {
    using ECDSA for bytes32;

    enum State { Created, Funded_Escrow, Active_Transit, Settled_Claim, Completed_Safe }

    State public currentState;
    address public insurer;
    address public client;
    uint256 public premium;
    uint256 public coverageAmount;

    // Oracle Simulation (2-out-of-3)
    address[3] public oracleNodes;
    mapping(uint256 => mapping(address => bool)) public spoilageVotes;
    mapping(uint256 => uint8) public voteCount;
    uint256 public currentJourneyId;

    event StateChanged(State newState);
    event ClaimSettled(address to, uint256 amount);
    event SafeCompletion(address to, uint256 amount);

    modifier inState(State _state) {
        require(currentState == _state, "Invalid state transition");
        _;
    }

    modifier onlyOracle() {
        require(
            msg.sender == oracleNodes[0] || 
            msg.sender == oracleNodes[1] || 
            msg.sender == oracleNodes[2],
            "Not an authorized oracle node"
        );
        _;
    }

    constructor(address _client, address _oracle1, address _oracle2, address _oracle3, uint256 _premium, uint256 _coverage) {
        insurer = msg.sender;
        client = _client;
        oracleNodes[0] = _oracle1;
        oracleNodes[1] = _oracle2;
        oracleNodes[2] = _oracle3;
        premium = _premium;
        coverageAmount = _coverage;
        currentState = State.Created;
        currentJourneyId = 1;
    }

    function fundEscrow() external payable inState(State.Created) {
        require(msg.sender == insurer, "Only insurer can fund coverage");
        require(msg.value == coverageAmount, "Must fund exact coverage amount");
        currentState = State.Funded_Escrow;
        emit StateChanged(currentState);
    }

    function payPremium() external payable inState(State.Funded_Escrow) {
        require(msg.sender == client, "Only client pays premium");
        require(msg.value == premium, "Must pay exact premium");
        (bool success, ) = payable(insurer).call{value: premium}("");
        require(success, "Premium transfer failed");
        currentState = State.Active_Transit;
        emit StateChanged(currentState);
    }

    // Oracle nodes submit spoilage flags along with the device signature they validated off-chain
    function submitSpoilageVote(uint256 journeyId, bool isSpoiled, bytes32 telemetryHash, bytes memory deviceSignature, address expectedDeviceAddress) external onlyOracle inState(State.Active_Transit) {
        require(!spoilageVotes[journeyId][msg.sender], "Oracle already voted for this journey");
        
        // Validate the ECDSA signature of the hardware on-chain
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(telemetryHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, deviceSignature);
        require(recoveredSigner == expectedDeviceAddress, "Invalid hardware signature");

        spoilageVotes[journeyId][msg.sender] = true;
        
        if (isSpoiled) {
            voteCount[journeyId]++;
        }

        // 2-out-of-3 consensus
        if (voteCount[journeyId] >= 2) {
            _settleClaim();
        }
    }

    function _settleClaim() internal {
        currentState = State.Settled_Claim;
        (bool success, ) = payable(client).call{value: coverageAmount}("");
        require(success, "Claim settlement transfer failed");
        emit StateChanged(currentState);
        emit ClaimSettled(client, coverageAmount);
    }

    function completeJourneySafe() external inState(State.Active_Transit) {
        require(msg.sender == insurer || msg.sender == client, "Unauthorized");
        currentState = State.Completed_Safe;
        (bool success, ) = payable(insurer).call{value: coverageAmount}("");
        require(success, "Safe completion transfer failed");
        emit StateChanged(currentState);
        emit SafeCompletion(insurer, coverageAmount);
    }
}