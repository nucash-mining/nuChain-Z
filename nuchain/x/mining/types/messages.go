package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const (
	TypeMsgCreateStakingNode         = "create_staking_node"
	TypeMsgProcessCrossChainMessage  = "process_cross_chain_message"
	TypeMsgUpdateMiningRig           = "update_mining_rig"
)

var _ sdk.Msg = &MsgCreateStakingNode{}

func NewMsgCreateStakingNode(creator string, moniker string, supportedChains []string) *MsgCreateStakingNode {
	return &MsgCreateStakingNode{
		Creator:         creator,
		Moniker:         moniker,
		SupportedChains: supportedChains,
	}
}

func (msg *MsgCreateStakingNode) Route() string {
	return RouterKey
}

func (msg *MsgCreateStakingNode) Type() string {
	return TypeMsgCreateStakingNode
}

func (msg *MsgCreateStakingNode) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgCreateStakingNode) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgCreateStakingNode) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	
	if msg.Moniker == "" {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "moniker cannot be empty")
	}
	
	if len(msg.SupportedChains) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "supported chains cannot be empty")
	}
	
	return nil
}

var _ sdk.Msg = &MsgProcessCrossChainMessage{}

func NewMsgProcessCrossChainMessage(creator string, sourceChain string, messageType string, payload []byte, nonce uint64) *MsgProcessCrossChainMessage {
	return &MsgProcessCrossChainMessage{
		Creator:     creator,
		SourceChain: sourceChain,
		MessageType: messageType,
		Payload:     payload,
		Nonce:       nonce,
	}
}

func (msg *MsgProcessCrossChainMessage) Route() string {
	return RouterKey
}

func (msg *MsgProcessCrossChainMessage) Type() string {
	return TypeMsgProcessCrossChainMessage
}

func (msg *MsgProcessCrossChainMessage) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgProcessCrossChainMessage) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgProcessCrossChainMessage) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	
	if msg.SourceChain == "" {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "source chain cannot be empty")
	}
	
	if msg.MessageType == "" {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "message type cannot be empty")
	}
	
	return nil
}

var _ sdk.Msg = &MsgUpdateMiningRig{}

func NewMsgUpdateMiningRig(creator string, tokenId uint64, chainId string, contractAddress string, hashPower uint64, wattConsumption uint64, isActive bool) *MsgUpdateMiningRig {
	return &MsgUpdateMiningRig{
		Creator:         creator,
		TokenId:         tokenId,
		ChainId:         chainId,
		ContractAddress: contractAddress,
		HashPower:       hashPower,
		WattConsumption: wattConsumption,
		IsActive:        isActive,
	}
}

func (msg *MsgUpdateMiningRig) Route() string {
	return RouterKey
}

func (msg *MsgUpdateMiningRig) Type() string {
	return TypeMsgUpdateMiningRig
}

func (msg *MsgUpdateMiningRig) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgUpdateMiningRig) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgUpdateMiningRig) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	
	if msg.TokenId == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "token ID cannot be zero")
	}
	
	if msg.ChainId == "" {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "chain ID cannot be empty")
	}
	
	return nil
}

// Message types for the mining module
type MsgCreateStakingNode struct {
	Creator         string   `json:"creator"`
	Moniker         string   `json:"moniker"`
	SupportedChains []string `json:"supported_chains"`
}

type MsgCreateStakingNodeResponse struct{}

type MsgProcessCrossChainMessage struct {
	Creator     string `json:"creator"`
	SourceChain string `json:"source_chain"`
	MessageType string `json:"message_type"`
	Payload     []byte `json:"payload"`
	Nonce       uint64 `json:"nonce"`
}

type MsgProcessCrossChainMessageResponse struct{}

type MsgUpdateMiningRig struct {
	Creator         string `json:"creator"`
	TokenId         uint64 `json:"token_id"`
	ChainId         string `json:"chain_id"`
	ContractAddress string `json:"contract_address"`
	HashPower       uint64 `json:"hash_power"`
	WattConsumption uint64 `json:"watt_consumption"`
	IsActive        bool   `json:"is_active"`
}

type MsgUpdateMiningRigResponse struct{}