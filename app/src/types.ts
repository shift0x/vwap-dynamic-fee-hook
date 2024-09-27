import { ethers } from "ethers"

export type AppConfig = {
    vwapDuration: number,
    maxSwaps: number,
    chains: ChainConfig[]
}

export type ChainConfig = {
    chainId: string,
    baseTokenAddress: string,
    quoteTokenAddress: string,
    rpc: string,
    blockTime: number,
    blockRange: number
}

export type Swap = {
    chain: ChainConfig,
    log: ethers.Log,
    age: number, 
    amounts: SwapAmount
}

export type SwapAmount = {
    baseAmountIndex: number,
    baseAmount: string,
    quoteAmount: string,
    quoteAmountIndex: number
}

export type TransactionReceiptWithChain = {
    chain: ChainConfig,
    receipt: ethers.TransactionReceipt
}

export class V3LiquidityPool {
    public address: string;
    public token0: string;
    public token1: string;
    
    constructor(address: string, token0: string, token1: string){
        this.address = address.toLowerCase();
        this.token0 = token0.toLowerCase();
        this.token1 = token1.toLowerCase()
    }

    public containsToken(token: string) : boolean {
        return this.token0 == token.toLowerCase() || this.token1 == token.toLowerCase()
    }

    public canSwap(tokenA: string, tokenB: string) : boolean {
        return this.containsToken(tokenA) && this.containsToken(tokenB);
    }

    private getAmountIndex(token: string, amount0: number, amount1: number) : number {
        if(this.token0 == token.toLowerCase()) {
            return 0
        } else if(this.token1 == token.toLowerCase()) {
            return 1
        }

        throw "unsupported token: ${token}"
    }

    public getSwamAmountsFrom(
        log: ethers.Log, 
        baseToken: string, 
        quoteToken: string
    ) : SwapAmount {

        const result = ethers.AbiCoder.defaultAbiCoder().decode(["int256", "int256"], log.data);
        const baseAmountIndex = this.getAmountIndex(baseToken, result[0], result[1])
        const quoteAmountIndex = this.getAmountIndex(quoteToken, result[0], result[1]);

        return {
            baseAmount: ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [result[baseAmountIndex]]),
            quoteAmount: ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [result[quoteAmountIndex]]),
            baseAmountIndex,
            quoteAmountIndex,
        }
    }
}