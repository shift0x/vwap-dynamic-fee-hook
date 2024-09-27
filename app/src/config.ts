import { ethers } from "ethers";
import { config } from "../app.config";

export async function validateConfiguration() {
    const requests = config.chains.map(async chain => {
        if(!chain.rpc || chain.rpc.trim().length == 0) {
            return `rpc is undefined (chainId: ${chain.chainId})`
        }

        const provider = new ethers.JsonRpcProvider(chain.rpc)

        try {
            await provider.getBlockNumber()

            return null;
        } catch(err: any) {
            return `unable to connect to rpc (chainId: ${chain.chainId}) - ${err.message}`
        }
    });

    const checkResults = await Promise.all(requests)
    const errors = checkResults.filter(result => { return result != null})

    errors.forEach(err => {
        console.error(`configuration error: ${err}`)
    });

    return errors.length == 0;
}