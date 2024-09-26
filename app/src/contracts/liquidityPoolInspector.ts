import { ethers } from "ethers";

const CONTRACT_ABI = ``;
const STATE_OVERRIDE_BYTECODE = ``;
const STATE_OVERRIDE_ADDRESS = ``;

export async function checkLiquidityPoolsForTokens(provider: ethers.JsonRpcProvider, token0: string, token1: string, pools: string[]) {
    const override = {
        STATE_OVERRIDE_ADDRESS: {
            code: STATE_OVERRIDE_BYTECODE
        }
    }

    const contract = new ethers.Contract(STATE_OVERRIDE_ADDRESS, CONTRACT_ABI, provider);
    const calldata = contract.interface.encodeFunctionData("inspect", [pools, token0, token1]);

    const tx = {
        to: STATE_OVERRIDE_ADDRESS,
        data: calldata
    }

    const params = [
        tx,
        "latest",
        override
    ]
    
    const callResult = await provider.send("eth_call", params)
    const decodedCallResult = contract.interface.decodeFunctionResult("inspect", callResult)

    
}