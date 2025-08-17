package keeper

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strconv"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	
	"z-blockchain/x/utxo/types"
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

// SendUTXO processes a UTXO transaction
func (k msgServer) SendUTXO(goCtx context.Context, msg *types.MsgSendUTXO) (*types.MsgSendUTXOResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate the message
	if msg.Creator == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "creator cannot be empty")
	}
	
	if len(msg.Inputs) == 0 {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "transaction must have inputs")
	}
	
	if len(msg.Outputs) == 0 {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "transaction must have outputs")
	}

	// Generate transaction hash
	txHash := k.generateTxHash(msg)

	// Create UTXO transaction
	utxoTx := types.UTXOTransaction{
		TxHash:    txHash,
		Inputs:    msg.Inputs,
		Outputs:   msg.Outputs,
		LockTime:  msg.LockTime,
		Timestamp: ctx.BlockTime().Unix(),
		Fee:       msg.Fee,
		ZkProof:   msg.ZkProof,
	}

	// Process the transaction
	if err := k.Keeper.ProcessUTXOTransaction(ctx, utxoTx); err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeSendUTXO,
			sdk.NewAttribute(types.AttributeKeyCreator, msg.Creator),
			sdk.NewAttribute(types.AttributeKeyTxHash, txHash),
			sdk.NewAttribute(types.AttributeKeyInputCount, strconv.Itoa(len(msg.Inputs))),
			sdk.NewAttribute(types.AttributeKeyOutputCount, strconv.Itoa(len(msg.Outputs))),
			sdk.NewAttribute(types.AttributeKeyFee, msg.Fee),
		),
	)

	return &types.MsgSendUTXOResponse{
		TxHash: txHash,
	}, nil
}

// SendShielded processes a shielded transaction
func (k msgServer) SendShielded(goCtx context.Context, msg *types.MsgSendShielded) (*types.MsgSendShieldedResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate the message
	if msg.Creator == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "creator cannot be empty")
	}
	
	if len(msg.ZkProof) == 0 {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "zk proof cannot be empty")
	}
	
	if len(msg.Nullifiers) == 0 {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "nullifiers cannot be empty")
	}

	// Generate transaction hash
	txHash := k.generateShieldedTxHash(msg)

	// Create shielded transaction
	shieldedTx := types.ShieldedTransaction{
		TxHash:        txHash,
		Nullifiers:    msg.Nullifiers,
		Commitments:   msg.Commitments,
		ZkProof:       msg.ZkProof,
		EncryptedMemo: msg.EncryptedMemo,
		Fee:           msg.Fee,
		Timestamp:     ctx.BlockTime().Unix(),
	}

	// Process the shielded transaction
	if err := k.Keeper.ProcessShieldedTransaction(ctx, shieldedTx); err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeSendShielded,
			sdk.NewAttribute(types.AttributeKeyCreator, msg.Creator),
			sdk.NewAttribute(types.AttributeKeyTxHash, txHash),
			sdk.NewAttribute(types.AttributeKeyNullifierCount, strconv.Itoa(len(msg.Nullifiers))),
			sdk.NewAttribute(types.AttributeKeyCommitmentCount, strconv.Itoa(len(msg.Commitments))),
			sdk.NewAttribute(types.AttributeKeyFee, msg.Fee),
		),
	)

	return &types.MsgSendShieldedResponse{
		TxHash: txHash,
	}, nil
}

// SubmitMiningProof processes a hardware-accelerated mining proof
func (k msgServer) SubmitMiningProof(goCtx context.Context, msg *types.MsgSubmitMiningProof) (*types.MsgSubmitMiningProofResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate the message
	if msg.Creator == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "creator cannot be empty")
	}
	
	if len(msg.ZkProof) == 0 {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "zk proof cannot be empty")
	}
	
	if msg.HardwareId == "" {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "hardware ID cannot be empty")
	}

	// Create mining proof
	miningProof := types.MiningProof{
		MinerAddress: msg.Creator,
		ZkProof:      msg.ZkProof,
		PublicInputs: msg.PublicInputs,
		Nonce:        msg.Nonce,
		Difficulty:   msg.Difficulty,
		Timestamp:    ctx.BlockTime().Unix(),
		HardwareId:   msg.HardwareId,
	}

	// Process the mining proof
	if err := k.Keeper.MineBlock(ctx, miningProof); err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeSubmitMiningProof,
			sdk.NewAttribute(types.AttributeKeyCreator, msg.Creator),
			sdk.NewAttribute(types.AttributeKeyHardwareId, msg.HardwareId),
			sdk.NewAttribute(types.AttributeKeyDifficulty, strconv.FormatUint(msg.Difficulty, 10)),
			sdk.NewAttribute(types.AttributeKeyNonce, strconv.FormatUint(msg.Nonce, 10)),
		),
	)

	return &types.MsgSubmitMiningProofResponse{
		Success: true,
	}, nil
}

// Helper functions
func (k msgServer) generateTxHash(msg *types.MsgSendUTXO) string {
	data := msg.Creator
	for _, input := range msg.Inputs {
		data += input.PrevTxHash + strconv.FormatUint(uint64(input.PrevOutputIndex), 10)
	}
	for _, output := range msg.Outputs {
		data += output.Address + output.Amount
	}
	data += msg.Fee + strconv.FormatUint(msg.LockTime, 10)
	
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

func (k msgServer) generateShieldedTxHash(msg *types.MsgSendShielded) string {
	data := msg.Creator + msg.Fee
	for _, nullifier := range msg.Nullifiers {
		data += hex.EncodeToString(nullifier)
	}
	for _, commitment := range msg.Commitments {
		data += hex.EncodeToString(commitment)
	}
	
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}