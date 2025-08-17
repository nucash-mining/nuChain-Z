export interface ComponentData {
  name: string;
  hashPower: number;
  wattCost: number;
  glbModel: string;
  description: string;
  openSeaUrl?: string;
  canFreeMint?: boolean;
}

export interface NFTMetadata {
  name: string;
  description: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  image: string;
  external_url: string;
  background_color: string;
}

export interface SavedMiningRig {
  id: number;
  name: string;
  nftTokenId: number;
  network: string;
  components: { [key: number]: number };
  nuChainAddress: string;
  wattAllowance: string;
  totalHashPower: number;
  totalWattCost: number;
  isStaked: boolean;
  stakedPool: string | null;
  createdAt: string;
  nftMetadata?: NFTMetadata;
}

export interface MiningPool {
  id: number;
  name: string;
  domainName: string;
  operator: string;
  feeRate: number;
  feePayoutAddress: string;
  logoImageUrl: string;
  network: string;
  totalMiners: number;
  totalHashPower: number;
  wattStaked: number;
  isActive: boolean;
  createdAt: string;
  payoutFrequency: string;
  minPayout: string;
}

export interface ContractData {
  rigName: string;
  nuChainAddress: string;
  wattAllowance: string;
  nftMetadata?: NFTMetadata;
}

export interface PoolContractData {
  poolName: string;
  domainName: string;
  feePayoutAddress: string;
  feeRate: string;
  logoImageUrl: string;
  developerDonation: string;
}