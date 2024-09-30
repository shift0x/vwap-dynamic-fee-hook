const { ethers } = require("hardhat");

const brevisRequestAddress = "0x841ce48F9446C8E281D3F1444cB859b4A6D0738C";
const clPoolManagerAddress = "0x6F9302eE8760c764d775B1550C65468Ec4C25Dfc";

const deploy = async () => {
    const contract = await ethers.getContractFactory("VwapDynamicFeeHook")
    const hook = await contract.deploy(brevisRequestAddress, clPoolManagerAddress);

    await hook.waitForDeployment();

    const address = await hook.getAddress();

    return address
}

deploy()
    .then(address => {
        console.log(`VwapDynamicFeeHook: ${address}`);
    })