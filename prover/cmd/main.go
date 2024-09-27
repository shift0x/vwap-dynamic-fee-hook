package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/brevis-network/brevis-sdk/sdk/prover"
	"github.com/shift0x/vwap-dynamic-fee-hook/prover/circuits"
)

var port = flag.Uint("port", 33247, "the port to start the service at")

func main() {
	flag.Parse()

	proverService, err := prover.NewService(circuits.NewVwapCircuit(), prover.ServiceConfig{
		SetupDir: "$HOME/circuitOut",
		SrsDir:   "$HOME/kzgsrs",
	})

	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	proverService.Serve("", *port)
}
