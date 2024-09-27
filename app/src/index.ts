import { submit } from "./brevis";
import { getSwaps } from "./chain";
import { validateConfiguration } from "./config";
import { prove } from "./prover";

async function main(){
    const ok = await validateConfiguration();

    if(!ok) {
        process.exit(1);
    }

    const swaps = await getSwaps();
    const proof = await prove(swaps);

    await submit();
}

main();