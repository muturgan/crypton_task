import { ethers, getNamedAccounts, network } from 'hardhat';
import { assert, expect } from './chai';
import { VOTING_PLATFORM_CONTRACT_NAME, ZERO_ADDRESS } from '../constants';
import { Voting, VotingPlatform, VotingPlatform__factory } from '../typechain-types';
import { abi } from '../artifacts/contracts/voting.sol/Voting.json';

const parseEther = ethers.utils.parseEther;
const votingCost = parseEther('0.01');

let platform: VotingPlatform;
let voting: Voting;

describe('Withdraw the leader reward', async () => {
	before(async () => {
		const [deployerSigner] = await ethers.getSigners();
		const VP = await ethers.getContractFactory(VOTING_PLATFORM_CONTRACT_NAME, deployerSigner) as VotingPlatform__factory;
		platform = await VP.deploy();
		await platform.deployed();

		const { candidate1, candidate2 } = await getNamedAccounts();
		const tx = await platform.createVoting([candidate1, candidate2]);
		await tx.wait();

		const votingAddress = await platform.votings(0);

		voting = await ethers.getContractAt(abi, votingAddress);
	});

	it('not finished yet', async () => {
		const { candidate1 } = await getNamedAccounts();
		const candidate1Signer = ethers.provider.getSigner(candidate1);
		const candidate1Connection = voting.connect(candidate1Signer);
		await expect(candidate1Connection.withdrawReward())
			.to.be.revertedWith('not finished yet');
	});

	it('should finish the voting', async () => {
		const { user1, candidate1 } = await getNamedAccounts();
		const user1Signer = ethers.provider.getSigner(user1);
		const user1Connection = voting.connect(user1Signer);

		await user1Connection.vote(candidate1, {value: votingCost});

		await network.provider.send(
			'evm_increaseTime',
			[1 * 60 * 60 * 24 * 4], // 4 days
		);

		await voting.finish();
		const finished = await voting.finished();
		assert.strictEqual(finished, true);
	});

	it('not a leader', async () => {
		const { candidate2 } = await getNamedAccounts();
		const candidate2Signer = ethers.provider.getSigner(candidate2);
		const candidate2Connection = voting.connect(candidate2Signer);
		await expect(candidate2Connection.withdrawReward())
			.to.be.revertedWith('not a leader');
	});

	it('should withdraw a reward correctly', async () => {
		const { candidate1 } = await getNamedAccounts();
		const candidate1Signer = ethers.provider.getSigner(candidate1);
		const candidate1Connection = voting.connect(candidate1Signer);

		const provider = ethers.provider;
		const balanceBefore = await provider.getBalance(candidate1);

		const reward = await voting.reward();

		const tx = await candidate1Connection.withdrawReward();
		const receipt = await tx.wait();
		const gasUsed = receipt.gasUsed;
		const gasPrice = receipt.effectiveGasPrice;

		const balanceAfter = await provider.getBalance(candidate1);

		assert.strictEqual(
			balanceAfter.sub(balanceBefore),
			reward.sub(gasUsed.mul(gasPrice)),
		);
	});

	it('already withdrawn', async () => {
		const { candidate1 } = await getNamedAccounts();
		const candidate1Signer = ethers.provider.getSigner(candidate1);
		const candidate1Connection = voting.connect(candidate1Signer);
		await expect(candidate1Connection.withdrawReward())
			.to.be.revertedWith('already withdrawn');
	});
});
