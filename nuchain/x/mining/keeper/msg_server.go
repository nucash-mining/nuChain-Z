package keeper

import (
	"context"
	"strconv"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	
	"nuchain/x/mining/types"
)

type msgServer struct {
	Keeper
}

// NewMsgServerImpl returns an implementation of the MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

var _ types.MsgServer = msgServer{}

// CreateStakingNode creates a new staking node for nuChain validation
func (k msgServer) CreateStakingNode(goCtx context.Context, msg *types.MsgCreateStakingNode) (*types.MsgCreateStakingNodeResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate the message
	if msg.Creator == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "creator cannot be empty")
	}
	
	if msg.Moniker == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "moniker cannot be empty")
	}
	
	if len(msg.SupportedChains) == 0 {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "supported chains cannot be empty")
	}

	// Convert creator address
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return nil, sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}

	// Create the staking node
	if err := k.Keeper.CreateStakingNode(ctx, creator, msg.Moniker, msg.SupportedChains); err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeCreateStakingNode,
			sdk.NewAttribute(types.AttributeKeyCreator, msg.Creator),
			sdk.NewAttribute(types.AttributeKeyMoniker, msg.Moniker),
			sdk.NewAttribute(types.AttributeKeySupportedChains, strings.Join(msg.SupportedChains, ",")),
		),
	)

	return &types.MsgCreateStakingNodeResponse{}, nil
}

// ProcessCrossChainMessage processes incoming cross-chain messages
func (k msgServer) ProcessCrossChainMessage(goCtx context.Context, msg *types.MsgProcessCrossChainMessage) (*types.MsgProcessCrossChainMessageResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate the message
	if msg.Creator == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "creator cannot be empty")
	}
	
	if msg.SourceChain == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "source chain cannot be empty")
	}
	
	if msg.MessageType == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "message type cannot be empty")
	}

	// Create cross-chain message
	crossChainMsg := types.CrossChainMessage{
		SourceChain: msg.SourceChain,
		MessageType: msg.MessageType,
		Payload:     msg.Payload,
		Sender:      msg.Creator,
		Nonce:       msg.Nonce,
		Timestamp:   ctx.BlockTime().Unix(),
	}

	// Process the message
	if err := k.Keeper.ProcessCrossChainMessage(ctx, crossChainMsg); err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeProcessCrossChainMessage,
			sdk.NewAttribute(types.AttributeKeySourceChain, msg.SourceChain),
			sdk.NewAttribute(types.AttributeKeyMessageType, msg.MessageType),
			sdk.NewAttribute(types.AttributeKeyNonce, strconv.FormatUint(msg.Nonce, 10)),
		),
	)

	return &types.MsgProcessCrossChainMessageResponse{}, nil
}

// UpdateMiningRig updates mining rig configuration from external chains
func (k msgServer) UpdateMiningRig(goCtx context.Context, msg *types.MsgUpdateMiningRig) (*types.MsgUpdateMiningRigResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate the message
	if msg.Creator == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "creator cannot be empty")
	}
	
	if msg.TokenId == 0 {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "token ID cannot be zero")
	}
	
	if msg.ChainId == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "chain ID cannot be empty")
	}

	// Create mining rig NFT data
	rigData := types.MiningRigNFT{
		TokenId:         msg.TokenId,
		Owner:           msg.Creator,
		ChainId:         msg.ChainId,
		ContractAddress: msg.ContractAddress,
		HashPower:       msg.HashPower,
		WattConsumption: msg.WattConsumption,
		IsActive:        msg.IsActive,
		LastUpdated:     ctx.BlockTime().Unix(),
	}

	// Create cross-chain message for mining rig update
	crossChainMsg := types.CrossChainMessage{
		SourceChain: msg.ChainId,
		MessageType: "mining_rig_update",
		Payload:     k.cdc.MustMarshal(&rigData),
		Sender:      msg.Creator,
		Nonce:       0, // Will be set by the keeper
		Timestamp:   ctx.BlockTime().Unix(),
	}

	// Process the mining rig update
	if err := k.Keeper.ProcessCrossChainMessage(ctx, crossChainMsg); err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeUpdateMiningRig,
			sdk.NewAttribute(types.AttributeKeyTokenId, strconv.FormatUint(msg.TokenId, 10)),
			sdk.NewAttribute(types.AttributeKeyChainId, msg.ChainId),
			sdk.NewAttribute(types.AttributeKeyHashPower, strconv.FormatUint(msg.HashPower, 10)),
			sdk.NewAttribute(types.AttributeKeyWattConsumption, strconv.FormatUint(msg.WattConsumption, 10)),
		),
	)

	return &types.MsgUpdateMiningRigResponse{}, nil
}