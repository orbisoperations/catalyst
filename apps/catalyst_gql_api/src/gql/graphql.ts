/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type DataChannel = {
  __typename?: 'DataChannel';
  creatorOrganziation: Scalars['String']['output'];
  endpoint: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type DataChannelInput = {
  creatorOrganziation: Scalars['String']['input'];
  endpoint: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createDataChannel: DataChannel;
};


export type MutationCreateDataChannelArgs = {
  input: DataChannelInput;
};

export type Query = {
  __typename?: 'Query';
  allDataChannels?: Maybe<Array<DataChannel>>;
  dataChannelById?: Maybe<DataChannel>;
  dataChannelsByCreatorOrg?: Maybe<Array<DataChannel>>;
};


export type QueryDataChannelByIdArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDataChannelsByCreatorOrgArgs = {
  creatorOrganziation?: InputMaybe<Scalars['String']['input']>;
};
