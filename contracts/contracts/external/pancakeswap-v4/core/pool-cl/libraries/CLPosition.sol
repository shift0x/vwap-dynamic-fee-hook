// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity ^0.8.0;

import {FullMath} from "./FullMath.sol";
import {FixedPoint128} from "./FixedPoint128.sol";
import {LiquidityMath} from "./LiquidityMath.sol";

/// @title CLPosition
/// @notice Positions represent an owner address' liquidity between a lower and upper tick boundary
/// @dev Positions store additional state for tracking fees owed to the position
library CLPosition {
    /// @notice Cannot update a position with no liquidity
    error CannotUpdateEmptyPosition();

    // info stored for each user's position
    struct Info {
        // the amount of liquidity owned by this position
        uint128 liquidity;
        // fee growth per unit of liquidity as of the last update to liquidity or fees owed
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
    }

    /// @notice A helper function to calculate the position key
    /// @param owner The address of the position owner
    /// @param tickLower the lower tick boundary of the position
    /// @param tickUpper the upper tick boundary of the position
    /// @param salt A unique value to differentiate between multiple positions in the same range, by the same owner. Passed in by the caller.
    function calculatePositionKey(address owner, int24 tickLower, int24 tickUpper, bytes32 salt)
        internal
        pure
        returns (bytes32 key)
    {
        // same as `positionKey = keccak256(abi.encodePacked(owner, tickLower, tickUpper, salt))`
        // make salt, tickUpper, tickLower, owner to be tightly packed in memory
        // mstore in reverse order make sure latter can make use of the empty space in the former
        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(add(fmp, 0x26), salt) // salt at [0x26, 0x46)
            mstore(add(fmp, 0x06), tickUpper) // tickUpper at [0x23, 0x26)
            mstore(add(fmp, 0x03), tickLower) // tickLower at [0x20, 0x23)
            mstore(fmp, owner) // owner at [0x0c, 0x20)
            key := keccak256(add(fmp, 0x0c), 0x3a) // len is 58 bytes

            // now clean the memory we used since we don't need it anymore
            mstore(add(fmp, 0x40), 0) // fmp+0x40 held salt
            mstore(add(fmp, 0x20), 0) // fmp+0x20 held tickLower, tickUpper, salt
            mstore(fmp, 0) // fmp held owner
        }
    }

    /// @notice Returns the Info struct of a position, given an owner and position boundaries
    /// @param self The mapping containing all user positions
    /// @param owner The address of the position owner
    /// @param tickLower The lower tick boundary of the position
    /// @param tickUpper The upper tick boundary of the position
    /// @param salt A unique value to differentiate between multiple positions in the same range
    /// @return position The position info struct of the given owners' position
    function get(mapping(bytes32 => Info) storage self, address owner, int24 tickLower, int24 tickUpper, bytes32 salt)
        internal
        view
        returns (Info storage position)
    {
        bytes32 key = calculatePositionKey(owner, tickLower, tickUpper, salt);
        position = self[key];
    }

    /// @notice Credits accumulated fees to a user's position
    /// @param self The individual position to update
    /// @param liquidityDelta The change in pool liquidity as a result of the position update
    /// @param feeGrowthInside0X128 The all-time fee growth in currency0, per unit of liquidity, inside the position's tick boundaries
    /// @param feeGrowthInside1X128 The all-time fee growth in currency1, per unit of liquidity, inside the position's tick boundaries
    /// @return feesOwed0 The amount of currency0 owed to the position owner
    /// @return feesOwed1 The amount of currency1 owed to the position owner
    function update(
        Info storage self,
        int128 liquidityDelta,
        uint256 feeGrowthInside0X128,
        uint256 feeGrowthInside1X128
    ) internal returns (uint256 feesOwed0, uint256 feesOwed1) {
        uint128 liquidity = self.liquidity;

        uint128 liquidityNext;
        if (liquidityDelta == 0) {
            if (liquidity == 0) revert CannotUpdateEmptyPosition(); // disallow pokes for 0 liquidity positions
            liquidityNext = liquidity;
        } else {
            liquidityNext = LiquidityMath.addDelta(liquidity, liquidityDelta);
        }

        ///@dev Tho overflow is expected, it's technically possible users can lose their rewards if it hits type(uint128).max
        unchecked {
            feesOwed0 =
                FullMath.mulDiv(feeGrowthInside0X128 - self.feeGrowthInside0LastX128, liquidity, FixedPoint128.Q128);
            feesOwed1 =
                FullMath.mulDiv(feeGrowthInside1X128 - self.feeGrowthInside1LastX128, liquidity, FixedPoint128.Q128);
        }

        // update the position
        if (liquidityDelta != 0) self.liquidity = liquidityNext;
        self.feeGrowthInside0LastX128 = feeGrowthInside0X128;
        self.feeGrowthInside1LastX128 = feeGrowthInside1X128;
    }
}
