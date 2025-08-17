package types

import (
	"fmt"
	
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"gopkg.in/yaml.v2"
)

var _ paramtypes.ParamSet = (*Params)(nil)

var (
	KeyBlockReward          = []byte("BlockReward")
	KeyHalvingInterval      = []byte("HalvingInterval")
	KeyMinDifficulty        = []byte("MinDifficulty")
	KeyMaxDifficulty        = []byte("MaxDifficulty")
	KeyHardwareAcceleration = []byte("HardwareAcceleration")
	KeySupportedDevices     = []byte("SupportedDevices")
)

// ParamKeyTable the param key table for utxo module
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// NewParams creates a new Params instance
func NewParams(
	blockReward string,
	halvingInterval int64,
	minDifficulty uint64,
	maxDifficulty uint64,
	hardwareAcceleration bool,
	supportedDevices []string,
) Params {
	return Params{
		BlockReward:          blockReward,
		HalvingInterval:      halvingInterval,
		MinDifficulty:        minDifficulty,
		MaxDifficulty:        maxDifficulty,
		HardwareAcceleration: hardwareAcceleration,
		SupportedDevices:     supportedDevices,
	}
}

// DefaultParams returns a default set of parameters
func DefaultParams() Params {
	return NewParams(
		"50000000000000000", // 0.05 Z tokens
		210000000,           // 210M blocks
		1000000,             // Min difficulty
		1000000000000,       // Max difficulty
		true,                // Hardware acceleration enabled
		[]string{"nvidia-a100", "nvidia-h100", "xilinx-fpga"},
	)
}

// ParamSetPairs get the params.ParamSet
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(KeyBlockReward, &p.BlockReward, validateBlockReward),
		paramtypes.NewParamSetPair(KeyHalvingInterval, &p.HalvingInterval, validateHalvingInterval),
		paramtypes.NewParamSetPair(KeyMinDifficulty, &p.MinDifficulty, validateMinDifficulty),
		paramtypes.NewParamSetPair(KeyMaxDifficulty, &p.MaxDifficulty, validateMaxDifficulty),
		paramtypes.NewParamSetPair(KeyHardwareAcceleration, &p.HardwareAcceleration, validateHardwareAcceleration),
		paramtypes.NewParamSetPair(KeySupportedDevices, &p.SupportedDevices, validateSupportedDevices),
	}
}

// Validate validates the set of params
func (p Params) Validate() error {
	if err := validateBlockReward(p.BlockReward); err != nil {
		return err
	}
	if err := validateHalvingInterval(p.HalvingInterval); err != nil {
		return err
	}
	if err := validateMinDifficulty(p.MinDifficulty); err != nil {
		return err
	}
	if err := validateMaxDifficulty(p.MaxDifficulty); err != nil {
		return err
	}
	if err := validateHardwareAcceleration(p.HardwareAcceleration); err != nil {
		return err
	}
	if err := validateSupportedDevices(p.SupportedDevices); err != nil {
		return err
	}
	return nil
}

// String implements the Stringer interface.
func (p Params) String() string {
	out, _ := yaml.Marshal(p)
	return string(out)
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

func validateMinDifficulty(i interface{}) error {
	v, ok := i.(uint64)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	if v == 0 {
		return fmt.Errorf("min difficulty must be positive: %d", v)
	}
	
	return nil
}

func validateMaxDifficulty(i interface{}) error {
	v, ok := i.(uint64)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	if v == 0 {
		return fmt.Errorf("max difficulty must be positive: %d", v)
	}
	
	return nil
}

func validateHardwareAcceleration(i interface{}) error {
	_, ok := i.(bool)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	return nil
}

func validateSupportedDevices(i interface{}) error {
	v, ok := i.([]string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	
	if len(v) == 0 {
		return fmt.Errorf("supported devices cannot be empty")
	}
	
	return nil
}

// Params defines the parameters for the utxo module
type Params struct {
	BlockReward          string   `json:"block_reward" yaml:"block_reward"`
	HalvingInterval      int64    `json:"halving_interval" yaml:"halving_interval"`
	MinDifficulty        uint64   `json:"min_difficulty" yaml:"min_difficulty"`
	MaxDifficulty        uint64   `json:"max_difficulty" yaml:"max_difficulty"`
	HardwareAcceleration bool     `json:"hardware_acceleration" yaml:"hardware_acceleration"`
	SupportedDevices     []string `json:"supported_devices" yaml:"supported_devices"`
}