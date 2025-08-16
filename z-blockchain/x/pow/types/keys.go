package types

const (
	// ModuleName defines the module name
	ModuleName = "pow"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_pow"
)

var (
	// DifficultyKey is the key for storing current mining difficulty
	DifficultyKey = []byte("difficulty")
	
	// ValidatorsKey is the key prefix for storing validators
	ValidatorsKey = []byte("validators")
	
	// BlockRewardKey is the key for storing block reward
	BlockRewardKey = []byte("block_reward")
	
	// HalvingIntervalKey is the key for storing halving interval
	HalvingIntervalKey = []byte("halving_interval")
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}