const { ethers } = require('ethers');
require('dotenv').config({ path: __dirname + '/.env' });

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    const addresses = require('../blockchain/deployed-addresses.json');
    
    const tokenAddress = addresses.PropertyToken_PAR7E;
    const swapPoolAddress = addresses.TokenSwapPool;
    const complianceAddress = addresses.ComplianceRegistry;
    
    const uniRouterAddr = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";
    const uniFactoryAddr = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003";
    const wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
    
    const tokenAbi = ["function approve(address spender, uint256 amount) external returns (bool)", "function balanceOf(address account) external view returns (uint256)"];
    const poolAbi = ["function addLiquidity(uint256 tokenAmount) external payable returns (uint256)", "function reserveETH() external view returns (uint256)", "function reserveToken() external view returns (uint256)"];
    const routerAbi = ["function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) external payable returns (uint amountToken,uint amountETH,uint liquidity)"];
    const factoryAbi = ["function getPair(address tokenA, address tokenB) external view returns (address pair)", "function createPair(address tokenA, address tokenB) external returns (address pair)"];
    const complianceAbi = ["function isCompliant(address account) external view returns (bool)", "function addToWhitelist(address account) external"];
    
    const token = new ethers.Contract(tokenAddress, tokenAbi, deployer);
    const pool = new ethers.Contract(swapPoolAddress, poolAbi, deployer);
    const uniRouter = new ethers.Contract(uniRouterAddr, routerAbi, deployer);
    const uniFactory = new ethers.Contract(uniFactoryAddr, factoryAbi, deployer);
    const compliance = new ethers.Contract(complianceAddress, complianceAbi, deployer);
    
    // --- 1. Internal Pool Liquidity ---
    const reserveETH = await pool.reserveETH();
    const reserveToken = await pool.reserveToken();
    const tokenAmount = 200n; // Use 200 tokens to be safe
    let ethAmount;
    if (reserveToken > 0n) {
        ethAmount = (tokenAmount * reserveETH) / reserveToken + 100n; // Add buffer to avoid Insufficient ETH for ratio
    } else {
        ethAmount = ethers.parseEther("0.0208");
    }
    
    console.log("Approving Pool...");
    let tx = await token.approve(swapPoolAddress, ethers.MaxUint256);
    await tx.wait();
    
    console.log("Adding liquidity to Pool...");
    try {
        tx = await pool.addLiquidity(tokenAmount, { value: ethAmount });
        await tx.wait();
        console.log("Pool liquidity added!");
    } catch(e) {
        console.log("Pool addLiquidity failed:", e.shortMessage || e.message);
    }
    
    // --- 2. Uniswap V2 Liquidity ---
    let uniPairAddress = await uniFactory.getPair(tokenAddress, wethAddress);
    if (!uniPairAddress || uniPairAddress === ethers.ZeroAddress) {
        console.log("Creating Uniswap Pair...");
        tx = await uniFactory.createPair(tokenAddress, wethAddress);
        await tx.wait();
        uniPairAddress = await uniFactory.getPair(tokenAddress, wethAddress);
    }
    
    console.log("Uniswap Pair Address:", uniPairAddress);
    
    // Whitelist the Pair before adding liquidity!
    const isPairCompliant = await compliance.isCompliant(uniPairAddress);
    if (!isPairCompliant) {
        console.log("Whitelisting Uniswap Pair in ComplianceRegistry...");
        tx = await compliance.addToWhitelist(uniPairAddress);
        await tx.wait();
        console.log("Uniswap Pair Whitelisted.");
    }

    // Also Whitelist the Router just in case it holds tokens transiently (though it shouldn't hold them, it transfersFrom directly to pair)
    const isRouterCompliant = await compliance.isCompliant(uniRouterAddr);
    if (!isRouterCompliant) {
        console.log("Whitelisting Uniswap Router...");
        tx = await compliance.addToWhitelist(uniRouterAddr);
        await tx.wait();
        console.log("Router Whitelisted.");
    }
    
    let uniEthAmount = ethers.parseEther("0.0208"); // 200 tokens
    
    console.log("Approving Uniswap Router...");
    tx = await token.approve(uniRouterAddr, ethers.MaxUint256);
    await tx.wait();
    
    console.log("Adding liquidity to Uniswap...");
    try {
        tx = await uniRouter.addLiquidityETH(
            tokenAddress,
            tokenAmount,
            0,
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 60 * 15,
            { value: uniEthAmount }
        );
        await tx.wait();
        console.log("Uniswap liquidity added!");
    } catch(e) {
        console.log("Uniswap addLiquidity failed:", e.shortMessage || e.message);
    }
}
main().then(() => console.log("Done")).catch(console.error);
