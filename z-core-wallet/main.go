package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
	
	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/btcsuite/btcd/btcutil/base58"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// ShieldedTransfer represents a Zcash-style private transaction
type ShieldedTransfer struct {
	Sender    string `json:"sender"`    // Hidden via zk-SNARK
	Recipient string `json:"recipient"` // Hidden
	Amount    int64  `json:"amount"`    // Hidden
	Memo      []byte `json:"memo"`      // Encrypted, 512 bytes max
	ZkProof   []byte `json:"zk_proof"`  // zk-SNARK proof
	Nullifier string `json:"nullifier"` // Prevents double spending
}

// Wallet represents the Z Core wallet
type Wallet struct {
	PrivateKey *btcec.PrivateKey
	PublicKey  *btcec.PublicKey
	Address    string
	Balance    Balance
	TxHistory  []Transaction
}

// Balance represents wallet balances
type Balance struct {
	Z  int64 `json:"z"`
	NU int64 `json:"nu"`
}

// Transaction represents a transaction record
type Transaction struct {
	Hash      string    `json:"hash"`
	From      string    `json:"from"`
	To        string    `json:"to"`
	Amount    int64     `json:"amount"`
	Token     string    `json:"token"`
	Timestamp time.Time `json:"timestamp"`
	Status    string    `json:"status"`
	Memo      string    `json:"memo"`
	Private   bool      `json:"private"`
}

// WalletService manages wallet operations
type WalletService struct {
	wallet    *Wallet
	upgrader  websocket.Upgrader
	clients   map[*websocket.Conn]bool
	broadcast chan []byte
}

// NewWalletService creates a new wallet service
func NewWalletService() *WalletService {
	privateKey, _ := btcec.NewPrivateKey()
	publicKey := privateKey.PubKey()
	
	// Generate address using secp256k1
	pubKeyBytes := publicKey.SerializeCompressed()
	hash := sha256.Sum256(pubKeyBytes)
	address := base58.Encode(hash[:20])
	
	wallet := &Wallet{
		PrivateKey: privateKey,
		PublicKey:  publicKey,
		Address:    address,
		Balance:    Balance{Z: 0, NU: 0},
		TxHistory:  []Transaction{},
	}
	
	return &WalletService{
		wallet: wallet,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for development
			},
		},
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan []byte),
	}
}

// CreateShieldedTransfer creates a private transaction
func (ws *WalletService) CreateShieldedTransfer(recipient string, amount int64, memo string) (*ShieldedTransfer, error) {
	// Create commitment and nullifier
	nullifier := ws.generateNullifier()
	
	// Create zk-SNARK proof (hypothetical implementation)
	zkProof, err := ws.generateZkProof(recipient, amount, memo, nullifier)
	if err != nil {
		return nil, err
	}
	
	// Encrypt memo (simplified - use proper encryption in production)
	encryptedMemo := ws.encryptMemo(memo, recipient)
	
	transfer := &ShieldedTransfer{
		Sender:    "", // Hidden
		Recipient: "", // Hidden
		Amount:    0,  // Hidden
		Memo:      encryptedMemo,
		ZkProof:   zkProof,
		Nullifier: nullifier,
	}
	
	return transfer, nil
}

// generateNullifier creates a unique nullifier to prevent double spending
func (ws *WalletService) generateNullifier() string {
	data := fmt.Sprintf("%s:%d", ws.wallet.Address, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// generateZkProof creates a zk-SNARK proof for the transaction
func (ws *WalletService) generateZkProof(recipient string, amount int64, memo string, nullifier string) ([]byte, error) {
	// In a real implementation, this would use a zk-SNARK library
	// For now, create a mock proof
	data := fmt.Sprintf("%s:%s:%d:%s:%s", 
		ws.wallet.Address, recipient, amount, memo, nullifier)
	
	// Sign with private key
	hash := sha256.Sum256([]byte(data))
	signature := crypto.Sign(hash[:], ws.wallet.PrivateKey.ToECDSA())
	
	return signature, nil
}

// encryptMemo encrypts the memo field
func (ws *WalletService) encryptMemo(memo, recipient string) []byte {
	// Simplified encryption - use proper encryption in production
	data := []byte(memo)
	key := sha256.Sum256([]byte(recipient))
	
	for i := range data {
		data[i] ^= key[i%32]
	}
	
	// Pad to 512 bytes
	if len(data) < 512 {
		padding := make([]byte, 512-len(data))
		data = append(data, padding...)
	}
	
	return data[:512]
}

// SignMessage signs a message with the wallet's private key
func (ws *WalletService) SignMessage(message string) (string, error) {
	hash := sha256.Sum256([]byte(message))
	signature := crypto.Sign(hash[:], ws.wallet.PrivateKey.ToECDSA())
	return hex.EncodeToString(signature), nil
}

// HTTP Handlers

func (ws *WalletService) getWalletInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"address": ws.wallet.Address,
		"balance": ws.wallet.Balance,
		"publicKey": hex.EncodeToString(ws.wallet.PublicKey.SerializeCompressed()),
	})
}

func (ws *WalletService) getTransactionHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ws.wallet.TxHistory)
}

func (ws *WalletService) createTransaction(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Recipient string `json:"recipient"`
		Amount    string `json:"amount"`
		Token     string `json:"token"`
		Memo      string `json:"memo"`
		Private   bool   `json:"private"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	amount, err := strconv.ParseInt(req.Amount, 10, 64)
	if err != nil {
		http.Error(w, "Invalid amount", http.StatusBadRequest)
		return
	}
	
	if req.Private {
		// Create shielded transfer
		transfer, err := ws.CreateShieldedTransfer(req.Recipient, amount, req.Memo)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(transfer)
	} else {
		// Create regular transaction
		tx := Transaction{
			Hash:      ws.generateTxHash(),
			From:      ws.wallet.Address,
			To:        req.Recipient,
			Amount:    amount,
			Token:     req.Token,
			Timestamp: time.Now(),
			Status:    "pending",
			Memo:      req.Memo,
			Private:   false,
		}
		
		ws.wallet.TxHistory = append(ws.wallet.TxHistory, tx)
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tx)
	}
}

func (ws *WalletService) generateTxHash() string {
	data := fmt.Sprintf("%s:%d", ws.wallet.Address, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

func (ws *WalletService) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := ws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()
	
	ws.clients[conn] = true
	
	// Send initial wallet state
	walletState := map[string]interface{}{
		"type": "wallet_state",
		"data": map[string]interface{}{
			"address": ws.wallet.Address,
			"balance": ws.wallet.Balance,
		},
	}
	
	if err := conn.WriteJSON(walletState); err != nil {
		delete(ws.clients, conn)
		return
	}
	
	// Listen for messages
	for {
		var msg map[string]interface{}
		if err := conn.ReadJSON(&msg); err != nil {
			delete(ws.clients, conn)
			break
		}
		
		// Handle different message types
		switch msg["type"] {
		case "ping":
			conn.WriteJSON(map[string]string{"type": "pong"})
		}
	}
}

func (ws *WalletService) broadcastToClients() {
	for {
		select {
		case message := <-ws.broadcast:
			for client := range ws.clients {
				if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
					client.Close()
					delete(ws.clients, client)
				}
			}
		}
	}
}

func main() {
	walletService := NewWalletService()
	
	// Start WebSocket broadcaster
	go walletService.broadcastToClients()
	
	// Setup routes
	r := mux.NewRouter()
	
	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/wallet", walletService.getWalletInfo).Methods("GET")
	api.HandleFunc("/transactions", walletService.getTransactionHistory).Methods("GET")
	api.HandleFunc("/transactions", walletService.createTransaction).Methods("POST")
	
	// WebSocket route
	r.HandleFunc("/ws", walletService.handleWebSocket)
	
	// Serve static files
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./static/")))
	
	// CORS middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			
			if r.Method == "OPTIONS" {
				return
			}
			
			next.ServeHTTP(w, r)
		})
	})
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	fmt.Printf("Z Core Wallet API server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}