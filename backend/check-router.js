const { ethers } = require('ethers');
require('dotenv').config({ path: __dirname + '/.env' });
async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const routerAddr = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Official Uniswap V2 Router on Sepolia
    const routerAbi = ["function factory() external view returns (address)", "function WETH() external view returns (address)"];
    const router = new ethers.Contract(routerAddr, routerAbi, provider);
    const factory = await router.factory();
    const weth = await router.WETH();
    console.log("Factory:", factory);
    console.log("WETH:", weth);
}
main().catch(console.error);