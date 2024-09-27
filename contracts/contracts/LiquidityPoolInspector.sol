// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import './interfaces/IV3LiquidityPoolImmutables.sol';

contract LiquidityPoolInspector {

    struct InspectionResult {
        address pool;
        address token0;
        address token1;
    }

    function getPoolToken(
        bytes4 selector, 
        address pool
    ) private view returns (address) {
        (bool success, bytes memory data) = pool.staticcall(abi.encodePacked(selector));

        if(!success) {
            return address(0);
        }

        return abi.decode(data, (address));
    }

    function inspect(
        address[] memory pools
    ) public view returns (InspectionResult[] memory inspectionResults) {
        inspectionResults = new InspectionResult[](pools.length);

        for(uint256 i=0; i < pools.length; ++i){
            inspectionResults[i] = InspectionResult(
                pools[i], 
                getPoolToken(IV3LiquidityPoolImmutables.token0.selector, pools[i]),
                getPoolToken(IV3LiquidityPoolImmutables.token1.selector, pools[i]));
        }
    }
}