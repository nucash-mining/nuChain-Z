package keeper

import (
	"encoding/json"
	"fmt"
	"strconv"
	
	"cosmossdk.io/log"
	"cosmossdk.io/store/prefix"
	storetypes "cosmossdk.io/store/types"
	
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	
	"nuchain/x/mining/types"
	
	// Cross-chain integrations
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
	
	// Cross-chain clients
	layerZeroClient *layerzero.Client
	altcoinClient   *altcoin.Client
	polygonRPC      string
	altcoinRPC      string
}

func NewKeeper(
	cdc codec.BinaryCodec,
	storeKey,
	memKey storetypes.StoreKey,
	ps paramtypes.Subspace,
	bankKeeper types.BankKeeper,
	logger log.Logger,
	layerZeroEndpoint string,
	altcoinRPC string,
	polygonRPC string,
) *Keeper {
	if !ps.HasKeyTable() {
		ps = ps.WithKeyTable(types.ParamKeyTable())
	}

	// Initialize LayerZero client for cross-chain messaging
	layerZeroClient, err := layerzero.NewClient(layerZeroEndpoint)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize LayerZero client: %v", err))
	}
	
	// Initialize Altcoinchain client
	altcoinClient, err := altcoin.NewClient(altcoinRPC)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize Altcoinchain client: %v", err))
	}

	return &Keeper{
		cdc:             cdc,
		storeKey:        storeKey,
		memKey:          memKey,
		paramstore:      ps,
		bankKeeper:      bankKeeper,
		logger:          logger,
		layerZeroClient: layerZeroClient,
		altcoinClient:   altcoinClient,
		polygonRPC:      polygonRPC,
		altcoinRPC:      altcoinRPC,
	}
}

// ProcessCrossChainMessage handles incoming messages from Altcoinchain/Polygon
func (k Keeper) ProcessCrossChainMessage(ctx sdk.Context, msg types.CrossChainMessage) error {
	switch msg.MessageType {
	case "mining_rig_update":
		return k.processMiningRigUpdate(ctx, msg)
	case "pool_operator_stake":
		return k.processPoolOperatorStake(ctx, msg)
	case "reward_distribution":
		return k.processRewardDistribution(ctx, msg)
	default:
		return fmt.Errorf("unknown message type: %s", msg.MessageType)
	}
}

// processMiningRigUpdate updates mining rig NFT data from external chains
func (k Keeper) processMiningRigUpdate(ctx sdk.Context, msg types.CrossChainMessage) error {
	var rigData types.MiningRigNFT
	if err := json.Unmarshal(msg.Payload, &rigData); err != nil {
		return fmt.Errorf("failed to unmarshal mining rig data: %w", err)
	}
	
	// Validate the mining rig data
	if rigData.HashPower == 0 {
		return fmt.Errorf("invalid hash power: %d", rigData.HashPower)
	}
	
	// Store the mining rig data
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.MiningRigKey))
	key := types.MiningRigKey + strconv.FormatUint(rigData.TokenId, 10) + "-" + rigData.ChainId
	
	bz := k.cdc.MustMarshal(&rigData)
	store.Set([]byte(key), bz)
	
	k.logger.Info("Updated mining rig NFT", 
		"token_id", rigData.TokenId,
		"chain_id", rigData.ChainId,
		"hash_power", rigData.HashPower,
		"watt_consumption", rigData.WattConsumption)
	
	return nil
}

// processPoolOperatorStake handles pool operator staking verification
func (k Keeper) processPoolOperatorStake(ctx sdk.Context, msg types.CrossChainMessage) error {
	var poolData types.PoolOperator
	if err := json.Unmarshal(msg.Payload, &poolData); err != nil {
		return fmt.Errorf("failed to unmarshal pool operator data: %w", err)
	}
	
	// Verify 100,000 WATT stake on source chain
	if !poolData.HasStakedWatt {
		return fmt.Errorf("pool operator has not staked required WATT tokens")
	}
	
	// Store pool operator data
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.PoolOperatorKey))
	key := types.PoolOperatorKey + poolData.Address + "-" + poolData.ChainId
	
	bz := k.cdc.MustMarshal(&poolData)
	store.Set([]byte(key), bz)
	
	k.logger.Info("Registered pool operator",
		"address", poolData.Address,
		"chain_id", poolData.ChainId,
		"total_hash_power", poolData.TotalHashPower)
	
	return nil
}

// CreateStakingNode creates a new staking node for nuChain validation
func (k Keeper) CreateStakingNode(ctx sdk.Context, operator sdk.AccAddress, moniker string, supportedChains []string) error {
	// Check if operator has staked 21 NU tokens
	stakedAmount := k.GetStakedAmount(ctx, operator)
	requiredStake := sdk.NewInt(21 * 1e18) // 21 NU tokens
	
	if stakedAmount.LT(requiredStake) {
		return fmt.Errorf("insufficient stake: required %s, got %s", requiredStake, stakedAmount)
	}
	
	stakingNode := types.StakingNode{
		Operator:        operator.String(),
		Moniker:         moniker,
		StakedNu:        stakedAmount.Uint64(),
		IsOnline:        true,
		LastBlockSigned: ctx.BlockHeight(),
		VotingPower:     k.CalculateVotingPower(stakedAmount),
		SupportedChains: supportedChains,
	}
	
	// Store staking node
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.StakingNodeKey))
	key := types.StakingNodeKey + operator.String()
	
	bz := k.cdc.MustMarshal(&stakingNode)
	store.Set([]byte(key), bz)
	
	k.logger.Info("Created staking node",
		"operator", operator.String(),
		"moniker", moniker,
		"voting_power", stakingNode.VotingPower)
	
	return nil
}

// DistributeBlockRewards distributes mining and staking rewards
func (k Keeper) DistributeBlockRewards(ctx sdk.Context, blockHeight int64) error {
	// Get all active mining rigs and calculate total hash power
	totalHashPower := k.GetTotalHashPower(ctx)
	if totalHashPower == 0 {
		return fmt.Errorf("no active mining rigs found")
	}
	
	// Calculate base reward (0.05 NU per block)
	baseReward := sdk.NewInt(50000000000000000) // 0.05 NU * 10^18
	
	// Apply halving mechanism
	halvingInterval := int64(210000000)
	halvings := blockHeight / halvingInterval
	if halvings > 0 {
		divisor := sdk.NewInt(1 << uint(halvings))
		baseReward = baseReward.Quo(divisor)
	}
	
	// Distribute rewards to miners based on hash power contribution
	if err := k.distributeMiningRewards(ctx, baseReward, totalHashPower); err != nil {
		return fmt.Errorf("failed to distribute mining rewards: %w", err)
	}
	
	// Distribute WATT rewards to online staking nodes
	if err := k.distributeStakingRewards(ctx, blockHeight); err != nil {
		return fmt.Errorf("failed to distribute staking rewards: %w", err)
	}
	
	return nil
}

// distributeMiningRewards distributes NU rewards to miners
func (k Keeper) distributeMiningRewards(ctx sdk.Context, totalReward sdk.Int, totalHashPower uint64) error {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.MiningRigKey))
	iterator := store.Iterator(nil, nil)
	defer iterator.Close()
	
	for ; iterator.Valid(); iterator.Next() {
		var rig types.MiningRigNFT
		k.cdc.MustUnmarshal(iterator.Value(), &rig)
		
		if !rig.IsActive {
			continue
		}
		
		// Calculate reward based on hash power contribution
		contribution := sdk.NewDec(int64(rig.HashPower)).Quo(sdk.NewDec(int64(totalHashPower)))
		reward := contribution.MulInt(totalReward).TruncateInt()
		
		if reward.IsPositive() {
			// Mint and send NU tokens
			coins := sdk.NewCoins(sdk.NewCoin("nu", reward))
			if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, coins); err != nil {
				return err
			}
			
			recipient, err := sdk.AccAddressFromBech32(rig.Owner)
			if err != nil {
				continue
			}
			
			if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, recipient, coins); err != nil {
				return err
			}
			
			k.logger.Info("Distributed mining reward",
				"recipient", rig.Owner,
				"amount", reward.String(),
				"hash_power", rig.HashPower)
		}
	}
	
	return nil
}

// distributeStakingRewards distributes WATT rewards to staking nodes
func (k Keeper) distributeStakingRewards(ctx sdk.Context, blockHeight int64) error {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.StakingNodeKey))
	iterator := store.Iterator(nil, nil)
	defer iterator.Close()
	
	// Base WATT reward per online staking node per block
	wattReward := sdk.NewInt(1000000000000000) // 0.001 WATT * 10^18
	
	for ; iterator.Valid(); iterator.Next() {
		var node types.StakingNode
		k.cdc.MustUnmarshal(iterator.Value(), &node)
		
		if !node.IsOnline {
			continue
		}
		
		// Send cross-chain message to distribute WATT rewards
		for _, chainId := range node.SupportedChains {
			if err := k.sendWattReward(ctx, node.Operator, chainId, wattReward); err != nil {
				k.logger.Error("Failed to send WATT reward",
					"operator", node.Operator,
					"chain_id", chainId,
					"error", err)
			}
		}
	}
	
	return nil
}

// sendWattReward sends WATT rewards to external chains via LayerZero
func (k Keeper) sendWattReward(ctx sdk.Context, operator string, chainId string, amount sdk.Int) error {
	payload := map[string]interface{}{
		"type":      "watt_reward",
		"recipient": operator,
		"amount":    amount.String(),
		"block_height": ctx.BlockHeight(),
	}
	
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	
	// Send via LayerZero to target chain
	return k.layerZeroClient.SendMessage(chainId, payloadBytes)
}

// GetTotalHashPower calculates total hash power from all active mining rigs
func (k Keeper) GetTotalHashPower(ctx sdk.Context) uint64 {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.KeyPrefix(types.MiningRigKey))
	iterator := store.Iterator(nil, nil)
	defer iterator.Close()
	
	var totalHashPower uint64
	for ; iterator.Valid(); iterator.Next() {
		var rig types.MiningRigNFT
		k.cdc.MustUnmarshal(iterator.Value(), &rig)
		
		if rig.IsActive {
			totalHashPower += rig.HashPower
		}
	}
	
	return totalHashPower
}

// GetStakedAmount returns the amount of NU tokens staked by an operator
func (k Keeper) GetStakedAmount(ctx sdk.Context, operator sdk.AccAddress) sdk.Int {
	// Implementation would check staking contract or module
	// For now, return a placeholder
	return sdk.NewInt(21 * 1e18) // 21 NU tokens
}

// CalculateVotingPower calculates voting power based on staked amount
func (k Keeper) CalculateVotingPower(stakedAmount sdk.Int) uint64 {
	// Simple calculation: 1 voting power per NU token
	return stakedAmount.Quo(sdk.NewInt(1e18)).Uint64()
}

// Logger returns the keeper's logger
func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return k.logger.With("module", fmt.Sprintf("x/%s", types.ModuleName))
}