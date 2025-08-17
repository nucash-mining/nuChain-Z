package types

// UTXO module event types
const (
	EventTypeSendUTXO           = "send_utxo"
	EventTypeSendShielded       = "send_shielded"
	EventTypeSubmitMiningProof  = "submit_mining_proof"
	EventTypeMiningReward       = "mining_reward"
	EventTypeUTXOSpent          = "utxo_spent"
	EventTypeUTXOCreated        = "utxo_created"
	EventTypeShieldedTx         = "shielded_transaction"
	EventTypeDifficultyAdjust   = "difficulty_adjustment"
)

// UTXO module attribute keys
const (
	AttributeKeyCreator         = "creator"
	AttributeKeyTxHash          = "tx_hash"
	AttributeKeyInputCount      = "input_count"
	AttributeKeyOutputCount     = "output_count"
	AttributeKeyFee             = "fee"
	AttributeKeyNullifierCount  = "nullifier_count"
	AttributeKeyCommitmentCount = "commitment_count"
	AttributeKeyHardwareId      = "hardware_id"
	AttributeKeyDifficulty      = "difficulty"
	AttributeKeyNonce           = "nonce"
	AttributeKeyMiner           = "miner"
	AttributeKeyReward          = "reward"
	AttributeKeyUTXOHash        = "utxo_hash"
	AttributeKeyOutputIndex     = "output_index"
	AttributeKeyAmount          = "amount"
	AttributeKeyAddress         = "address"
	AttributeKeyBlockHeight     = "block_height"
	AttributeKeyOldDifficulty   = "old_difficulty"
	AttributeKeyNewDifficulty   = "new_difficulty"
)