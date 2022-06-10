import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';

import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@typechain/hardhat';
import 'solidity-coverage';
import '@nomiclabs/hardhat-etherscan';

dotenv.config();


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
	solidity: '0.8.7',
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {
			// the url is 'http://localhost:8545' but you should not define it
		},
		rinkeby: {
			url: `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`,
			accounts: [process.env.DEPLOYER_PRIVATE_KEY as string],
		},
	},
	etherscan: {
		apiKey: process.env.ETHERSCAN_API_KEY,
	},
	namedAccounts: {
		deployer: 0,
		candidate1: 1,
		candidate2: 2,
		candidate3: 3,
		user1: 4,
		user2: 5,
		user3: 6,
	},
};

export default config;
