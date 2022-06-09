// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract Voting {

	bool public finished;
	bool public success;
	address public immutable admin;
	address[] public candidates;
	address[] public voters;
	uint public immutable votingClosingDate;
	mapping(address => uint) public votes;
	mapping(address => bool) public isCandidate;
	mapping(address => bool) public isVoted;


	constructor(address[] memory _candidates) {
		require(_candidates.length > 1, "at least 2 candidates");

		address address0 = address(0);

		for (uint i = 0; i < _candidates.length; i++) {
			address candidate = _candidates[i];
			require(candidate != address0, "zero address candidate");
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
		require(isCandidate[voter] == false, "a candidate can't vote");
		require(isVoted[voter] == false, "already voted");
		require(msg.value == 0.01 ether, "a voting cost is 0.01 ETH");
		require(isCandidate[_candidate], "not a candidate");

		unchecked {
			votes[_candidate] += 1;
		}
		isVoted[voter] = true;
		voters.push(voter);
	}

	function finish() external {
		require(closed(), "not closed yet");
		require(!finished, "already finished");

		address leader;
		uint maxVotes;
		bool notSingleLeader;

		for (uint i = 0; i < candidates.length; i++) {
			address candidate = candidates[i];
			uint candidateVotes = votes[candidate];

			if (candidateVotes > maxVotes) {
				leader = candidate;
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
				payable(voters[i]).transfer(0.01 ether);
			}
		}
		else {
			uint reward = address(this).balance / 90;
			payable(leader).transfer(reward);
		}
	}

	function withdraw(address _owner) external {
		require(msg.sender == admin, "not an admin");
		require(finished, "not finished yet");
		require(success, "the voting was not successful");
		payable(_owner).transfer(address(this).balance);
	}

	function closed() public view returns(bool) {
		return block.timestamp >= votingClosingDate;
	}

	function getCandidates() external view returns(address[] memory) {
		return candidates;
	}
}
