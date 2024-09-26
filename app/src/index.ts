import { submit } from "./brevis";
import { getSwaps } from "./chain";
import { prove } from "./prover";

async function main(){
    const swaps = await getSwaps();
    const proof = await prove(swaps);

    await submit();
}

main();