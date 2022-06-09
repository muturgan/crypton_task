import { ethers, deployments, getNamedAccounts } from 'hardhat';
import { assert } from './chai';
import { VOTING_PLATFORM_CONTRACT_NAME } from '../constants';
import { VotingPlatform } from '../typechain-types';

describe('Dummy test', () => {
	it('Should set an owner correctly', async () => {
		await deployments.fixture(VOTING_PLATFORM_CONTRACT_NAME);
		const { deployer } = await getNamedAccounts();

		const vp = await ethers.getContract<VotingPlatform>(VOTING_PLATFORM_CONTRACT_NAME);

		const owner = await vp.owner();

		assert.strictEqual(owner, deployer);
	});
});
