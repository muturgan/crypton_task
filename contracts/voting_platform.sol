// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./voting.sol";

contract VotingPlatform is Ownable {

	uint public votingsCount;
	Voting[] public votings;
	mapping(Voting => bool) public isVoting;


	function createVoting(address[] calldata _candidates) external onlyOwner {
		Voting voting = new Voting(_candidates);
		votings.push(voting);
		isVoting[voting] = true;
		unchecked {
			votingsCount++;
		}
	}

	function withdraw(Voting _voting) external onlyOwner {
		require(isVoting[_voting], "not a voting");
		_voting.withdrawPlatformFee(msg.sender);
	}
}
