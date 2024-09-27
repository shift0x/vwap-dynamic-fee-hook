import { ethers } from 'ethers';
import { ChainConfig, Swap } from './types';
import { getLiquidityPools } from './contracts/liquidityPoolInspector';
import { config } from '../app.config';

const SWAP_TOPICS = [
    "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83",
    "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
]

async function buildSwapEvents (
    provider: ethers.JsonRpcProvider, 
    chain: ChainConfig,
    currentBlockNumber: number,
    logs : ethers.Log[]
) : Promise<Swap[]> {
    if(logs.length == 0) { return []; }

    const logsByPool: Map<string, ethers.Log[]> = new Map();

    logs.forEach(log => {
        const addr = log.address.toLowerCase();

        if(!logsByPool.has(addr)) {
            logsByPool.set(addr, []);
        }

        logsByPool.get(addr)?.push(log);
    });


    const liquidityPools = await getLiquidityPools(provider, Array.from(logsByPool.keys()));

    const matchingPools = liquidityPools.filter(pool => { return pool.canSwap(chain.baseTokenAddress, chain.quoteTokenAddress) })
    const swaps = matchingPools
        .map(pool => {
            const poolLogs = logsByPool.get(pool.address);
            const swaps = poolLogs?.map(log => {
                const amounts = pool.getSwamAmountsFrom(log, chain.baseTokenAddress, chain.quoteTokenAddress)
                const age = (currentBlockNumber - log.blockNumber) * chain.blockTime

                return {
                    chain,
                    log,
                    amounts,
                    age
                } as Swap
            })

            return swaps
        })


    return swaps.flat() as Swap[]
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

        const swapEvents = await buildSwapEvents(provider, chain, currentBlockNumber, logs)

        swaps = swaps.concat(swapEvents)
    }

    return swaps;
}

export const getSwaps = async () => {
    const chainDataRequests = config.chains.map(chain => { return getLogs(chain) });
    const swaps = await Promise.all(chainDataRequests)

    return swaps.flat()
}
