package circuits

import (
	"github.com/brevis-network/brevis-sdk/sdk"
)

type VwapCircuit struct{}

func NewVwapCircuit() *VwapCircuit {
	return &VwapCircuit{}
}

func (c *VwapCircuit) Allocate() (maxReceipts, maxStorage, maxTransactions int) {
	// This circuit will process a maximum of 100 receipts
	return 100, 0, 1
}

func (c *VwapCircuit) getVolume(api *sdk.CircuitAPI, receipts *sdk.DataStream[sdk.Receipt], index uint64) sdk.Uint248 {
	volume := sdk.Map(receipts, func(cur sdk.Receipt) sdk.Uint248 {
		valInt := api.ToInt248(cur.Fields[index].Value)
		return api.Int248.ABS(valInt)
	})

	return sdk.Sum(volume)
}

func (c *VwapCircuit) Define(api *sdk.CircuitAPI, in sdk.DataInput) error {
	chainId := in.Transactions.Raw[0].ChainId

	// This circuit accepts swap receipts from a given chain. It is expected
	// that the sender has stored thebase token volumes in Fields[0] and
	// quote token volume in Fields[1]. It is also expected that these volume amount will
	// be of type int256. The get volume method will be responsibile for ensure volumes are
	// positive before they are summed.
	receipts := sdk.NewDataStream(api, in.Receipts)

	baseTokenVolume := c.getVolume(api, receipts, 0)
	quoteTokenVolume := c.getVolume(api, receipts, 1)

	api.OutputUint(248, chainId)
	api.OutputUint(248, baseTokenVolume)
	api.OutputUint(248, quoteTokenVolume)

	return nil
}
