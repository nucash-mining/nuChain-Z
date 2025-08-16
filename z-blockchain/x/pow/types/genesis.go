package types

import "fmt"

// DefaultIndex is the default global index
const DefaultIndex uint64 = 1

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	return &GenesisState{
		Params:     DefaultParams(),
		Validators: []Validator{},
		Difficulty: 1000000, // Initial difficulty
		BlockReward: "50000000000000000", // 0.05 Z * 10^18
		HalvingInterval: 210000000, // Halving every 210M blocks
		LastBlockHeight: 0,
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

	return gs.Params.Validate()
}