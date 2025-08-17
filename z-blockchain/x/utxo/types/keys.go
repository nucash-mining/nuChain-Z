package types

const (
	// ModuleName defines the module name
	ModuleName = "utxo"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_utxo"
)

var (
	// UTXOKey is the key prefix for storing UTXO data
	UTXOKey = []byte("utxo/")
	
	// TransactionKey is the key prefix for storing transactions
	TransactionKey = []byte("tx/")
	
	// ShieldedTxKey is the key prefix for storing shielded transactions
	ShieldedTxKey = []byte("shielded_tx/")
	
	// NullifierKey is the key prefix for storing nullifiers
	NullifierKey = []byte("nullifier/")
	
	// CommitmentKey is the key prefix for storing commitments
	CommitmentKey = []byte("commitment/")
	
	// DifficultyKey is the key for storing current mining difficulty
	DifficultyKey = []byte("difficulty")
	
	// BlockHeaderKey is the key prefix for storing block headers
	BlockHeaderKey = []byte("block_header/")
	
	// MiningStatsKey is the key prefix for storing mining statistics
	MiningStatsKey = []byte("mining_stats/")
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}