export interface IHardhatError {
	readonly message?: string;
	readonly reason?: string;
}

export interface IVotingsPlatformAddress {
	readonly addr?: string;
}

export interface IIsVotingArgs extends IVotingsPlatformAddress {
	readonly voting: string;
}

export interface IGetVotingArgs extends IVotingsPlatformAddress {
	readonly index: string;
}

export interface ICreateVotingArgs extends IVotingsPlatformAddress {
	readonly candidates: string;
}
