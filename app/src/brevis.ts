import { Brevis, ErrCode, ProofRequest, ProveResponse } from "brevis-sdk-typescript";

const destinationChainId = 11155111 // sepolia

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
        const brevisRes = await brevis.submit(proofReq, proofRes, chainId, destinationChainId, 0, "", "");
        console.log('brevis res', brevisRes);

        await brevis.wait(brevisRes.queryKey, destinationChainId);
    } catch (err) {
        console.error(err);
    }
}