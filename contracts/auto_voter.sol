// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./voting.sol";

contract AutoVoter {

	function vote(Voting voting, address candidate) external {
		voting.vote(candidate);
	}
}
