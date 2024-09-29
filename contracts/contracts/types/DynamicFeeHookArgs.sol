// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

struct DynamicFeeHookArgs {
    uint24 baseFee;
    uint24 volatilityFee;
    address admin;
    address baseToken;
    address quoteToken;
}