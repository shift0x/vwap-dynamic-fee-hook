// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

contract MockLiquidityPool {

    address _token0;
    address _token1;

    function setTokens(address token0Address, address token1Address) public {
        _token0 = token0Address;
        _token1 = token1Address;
    }

    function token0() public view returns (address) {
        return _token0;
    }

    function token1() public view returns (address) {
        return _token1;
    }
}