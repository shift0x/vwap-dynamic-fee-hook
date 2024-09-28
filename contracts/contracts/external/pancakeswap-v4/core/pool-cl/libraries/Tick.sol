// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity ^0.8.0;

import "../../libraries/SafeCast.sol";
import "./TickMath.sol";
import "./LiquidityMath.sol";

/// @title Tick
/// @notice Contains functions for managing tick processes and relevant calculations
library Tick {
    using SafeCast for int256;

    /// @notice Thrown when tickLower is not below tickUpper
    /// @param tickLower The invalid tickLower
    /// @param tickUpper The invalid tickUpper
    error TicksMisordered(int24 tickLower, int24 tickUpper);

    /// @notice Thrown when tickLower is less than min tick
    /// @param tickLower The invalid tickLower
    error TickLowerOutOfBounds(int24 tickLower);

    /// @notice Thrown when tickUpper exceeds max tick
    /// @param tickUpper The invalid tickUpper
    error TickUpperOutOfBounds(int24 tickUpper);

    /// @notice For the tick spacing, the tick has too much liquidity
    error TickLiquidityOverflow(int24 tick);

    // info stored for each initialized individual tick
    struct Info {
        // the total position liquidity that references this tick
        uint128 liquidityGross;
        // amount of net liquidity added (subtracted) when tick is crossed from left to right (right to left),
        int128 liquidityNet;
        // fee growth per unit of liquidity on the _other_ side of this tick (relative to the current tick)
        // only has relative meaning, not absolute — the value depends on when the tick is initialized
        uint256 feeGrowthOutside0X128;
        uint256 feeGrowthOutside1X128;
    }
    /// @dev Common checks for valid tick inputs.

    function checkTicks(int24 tickLower, int24 tickUpper) internal pure {
        if (tickLower >= tickUpper) revert TicksMisordered(tickLower, tickUpper);
        if (tickLower < TickMath.MIN_TICK) revert TickLowerOutOfBounds(tickLower);
        if (tickUpper > TickMath.MAX_TICK) revert TickUpperOutOfBounds(tickUpper);
    }

    /// @notice Derives max liquidity per tick from given tick spacing
    /// @dev Executed within the pool constructor
    /// @param tickSpacing The amount of required tick separation, realized in multiples of `tickSpacing`
    ///     e.g., a tickSpacing of 3 requires ticks to be initialized every 3rd tick i.e., ..., -6, -3, 0, 3, 6, ...
    /// @return result The max liquidity per tick
    function tickSpacingToMaxLiquidityPerTick(int24 tickSpacing) internal pure returns (uint128 result) {
        // Equivalent to v3 but in assembly for gas efficiency:
        // int24 minTick = (TickMath.MIN_TICK / tickSpacing);
        // int24 maxTick = (TickMath.MAX_TICK / tickSpacing);
        // uint24 numTicks = maxTick - minTick + 1;
        // return type(uint128).max / numTicks;
        int24 MAX_TICK = TickMath.MAX_TICK;
        int24 MIN_TICK = TickMath.MIN_TICK;
        // tick spacing will never be 0 since TickMath.MIN_TICK_SPACING is 1
        assembly ("memory-safe") {
            tickSpacing := signextend(2, tickSpacing)
            let minTick := sub(sdiv(MIN_TICK, tickSpacing), slt(smod(MIN_TICK, tickSpacing), 0))
            let maxTick := sdiv(MAX_TICK, tickSpacing)
            let numTicks := add(sub(maxTick, minTick), 1)
            result := div(sub(shl(128, 1), 1), numTicks)
        }
    }

    /// @notice Retrieves fee growth data
    /// @param self The mapping containing all tick information for initialized ticks
    /// @param tickLower The lower tick boundary of the position
    /// @param tickUpper The upper tick boundary of the position
    /// @param tickCurrent The current tick
    /// @param feeGrowthGlobal0X128 The all-time global fee growth, per unit of liquidity, in token0
    /// @param feeGrowthGlobal1X128 The all-time global fee growth, per unit of liquidity, in token1
    /// @return feeGrowthInside0X128 The all-time fee growth in token0, per unit of liquidity, inside the position's tick boundaries
    /// @return feeGrowthInside1X128 The all-time fee growth in token1, per unit of liquidity, inside the position's tick boundaries
    function getFeeGrowthInside(
        mapping(int24 => Tick.Info) storage self,
        int24 tickLower,
        int24 tickUpper,
        int24 tickCurrent,
        uint256 feeGrowthGlobal0X128,
        uint256 feeGrowthGlobal1X128
    ) internal view returns (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128) {
        Info storage lower = self[tickLower];
        Info storage upper = self[tickUpper];

        // calculate fee growth below
        uint256 feeGrowthBelow0X128;
        uint256 feeGrowthBelow1X128;
        unchecked {
            if (tickCurrent >= tickLower) {
                feeGrowthBelow0X128 = lower.feeGrowthOutside0X128;
                feeGrowthBelow1X128 = lower.feeGrowthOutside1X128;
            } else {
                feeGrowthBelow0X128 = feeGrowthGlobal0X128 - lower.feeGrowthOutside0X128;
                feeGrowthBelow1X128 = feeGrowthGlobal1X128 - lower.feeGrowthOutside1X128;
            }

            // calculate fee growth above
            uint256 feeGrowthAbove0X128;
            uint256 feeGrowthAbove1X128;
            if (tickCurrent < tickUpper) {
                feeGrowthAbove0X128 = upper.feeGrowthOutside0X128;
                feeGrowthAbove1X128 = upper.feeGrowthOutside1X128;
            } else {
                feeGrowthAbove0X128 = feeGrowthGlobal0X128 - upper.feeGrowthOutside0X128;
                feeGrowthAbove1X128 = feeGrowthGlobal1X128 - upper.feeGrowthOutside1X128;
            }

            feeGrowthInside0X128 = feeGrowthGlobal0X128 - feeGrowthBelow0X128 - feeGrowthAbove0X128;
            feeGrowthInside1X128 = feeGrowthGlobal1X128 - feeGrowthBelow1X128 - feeGrowthAbove1X128;
        }
    }

    /// @notice Updates a tick and returns true if the tick was flipped from initialized to uninitialized, or vice versa
    /// @param self The mapping containing all tick information for initialized ticks
    /// @param tick The tick that will be updated
    /// @param tickCurrent The current tick
    /// @param liquidityDelta A new amount of liquidity to be added (subtracted) when tick is crossed from left to right (right to left)
    /// @param feeGrowthGlobal0X128 The all-time global fee growth, per unit of liquidity, in token0
    /// @param feeGrowthGlobal1X128 The all-time global fee growth, per unit of liquidity, in token1
    /// @param upper true for updating a position's upper tick, or false for updating a position's lower tick
    /// @param maxLiquidity The maximum liquidity allocation for a single tick
    /// @return flipped Whether the tick was flipped from initialized to uninitialized, or vice versa
    function update(
        mapping(int24 => Tick.Info) storage self,
        int24 tick,
        int24 tickCurrent,
        int128 liquidityDelta,
        uint256 feeGrowthGlobal0X128,
        uint256 feeGrowthGlobal1X128,
        bool upper,
        uint128 maxLiquidity
    ) internal returns (bool flipped) {
        Tick.Info storage info = self[tick];

        ///@dev accessing two members without touching the same slot twice
        uint128 liquidityGrossBefore;
        int128 liquidityNetBefore;
        assembly ("memory-safe") {
            let slot0 := sload(info.slot)
            liquidityGrossBefore := shr(128, shl(128, slot0))
            liquidityNetBefore := shr(128, slot0)
        }

        uint128 liquidityGrossAfter = LiquidityMath.addDelta(liquidityGrossBefore, liquidityDelta);

        if (liquidityGrossAfter > maxLiquidity) revert TickLiquidityOverflow(tick);

        flipped = (liquidityGrossAfter == 0) != (liquidityGrossBefore == 0);

        if (liquidityGrossBefore == 0) {
            // by convention, we assume that all growth before a tick was initialized happened _below_ the tick
            if (tick <= tickCurrent) {
                info.feeGrowthOutside0X128 = feeGrowthGlobal0X128;
                info.feeGrowthOutside1X128 = feeGrowthGlobal1X128;
            }
        }

        // when the lower (upper) tick is crossed left to right (right to left), liquidity must be added (removed)
        int128 liquidityNetAfter = upper ? (liquidityNetBefore - liquidityDelta) : (liquidityNetBefore + liquidityDelta);

        // update two members in one go
        assembly ("memory-safe") {
            sstore(
                info.slot, or(and(liquidityGrossAfter, 0xffffffffffffffffffffffffffffffff), shl(128, liquidityNetAfter))
            )
        }
    }

    /// @notice Clears tick data
    /// @param self The mapping containing all initialized tick information for initialized ticks
    /// @param tick The tick that will be cleared
    function clear(mapping(int24 => Tick.Info) storage self, int24 tick) internal {
        delete self[tick];
    }

    /// @notice Transitions to next tick as needed by price movement
    /// @param self The mapping containing all tick information for initialized ticks
    /// @param tick The destination tick of the transition
    /// @param feeGrowthGlobal0X128 The all-time global fee growth, per unit of liquidity, in token0
    /// @param feeGrowthGlobal1X128 The all-time global fee growth, per unit of liquidity, in token1
    /// @return liquidityNet The amount of liquidity added (subtracted) when tick is crossed from left to right (right to left)
    function cross(
        mapping(int24 => Tick.Info) storage self,
        int24 tick,
        uint256 feeGrowthGlobal0X128,
        uint256 feeGrowthGlobal1X128
    ) internal returns (int128 liquidityNet) {
        unchecked {
            Tick.Info storage info = self[tick];
            info.feeGrowthOutside0X128 = feeGrowthGlobal0X128 - info.feeGrowthOutside0X128;
            info.feeGrowthOutside1X128 = feeGrowthGlobal1X128 - info.feeGrowthOutside1X128;
            liquidityNet = info.liquidityNet;
        }
    }
}
