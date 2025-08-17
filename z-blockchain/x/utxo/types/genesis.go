package types

import "fmt"

// DefaultIndex is the default global index
const DefaultIndex uint64 = 1

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	return &GenesisState{
		Params:              DefaultParams(),
		Utxos:               []UTXO{},
		Transactions:        []UTXOTransaction{},
		ShieldedTransactions: []ShieldedTransaction{},
		Difficulty:          1000000, // Initial difficulty
		BlockReward:         "50000000000000000", // 0.05 Z * 10^18
		HalvingInterval:     210000000, // Halving every 210M blocks
		LastBlockHeight:     0,
		HardwareAcceleration: true,
	}
}

// Validate performs basic genesis state validation returning an error upon any failure.
func (gs GenesisState) Validate() error {
	if gs.HalvingInterval == 0 {
		return fmt.Errorf("halving interval cannot be zero")
	}
	
	if gs.Difficulty == 0 {
		return fmt.Errorf("difficulty cannot be zero")
	}
	
	// Validate UTXOs
	for _, utxo := range gs.Utxos {
		if utxo.TxHash == "" {
			return fmt.Errorf("UTXO tx_hash cannot be empty")
		}
		if utxo.Address == "" {
			return fmt.Errorf("UTXO address cannot be empty")
		}
		if utxo.Amount == "" {
			return fmt.Errorf("UTXO amount cannot be empty")
		}
	}
	
	// Validate transactions
	for _, tx := range gs.Transactions {
		if tx.TxHash == "" {
			return fmt.Errorf("transaction hash cannot be empty")
		}
		if len(tx.Inputs) == 0 && len(tx.Outputs) == 0 {
			return fmt.Errorf("transaction must have inputs or outputs")
		}
	}

	return gs.Params.Validate()
}

// GenesisState defines the utxo module's genesis state
type GenesisState struct {
	Params               Params                `json:"params"`
	Utxos                []UTXO               `json:"utxos"`
	Transactions         []UTXOTransaction    `json:"transactions"`
	ShieldedTransactions []ShieldedTransaction `json:"shielded_transactions"`
	Difficulty           uint64               `json:"difficulty"`
	BlockReward          string               `json:"block_reward"`
	HalvingInterval      int64                `json:"halving_interval"`
	LastBlockHeight      int64                `json:"last_block_height"`
	HardwareAcceleration bool                 `json:"hardware_acceleration"`
}