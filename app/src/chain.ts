import { ethers } from 'ethers';
import config from '../config.json'
import { ChainConfig } from './types';

const SWAP_TOPIC = "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83"

async function filterTransactionLogsForPoolsContainingTokens(token0 : string, token1: string, logs : ethers.Log[]) : Promise<ethers.Log[]> {
    const logsByPool: Map<string, ethers.Log[]> = new Map();

    logs.forEach(log => {
        if(!logsByPool.has(log.address)) {
            logsByPool.set(log.address, []);
        }

        logsByPool.get(log.address)?.push(log);
    });

    return []
}

async function getReceipts(chain : ChainConfig){
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const blocksLookback = Math.floor(config.vwapDuration / chain.blockTime)
    const currentBlockNumber = await provider.getBlockNumber()
    const blockIncrement = 100;
    
    let fromBlockNumber = currentBlockNumber - blocksLookback;
    let toBlockNumber = fromBlockNumber + blockIncrement;

    while(toBlockNumber < currentBlockNumber) {
        const logs = await provider.getLogs({
            fromBlock: fromBlockNumber,
            toBlock: toBlockNumber,
            topics: [ SWAP_TOPIC ]
        })

        toBlockNumber += blockIncrement;

        const matchingLogs = await filterTransactionLogsForPoolsContainingTokens(chain.baseTokenAddress, chain.quoteTokenAddress, logs)

        console.log({ logs: logs.length, matches: matchingLogs.length })
    }

    console.log(`completed chain: ${chain.chainId}`)
}

export const getReceiptsByChain = async () => {
    const chainDataRequests = config.chains.map(chain => { return getReceipts(chain as ChainConfig) });

    return Promise.all(chainDataRequests)
}
