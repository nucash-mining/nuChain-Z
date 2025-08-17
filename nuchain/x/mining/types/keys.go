package types

const (
	// ModuleName defines the module name
	ModuleName = "mining"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_mining"
)

var (
	// MiningRigKey is the key prefix for storing mining rig NFT data
	MiningRigKey = "mining_rig/"
	
	// PoolOperatorKey is the key prefix for storing pool operator data
	PoolOperatorKey = "pool_operator/"
	
	// StakingNodeKey is the key prefix for storing staking node data
	StakingNodeKey = "staking_node/"
	
	// CrossChainMessageKey is the key prefix for storing cross-chain messages
	CrossChainMessageKey = "cross_chain_message/"
	
	// BlockRewardKey is the key prefix for storing block reward data
	BlockRewardKey = "block_reward/"
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}