import { submit } from "./brevis";
import { getReceiptsByChain } from "./chain";
import { prove } from "./prover";

async function main(){
    const receipts = await getReceiptsByChain();
    const proof = await prove();
    
    await submit();

    console.log("completed")
}

main();