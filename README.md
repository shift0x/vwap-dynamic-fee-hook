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
Post pool deployment, the admin will need to configure the `BrevisVwapRateProvider` using the following functions. 

``` solidity
    // chains which we will consider for vwap computations
    function setChains(uint256[] calldata _chains);

    // timeout represents how long the volume data will be valid before it is considered stale
    function setTimeout(uint256 _timeout);

    // vkHash represents the unique circuit app logic
    function setVkHash(bytes32 _vkHash);
```

You can get the rate provider address using the following property on the hook contract

``` solidity
    struct PoolInfo {
        uint24 baseFee;
        uint24 volatilityFee;
        address baseToken;
        address quoteToken;
        IVwapRateProvider rateProvider;
    }

    mapping(PoolId => PoolInfo) public pools;
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

## 4. Configure the app
Open the file `app/app.config.ts` and edit the following configurations as desired. The application supports an arbitrary number of chains to aggregate swaps from, but consult with the brevis team to ensure the source/target chainId mappings have been implemented in the system.

``` javascript
{
    // length of the vwap window
    "vwapDuration": 600,

    // maximum number of swaps to consider. If more swaps are found within the window, 
    // the latest swaps will be taken
    "maxSwaps": 250,

    // prover address
    "prover": "localhost:33247",

    // target chain information for submitting brevis proofs
    "destination": {

        // target chain
        "chainId": 11155111, // sepolia

        // rate provider contract, created during pool initalization
        "address": "<RATE_PROVIDER_ADDRESS>",

        // brevis contract address
        "brevisRequestContract": "0x841ce48F9446C8E281D3F1444cB859b4A6D0738C",

        // rpc address
        "rpc": "https://rpc.sepolia.org",

        // wallet seed phrase for sending txs
        "wallet": process.env.ETH_SEPOLIA_WALLET as string,
    },

    // chains which to aggreggate trade volume
    "chains": [
        {
            // target chain Id
            "chainId": 1,

            // token address of base token
            "baseTokenAddress": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",

            // token address of quote token
            "quoteTokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",

            // rpc address
            "rpc": process.env.ETH_RPC_URL as string,

            // block time of the chain
            "blockTime": 12,

            // maximum block range supported by getLogs on the given rpc
            "blockRange": 10
        },
        ..
    ]
}
```

## 5. Run the app
``` shell
make run-app
```


