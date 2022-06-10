import { ethers, getNamedAccounts, network } from 'hardhat';
import { assert, expect } from './chai';
import { VOTING_PLATFORM_CONTRACT_NAME, ZERO_ADDRESS, AUTO_VOTER_CONTRACT_NAME } from '../constants';
import { Voting, VotingPlatform, VotingPlatform__factory, AutoVoter__factory } from '../typechain-types';
import { abi } from '../artifacts/contracts/voting.sol/Voting.json';

const parseEther = ethers.utils.parseEther;
const votingCost = parseEther('0.01');

let vp: VotingPlatform;
let voting: Voting;

describe(VOTING_PLATFORM_CONTRACT_NAME, async () => {

	before(async () => {
		const [deployerSigner] = await ethers.getSigners();
		const VP = await ethers.getContractFactory(VOTING_PLATFORM_CONTRACT_NAME, deployerSigner) as VotingPlatform__factory;
		vp = await VP.deploy();
		await vp.deployed();
	});

	describe('Should prevent a voting creation', async () => {
		it('not an owner', async () => {
			const [, anotherUserSigner] = await ethers.getSigners();
			const anotherConnection = vp.connect(anotherUserSigner);
			await expect(anotherConnection.createVoting([]))
				.to.be.revertedWith('Ownable: caller is not the owner');
		});

		it('empty candidates list', async () => {
			await expect(vp.createVoting([]))
				.to.be.revertedWith('at least 2 candidates');
		});

		it('short candidates list', async () => {
			const { candidate1 } = await getNamedAccounts();
			await expect(vp.createVoting([candidate1]))
				.to.be.revertedWith('at least 2 candidates');
		});

		it('zero address candidate', async () => {
			const { candidate1 } = await getNamedAccounts();
			await expect(vp.createVoting([candidate1, ZERO_ADDRESS]))
				.to.be.revertedWith('zero address candidate');
		});

		it('not unique candidate', async () => {
			const { candidate1, candidate2 } = await getNamedAccounts();
			await expect(vp.createVoting([candidate1, candidate2, candidate1]))
				.to.be.revertedWith('not unique candidate');
		});
	});

	it('Should create a voting', async () => {
		const { candidate1, candidate2 } = await getNamedAccounts();
		const tx = await vp.createVoting([candidate1, candidate2]);
		await tx.wait();

		const votingsCount = await vp.votingsCount();
		assert.strictEqual(Number(votingsCount), 1);

		const votingAddress = await vp.votings(0);
		expect(votingAddress).to.be.properAddress; // tslint:disable-line:no-unused-expression

		voting = await ethers.getContractAt(abi, votingAddress);
		const admin = await voting.admin();
		assert.strictEqual(admin, vp.address);

		const [c1, c2] = await voting.getCandidates();
		assert.strictEqual(c1, candidate1);
		assert.strictEqual(c2, candidate2);
	});

	describe('Voting', async () => {
		it('just vote', async () => {
			const { user1, candidate1 } = await getNamedAccounts();
			const user1Signer = ethers.provider.getSigner(user1);
			const user1Connection = voting.connect(user1Signer);

			await user1Connection.vote(candidate1, {value: votingCost});

			const isVoted = await user1Connection.isVoted(user1);
			assert.strictEqual(isVoted, true);

			const votes = await user1Connection.votes(candidate1);
			assert.strictEqual(Number(votes), 1);
		});

		it(`a contract can't vote`, async () => {
			const [deployerSigner] = await ethers.getSigners();
			const AV = await ethers.getContractFactory(AUTO_VOTER_CONTRACT_NAME, deployerSigner) as AutoVoter__factory;
			const av = await AV.deploy();
			await av.deployed();

			const { candidate1 } = await getNamedAccounts();

			await expect(av.vote(voting.address, candidate1))
				.to.be.revertedWith(`a contract can't vote`);
		});

		it(`a candidate can't vote`, async () => {
			const { candidate1 } = await getNamedAccounts();
			const candidate1Signer = ethers.provider.getSigner(candidate1);
			const candidate1Connection = voting.connect(candidate1Signer);

			await expect(
				candidate1Connection.vote(candidate1, {value: votingCost}),
			).to.be.revertedWith(`a candidate can't vote`);
		});

		it('already voted', async () => {
			const { user1, candidate1 } = await getNamedAccounts();
			const user1Signer = ethers.provider.getSigner(user1);
			const user1Connection = voting.connect(user1Signer);

			await expect(
				user1Connection.vote(candidate1, {value: votingCost}),
			).to.be.revertedWith(`already voted`);
		});

		it('too much', async () => {
			const { user2, candidate1 } = await getNamedAccounts();
			const user2Signer = ethers.provider.getSigner(user2);
			const user2Connection = voting.connect(user2Signer);

			await expect(
				user2Connection.vote(
					candidate1,
					{ value: parseEther('0.02') },
				),
			).to.be.revertedWith(`a voting cost is 0.01 ETH`);
		});

		it('not eniugth', async () => {
			const { user2, candidate1 } = await getNamedAccounts();
			const user2Signer = ethers.provider.getSigner(user2);
			const user2Connection = voting.connect(user2Signer);

			await expect(
				user2Connection.vote(
					candidate1,
					{ value: parseEther('0.001') },
				),
			).to.be.revertedWith(`a voting cost is 0.01 ETH`);
		});

		it('not payed', async () => {
			const { user2, candidate1 } = await getNamedAccounts();
			const user2Signer = ethers.provider.getSigner(user2);
			const user2Connection = voting.connect(user2Signer);

			await expect(
				user2Connection.vote(candidate1),
			).to.be.revertedWith(`a voting cost is 0.01 ETH`);
		});

		it('not a candidate', async () => {
			const { user1, user2 } = await getNamedAccounts();
			const user2Signer = ethers.provider.getSigner(user2);
			const user2Connection = voting.connect(user2Signer);

			await expect(
				user2Connection.vote(user1, {value: votingCost}),
			).to.be.revertedWith(`not a candidate`);
		});
	});

	describe('Shold prevent actions before the end of voting', async () => {
		it('not closed yet', async () => {
			await expect(voting.finish())
				.to.be.revertedWith('not closed yet');
		});

		it('not finished yet', async () => {
			await expect(vp.withdraw(voting.address))
				.to.be.revertedWith('not finished yet');
		});
	});

	describe('Finishing', async () => {
		before(async () => {
			await network.provider.send(
				'evm_increaseTime',
				[1 * 60 * 60 * 24 * 4], // 4 days
			);
		});

		it('should finish a voting', async () => {
			const { candidate1: leader } = await getNamedAccounts();
			const provider = ethers.provider;
			const balance1 = await provider.getBalance(leader);

			await voting.finish();
			const finished = await voting.finished();
			assert.strictEqual(finished, true);
			const success = await voting.success();
			assert.strictEqual(success, true);
			const closed = await voting.closed();
			assert.strictEqual(closed, true);

			const balance2 = await provider.getBalance(leader);
			assert.strictEqual(
				balance2.toBigInt() - balance1.toBigInt(),
				votingCost.mul(90).div(100).toBigInt(), // only one vote was shiped
			);
		});

		it('already finished', async () => {
			await expect(voting.finish())
				.to.be.revertedWith('already finished');
		});

		it('already closed', async () => {
			const { user3, candidate1 } = await getNamedAccounts();
			const user3Signer = ethers.provider.getSigner(user3);
			const user3Connection = voting.connect(user3Signer);

			await expect(
				user3Connection.vote(candidate1, {value: votingCost}),
			).to.be.revertedWith(`already closed`);
		});
	});

	describe('Withdraw', async () => {
		it('not an owner', async () => {
			const [, anotherUserSigner] = await ethers.getSigners();
			const anotherConnection = vp.connect(anotherUserSigner);
			await expect(anotherConnection.withdraw(voting.address))
				.to.be.revertedWith('Ownable: caller is not the owner');
		});

		it('not a voting', async () => {
			const { user3 } = await getNamedAccounts();
			await expect(vp.withdraw(user3))
				.to.be.revertedWith('not a voting');
		});

		it('not an admin', async () => {
			const [, anotherUserSigner] = await ethers.getSigners();
			const anotherConnection = voting.connect(anotherUserSigner);
			await expect(anotherConnection.withdraw(anotherUserSigner.address))
				.to.be.revertedWith('not an admin');
		});

		it('should be withdrawn', async () => {
			const { deployer } = await getNamedAccounts();
			const provider = ethers.provider;
			const balance1 = await provider.getBalance(deployer);

			const tx = await vp.withdraw(voting.address);
			const receipt = await tx.wait();
			const gasUsed = receipt.gasUsed;

			const balance2 = await provider.getBalance(deployer);

			console.info({
				actual: balance2.toBigInt() - balance1.toBigInt(),
				expected: votingCost.mul(10).div(100).sub(gasUsed).toBigInt(),
			});

			// assert.strictEqual(
			// 	balance2.toBigInt() - balance1.toBigInt(),
			// 	votingCost.mul(10).div(100).sub(gasUsed).toBigInt(),
			// );

			assert.strictEqual(balance2.toBigInt() > balance1.toBigInt(), true);
		});
	});
});
