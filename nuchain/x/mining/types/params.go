package types

import (
	"fmt"
	
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"gopkg.in/yaml.v2"
)

var _ paramtypes.ParamSet = (*Params)(nil)

var (
	KeyMinStakeAmount        = []byte("MinStakeAmount")
	KeyBlockReward          = []byte("BlockReward")
	KeyHalvingInterval      = []byte("HalvingInterval")
	KeySupportedChains      = []byte("SupportedChains")
	KeyLayerZeroEndpoint    = []byte("LayerZeroEndpoint")
)

// ParamKeyTable the param key table for launch module
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// NewParams creates a new Params instance
func NewParams(
	minStakeAmount string,
	blockReward string,
	halvingInterval int64,
	supportedChains []string,
	layerZeroEndpoint string,
) Params {
	return Params{
		MinStakeAmount:    minStakeAmount,
		BlockReward:       blockReward,
		HalvingInterval:   halvingInterval,
		SupportedChains:   supportedChains,
		LayerZeroEndpoint: layerZeroEndpoint,
	}
}

// DefaultParams returns a default set of parameters
func DefaultParams() Params {
	return NewParams(
		"21000000000000000000", // 21 NU tokens
		"50000000000000000",    // 0.05 NU per block
		210000000,              // 210M blocks
		[]string{"altcoinchain-2330", "polygon-137"},
		"",
	)
}

// ParamSetPairs get the params.ParamSet
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(KeyMinStakeAmount, &p.MinStakeAmount, validateMinStakeAmount),
		paramtypes.NewParamSetPair(KeyBlockReward, &p.BlockReward, validateBlockReward),
		paramtypes.NewParamSetPair(KeyHalvingInterval, &p.HalvingInterval, validateHalvingInterval),
		paramtypes.NewParamSetPair(KeySupportedChains, &p.SupportedChains, validateSupportedChains),
		paramtypes.NewParamSetPair(KeyLayerZeroEndpoint, &p.LayerZeroEndpoint, validateLayerZeroEndpoint),
	}
}

// Validate validates the set of params
func (p Params) Validate() error {
	if err := validateMinStakeAmount(p.MinStakeAmount); err != nil {
		return err
	}
	if err := validateBlockReward(p.BlockReward); err != nil {
		return err
	}
	if err := validateHalvingInterval(p.HalvingInterval); err != nil {
		return err
	}
	if err := validateSupportedChains(p.SupportedChains); err != nil {
		return err
	}
	if err := validateLayerZeroEndpoint(p.LayerZeroEndpoint); err != nil {
		return err
	}
	return nil
}

// String implements the Stringer interface.
func (p Params) String() string {
	out, _ := yaml.Marshal(p)
	return string(out)
}

func validateMinStakeAmount(i interface{}) error {
	v, ok := i.(string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	if v == "" {
		return fmt.Errorf("min stake amount cannot be empty")
	}
	
	return nil
}

func validateBlockReward(i interface{}) error {
	v, ok := i.(string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	if v == "" {
		return fmt.Errorf("block reward cannot be empty")
	}
	
	return nil
}

func validateHalvingInterval(i interface{}) error {
	v, ok := i.(int64)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	if v <= 0 {
		return fmt.Errorf("halving interval must be positive: %d", v)
	}
	
	return nil
}

func validateSupportedChains(i interface{}) error {
	v, ok := i.([]string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	if len(v) == 0 {
		return fmt.Errorf("supported chains cannot be empty")
	}
	
	return nil
}

func validateLayerZeroEndpoint(i interface{}) error {
	v, ok := i.(string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	// LayerZero endpoint can be empty during initialization
	return nil
}

// Params defines the parameters for the mining module
type Params struct {
	MinStakeAmount    string   `json:"min_stake_amount" yaml:"min_stake_amount"`
	BlockReward       string   `json:"block_reward" yaml:"block_reward"`
	HalvingInterval   int64    `json:"halving_interval" yaml:"halving_interval"`
	SupportedChains   []string `json:"supported_chains" yaml:"supported_chains"`
	LayerZeroEndpoint string   `json:"layer_zero_endpoint" yaml:"layer_zero_endpoint"`
}