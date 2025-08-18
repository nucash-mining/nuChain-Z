package oracle

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/bank/keeper"
	
	// Cysic integration
	cysic "github.com/cysic-labs/zk-sdk-go"
)

// OracleKeeper handles cross-chain mining data and block rewards
type OracleKeeper struct {
	bankKeeper    keeper.Keeper
	cysicVerifier *cysic.Verifier
	
	// Mining state
	miners        map[string]*MinerState
	totalHashPower uint64
	blockRewards   map[int64]*BlockReward
}

type MinerState struct {
	Address            string   `json:"address"`
	NuChainAddress     string   `json:"nuchain_address"`
	RigIds             []uint64 `json:"rig_ids"`
	TotalHashPower     uint64   `json:"total_hash_power"`
	TotalWattCost      uint64   `json:"total_watt_cost"`
	SourceChain        string   `json:"source_chain"`
	LastProofTime      int64    `json:"last_proof_time"`
	IsActive           bool     `json:"is_active"`
	PendingRewards     sdk.Int  `json:"pending_rewards"`
}

type BlockReward struct {
	BlockHeight    int64                    `json:"block_height"`
	TotalReward    sdk.Int                  `json:"total_reward"`
	Distributions  map[string]sdk.Int       `json:"distributions"`
	WattConsumption map[string]uint64       `json:"watt_consumption"`
	Timestamp      int64                    `json:"timestamp"`
	CysicProofs    map[string][]byte        `json:"cysic_proofs"`
}

type CrossChainMiningMessage struct {
	Type              string   `json:"type"`
	MinerAddress      string   `json:"miner_address"`
	NuChainAddress    string   `json:"nuchain_address"`
	RigIds            []uint64 `json:"rig_ids"`
	TotalHashPower    uint64   `json:"total_hash_power"`
	TotalWattCost     uint64   `json:"total_watt_cost"`
	SourceChain       string   `json:"source_chain"`
	CysicProof        []byte   `json:"cysic_proof"`
	PublicInputs      []byte   `json:"public_inputs"`
	BlockHeight       int64    `json:"block_height"`
	Timestamp         int64    `json:"timestamp"`
}

// NewOracleKeeper creates a new oracle keeper
func NewOracleKeeper(bankKeeper keeper.Keeper, cysicEndpoint string) *OracleKeeper {
	verifier, err := cysic.NewVerifier(cysicEndpoint)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize Cysic verifier: %v", err))
	}

	return &OracleKeeper{
		bankKeeper:    bankKeeper,
		cysicVerifier: verifier,
		miners:        make(map[string]*MinerState),
		blockRewards:  make(map[int64]*BlockReward),
	}
}

// ProcessCrossChainMiningMessage processes mining messages from Altcoinchain/Polygon
func (k *OracleKeeper) ProcessCrossChainMiningMessage(ctx sdk.Context, msgBytes []byte) error {
	var msg CrossChainMiningMessage
	if err := json.Unmarshal(msgBytes, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal mining message: %w", err)
	}

	switch msg.Type {
	case "miner_registration":
		return k.processMinerRegistration(ctx, msg)
	case "mining_reward_claim":
		return k.processMiningRewardClaim(ctx, msg)
	case "cysic_proof_submission":
		return k.processCysicProofSubmission(ctx, msg)
	default:
		return fmt.Errorf("unknown message type: %s", msg.Type)
	}
}

// processMinerRegistration registers a new miner from external chains
func (k *OracleKeeper) processMinerRegistration(ctx sdk.Context, msg CrossChainMiningMessage) error {
	minerKey := fmt.Sprintf("%s:%s", msg.SourceChain, msg.MinerAddress)
	
	// Verify miner doesn't already exist
	if _, exists := k.miners[minerKey]; exists {
		return fmt.Errorf("miner already registered: %s", minerKey)
	}
	
	// Create miner state
	miner := &MinerState{
		Address:        msg.MinerAddress,
		NuChainAddress: msg.NuChainAddress,
		RigIds:         msg.RigIds,
		TotalHashPower: msg.TotalHashPower,
		TotalWattCost:  msg.TotalWattCost,
		SourceChain:    msg.SourceChain,
		LastProofTime:  ctx.BlockTime().Unix(),
		IsActive:       true,
		PendingRewards: sdk.ZeroInt(),
	}
	
	k.miners[minerKey] = miner
	k.totalHashPower += msg.TotalHashPower
	
	ctx.Logger().Info("Registered cross-chain miner",
		"miner", msg.MinerAddress,
		"source_chain", msg.SourceChain,
		"hash_power", msg.TotalHashPower,
		"nuchain_address", msg.NuChainAddress)
	
	return nil
}

// processCysicProofSubmission processes Cysic zk-proof submissions
func (k *OracleKeeper) processCysicProofSubmission(ctx sdk.Context, msg CrossChainMiningMessage) error {
	minerKey := fmt.Sprintf("%s:%s", msg.SourceChain, msg.MinerAddress)
	
	miner, exists := k.miners[minerKey]
	if !exists {
		return fmt.Errorf("miner not registered: %s", minerKey)
	}
	
	// Verify Cysic zk-proof
	if !k.verifyCysicProof(msg.CysicProof, msg.PublicInputs) {
		return fmt.Errorf("invalid Cysic proof for miner %s", msg.MinerAddress)
	}
	
	// Calculate block reward
	reward := k.calculateMinerReward(ctx, miner, msg.BlockHeight)
	
	// Distribute NU tokens
	if err := k.distributeNuTokens(ctx, miner.NuChainAddress, reward); err != nil {
		return fmt.Errorf("failed to distribute NU tokens: %w", err)
	}
	
	// Update miner state
	miner.LastProofTime = ctx.BlockTime().Unix()
	miner.PendingRewards = miner.PendingRewards.Add(reward)
	
	// Store block reward data
	k.storeBlockReward(ctx, msg.BlockHeight, miner, reward)
	
	ctx.Logger().Info("Processed Cysic mining proof",
		"miner", msg.MinerAddress,
		"reward", reward.String(),
		"block_height", msg.BlockHeight)
	
	return nil
}

// verifyCysicProof verifies a Cysic zk-SNARK proof
func (k *OracleKeeper) verifyCysicProof(proof []byte, publicInputs []byte) bool {
	return k.cysicVerifier.VerifyProof(proof, publicInputs)
}

// calculateMinerReward calculates NU token reward based on hash power contribution
func (k *OracleKeeper) calculateMinerReward(ctx sdk.Context, miner *MinerState, blockHeight int64) sdk.Int {
	// Base reward: 0.05 NU per block
	baseReward := sdk.NewInt(50000000000000000) // 0.05 NU * 10^18
	
	// Apply halving mechanism
	halvingInterval := int64(210000000)
	halvings := blockHeight / halvingInterval
	if halvings > 0 {
		divisor := sdk.NewInt(1 << uint(halvings))
		baseReward = baseReward.Quo(divisor)
	}
	
	// Calculate miner's share based on hash power
	if k.totalHashPower == 0 {
		return baseReward // Only miner gets full reward
	}
	
	hashPowerShare := sdk.NewDec(int64(miner.TotalHashPower)).Quo(sdk.NewDec(int64(k.totalHashPower)))
	minerReward := hashPowerShare.MulInt(baseReward).TruncateInt()
	
	return minerReward
}

// distributeNuTokens mints and distributes NU tokens to miner
func (k *OracleKeeper) distributeNuTokens(ctx sdk.Context, nuChainAddress string, amount sdk.Int) error {
	// Convert nuChain address to Cosmos address
	recipient, err := sdk.AccAddressFromBech32(nuChainAddress)
	if err != nil {
		return fmt.Errorf("invalid nuChain address: %w", err)
	}
	
	// Mint NU tokens
	coins := sdk.NewCoins(sdk.NewCoin("nu", amount))
	if err := k.bankKeeper.MintCoins(ctx, "oracle", coins); err != nil {
		return err
	}
	
	// Send to recipient
	return k.bankKeeper.SendCoinsFromModuleToAccount(ctx, "oracle", recipient, coins)
}

// storeBlockReward stores block reward data for analytics
func (k *OracleKeeper) storeBlockReward(ctx sdk.Context, blockHeight int64, miner *MinerState, reward sdk.Int) {
	if k.blockRewards[blockHeight] == nil {
		k.blockRewards[blockHeight] = &BlockReward{
			BlockHeight:     blockHeight,
			TotalReward:     sdk.ZeroInt(),
			Distributions:   make(map[string]sdk.Int),
			WattConsumption: make(map[string]uint64),
			Timestamp:       ctx.BlockTime().Unix(),
			CysicProofs:     make(map[string][]byte),
		}
	}
	
	blockReward := k.blockRewards[blockHeight]
	blockReward.TotalReward = blockReward.TotalReward.Add(reward)
	blockReward.Distributions[miner.Address] = reward
	blockReward.WattConsumption[miner.Address] = miner.TotalWattCost
}

// GetMinerStats returns statistics for a specific miner
func (k *OracleKeeper) GetMinerStats(minerAddress string, sourceChain string) (*MinerState, bool) {
	minerKey := fmt.Sprintf("%s:%s", sourceChain, minerAddress)
	miner, exists := k.miners[minerKey]
	return miner, exists
}

// GetNetworkStats returns overall network statistics
func (k *OracleKeeper) GetNetworkStats() map[string]interface{} {
	totalRewards := sdk.ZeroInt()
	totalWattConsumption := uint64(0)
	
	for _, miner := range k.miners {
		totalRewards = totalRewards.Add(miner.PendingRewards)
		totalWattConsumption += miner.TotalWattCost
	}
	
	return map[string]interface{}{
		"total_miners":          len(k.miners),
		"total_hash_power":      k.totalHashPower,
		"total_rewards":         totalRewards.String(),
		"total_watt_consumption": totalWattConsumption,
		"active_chains":         []string{"altcoinchain-2330", "polygon-137"},
		"block_rewards_count":   len(k.blockRewards),
	}
}

// ProcessBlockRewards processes all pending block rewards for current block
func (k *OracleKeeper) ProcessBlockRewards(ctx sdk.Context) error {
	currentHeight := ctx.BlockHeight()
	
	// Process rewards for all active miners
	for minerKey, miner := range k.miners {
		if !miner.IsActive {
			continue
		}
		
		// Check if miner has submitted proof recently (within last 10 blocks)
		if currentHeight-miner.LastProofTime > 10 {
			ctx.Logger().Warn("Miner inactive, skipping reward",
				"miner", minerKey,
				"last_proof", miner.LastProofTime,
				"current_height", currentHeight)
			continue
		}
		
		// Calculate and distribute reward
		reward := k.calculateMinerReward(ctx, miner, currentHeight)
		if reward.IsPositive() {
			if err := k.distributeNuTokens(ctx, miner.NuChainAddress, reward); err != nil {
				ctx.Logger().Error("Failed to distribute reward",
					"miner", minerKey,
					"error", err)
				continue
			}
			
			miner.PendingRewards = miner.PendingRewards.Add(reward)
		}
	}
	
	return nil
}

// StartCysicMiningPool starts the Cysic hardware mining pool
func (k *OracleKeeper) StartCysicMiningPool(ctx sdk.Context, poolConfig map[string]interface{}) error {
	ctx.Logger().Info("Starting Cysic hardware mining pool",
		"hardware_devices", poolConfig["hardware_devices"],
		"pool_endpoint", poolConfig["pool_endpoint"],
		"target_block_time", "500ms")
	
	// Initialize Cysic mining pool with hardware acceleration
	// This would integrate with actual Cysic hardware mining infrastructure
	
	return nil
}