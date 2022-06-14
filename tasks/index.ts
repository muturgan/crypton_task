import { task } from 'hardhat/config';
import * as t from './typings';
// @ts-ignore
import { VotingPlatform, Voting } from '../typechain-types';



/*************************
 *                       *
 *    VOTING PLATFORM    *
 *                       *
 *************************/

task<t.IVotingsPlatformAddress>('vp-votings-count', 'Prints a count of created votings on a voting platform')
	.addOptionalParam('addr', 'VotingPlatform contract address')
	.setAction(async (args: t.IVotingsPlatformAddress, { ethers }) => {
		const address = args.addr || process.env.DEFAULT_VOTING_PLATFORM_ADDRESS;
		if (!address) {
			console.info('Fail. Define an "addr" param please');
			return;
		}

		const { abi } = require('../artifacts/contracts/voting_platform.sol/VotingPlatform.json');
		const vp = await ethers.getContractAt<VotingPlatform>(abi, address);
		const votingsCount = await vp.votingsCount();
		console.info(`A voting platform contains ${votingsCount} votings`);
	});

task<t.IGetVotingArgs>('vp-get-voting', 'Prints a voting address by index')
	.addParam('index', 'Voting contract index')
	.addOptionalParam('addr', 'VotingPlatform contract address')
	.setAction(async (args: t.IGetVotingArgs, { ethers }) => {
		const indexStr = args.index;
		if (!indexStr) {
			console.info('Fail. Define an "index" param please');
			return;
		}
		const index = parseInt(indexStr, 10);
		if ((!index && index !== 0) || index < 0) {
			console.info('Fail. The "index" param should be a non negative integer');
			return;
		}

		const address = args.addr || process.env.DEFAULT_VOTING_PLATFORM_ADDRESS;
		if (!address) {
			console.info('Fail. Define an "addr" param please');
			return;
		}

		const { abi } = require('../artifacts/contracts/voting_platform.sol/VotingPlatform.json');
		const vp = await ethers.getContractAt<VotingPlatform>(abi, address);
		const votingsCount = await vp.votingsCount();
		if (index >= Number(votingsCount)) {
			console.info('Fail. The "index" param is out of a votings list range');
			return;
		}

		const voting = await vp.votings(index);
		console.info(`The address of ${index} voting is ${voting}`);
	});

task<t.IIsVotingArgs>('vp-is-voting', 'Prints is this address a voting contract or not')
	.addParam('voting', 'Voting contract address')
	.addOptionalParam('addr', 'VotingPlatform contract address')
	.setAction(async (args: t.IIsVotingArgs, { ethers }) => {
		const voting = args.voting;
		if (!voting) {
			console.info('Fail. Define a "voting" param please');
			return;
		}

		const address = args.addr || process.env.DEFAULT_VOTING_PLATFORM_ADDRESS;
		if (!address) {
			console.info('Fail. Define an "addr" param please');
			return;
		}

		const { abi } = require('../artifacts/contracts/voting_platform.sol/VotingPlatform.json');
		const vp = await ethers.getContractAt<VotingPlatform>(abi, address);
		const isVoting = await vp.isVoting(voting);
		console.info(`The address ${voting} IS ${isVoting ? '' : 'NOT '}a Voting contract`);
	});

task<t.ICreateVotingArgs>('vp-create-voting', 'Create a new voting')
	.addParam('candidates', 'A candidates addresses list - splited by a comma')
	.addOptionalParam('addr', 'VotingPlatform contract address')
	.setAction(async (args: t.ICreateVotingArgs, { ethers }) => {
		const candidatesStr = args.candidates;
		if (!candidatesStr) {
			console.info('Fail. Define a "candidates" param please');
			return;
		}
		const candidates = candidatesStr.split(',');

		const address = args.addr || process.env.DEFAULT_VOTING_PLATFORM_ADDRESS;
		if (!address) {
			console.info('Fail. Define an "addr" param please');
			return;
		}
		const [deployerSigner] = await ethers.getSigners();
		const { abi } = require('../artifacts/contracts/voting_platform.sol/VotingPlatform.json');
		const vp = await ethers.getContractAt<VotingPlatform>(abi, address, deployerSigner);

		console.info(`transaction started...`);
		const tx = await vp.createVoting(candidates)
			.catch((er: unknown) => {
				const err: t.IHardhatError = er as any;
				console.info('Fail.', err?.reason || err?.message || err);
				return null;
			});
		if (tx === null) {
			return;
		}

		console.info(`transaction was sent. waiting for executing...`);
		await tx.wait();
		console.info(`transaction was finished. checking a result...`);

		const votingsCount = await vp.votingsCount();
		const voting = await vp.votings(Number(votingsCount) - 1);

		console.info(`A new Voting was created with address ${voting}`);
	});

task<t.IIsVotingArgs>('vp-withdraw', 'Withdraw a platform fee from a finished voting contract')
	.addParam('voting', 'Voting contract address')
	.addOptionalParam('addr', 'VotingPlatform contract address')
	.setAction(async (args: t.IIsVotingArgs, { ethers }) => {
		const voting = args.voting;
		if (!voting) {
			console.info('Fail. Define a "voting" param please');
			return;
		}

		const address = args.addr || process.env.DEFAULT_VOTING_PLATFORM_ADDRESS;
		if (!address) {
			console.info('Fail. Define an "addr" param please');
			return;
		}

		const { abi } = require('../artifacts/contracts/voting_platform.sol/VotingPlatform.json');
		const vp = await ethers.getContractAt<VotingPlatform>(abi, address);

		console.info(`transaction started...`);
		const tx = await vp.withdraw(voting)
			.catch((er: unknown) => {
				const err: t.IHardhatError = er as any;
				console.info('Fail.', err?.reason || err?.message || err);
				return null;
			});
		if (tx === null) {
			return;
		}

		console.info(`transaction was sent. waiting for executing...`);
		await tx.wait();
		console.info(`transaction was finished.`);

		const { abi: votingApi } = require('../artifacts/contracts/voting.sol/Voting.json');
		const v = await ethers.getContractAt<Voting>(votingApi, voting);
		const fee = await v.reward();

		console.info(`An owner withdrew ${ethers.utils.formatEther(fee)} ETH from a finished voting`);
	});
