// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/Address.sol";

contract Voting {

	bool public finished;
	bool public success;
	address public immutable admin;
	address public leader;
	address[] public candidates;
	address[] public voters;
	uint public immutable votingClosingDate;
	uint public reward;
	uint public platformFee;
	mapping(address => uint) public votesForCandidates;
	mapping(address => bool) public isCandidate;
	mapping(address => bool) public isVoted;
	mapping(address => address) public voterToCandidate;


	constructor(address[] memory _candidates) {
		require(_candidates.length > 1, "at least 2 candidates");

		address address0 = address(0);

		for (uint i = 0; i < _candidates.length; i++) {
			address candidate = _candidates[i];
			require(candidate != address0, "zero address candidate");
			require(Address.isContract(candidate) == false, "a contract can't be a candidate");
			require(!isCandidate[candidate], "not unique candidate");
			isCandidate[candidate] = true;
		}

		candidates = _candidates;
		votingClosingDate = block.timestamp + 3 days;

		admin = msg.sender;
	}

	function vote(address _candidate) external payable {
		require(!closed(), "already closed");

		address voter = msg.sender;
		require(Address.isContract(voter) == false, "a contract can't vote");
		require(isCandidate[voter] == false, "a candidate can't vote");
		require(isVoted[voter] == false, "already voted");
		require(msg.value == 0.01 ether, "a voting cost is 0.01 ETH");
		require(isCandidate[_candidate], "not a candidate");

		unchecked {
			votesForCandidates[_candidate] += 1;
		}
		isVoted[voter] = true;
		voters.push(voter);
		voterToCandidate[voter] = _candidate;
	}

	function finish() external {
		require(closed(), "not closed yet");
		require(!finished, "already finished");

		address nextLeader;
		uint maxVotes;
		bool notSingleLeader;

		for (uint i = 0; i < candidates.length; i++) {
			address candidate = candidates[i];
			uint candidateVotes = votesForCandidates[candidate];

			if (candidateVotes > maxVotes) {
				nextLeader = candidate;
				maxVotes = candidateVotes;
				notSingleLeader = false;
			}
			else if (candidateVotes > 0 && candidateVotes == maxVotes) {
				notSingleLeader = true;
			}
		}

		success = !notSingleLeader;
		finished = true;

		if (notSingleLeader) {
			for (uint i = 0; i < voters.length; i++) {
				Address.sendValue(payable(voters[i]), 0.01 ether);
			}
		}
		else {
			uint balance = address(this).balance;
			reward = balance * 90 / 100;
			platformFee = balance - reward;
			leader = nextLeader;
			Address.sendValue(payable(leader), reward);
		}
	}

	function withdraw(address _owner) external {
		require(msg.sender == admin, "not an admin");
		require(finished, "not finished yet");
		require(success, "the voting was not successful");
		Address.sendValue(payable(_owner), platformFee);
	}

	function closed() public view returns(bool) {
		return block.timestamp >= votingClosingDate;
	}

	function getCandidates() external view returns(address[] memory) {
		return candidates;
	}
}
