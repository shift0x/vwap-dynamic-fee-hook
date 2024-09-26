import { ethers } from 'ethers';
import config from '../config.json'
import { ChainConfig, Swap } from './types';
import { discoverLiquidityPoolsWithTokens } from './contracts/liquidityPoolInspector';

const SWAP_TOPICS = [
    "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83",
    "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
]

async function filterTransactionLogsForPoolsContainingTokens(
    provider: ethers.JsonRpcProvider, 
    tokenA : string, 
    tokenB: string, 
    logs : ethers.Log[]
) : Promise<ethers.Log[]> {
    if(logs.length == 0) { return []; }

    const logsByPool: Map<string, ethers.Log[]> = new Map();

    logs.forEach(log => {
        if(!logsByPool.has(log.address)) {
            logsByPool.set(log.address, []);
        }

        logsByPool.get(log.address)?.push(log);
    });

    const allLiquidityPools = logs
        .map(log => { return log.address})
        .filter((val, index, self) => { return self.indexOf(val) === index });


    const liquidityPoolsWithTokens = await discoverLiquidityPoolsWithTokens(provider, tokenA, tokenB, allLiquidityPools);

    const logsForPoolsWithTokens = liquidityPoolsWithTokens
        .map(pool => { 
            return logsByPool.get(pool) 
        })
        .flat()

    return logsForPoolsWithTokens as ethers.Log[]
}

async function getLogs(
    chain : ChainConfig
) : Promise<Swap[]> {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const blocksLookback = Math.floor(config.vwapDuration / chain.blockTime)
    const currentBlockNumber = await provider.getBlockNumber()
    
    let fromBlockNumber = currentBlockNumber - blocksLookback;
    let toBlockNumber = fromBlockNumber + chain.blockRange;
    let swaps: Swap[] = [];

    while(fromBlockNumber < currentBlockNumber) {
        const logs = await provider.getLogs({
            fromBlock: fromBlockNumber,
            toBlock: toBlockNumber,
            topics: [SWAP_TOPICS]
        })

        fromBlockNumber += chain.blockRange;
        toBlockNumber = Math.min(fromBlockNumber+chain.blockRange, currentBlockNumber);

        const matchingLogs = await filterTransactionLogsForPoolsContainingTokens(provider, chain.baseTokenAddress, chain.quoteTokenAddress, logs)
        const swapEvents = matchingLogs.map(log => {
            return {
                chainId: chain.chainId,
                swap: log,
                age: (currentBlockNumber - log.blockNumber) * chain.blockTime
            } as Swap
        })

        if(matchingLogs.length > 0){
            swaps = swaps.concat(swapEvents)
        }
    }

    return swaps;
}

export const getSwaps = async () => {
    const chainDataRequests = config.chains.map(chain => { return getLogs(chain as ChainConfig) });
    const swaps = await Promise.all(chainDataRequests)

    return swaps.flat()
}
