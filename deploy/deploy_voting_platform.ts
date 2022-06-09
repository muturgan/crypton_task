import { DeployFunction } from 'hardhat-deploy/types';
import { VOTING_PLATFORM_CONTRACT_NAME } from '../constants';

const deployFunction: DeployFunction = async (hre) => {
	const { deployments, getNamedAccounts } = hre;
	const { deploy } = deployments;

	const { deployer } = await getNamedAccounts();

	await deploy(VOTING_PLATFORM_CONTRACT_NAME, {
		from: deployer,
		log: true,
	});
};

deployFunction.tags = [VOTING_PLATFORM_CONTRACT_NAME];

export default deployFunction;
