package circuits

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/brevis-network/brevis-sdk/sdk"
	"github.com/brevis-network/brevis-sdk/test"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
)

func Test_Circuit(t *testing.T) {
	app, err := sdk.NewBrevisApp()

	check(err)

	pool := common.HexToAddress("0x72AB388E2E2F6FaceF59E3C3FA2C4E29011c2D38")
	swapEvent := common.HexToHash("0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83")
	amount0 := big.NewInt(-2992894057678370)
	amount1 := big.NewInt(7958893)

	amount0Hex := common.HexToHash(hexutil.EncodeBig(amount0))
	amount1Hex := common.HexToHash(hexutil.EncodeBig(amount1))

	txHash := common.HexToHash("53b37ec7975d217295f4bdadf8043b261fc49dccc16da9b9fc8b9530845a5794")

	app.AddTransaction(sdk.TransactionData{
		Hash:                txHash,
		ChainId:             big.NewInt(1),
		BlockNum:            big.NewInt(20850020),
		Nonce:               250,
		GasTipCapOrGasPrice: common.Big0,
		GasFeeCap:           common.Big0,
		Value:               common.Big0,
		From:                common.Address{},
		To:                  common.Address{},
		GasLimit:            50000,
	})

	app.AddReceipt(sdk.ReceiptData{
		BlockNum: big.NewInt(18064070),
		TxHash:   txHash,
		Fields: [sdk.NumMaxLogFields]sdk.LogFieldData{
			{
				Contract:   pool,
				LogIndex:   1,
				EventID:    swapEvent,
				IsTopic:    false,
				FieldIndex: 0,
				Value:      amount0Hex,
			}, // field: Pool.Swap.amount0
			{
				Contract:   pool,
				LogIndex:   1,
				EventID:    swapEvent,
				IsTopic:    false,
				FieldIndex: 1,
				Value:      amount1Hex,
			}, // field: Pool.Swap.amount1
		},
	})

	// Initialize our AppCircuit and prepare the circuit assignment
	appCircuit := NewVwapCircuit()
	appCircuitAssignment := NewVwapCircuit()

	// Execute the added queries and package the query results into circuit inputs
	in, err := app.BuildCircuitInput(appCircuit)
	check(err)

	///////////////////////////////////////////////////////////////////////////////
	// Testing
	///////////////////////////////////////////////////////////////////////////////

	// Use the test package to check if the circuit can be solved using the given
	// assignment
	test.ProverSucceeded(t, appCircuit, appCircuitAssignment, in)
}

func TestE2E(t *testing.T) {
	app, err := sdk.NewBrevisApp()

	check(err)

	pool := common.HexToAddress("0x72AB388E2E2F6FaceF59E3C3FA2C4E29011c2D38")
	swapEvent := common.HexToHash("0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83")
	amount0 := big.NewInt(-2992894057678370)
	amount1 := big.NewInt(7958893)

	amount0Hex := common.HexToHash(hexutil.EncodeBig(amount0))
	amount1Hex := common.HexToHash(hexutil.EncodeBig(amount1))

	txHash := common.HexToHash("53b37ec7975d217295f4bdadf8043b261fc49dccc16da9b9fc8b9530845a5794")

	app.AddTransaction(sdk.TransactionData{
		Hash:                txHash,
		ChainId:             big.NewInt(1),
		BlockNum:            big.NewInt(20850020),
		Nonce:               250,
		GasTipCapOrGasPrice: common.Big0,
		GasFeeCap:           common.Big0,
		Value:               common.Big0,
		From:                common.Address{},
		To:                  common.Address{},
		GasLimit:            50000,
	})

	app.AddReceipt(sdk.ReceiptData{
		BlockNum: big.NewInt(18064070),
		TxHash:   common.HexToHash("53b37ec7975d217295f4bdadf8043b261fc49dccc16da9b9fc8b9530845a5794"),
		Fields: [sdk.NumMaxLogFields]sdk.LogFieldData{
			{
				Contract:   pool,
				LogIndex:   1,
				EventID:    swapEvent,
				IsTopic:    false,
				FieldIndex: 0,
				Value:      amount0Hex,
			}, // field: Pool.Swap.amount0
			{
				Contract:   pool,
				LogIndex:   1,
				EventID:    swapEvent,
				IsTopic:    false,
				FieldIndex: 1,
				Value:      amount1Hex,
			}, // field: Pool.Swap.amount1
		},
	})

	// Initialize our AppCircuit and prepare the circuit assignment
	appCircuit := NewVwapCircuit()
	appCircuitAssignment := NewVwapCircuit()

	// Execute the added queries and package the query results into circuit inputs
	in, err := app.BuildCircuitInput(appCircuit)
	check(err)

	///////////////////////////////////////////////////////////////////////////////
	// Testing
	///////////////////////////////////////////////////////////////////////////////

	// Use the test package to check if the input can be proved with the given
	// circuit
	test.ProverSucceeded(t, appCircuit, appCircuitAssignment, in)

	///////////////////////////////////////////////////////////////////////////////
	// Compiling and Setup
	///////////////////////////////////////////////////////////////////////////////

	// The compiled circuit, proving key, and verifying key are saved to outDir, and
	// the downloaded SRS in the process is saved to srsDir
	outDir := "$HOME/circuitOut/tradingvolume"
	srsDir := "$HOME/kzgsrs"
	compiledCircuit, pk, vk, err := sdk.Compile(appCircuit, outDir, srsDir)
	check(err)

	// Once you saved your ccs, pk, and vk files, you can read them back into memory
	// for use with the provided utils
	compiledCircuit, pk, vk, err = sdk.ReadSetupFrom(outDir)
	check(err)

	///////////////////////////////////////////////////////////////////////////////
	// Proving
	///////////////////////////////////////////////////////////////////////////////

	fmt.Println(">> prove")
	witness, publicWitness, err := sdk.NewFullWitness(appCircuitAssignment, in)
	check(err)
	proof, err := sdk.Prove(compiledCircuit, pk, witness)
	check(err)

	///////////////////////////////////////////////////////////////////////////////
	// Verifying
	///////////////////////////////////////////////////////////////////////////////

	// The verification of the proof generated by you is done on Brevis' side. But
	// you can also verify your own proof to make sure everything works fine and
	// pk/vk are serialized/deserialized properly
	err = sdk.Verify(vk, publicWitness, proof)
	check(err)
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
