import config from '../hardhat.config';
import { HARDHAT_PROVIDER_URL } from '../constants';
import { HttpNetworkUserConfig } from 'hardhat/types';

export const getProviderUrl = (nethork?: string): string => {
	const net = nethork || process.env.DEFAULT_TASK_NETWORK;
	if (!net) {
		throw new Error(`unsupported network: ${net}`);
	}

	if (net === 'hardhat' || net === 'localhost') {
		return HARDHAT_PROVIDER_URL;
	}

	const configNetwork = config.networks?.[net];
	if (!configNetwork) {
		throw new Error(`unsupported network: ${net}`);
	}

	if (typeof configNetwork === 'string') {
		return configNetwork;
	}

	const url = (configNetwork as HttpNetworkUserConfig).url;
	if (typeof url === 'string') {
		return url;
	}

	throw new Error(`unsupported network: ${net}`);
};
