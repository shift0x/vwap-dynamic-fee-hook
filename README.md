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
The main entry point for the application is the nodejs app which pulls matching swap transaction logs from uniswap-v3 like pools for configured pools and chains. These logs are then submitted to the prover, which aggregated transaction volumes and generates a proof to submit to brevis. Once submitted, brevis will call the configured smart contract to persist base and quote swap volumes on the destination chain. 

To setup this flow, follow the steps below:

## 1. Deploy the hook contract
The hook smart contract registers an onBeforeSwap and onAfterInitalize hook methods in order to process dynamic transaction fees.

### onAfterInitalize
In this method, the hook registers the newly created pool with the hook and creates a new `BrevisVwapRateProvider` contract to processes brevis proofs and compute vwaps when requested.

The hook contract will emit a `VwapRateProviderCreated` event with the PoolId and address of the `BrevisVwapRateProvider`.

### onBeforeSwap
In this method, the hook will determine what fee to charge for the incoming swap. The pool will charge the `baseFee` if the swap will move price closer to the vwap and charge `baseFee + volatilityFee` if the swap will move price away from the vwap.

The vwap is retrived from the registerd `BrevisVwapRateProvider` for the given `PoolId`.

## 2. Deploy a liquidity pool using the hook
Use the following layout for hook params when deploying a new pool using this hook

``` solidity
struct DynamicFeeHookArgs {
    // Minimum swap fee to charge on each swap
    uint24 baseFee;

    // Excess fee to charge in addition to the swap fee for swaps that move the price away from te vwap
    uint24 volatilityFee;

    // The administrator for the deployed `BrevisVwapRateProvider` contract
    address admin;

    // Base token for the pair
    address baseToken;

    // Quote token for the pair
    address quoteToken;
}
```

### After pool deployment
Post pool deployment, the admin will need to configure the rate provider using the following functions

``` solidity
    // chains which we will consider for vwap computations
    function setChains(uint256[] calldata _chains);

    // timeout represents how long the volume data will be valid before it is considered stale
    function setTimeout(uint256 _timeout);

    // vkHash represents the unique circuit app logic
    function setVkHash(bytes32 _vkHash);
```


## 3. Setup the prover
The prover is responsible for processing transaction receipts, aggregating volume amounts and creating the proof to submit to brevis.

To install the prover on a linux server and run with systemd:

```shell
make deploy-prover
```

To stop the running prover

```shell
systemctl stop vwap-dynamic-fee-prover
```

To restart the prover

```shell
systemctl restart vwap-dynamic-fee-prover
```

To run the prover from the command line (non systemd):

```shell
make run-prover
```


