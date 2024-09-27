const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokenA = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const tokenB = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const tokenC = "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f";

describe("Liquidity Pool Inspector Tests", function(){

    async function deploy(name, args){
        const contract = await ethers.getContractFactory(name);
        const instance = await contract.deploy(...(args??[]));
        
        await instance.waitForDeployment();
        
        return instance;
    }

    async function setup(){
        const mockLiquidityPool = await deploy("MockLiquidityPool");
        const liquidityPoolInspector = await deploy("LiquidityPoolInspector");

        return { mockLiquidityPool, liquidityPoolInspector }
    }
    
    it("Should return false when liquidity pool does not contain tokens", async function () {
        const { mockLiquidityPool, liquidityPoolInspector } = await loadFixture(setup);

        await mockLiquidityPool.setTokens(tokenA, tokenC);

        const poolAddress = await mockLiquidityPool.getAddress();

        const inspectionResults = await liquidityPoolInspector.inspect(tokenA, tokenB, [poolAddress]);

        expect(inspectionResults[0][1]).is.false;
    });

    it("Should return true when liquidity pool contains tokens", async function () {
        const { mockLiquidityPool, liquidityPoolInspector } = await loadFixture(setup);

        await mockLiquidityPool.setTokens(tokenA, tokenB);

        const poolAddress = await mockLiquidityPool.getAddress();

        const inspectionResults = await liquidityPoolInspector.inspect(tokenA, tokenB, [poolAddress]);

        expect(inspectionResults[0][1]).is.true;
    });

});