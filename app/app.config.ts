import { AppConfig } from "./src/types";

export const config : AppConfig = {
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

        // contract responsible for processing proofs
        "address": "<RATE_PROVIDER_ADDRESS>",

        // brevis contract address
        "brevisRequestContract": "0x841ce48F9446C8E281D3F1444cB859b4A6D0738C",

        // desired rpc
        "rpc": "https://rpc.sepolia.org",

        // private key for sending txs
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

            // desired rpc
            "rpc": process.env.ETH_RPC_URL as string,

            // block time of the chain
            "blockTime": 12,

            // maximum block range supported by getLogs on the given rpc
            "blockRange": 10
        },
        {
            "chainId": 10,
            "baseTokenAddress": "0x4200000000000000000000000000000000000006",
            "quoteTokenAddress": "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
            "rpc": process.env.OPTIMISIM_RPC_URL as string,
            "blockTime": 2,
            "blockRange": 100
        },
        {
            "chainId": 8453,
            "baseTokenAddress": "0x4200000000000000000000000000000000000006",
            "quoteTokenAddress": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            "rpc": process.env.BASE_RPC_URL as string,
            "blockTime": 2,
            "blockRange": 100
        }
    ]
} 