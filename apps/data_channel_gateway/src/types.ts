export type Variables = {
    claims: string[];
    'catalyst-token': string;
};

export type SingleUseToken = {
    endpoint: string; // data channel endpoint URL
    singleUseToken: string; // single use JWT for the data channel CLAIM
};
