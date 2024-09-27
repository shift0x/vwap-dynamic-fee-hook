import { ethers } from "ethers";
import { config } from "../app.config";
import { ChainConfig, Swap, TransactionReceiptWithChain } from "./types";
import { Field, ProofRequest, Prover, ReceiptData } from "brevis-sdk-typescript";

function createDatasetFrom(swaps : Swap[]) : Swap[] {
    if(swaps.length <= config.maxSwaps) {
        return swaps
    }

    const sortedSwaps = swaps.sort((x,y) => {
        return x.age - y.age;
    })

    return sortedSwaps.splice(0, config.maxSwaps)
}

/*
async function getTransactionReceipts(swaps: Swap[]) : Promise<TransactionReceiptWithChain[]> {
    console.log(`processing swaps: ${swaps.length}`)
    // Transactions receipts may have multiple matching swaps. So, we need to deduplicate while preserving
    // chain information to reduce the number of calls we make to rpcs
    const txsToProcess: Map<string, Swap> = new Map();

    swaps.forEach(swap => {
        txsToProcess.set(swap.log.transactionHash, swap)
    })

    const receipts : TransactionReceiptWithChain[] = []

    const txs = Array.from(txsToProcess.keys())

    for(var i =0; i < txs.length; i++) {
        const txHash = txs[i];
        const swap = txsToProcess.get(txHash)
        const provider = new ethers.JsonRpcProvider(swap?.chain.rpc)
        const receipt = await provider.getTransactionReceipt(txHash) as ethers.TransactionReceipt

        receipts.push({ receipt, chain: swap?.chain as ChainConfig})
    }

    return receipts
}
*/

export const prove = async (swaps : Swap[]) => {
    const dataset = createDatasetFrom(swaps);
    const proofRequest = new ProofRequest()

    dataset.forEach(swap => {
        proofRequest.addReceipt(new ReceiptData({
            block_num: swap.log.blockNumber,
            tx_hash: swap.log.transactionHash,

            fields: [
                new Field({ 
                    contract: swap.log.address,
                    event_id: swap.log.topics[0],
                    log_index: swap.log.index,
                    field_index: swap.amounts.baseAmountIndex,
                    is_topic: false,
                    value: swap.amounts.baseAmount,
                }),

                new Field({
                    contract: swap.log.address,
                    event_id: swap.log.topics[0],
                    log_index: swap.log.index,
                    field_index: swap.amounts.quoteAmountIndex,
                    is_topic: false,
                    value: swap.amounts.quoteAmount,
                })
            ]
        }))
    })

    const prover = new Prover(config.prover);

    const response = await prover.prove(proofRequest)

    console.log({response});

}