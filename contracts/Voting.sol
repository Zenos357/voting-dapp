// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    address public admin;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;
    uint256 public candidatesCount;

    constructor() {
        admin = msg.sender;
        addCandidate("Candidate Alpha");
        addCandidate("Candidate Beta");
    }

    function addCandidate(string memory _name) public {
        require(msg.sender == admin, "Only admin can add candidate");
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    function vote(uint256 _candidateId) public {
        require(!hasVoted[msg.sender], "Error: You have already voted!");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
    }
}