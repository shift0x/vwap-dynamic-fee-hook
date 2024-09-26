import { ethers } from "ethers"

export type ChainConfig = {
    chainId: string,
    baseTokenAddress: string,
    quoteTokenAddress: string,
    rpc: string,
    blockTime: number,
    blockRange: number
}

export type Swap = {
    chainId: string,
    swap: ethers.Log,
    age: number, 
}