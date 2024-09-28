import { getSwaps } from "./chain";
import { validateConfiguration } from "./config";
import { proveAndSubmit } from "./prover";

async function main(){
    const ok = await validateConfiguration();

    if(!ok) {
        process.exit(1);
    }

    const swaps = await getSwaps();
    
    await proveAndSubmit(swaps);
}

main();