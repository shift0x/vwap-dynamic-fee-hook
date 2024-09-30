import { ethers } from "ethers";
import { config } from "../app.config";
import { Swap } from "./types";
import { Field, ProofRequest, Prover, ReceiptData, TransactionData } from "brevis-sdk-typescript";
import { submitProof } from "./brevis";

function createDatasetFrom(swaps : Swap[]) : Swap[] {
    if(swaps.length <= config.maxSwaps) {
        return swaps
    }

    const sortedSwaps = swaps.sort((x,y) => {
        return x.age - y.age;
    })

    return sortedSwaps.splice(0, config.maxSwaps)
}


export const proveAndSubmit = async (swaps : Swap[]) => {
    const dataset = createDatasetFrom(swaps);
    const proofsByChain : Map<number, ProofRequest> = new Map();

    for(var i = 0 ; i < dataset.length; i++){
        const swap = dataset[i];

        if(!proofsByChain.has(swap.chain.chainId)) {
            const request = new ProofRequest()
            const provider = new ethers.JsonRpcProvider(swap.chain.rpc);

            const tx = (await provider.getTransaction(swap.log.transactionHash)) as ethers.TransactionResponse
            const receipt = (await provider.getTransactionReceipt(swap.log.transactionHash)) as ethers.TransactionReceipt

            var gas_tip_cap_or_gas_price =  ''
            var gas_fee_cap = ''

            if (tx.type == 0) {
                gas_tip_cap_or_gas_price = tx.gasPrice.toString() ?? ''
                gas_fee_cap = '0'
            } else {
                gas_tip_cap_or_gas_price = tx.maxPriorityFeePerGas?.toString() ?? ''
                gas_fee_cap = tx.maxFeePerGas?.toString() ?? ''
            }

            request.addTransaction(new TransactionData({
                hash: tx.hash,
                chain_id: Number(tx.chainId.toString()),
                block_num: Number(receipt.blockNumber),
                nonce: tx.nonce,
                gas_tip_cap_or_gas_price,
                gas_fee_cap,
                gas_limit: Number(tx.gasLimit.toString()),
                from: tx.from,
                to: tx.to as string,
                value: tx.value.toString()
            }))

            proofsByChain.set(swap.chain.chainId, request)
        }

        proofsByChain.get(swap.chain.chainId)?.addReceipt(new ReceiptData({
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
        }));
    }

    const prover = new Prover(config.prover);
    const chainIds = Array.from(proofsByChain.keys())

    for(var i = 0; i < chainIds.length; i++){
        const chainId = chainIds[i];
        const proofRequest = proofsByChain.get(chainId) as ProofRequest;

        console.log(`>>> [${chainId}] generating proof: ${proofRequest.getReceipts().length} receipts`)

        const proofResponse = await prover.prove(proofRequest);

        await submitProof(Number(chainId), proofRequest, proofResponse)
    }
}