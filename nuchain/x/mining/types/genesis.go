package types

import "fmt"

// DefaultIndex is the default global index
const DefaultIndex uint64 = 1

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	return &GenesisState{
		Params:          DefaultParams(),
		MiningRigs:      []MiningRigNFT{},
		PoolOperators:   []PoolOperator{},
		StakingNodes:    []StakingNode{},
		LastBlockHeight: 0,
	}
}

// Validate performs basic genesis state validation returning an error upon any failure.
func (gs GenesisState) Validate() error {
	// Validate mining rigs
	for _, rig := range gs.MiningRigs {
		if rig.TokenId == 0 {
			return fmt.Errorf("invalid mining rig token ID: %d", rig.TokenId)
		}
		if rig.Owner == "" {
			return fmt.Errorf("mining rig owner cannot be empty")
		}
		if rig.ChainId == "" {
			return fmt.Errorf("mining rig chain ID cannot be empty")
		}
	}
	
	// Validate pool operators
	for _, operator := range gs.PoolOperators {
		if operator.Address == "" {
			return fmt.Errorf("pool operator address cannot be empty")
		}
		if operator.ChainId == "" {
			return fmt.Errorf("pool operator chain ID cannot be empty")
		}
	}
	
	// Validate staking nodes
	for _, node := range gs.StakingNodes {
		if node.Operator == "" {
			return fmt.Errorf("staking node operator cannot be empty")
		}
		if node.StakedNu < 21*1e18 {
			return fmt.Errorf("insufficient stake for node %s: %d", node.Operator, node.StakedNu)
		}
	}

	return gs.Params.Validate()
}

// GenesisState defines the mining module's genesis state
type GenesisState struct {
	Params          Params          `json:"params"`
	MiningRigs      []MiningRigNFT  `json:"mining_rigs"`
	PoolOperators   []PoolOperator  `json:"pool_operators"`
	StakingNodes    []StakingNode   `json:"staking_nodes"`
	LastBlockHeight int64           `json:"last_block_height"`
}