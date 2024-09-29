// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.27;

interface IVwapRateProvider {
    function vwap() external view returns (bool ok, uint256 value);
}