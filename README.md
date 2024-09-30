# VWAP Dynamic Fee Hook

This hook uses dynamic swap fees to create a positive feedback loop in which Liquidity Providers, Swappers and the PancakeSwap ecosystem benefit. Fees are dynamically determined based on whether the swap will move price away (higher fee) from or towards (lower fee) a Volume Weighted Average Price (VWAP).  

# The Positive Feedback Loop
1. During periods of high activity, price will move away from the VWAP - earning liquidity providers more fees. 
2. The increased pool APR will attract more liquidity providers to the pool. 
3. More liquidity in the pool means less slippage (better execution) for swappers
4. Less slippage for swappers means more volume can be swapped before price moves to a market equilibrium.
5. More volume means more fees
6. More fees = more cake burned

# Running the application

## Setup the prover
The prover is responsible for processing transaction receipts, aggregating volume amounts and creating the proof to submit to brevis.

To install the prover on a linux server:

```make
make deploy-prover
```

To run the prover from the command line:

```make
make run-prover
```


