package keeper

import (
	"encoding/binary"
	"fmt"
	"math/big"
	
	"cosmossdk.io/log"
	"cosmossdk.io/store/prefix"
	storetypes "cosmossdk.io/store/types"
	
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	
	"nuchain/x/pow/types"
	
	// External integrations
	cysic "github.com/cysic-labs/zk-sdk-go"
	layerzero "github.com/layerzerolabs/lz-sdk-go"
	altcoin "github.com/altcoinchain/sdk"
)

type Keeper struct {
	cdc        codec.BinaryCodec
	storeKey   storetypes.StoreKey
	memKey     storetypes.StoreKey
	paramstore paramtypes.Subspace
	bankKeeper types.BankKeeper
	logger     log.Logger
	
	// L1 Settlement
	altcoinClient *altcoin.Client
	
	// Cross-chain messaging
	layerZeroClient *layerzero.Client
}

func NewKeeper(
	cdc codec.BinaryCodec,
	storeKey,
	memKey storetypes.StoreKey,
	ps paramtypes.Subspace,
	bankKeeper types.BankKeeper,
	logger log.Logger,
	altcoinEndpoint string,
	layerZeroEndpoint string,
) *Keeper {
	if !ps.HasKeyTable() {
		ps = ps.WithKeyTable(types.ParamKeyTable())
	}

	// Initialize L1 client
	altcoinClient, err := altcoin.NewClient(altcoinEndpoint)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize Altcoinchain client: %v", err))
	}
	
	// Initialize LayerZero client
	layerZeroClient, err := layerzero.NewClient(layerZeroEndpoint)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize LayerZero client: %v", err))
	}

	return &Keeper{
		cdc:        cdc,
		storeKey:   storeKey,
		memKey:     memKey,
		paramstore: ps,
		bankKeeper: bankKeeper,
		logger:     logger,
		altcoinClient: altcoinClient,
		layerZeroClient: layerZeroClient,
	}
}

// VerifyZkProof verifies a zk-SNARK proof for mining
func (k Keeper) VerifyZkProof(ctx sdk.Context, proof []byte, publicInputs []byte) bool {
	return cysic.VerifyZkSNARK(proof, publicInputs, ctx.BlockHeader())
}

// MineBlock processes a mining attempt with zk-proof
func (k Keeper) MineBlock(ctx sdk.Context, miner sdk.AccAddress, proof []byte) error {
	difficulty := k.GetDifficulty(ctx)
	blockHeader := ctx.BlockHeader()
	
	publicInputs := k.PreparePublicInputs(blockHeader, difficulty, miner)
	
	if !k.VerifyZkProof(ctx, proof, publicInputs) {
		return fmt.Errorf("invalid zk-proof")
	}
	
	// Distribute reward and settle on L1
	if err := k.DistributeReward(ctx, miner); err != nil {
		return err
	}
	
	return k.SubmitToL1(ctx, blockHeader, proof)
}

// DistributeReward calculates and distributes NU tokens
func (k Keeper) DistributeReward(ctx sdk.Context, miner sdk.AccAddress) error {
	reward := k.CalculateReward(ctx.BlockHeight())
	
	// Mint NU tokens
	coins := sdk.NewCoins(sdk.NewCoin("nu", reward))
	if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, coins); err != nil {
		return err
	}
	
	return k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, miner, coins)
}

// CalculateReward implements halving mechanism for NU tokens
func (k Keeper) CalculateReward(height int64) sdk.Int {
	halvingInterval := int64(210000000) // 210M blocks
	halvings := height / halvingInterval
	
	// Initial reward: 0.05 NU * 10^18 wei
	initialReward := sdk.NewInt(50000000000000000)
	
	if halvings >= 64 {
		return sdk.ZeroInt()
	}
	
	divisor := sdk.NewInt(1 << uint(halvings))
	return initialReward.Quo(divisor)
}

// SubmitToL1 submits zk-rollup batch to Altcoinchain L1
func (k Keeper) SubmitToL1(ctx sdk.Context, blockHeader *storetypes.Context, proof []byte) error {
	// Create zk-rollup batch
	batch := &altcoin.RollupBatch{
		Height:      ctx.BlockHeight(),
		BlockHash:   blockHeader.BlockHeader().Hash().String(),
		Timestamp:   ctx.BlockTime().Unix(),
		ZkProof:     proof,
		TxCount:     len(ctx.TxBytes()),
	}
	
	// Submit to Altcoinchain L1
	return k.altcoinClient.SubmitRollupBatch(batch)
}

// BridgeToZChain handles cross-chain messaging to Z Blockchain
func (k Keeper) BridgeToZChain(ctx sdk.Context, recipient string, amount sdk.Int, memo string) error {
	// Create LayerZero message
	payload := layerzero.CrossChainPayload{
		Recipient: recipient,
		Amount:    amount.String(),
		Memo:      memo,
		ChainID:   "z-blockchain-1",
	}
	
	// Send via LayerZero
	return k.layerZeroClient.SendMessage("z-blockchain-1", payload)
}

// ProcessZChainMessage handles messages from zChain
func (k Keeper) ProcessZChainMessage(ctx sdk.Context, messageType string, payload []byte) error {
	switch messageType {
	case "zchain_mining_reward":
		return k.processZChainMiningReward(ctx, payload)
	case "block_sync":
		return k.processBlockSync(ctx, payload)
	default:
		return fmt.Errorf("unknown zChain message type: %s", messageType)
	}
}

// processZChainMiningReward processes mining reward notifications from zChain
func (k Keeper) processZChainMiningReward(ctx sdk.Context, payload []byte) error {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return err
	}
	
	miner := data["miner"].(string)
	reward := data["reward"].(string)
	hardwareId := data["hardware_id"].(string)
	blockHeight := int64(data["block_height"].(float64))
	
	k.logger.Info("Received zChain mining reward notification",
		"miner", miner,
		"reward", reward,
		"hardware_id", hardwareId,
		"zchain_block_height", blockHeight,
		"nuchain_block_height", ctx.BlockHeight())
	
	// Update mining statistics or trigger additional rewards
	return k.updateCrossChainMiningStats(ctx, miner, reward, hardwareId)
}

// processBlockSync handles block synchronization from zChain
func (k Keeper) processBlockSync(ctx sdk.Context, payload []byte) error {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return err
	}
	
	zchainHeight := int64(data["block_height"].(float64))
	zchainTime := int64(data["timestamp"].(float64))
	difficulty := uint64(data["difficulty"].(float64))
	
	k.logger.Info("Block synchronization from zChain",
		"zchain_height", zchainHeight,
		"nuchain_height", ctx.BlockHeight(),
		"time_diff", ctx.BlockTime().Unix()-zchainTime,
		"difficulty", difficulty)
	
	// Adjust nuChain parameters based on zChain performance if needed
	return nil
}

// updateCrossChainMiningStats updates mining statistics from cross-chain data
func (k Keeper) updateCrossChainMiningStats(ctx sdk.Context, miner string, reward string, hardwareId string) error {
	// Store cross-chain mining data for analytics and additional reward calculations
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix("cross_chain_mining"))
	
	key := fmt.Sprintf("%s:%d", miner, ctx.BlockHeight())
	value := fmt.Sprintf("%s:%s:%d", reward, hardwareId, ctx.BlockTime().Unix())
	
	store.Set([]byte(key), []byte(value))
	return nil
}

// PreparePublicInputs creates public inputs for zk-proof verification
func (k Keeper) PreparePublicInputs(header *storetypes.Context, difficulty uint64, miner sdk.AccAddress) []byte {
	data := make([]byte, 0, 64+8+20)
	
	// Block hash
	blockHash := header.BlockHeader().Hash()
	data = append(data, blockHash[:]...)
	
	// Previous block hash
	prevHash := header.BlockHeader().LastBlockId.Hash
	data = append(data, prevHash[:]...)
	
	// Difficulty
	diffBytes := make([]byte, 8)
	binary.BigEndian.PutUint64(diffBytes, difficulty)
	data = append(data, diffBytes...)
	
	// Miner address
	data = append(data, miner.Bytes()...)
	
	return data
}

// GetDifficulty retrieves current mining difficulty
func (k Keeper) GetDifficulty(ctx sdk.Context) uint64 {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DifficultyKey))
	bz := store.Get(types.DifficultyKey)
	if bz == nil {
		return 1000000
	}
	return binary.BigEndian.Uint64(bz)
}

// SetDifficulty sets mining difficulty
func (k Keeper) SetDifficulty(ctx sdk.Context, difficulty uint64) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.DifficultyKey))
	bz := make([]byte, 8)
	binary.BigEndian.PutUint64(bz, difficulty)
	store.Set(types.DifficultyKey, bz)
}

// Logger returns the keeper's logger
func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return k.logger.With("module", fmt.Sprintf("x/%s", types.ModuleName))
}