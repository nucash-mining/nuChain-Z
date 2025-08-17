package types

// Mining module event types
const (
	EventTypeCreateStakingNode         = "create_staking_node"
	EventTypeProcessCrossChainMessage  = "process_cross_chain_message"
	EventTypeUpdateMiningRig           = "update_mining_rig"
	EventTypeDistributeRewards         = "distribute_rewards"
	EventTypeStakingNodeOnline         = "staking_node_online"
	EventTypeStakingNodeOffline        = "staking_node_offline"
)

// Mining module attribute keys
const (
	AttributeKeyCreator           = "creator"
	AttributeKeyMoniker           = "moniker"
	AttributeKeySupportedChains   = "supported_chains"
	AttributeKeySourceChain       = "source_chain"
	AttributeKeyMessageType       = "message_type"
	AttributeKeyNonce             = "nonce"
	AttributeKeyTokenId           = "token_id"
	AttributeKeyChainId           = "chain_id"
	AttributeKeyHashPower         = "hash_power"
	AttributeKeyWattConsumption   = "watt_consumption"
	AttributeKeyRecipient         = "recipient"
	AttributeKeyAmount            = "amount"
	AttributeKeyRewardType        = "reward_type"
	AttributeKeyBlockHeight       = "block_height"
	AttributeKeyOperator          = "operator"
	AttributeKeyVotingPower       = "voting_power"
)