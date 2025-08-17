package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const (
	TypeMsgSendUTXO           = "send_utxo"
	TypeMsgSendShielded       = "send_shielded"
	TypeMsgSubmitMiningProof  = "submit_mining_proof"
)

var _ sdk.Msg = &MsgSendUTXO{}

func NewMsgSendUTXO(creator string, inputs []TxInput, outputs []TxOutput, fee string, lockTime uint64, zkProof []byte) *MsgSendUTXO {
	return &MsgSendUTXO{
		Creator:  creator,
		Inputs:   inputs,
		Outputs:  outputs,
		Fee:      fee,
		LockTime: lockTime,
		ZkProof:  zkProof,
	}
}

func (msg *MsgSendUTXO) Route() string {
	return RouterKey
}

func (msg *MsgSendUTXO) Type() string {
	return TypeMsgSendUTXO
}

func (msg *MsgSendUTXO) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgSendUTXO) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgSendUTXO) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	
	if len(msg.Inputs) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "transaction must have inputs")
	}
	
	if len(msg.Outputs) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "transaction must have outputs")
	}
	
	if msg.Fee == "" {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "fee cannot be empty")
	}
	
	return nil
}

var _ sdk.Msg = &MsgSendShielded{}

func NewMsgSendShielded(creator string, nullifiers [][]byte, commitments [][]byte, zkProof []byte, encryptedMemo []byte, fee string) *MsgSendShielded {
	return &MsgSendShielded{
		Creator:       creator,
		Nullifiers:    nullifiers,
		Commitments:   commitments,
		ZkProof:       zkProof,
		EncryptedMemo: encryptedMemo,
		Fee:           fee,
	}
}

func (msg *MsgSendShielded) Route() string {
	return RouterKey
}

func (msg *MsgSendShielded) Type() string {
	return TypeMsgSendShielded
}

func (msg *MsgSendShielded) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgSendShielded) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgSendShielded) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	
	if len(msg.ZkProof) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "zk proof cannot be empty")
	}
	
	if len(msg.Nullifiers) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "nullifiers cannot be empty")
	}
	
	if msg.Fee == "" {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "fee cannot be empty")
	}
	
	return nil
}

var _ sdk.Msg = &MsgSubmitMiningProof{}

func NewMsgSubmitMiningProof(creator string, zkProof []byte, publicInputs []byte, nonce uint64, difficulty uint64, hardwareId string) *MsgSubmitMiningProof {
	return &MsgSubmitMiningProof{
		Creator:      creator,
		ZkProof:      zkProof,
		PublicInputs: publicInputs,
		Nonce:        nonce,
		Difficulty:   difficulty,
		HardwareId:   hardwareId,
	}
}

func (msg *MsgSubmitMiningProof) Route() string {
	return RouterKey
}

func (msg *MsgSubmitMiningProof) Type() string {
	return TypeMsgSubmitMiningProof
}

func (msg *MsgSubmitMiningProof) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgSubmitMiningProof) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgSubmitMiningProof) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	
	if len(msg.ZkProof) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "zk proof cannot be empty")
	}
	
	if msg.HardwareId == "" {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "hardware ID cannot be empty")
	}
	
	if msg.Difficulty == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "difficulty must be positive")
	}
	
	return nil
}

// Message types for the utxo module
type MsgSendUTXO struct {
	Creator  string     `json:"creator"`
	Inputs   []TxInput  `json:"inputs"`
	Outputs  []TxOutput `json:"outputs"`
	Fee      string     `json:"fee"`
	LockTime uint64     `json:"lock_time"`
	ZkProof  []byte     `json:"zk_proof"`
}

type MsgSendUTXOResponse struct {
	TxHash string `json:"tx_hash"`
}

type MsgSendShielded struct {
	Creator       string   `json:"creator"`
	Nullifiers    [][]byte `json:"nullifiers"`
	Commitments   [][]byte `json:"commitments"`
	ZkProof       []byte   `json:"zk_proof"`
	EncryptedMemo []byte   `json:"encrypted_memo"`
	Fee           string   `json:"fee"`
}

type MsgSendShieldedResponse struct {
	TxHash string `json:"tx_hash"`
}

type MsgSubmitMiningProof struct {
	Creator      string `json:"creator"`
	ZkProof      []byte `json:"zk_proof"`
	PublicInputs []byte `json:"public_inputs"`
	Nonce        uint64 `json:"nonce"`
	Difficulty   uint64 `json:"difficulty"`
	HardwareId   string `json:"hardware_id"`
}

type MsgSubmitMiningProofResponse struct {
	Success bool `json:"success"`
}