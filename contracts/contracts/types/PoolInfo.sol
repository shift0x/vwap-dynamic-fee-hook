// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "../interfaces/IVwapRateProvider.sol";

struct PoolInfo {
    uint24 baseFee;
    uint24 volatilityFee;
    address baseToken;
    address quoteToken;
    IVwapRateProvider rateProvider;
}