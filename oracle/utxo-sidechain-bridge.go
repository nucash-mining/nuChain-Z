package oracle

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/bank/keeper"
	
	// UTXO and hardware mining
	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/ethereum/go-ethereum/crypto"
	
	// Cysic integration
	cysic "github.com/cysic-labs/zk-sdk-go"
	
	// LayerZero for cross-chain
	layerzero "github.com/layerzerolabs/lz-sdk-go"
)

// UTXOSidechainBridge manages the UTXO sidechain integration with nuChain
type UTXOSidechainBridge struct {
	bankKeeper      keeper.Keeper
	cysicClient     *cysic.Client
	layerZeroClient *layerzero.Client
	
	// UTXO state
	utxoSet         map[string]*UTXO
	pendingTxs      map[string]*UTXOTransaction
	
	// Hardware mining
	hardwareMiners  map[string]*HardwareMiner
	miningPools     map[string]*MiningPool
	
	// Cross-chain coordination
	nuChainBlocks   chan *NuChainBlock
	zChainBlocks    chan *ZChainBlock
}

type UTXO struct {
	TxHash      string    `json:"tx_hash"`
	OutputIndex uint32    `json:"output_index"`
	Address     string    `json:"address"`
	Amount      sdk.Int   `json:"amount"`
	BlockHeight int64     `json:"block_height"`
	IsSpent     bool      `json:"is_spent"`
	ScriptPubkey []byte   `json:"script_pubkey"`
	CreatedAt   time.Time `json:"created_at"`
}

type UTXOTransaction struct {
	TxHash    string      `json:"tx_hash"`
	Inputs    []UTXOInput `json:"inputs"`
	Outputs   []UTXOOutput `json:"outputs"`
	Fee       sdk.Int     `json:"fee"`
	LockTime  uint64      `json:"lock_time"`
	ZkProof   []byte      `json:"zk_proof"`
	Timestamp time.Time   `json:"timestamp"`
}

type UTXOInput struct {
	PrevTxHash      string `json:"prev_tx_hash"`
	PrevOutputIndex uint32 `json:"prev_output_index"`
	ScriptSig       []byte `json:"script_sig"`
	Witness         []byte `json:"witness"`
}

type UTXOOutput struct {
	Amount       sdk.Int `json:"amount"`
	ScriptPubkey []byte  `json:"script_pubkey"`
	Address      string  `json:"address"`
}

type HardwareMiner struct {
	Address         string    `json:"address"`
	HardwareID      string    `json:"hardware_id"`
	HashPower       uint64    `json:"hash_power"`
	WattConsumption uint64    `json:"watt_consumption"`
	NuChainAddress  string    `json:"nuchain_address"`
	ZChainAddress   string    `json:"zchain_address"`
	IsActive        bool      `json:"is_active"`
	LastProof       time.Time `json:"last_proof"`
	TotalRewards    sdk.Int   `json:"total_rewards"`
}

type MiningPool struct {
	PoolID          string           `json:"pool_id"`
	Operator        string           `json:"operator"`
	Miners          []*HardwareMiner `json:"miners"`
	TotalHashPower  uint64           `json:"total_hash_power"`
	FeePercentage   uint64           `json:"fee_percentage"`
	PoolEndpoint    string           `json:"pool_endpoint"`
	IsActive        bool             `json:"is_active"`
}

type NuChainBlock struct {
	Height    int64     `json:"height"`
	Hash      string    `json:"hash"`
	Timestamp time.Time `json:"timestamp"`
	Rewards   sdk.Int   `json:"rewards"`
}

type ZChainBlock struct {
	Height      int64     `json:"height"`
	Hash        string    `json:"hash"`
	Timestamp   time.Time `json:"timestamp"`
	Difficulty  uint64    `json:"difficulty"`
	MinerReward sdk.Int   `json:"miner_reward"`
	HardwareID  string    `json:"hardware_id"`
}

// NewUTXOSidechainBridge creates a new UTXO sidechain bridge
func NewUTXOSidechainBridge(
	bankKeeper keeper.Keeper,
	cysicEndpoint string,
	layerZeroEndpoint string,
) *UTXOSidechainBridge {
	cysicClient, err := cysic.NewClient(cysicEndpoint)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize Cysic client: %v", err))
	}
	
	layerZeroClient, err := layerzero.NewClient(layerZeroEndpoint)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize LayerZero client: %v", err))
	}

	return &UTXOSidechainBridge{
		bankKeeper:      bankKeeper,
		cysicClient:     cysicClient,
		layerZeroClient: layerZeroClient,
		utxoSet:         make(map[string]*UTXO),
		pendingTxs:      make(map[string]*UTXOTransaction),
		hardwareMiners:  make(map[string]*HardwareMiner),
		miningPools:     make(map[string]*MiningPool),
		nuChainBlocks:   make(chan *NuChainBlock, 100),
		zChainBlocks:    make(chan *ZChainBlock, 100),
	}
}

// ProcessHardwareMining processes hardware-accelerated mining with Cysic
func (b *UTXOSidechainBridge) ProcessHardwareMining(ctx sdk.Context, minerAddress string, cysicProof []byte) error {
	miner, exists := b.hardwareMiners[minerAddress]
	if !exists {
		return fmt.Errorf("hardware miner not registered: %s", minerAddress)
	}
	
	// Verify Cysic zk-proof
	publicInputs := b.prepareMiningInputs(ctx, miner)
	if !b.cysicClient.VerifyProof(cysicProof, publicInputs) {
		return fmt.Errorf("invalid Cysic mining proof")
	}
	
	// Calculate mining reward
	baseReward := b.calculateBaseReward(ctx.BlockHeight())
	hardwareBonus := b.getHardwareBonus(miner.HardwareID)
	totalReward := baseReward.Add(hardwareBonus)
	
	// Distribute Z tokens on UTXO sidechain
	if err := b.distributeZTokens(ctx, miner.ZChainAddress, totalReward); err != nil {
		return fmt.Errorf("failed to distribute Z tokens: %w", err)
	}
	
	// Coordinate with nuChain for NU token rewards
	if err := b.coordinateNuChainReward(ctx, miner, totalReward); err != nil {
		return fmt.Errorf("failed to coordinate nuChain reward: %w", err)
	}
	
	// Update miner state
	miner.LastProof = ctx.BlockTime()
	miner.TotalRewards = miner.TotalRewards.Add(totalReward)
	
	return nil
}

// prepareMiningInputs prepares public inputs for Cysic mining proof
func (b *UTXOSidechainBridge) prepareMiningInputs(ctx sdk.Context, miner *HardwareMiner) []byte {
	blockHeader := ctx.BlockHeader()
	
	data := struct {
		BlockHash      []byte `json:"block_hash"`
		PrevBlockHash  []byte `json:"prev_block_hash"`
		BlockHeight    int64  `json:"block_height"`
		Timestamp      int64  `json:"timestamp"`
		MinerAddress   string `json:"miner_address"`
		HardwareID     string `json:"hardware_id"`
		HashPower      uint64 `json:"hash_power"`
		WattConsumption uint64 `json:"watt_consumption"`
	}{
		BlockHash:       blockHeader.Hash(),
		PrevBlockHash:   blockHeader.LastBlockId.Hash,
		BlockHeight:     ctx.BlockHeight(),
		Timestamp:       ctx.BlockTime().Unix(),
		MinerAddress:    miner.Address,
		HardwareID:      miner.HardwareID,
		HashPower:       miner.HashPower,
		WattConsumption: miner.WattConsumption,
	}
	
	serialized, _ := json.Marshal(data)
	hash := sha256.Sum256(serialized)
	return hash[:]
}

// calculateBaseReward calculates base mining reward with halving
func (b *UTXOSidechainBridge) calculateBaseReward(blockHeight int64) sdk.Int {
	halvingInterval := int64(210000000) // 210M blocks
	halvings := blockHeight / halvingInterval
	
	// Initial reward: 0.05 Z * 10^18 wei
	initialReward := sdk.NewInt(50000000000000000)
	
	if halvings >= 64 {
		return sdk.ZeroInt()
	}
	
	divisor := sdk.NewInt(1 << uint(halvings))
	return initialReward.Quo(divisor)
}

// getHardwareBonus returns bonus for hardware acceleration
func (b *UTXOSidechainBridge) getHardwareBonus(hardwareID string) sdk.Int {
	bonuses := map[string]int64{
		"nvidia-rtx-4090": 5000000000000000,  // 0.005 Z
		"nvidia-a100":     5000000000000000,  // 0.005 Z
		"nvidia-h100":     10000000000000000, // 0.01 Z
		"xilinx-fpga":     15000000000000000, // 0.015 Z
		"amd-rx-7900-xtx": 5500000000000000,  // 0.0055 Z
	}
	
	if bonus, exists := bonuses[hardwareID]; exists {
		return sdk.NewInt(bonus)
	}
	
	return sdk.ZeroInt()
}

// distributeZTokens mints and distributes Z tokens on UTXO sidechain
func (b *UTXOSidechainBridge) distributeZTokens(ctx sdk.Context, zChainAddress string, amount sdk.Int) error {
	// Convert to Cosmos address
	recipient, err := sdk.AccAddressFromBech32(zChainAddress)
	if err != nil {
		return fmt.Errorf("invalid zChain address: %w", err)
	}
	
	// Mint Z tokens
	coins := sdk.NewCoins(sdk.NewCoin("z", amount))
	if err := b.bankKeeper.MintCoins(ctx, "utxo_bridge", coins); err != nil {
		return err
	}
	
	// Send to recipient
	return b.bankKeeper.SendCoinsFromModuleToAccount(ctx, "utxo_bridge", recipient, coins)
}

// coordinateNuChainReward coordinates NU token rewards with nuChain
func (b *UTXOSidechainBridge) coordinateNuChainReward(ctx sdk.Context, miner *HardwareMiner, zReward sdk.Int) error {
	// Calculate proportional NU reward
	nuReward := zReward // 1:1 ratio for now
	
	// Send cross-chain message to nuChain
	payload := map[string]interface{}{
		"type":             "hardware_mining_reward",
		"miner_address":    miner.Address,
		"nuchain_address":  miner.NuChainAddress,
		"z_reward":         zReward.String(),
		"nu_reward":        nuReward.String(),
		"hardware_id":      miner.HardwareID,
		"block_height":     ctx.BlockHeight(),
		"timestamp":        ctx.BlockTime().Unix(),
	}
	
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	
	// Send via LayerZero
	return b.layerZeroClient.SendMessage("nuchain-1", payloadBytes)
}

// ProcessUTXOTransaction processes a UTXO transaction on the sidechain
func (b *UTXOSidechainBridge) ProcessUTXOTransaction(ctx sdk.Context, tx *UTXOTransaction) error {
	// Validate transaction inputs
	totalInput := sdk.ZeroInt()
	for _, input := range tx.Inputs {
		utxoKey := fmt.Sprintf("%s:%d", input.PrevTxHash, input.PrevOutputIndex)
		utxo, exists := b.utxoSet[utxoKey]
		if !exists {
			return fmt.Errorf("UTXO not found: %s", utxoKey)
		}
		
		if utxo.IsSpent {
			return fmt.Errorf("UTXO already spent: %s", utxoKey)
		}
		
		// Verify script signature
		if !b.verifyScriptSig(input.ScriptSig, utxo.ScriptPubkey, tx.TxHash) {
			return fmt.Errorf("invalid script signature")
		}
		
		totalInput = totalInput.Add(utxo.Amount)
		
		// Mark as spent
		utxo.IsSpent = true
	}
	
	// Validate outputs and create new UTXOs
	totalOutput := sdk.ZeroInt()
	for i, output := range tx.Outputs {
		totalOutput = totalOutput.Add(output.Amount)
		
		// Create new UTXO
		utxoKey := fmt.Sprintf("%s:%d", tx.TxHash, i)
		newUTXO := &UTXO{
			TxHash:       tx.TxHash,
			OutputIndex:  uint32(i),
			Address:      output.Address,
			Amount:       output.Amount,
			BlockHeight:  ctx.BlockHeight(),
			IsSpent:      false,
			ScriptPubkey: output.ScriptPubkey,
			CreatedAt:    ctx.BlockTime(),
		}
		
		b.utxoSet[utxoKey] = newUTXO
	}
	
	// Validate fee
	if !totalInput.Equal(totalOutput.Add(tx.Fee)) {
		return fmt.Errorf("input/output mismatch")
	}
	
	return nil
}

// RegisterHardwareMiner registers a new hardware miner
func (b *UTXOSidechainBridge) RegisterHardwareMiner(
	ctx sdk.Context,
	address string,
	hardwareID string,
	hashPower uint64,
	wattConsumption uint64,
	nuChainAddress string,
	zChainAddress string,
) error {
	miner := &HardwareMiner{
		Address:         address,
		HardwareID:      hardwareID,
		HashPower:       hashPower,
		WattConsumption: wattConsumption,
		NuChainAddress:  nuChainAddress,
		ZChainAddress:   zChainAddress,
		IsActive:        true,
		LastProof:       ctx.BlockTime(),
		TotalRewards:    sdk.ZeroInt(),
	}
	
	b.hardwareMiners[address] = miner
	
	ctx.Logger().Info("Registered hardware miner",
		"address", address,
		"hardware_id", hardwareID,
		"hash_power", hashPower,
		"nuchain_address", nuChainAddress,
		"zchain_address", zChainAddress)
	
	return nil
}

// StartBlockCoordination starts coordinated block production between chains
func (b *UTXOSidechainBridge) StartBlockCoordination(ctx context.Context) error {
	go b.coordinateBlocks(ctx)
	return nil
}

// coordinateBlocks coordinates 0.5-second block production between nuChain and zChain
func (b *UTXOSidechainBridge) coordinateBlocks(ctx context.Context) {
	ticker := time.NewTicker(500 * time.Millisecond) // 0.5 second blocks
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			// Trigger coordinated block production
			b.triggerCoordinatedMining()
			
		case nuBlock := <-b.nuChainBlocks:
			// Process nuChain block
			b.processNuChainBlock(nuBlock)
			
		case zBlock := <-b.zChainBlocks:
			// Process zChain block
			b.processZChainBlock(zBlock)
			
		case <-ctx.Done():
			return
		}
	}
}

// triggerCoordinatedMining triggers mining on both chains simultaneously
func (b *UTXOSidechainBridge) triggerCoordinatedMining() {
	timestamp := time.Now()
	
	// Generate Cysic proofs for all active miners
	for _, miner := range b.hardwareMiners {
		if !miner.IsActive {
			continue
		}
		
		go b.generateCysicMiningProof(miner, timestamp)
	}
}

// generateCysicMiningProof generates a Cysic zk-proof for hardware mining
func (b *UTXOSidechainBridge) generateCysicMiningProof(miner *HardwareMiner, timestamp time.Time) {
	// Prepare mining challenge
	challenge := b.prepareMiningChallenge(miner, timestamp)
	
	// Generate Cysic proof
	proof, err := b.cysicClient.GenerateMiningProof(challenge, miner.HardwareID)
	if err != nil {
		fmt.Printf("Failed to generate Cysic proof for %s: %v\n", miner.Address, err)
		return
	}
	
	// Submit to both chains
	b.submitToNuChain(miner, proof, timestamp)
	b.submitToZChain(miner, proof, timestamp)
}

// prepareMiningChallenge prepares the mining challenge for Cysic proof generation
func (b *UTXOSidechainBridge) prepareMiningChallenge(miner *HardwareMiner, timestamp time.Time) *cysic.MiningChallenge {
	return &cysic.MiningChallenge{
		MinerAddress:    miner.Address,
		HardwareID:      miner.HardwareID,
		HashPower:       miner.HashPower,
		WattConsumption: miner.WattConsumption,
		Timestamp:       timestamp.Unix(),
		Difficulty:      1000000, // Current difficulty
		ASICResistant:   true,
	}
}

// submitToNuChain submits mining proof to nuChain for NU rewards
func (b *UTXOSidechainBridge) submitToNuChain(miner *HardwareMiner, proof *cysic.Proof, timestamp time.Time) {
	payload := map[string]interface{}{
		"type":             "cysic_mining_proof",
		"miner_address":    miner.Address,
		"nuchain_address":  miner.NuChainAddress,
		"hardware_id":      miner.HardwareID,
		"hash_power":       miner.HashPower,
		"watt_consumption": miner.WattConsumption,
		"cysic_proof":      hex.EncodeToString(proof.Bytes()),
		"timestamp":        timestamp.Unix(),
	}
	
	payloadBytes, _ := json.Marshal(payload)
	
	// Send to nuChain
	if err := b.layerZeroClient.SendMessage("nuchain-1", payloadBytes); err != nil {
		fmt.Printf("Failed to submit to nuChain: %v\n", err)
	}
}

// submitToZChain submits mining proof to zChain UTXO sidechain for Z rewards
func (b *UTXOSidechainBridge) submitToZChain(miner *HardwareMiner, proof *cysic.Proof, timestamp time.Time) {
	payload := map[string]interface{}{
		"type":             "utxo_mining_proof",
		"miner_address":    miner.Address,
		"zchain_address":   miner.ZChainAddress,
		"hardware_id":      miner.HardwareID,
		"cysic_proof":      hex.EncodeToString(proof.Bytes()),
		"timestamp":        timestamp.Unix(),
	}
	
	payloadBytes, _ := json.Marshal(payload)
	
	// Send to zChain
	if err := b.layerZeroClient.SendMessage("z-blockchain-1", payloadBytes); err != nil {
		fmt.Printf("Failed to submit to zChain: %v\n", err)
	}
}

// processNuChainBlock processes a new nuChain block
func (b *UTXOSidechainBridge) processNuChainBlock(block *NuChainBlock) {
	fmt.Printf("📦 nuChain Block %d: %s\n", block.Height, block.Hash)
	
	// Distribute NU rewards to miners based on hash power contribution
	b.distributeNuRewards(block)
}

// processZChainBlock processes a new zChain block
func (b *UTXOSidechainBridge) processZChainBlock(block *ZChainBlock) {
	fmt.Printf("⛏️ zChain Block %d: %s (Difficulty: %d)\n", 
		block.Height, block.Hash, block.Difficulty)
	
	// Update UTXO set and process hardware mining rewards
	b.processHardwareMiningRewards(block)
}

// distributeNuRewards distributes NU token rewards based on hash power
func (b *UTXOSidechainBridge) distributeNuRewards(block *NuChainBlock) {
	totalHashPower := uint64(0)
	for _, miner := range b.hardwareMiners {
		if miner.IsActive {
			totalHashPower += miner.HashPower
		}
	}
	
	if totalHashPower == 0 {
		return
	}
	
	// Base reward: 0.05 NU per block
	baseReward := sdk.NewInt(50000000000000000)
	
	for _, miner := range b.hardwareMiners {
		if !miner.IsActive {
			continue
		}
		
		// Calculate proportional reward
		contribution := sdk.NewDec(int64(miner.HashPower)).Quo(sdk.NewDec(int64(totalHashPower)))
		minerReward := contribution.MulInt(baseReward).TruncateInt()
		
		miner.TotalRewards = miner.TotalRewards.Add(minerReward)
		
		fmt.Printf("💰 NU Reward: %s → %s (%s NU)\n", 
			miner.Address, miner.NuChainAddress, minerReward.String())
	}
}

// processHardwareMiningRewards processes hardware mining rewards on zChain
func (b *UTXOSidechainBridge) processHardwareMiningRewards(block *ZChainBlock) {
	// Find the miner who solved this block
	for _, miner := range b.hardwareMiners {
		if miner.HardwareID == block.HardwareID {
			// Award Z tokens + hardware bonus
			totalReward := block.MinerReward.Add(b.getHardwareBonus(miner.HardwareID))
			miner.TotalRewards = miner.TotalRewards.Add(totalReward)
			
			fmt.Printf("⚡ Z Reward: %s → %s (%s Z + bonus)\n",
				miner.Address, miner.ZChainAddress, totalReward.String())
			break
		}
	}
}

// verifyScriptSig verifies UTXO script signature
func (b *UTXOSidechainBridge) verifyScriptSig(scriptSig []byte, scriptPubkey []byte, txHash string) bool {
	if len(scriptSig) < 64 {
		return false
	}
	
	signature := scriptSig[:64]
	pubkey := scriptSig[64:]
	
	hash := sha256.Sum256([]byte(txHash))
	return crypto.VerifySignature(pubkey, hash[:], signature)
}

// GetMiningStats returns mining statistics
func (b *UTXOSidechainBridge) GetMiningStats() map[string]interface{} {
	totalHashPower := uint64(0)
	totalWattConsumption := uint64(0)
	totalRewards := sdk.ZeroInt()
	activeMiners := 0
	
	for _, miner := range b.hardwareMiners {
		if miner.IsActive {
			activeMiners++
			totalHashPower += miner.HashPower
			totalWattConsumption += miner.WattConsumption
			totalRewards = totalRewards.Add(miner.TotalRewards)
		}
	}
	
	return map[string]interface{}{
		"active_miners":          activeMiners,
		"total_hash_power":       totalHashPower,
		"total_watt_consumption": totalWattConsumption,
		"total_rewards":          totalRewards.String(),
		"utxo_count":            len(b.utxoSet),
		"pending_transactions":   len(b.pendingTxs),
		"mining_pools":          len(b.miningPools),
	}
}