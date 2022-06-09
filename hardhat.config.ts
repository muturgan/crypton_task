import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';

import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@typechain/hardhat';
import 'solidity-coverage';

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
  namedAccounts: {
    deployer: 0,
    user1: 1,
    user2: 2,
    user3: 3,
  },
};

export default config;
