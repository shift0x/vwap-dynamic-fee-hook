import { AppConfig } from "./src/types";

export const config : AppConfig = {
    "vwapDuration": 600,
    "maxSwaps": 250,
    "prover": "localhost:33247",
    "destination": {
        "chainId": 11155111, // sepolia
        "address": "<RATE_PROVIDER_ADDRESS>",
        "brevisRequestContract": "0x841ce48F9446C8E281D3F1444cB859b4A6D0738C",
        "rpc": "https://rpc.sepolia.org",
        "wallet": process.env.ETH_SEPOLIA_WALLET as string,
    },
    "chains": [
        {
            "chainId": 1,
            "baseTokenAddress": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            "quoteTokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            "rpc": process.env.ETH_RPC_URL as string,
            "blockTime": 12,
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