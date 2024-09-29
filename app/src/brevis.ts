import { Brevis, ErrCode, ProofRequest, ProveResponse } from "brevis-sdk-typescript";
import { config } from "../app.config";
import { ethers } from "ethers";
import { brevisRequestAbi } from "./contracts/brevisRequest";

async function makeBrevisRequestContract(){
    const wallet = new ethers.Wallet(config.destination.wallet);
    const provider = new ethers.JsonRpcProvider(config.destination.rpc);
    const signer = wallet.connect(provider);
    const brevisRequestContract = new ethers.Contract(config.destination.brevisRequestContract, brevisRequestAbi, signer);
    const nonce = await signer.getNonce()

    return { nonce, provider, brevisRequestContract }
}


export const submitProof = async (chainId : number, proofReq : ProofRequest, proofRes : ProveResponse) => {
    const brevis = new Brevis('appsdkv2.brevis.network:9094');

    if (proofRes.has_err) {
        const err = proofRes.err;

        switch (err.code) {
            case ErrCode.ERROR_INVALID_INPUT:
                console.error('invalid receipt/storage/transaction input:', err.msg);
                break;

            case ErrCode.ERROR_INVALID_CUSTOM_INPUT:
                console.error('invalid custom input:', err.msg);
                break;

            case ErrCode.ERROR_FAILED_TO_PROVE:
                console.error('failed to prove:', err.msg);
                break;
        }
        return;
    }

    try {
        const brevisRes = await brevis.submit(proofReq, proofRes, chainId, config.destination.chainId, 0, "", "");
        const { nonce, brevisRequestContract } = await makeBrevisRequestContract();
        
        const callArgs = {
            value: brevisRes.fee, 
            nonce: nonce, 
        }

        const tx = await brevisRequestContract
            .sendRequest(
                brevisRes.queryKey.query_hash,
                brevisRes.queryKey.nonce,
                config.destination.brevisRequestContract,
                [config.destination.address, 1],
                0, 
                callArgs);

        await tx.wait();

        await brevis.wait(brevisRes.queryKey, config.destination.chainId);
    } catch (err) {
        console.error(err);
    }
}