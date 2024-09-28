// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./BrevisSwapVolumeProcessor.sol";
import "./external/pancakeswap-v4/template/CLBaseHook.sol";

contract VwapDynamicFeeHook is BrevisSwapVolumeProcessor, CLBaseHook {

    constructor(
        address brevisRequest, 
        ICLPoolManager poolManager,
        address baseToken,  
        address quoteToken
    ) 
    BrevisSwapVolumeProcessor(brevisRequest, baseToken, quoteToken)
    CLBaseHook(poolManager) {}

    function getHooksRegistrationBitmap() external pure override returns (uint16) {
    return _hooksRegistrationBitmapFrom(
        Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnsDelta: false,
            afterSwapReturnsDelta: false,
            afterAddLiquidityReturnsDelta: false,
            afterRemoveLiquidityReturnsDelta: false
        })
    );
  }


}