// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./BrevisVwapRateProvider.sol";
import "./external/pancakeswap-v4/template/CLBaseHook.sol";
import "./interfaces/IVwapRateProvider.sol";

import "./types/DynamicFeeHookArgs.sol";
import "./types/PoolInfo.sol"; 
 
import "./external/pancakeswap-v4/core/types/PoolKey.sol";
import "./external/pancakeswap-v4/core/types/PoolId.sol";
import "./external/pancakeswap-v4/core/libraries/LPFeeLibrary.sol";
import "./external/pancakeswap-v4/core/types/BeforeSwapDelta.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract VwapDynamicFeeHook is CLBaseHook {

    address public immutable brevisRequestContract;

    mapping(PoolId => PoolInfo) public pools;

    event VwapRateProviderCreated(PoolId indexed key, address rateProvider);
    
    constructor(
        address _brevisRequest, 
        ICLPoolManager _poolManager
    ) CLBaseHook(_poolManager) {
        brevisRequestContract = _brevisRequest;
    }

    function getHooksRegistrationBitmap() external pure override returns (uint16) {
        return _hooksRegistrationBitmapFrom(
            Permissions({
                beforeInitialize: false,
                afterInitialize: true,
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

    /// @notice The hook called after the state of a pool is initialized 
    /// @param sender The initial msg.sender for the initialize call
    /// @param key The key for the pool being initialized
    /// @param sqrtPriceX96 The sqrt(price) of the pool as a Q64.96
    /// @param tick The current tick after the state of a pool is initialized
    /// @param hookData Arbitrary data handed into the PoolManager by the initializer to be be passed on to the hook
    /// @return bytes4 The function selector for the hook
    function afterInitialize(
        address sender, 
        PoolKey calldata key, 
        uint160 sqrtPriceX96, 
        int24 tick, 
        bytes calldata hookData
    ) external override returns (bytes4){
        DynamicFeeHookArgs memory hookArgs = abi.decode(hookData, (DynamicFeeHookArgs));
        PoolId poolId = key.toId();

        // Create a new rate provider contract to store vwap info for the given pool
        BrevisVwapRateProvider vwapRateProvider = 
            new BrevisVwapRateProvider(hookArgs.admin, brevisRequestContract, hookArgs.baseToken, hookArgs.quoteToken);

        emit VwapRateProviderCreated(poolId, address(vwapRateProvider));
        
        pools[poolId] = PoolInfo(
            hookArgs.baseFee, 
            hookArgs.volatilityFee, 
            hookArgs.baseToken,
            hookArgs.quoteToken,
            IVwapRateProvider(vwapRateProvider));
    
        return this.afterInitialize.selector;
    } 

    /// @notice The hook called before a swap
    /// @param sender The initial msg.sender for the swap call
    /// @param key The key for the pool
    /// @param params The parameters for the swap
    /// @param hookData Arbitrary data handed into the PoolManager by the swapper to be be passed on to the hook
    /// @return bytes4 The function selector for the hook
    /// @return BeforeSwapDelta The hook's delta in specified and unspecified currencies.
    /// @return uint24 Optionally override the lp fee, only used if three conditions are met:
    ///     1) the Pool has a dynamic fee,
    ///     2) the value's override flag is set to 1 i.e. vaule & OVERRIDE_FEE_FLAG = 0x400000 != 0
    ///     3) the value is less than or equal to the maximum fee (1 million)
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        ICLPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolInfo memory info = pools[key.toId()];

        uint24 fee = info.baseFee;
        (bool ok, uint256 vwap) = info.rateProvider.vwap();

        // short circuit if the rate provider has no volume observations within 
        // in the specified timeout duration
        if(!ok) {
            return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee);
        }

        fee += getVolatilityFee(key, params, info, vwap);
        
        return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee);
    }

    /// @notice Determines the appropiate volatility fee based on market and pool conditions
    /// @param key The key for the pool
    /// @param params The parameters for the swap
    /// @param info Stored poolInfo for the dynamic fee calculation
    /// @param vwap Returned vwap price
    function getVolatilityFee(
        PoolKey calldata key, 
        ICLPoolManager.SwapParams calldata params,
        PoolInfo memory info,
        uint256 vwap
    ) private view returns (uint24) {
        (uint160 sqrtX96Price,,,) = poolManager.getSlot0(key.toId());

        uint256 poolPrice = getPriceFromSqrtX96Price(
            sqrtX96Price, 
            IERC20Metadata(Currency.unwrap(key.currency0)).decimals(), 
            IERC20Metadata(Currency.unwrap(key.currency1)).decimals());

        // determine price impact of the swap
        // price impact will be positive (increase price) when the input token is the quote token
        // price impact will be negative (decrease price) when the input token in the base token
        bool isTokenInBase = params.zeroForOne ?
            Currency.unwrap(key.currency0) == info.baseToken :
            Currency.unwrap(key.currency1) == info.baseToken;

        bool isPositivePriceImpact = !isTokenInBase;

        // determine the adequate fee addition. apply the volatility fee when:
        // 1. The current price is less than the vwap and the swap will move price lower
        // 2. The current price is above than the vwap and the the swap will move price higher
        if(poolPrice < vwap) {
            return isPositivePriceImpact ? 0 : info.volatilityFee;
        } else if(poolPrice > vwap) {
            return isPositivePriceImpact ? info.volatilityFee : 0;
        }

        return 0;
    }

    function getPriceFromSqrtX96Price(
        uint160 sqrtX96Price, 
        uint256 token0Decimals, 
        uint256 token1Decimals
    ) internal pure returns (uint256) {
        uint256 price = Math.mulDiv(
            uint256(sqrtX96Price) * uint256(sqrtX96Price), 
            10**token0Decimals, 
            1 << 192);
            
        return price * 10**(18-token1Decimals);
    }

}