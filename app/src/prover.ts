import { Swap } from "./types";
import config from '../config.json'

function createDatasetFrom(swaps : Swap[]) : Swap[] {
    if(swaps.length <= config.maxSwaps) {
        return swaps
    }

    const sortedSwaps = swaps.sort((x,y) => {
        return x.age - y.age;
    })

    return sortedSwaps.splice(0, config.maxSwaps)
}

export const prove = async (swaps : Swap[]) => {
    const dataset = createDatasetFrom(swaps);

    console.log({dataset})
}