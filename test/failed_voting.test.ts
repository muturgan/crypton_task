import { ethers, getNamedAccounts, network } from 'hardhat';
import { assert, expect } from './chai';
import { VOTING_PLATFORM_CONTRACT_NAME } from '../constants';
import { Voting, VotingPlatform__factory } from '../typechain-types';
import { abi } from '../artifacts/contracts/voting.sol/Voting.json';

describe('Failed voting', async () => {
	it('Should fail a voting', async () => {
		const { candidate1, candidate2, user1, user2 } = await getNamedAccounts();

		const [deployerSigner] = await ethers.getSigners();
		const VP = await ethers.getContractFactory(VOTING_PLATFORM_CONTRACT_NAME, deployerSigner) as VotingPlatform__factory;
		const vp = await VP.deploy();
		await vp.deployed();

		const tx = await vp.createVoting([candidate1, candidate2]);
		await tx.wait();
		const votingAddress = await vp.votings(0);
		const voting = await ethers.getContractAt<Voting>(abi, votingAddress);

		const value = ethers.utils.parseEther('0.01');

		const user1Signer = ethers.provider.getSigner(user1);
		const user1Connection = voting.connect(user1Signer);
		await user1Connection.vote(candidate1, { value });

		const user2Signer = ethers.provider.getSigner(user2);
		const user2Connection = voting.connect(user2Signer);
		await user2Connection.vote(candidate2, { value });

		await network.provider.send(
			'evm_increaseTime',
			[1 * 60 * 60 * 24 * 4], // 4 days
		);

		const provider = ethers.provider;
		const balance1Before = await provider.getBalance(user1);
		const balance2Before = await provider.getBalance(user2);

		await voting.finish();
		const finished = await voting.finished();
		assert.strictEqual(finished, true);
		const success = await voting.success();
		assert.strictEqual(success, false);

		const balance1After = await provider.getBalance(user1);
		const balance2After = await provider.getBalance(user2);

		assert.strictEqual(balance1After.toBigInt() > balance1Before.toBigInt(), true);
		assert.strictEqual(balance2After.toBigInt() > balance2Before.toBigInt(), true);

		await expect(vp.withdraw(voting.address))
			.to.be.revertedWith('the voting was not successful');
	});
});
