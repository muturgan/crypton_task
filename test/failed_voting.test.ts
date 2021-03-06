import { ethers, getNamedAccounts, network } from 'hardhat';
import { assert, expect } from './chai';
import { VOTING_PLATFORM_CONTRACT_NAME, ZERO_ADDRESS } from '../constants';
import { Voting, VotingPlatform__factory } from '../typechain-types';
import { abi } from '../artifacts/contracts/voting.sol/Voting.json';

describe('Failed voting', async () => {
	it('Should fail a voting', async () => {
		const { candidate1, candidate2, user1, user2 } = await getNamedAccounts();

		const [deployerSigner] = await ethers.getSigners();
		const VP = await ethers.getContractFactory(VOTING_PLATFORM_CONTRACT_NAME, deployerSigner) as VotingPlatform__factory;
		const vp = await VP.deploy();
		await vp.deployed();

		await vp.createVoting([candidate1, candidate2])
			.then((t) => t.wait());
		const votingAddress = await vp.votings(0);
		const voting = await ethers.getContractAt<Voting>(abi, votingAddress);

		const votingCost = ethers.utils.parseEther('0.01');

		const user1Signer = ethers.provider.getSigner(user1);
		const user1Connection = voting.connect(user1Signer);
		await user1Connection.vote(candidate1, { value: votingCost });

		const user2Signer = ethers.provider.getSigner(user2);
		const user2Connection = voting.connect(user2Signer);
		await user2Connection.vote(candidate2, { value: votingCost });

		await network.provider.send(
			'evm_increaseTime',
			[1 * 60 * 60 * 24 * 4], // 4 days
		);

		await voting.finish();
		const finished = await voting.finished();
		assert.strictEqual(finished, true);
		const success = await voting.success();
		assert.strictEqual(success, false);

		await expect(vp.withdraw(voting.address))
			.to.be.revertedWith('the voting was not successful');

		const leader = await voting.leader();
		assert.strictEqual(leader, ZERO_ADDRESS);

		const reward = await voting.reward();
		assert.strictEqual(Number(reward), 0);

		const platformFee = await voting.platformFee();
		assert.strictEqual(Number(platformFee), 0);

		const provider = ethers.provider;
		const balance1Before = await provider.getBalance(user1);

		const tx = await user1Connection.refundOnVotingFail();
		const receipt = await tx.wait();
		const gasUsed = receipt.gasUsed;
		const gasPrice = receipt.effectiveGasPrice;

		const balance1After = await provider.getBalance(user1);
		assert.strictEqual(
			balance1After.sub(balance1Before),
			votingCost.sub(gasUsed.mul(gasPrice)),
		);

		try {
			await user1Connection.refundOnVotingFail();
			assert.fail('refunded twice');
		} catch (error) {
			const err: Error = error as any;
			assert.strictEqual(err?.message?.includes('already withdrawn'), true);
		}

		try {
			const candidate1Signer = ethers.provider.getSigner(candidate1);
			const candidate1Connection = voting.connect(candidate1Signer);
			await candidate1Connection.withdrawReward();
			assert.fail(`should not withdraw a reward`);
		} catch (error) {
			const err: Error = error as any;
			assert.strictEqual(err?.message?.includes('the voting was not successful'), true);
		}
	});
});
