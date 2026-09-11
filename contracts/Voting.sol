// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    address public owner;
    uint256 public candidatesCount;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;

    event Voted(address indexed voter, uint256 indexed candidateId);
    event CandidateAdded(uint256 indexed candidateId, string name);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
        // Default initial candidates
        addCandidateInternal("Candidate Alpha");
        addCandidateInternal("Candidate Beta");
    }

    function addCandidateInternal(string memory _name) internal {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
        emit CandidateAdded(candidatesCount, _name);
    }

    // Admin-only function to register new candidates dynamically
    function addCandidate(string memory _name) public onlyOwner {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        addCandidateInternal(_name);
    }

    function vote(uint256 _candidateId) public {
        require(!hasVoted[msg.sender], "You have already voted.");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID.");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        emit Voted(msg.sender, _candidateId);
    }
}