package circuits

import (
	"github.com/brevis-network/brevis-sdk/sdk"
)

type VwapCircuit struct{}

func NewVwapCircuit() *VwapCircuit {
	return &VwapCircuit{}
}

func (c *VwapCircuit) Allocate() (maxReceipts, maxStorage, maxTransactions int) {
	return 10, 0, 0
}

func (c *VwapCircuit) Define(api *sdk.CircuitAPI, in sdk.DataInput) error {
	//receipts := sdk.NewDataStream(api, in.Receipts)

	return nil
}
