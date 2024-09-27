import { AppConfig } from "./src/types";

export const config : AppConfig = {
    "vwapDuration": 600,
    "maxSwaps": 10,
    "chains": [
        {
            "chainId": "1",
            "baseTokenAddress": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            "quoteTokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            "rpc": process.env.ETH_RPC_URL as string,
            "blockTime": 12,
            "blockRange": 100
        },
        {
            "chainId": "10",
            "baseTokenAddress": "0x4200000000000000000000000000000000000006",
            "quoteTokenAddress": "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
            "rpc": process.env.OPTIMISIM_RPC_URL as string,
            "blockTime": 2,
            "blockRange": 100
        },
        {
            "chainId": "8453",
            "baseTokenAddress": "0x4200000000000000000000000000000000000006",
            "quoteTokenAddress": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            "rpc": process.env.BASE_RPC_URL as string,
            "blockTime": 2,
            "blockRange": 100
        }
    ]
} 