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

The main entry point for the application is the nodejs app which pulls matching transaction logs from configured chains. These logs are then submitted to the prover, the generated proof is then submitted to brevis and data is persisted within the smart contract on the destination chain. 

To setup this flow, follow the steps below:

## 1. Deploy the hook contract

The hook smart contract registers an onBeforeSwap and onAfterInitalize hook methods in order to process dynamic transaction fees.

### onAfterInitalize
In this method, the hook registers the newly created pool with the hook and creates a new `BrevisVwapRateProvider` contract to processes brevis proofs and compute vwaps when requested.

The hook contract will emit a `VwapRateProviderCreated` event with the PoolId and address of the `BrevisVwapRateProvider`.

### onBeforeSwap
In this method, the hook will determine what fee to charge for the incoming swap. The pool will charge the `baseFee` if the swap will move price closer to the vwap and charge `baseFee + volatilityFee` if the swap will move price away from the vwap.

The vwap is retrived from the registerd `BrevisVwapRateProvider` for the given `PoolId`.


## 2. Setup the prover
The prover is responsible for processing transaction receipts, aggregating volume amounts and creating the proof to submit to brevis.

To install the prover on a linux server:

```shell
make deploy-prover
```

To run the prover from the command line:

```shell
make run-prover
```


