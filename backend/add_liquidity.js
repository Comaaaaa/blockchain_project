const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    // contract address of PAR7E property token
    const tokenAddress = '0xd3243096d2673A73d12bCef6D546dea5fdd03194';
    const swapPoolAddress = '0x699019D54eB692eBe911d0b84Cd6b24dA5673a2E';
    
    const tokenAbi = ["function approve(address spender, uint256 amount) external returns (bool)", "function balanceOf(address account) external view returns (uint256)"];
    const poolAbi = ["function addLiquidity(uint256 tokenAmount) external payable returns (uint256)", "function reserveETH() external view returns (uint256)", "function reserveToken() external view returns (uint256)"];
    
    const token = new ethers.Contract(tokenAddress, tokenAbi, deployer);
    const pool = new ethers.Contract(swapPoolAddress, poolAbi, deployer);
    
    console.log("Current pool ETH:", ethers.formatEther(await pool.reserveETH()));
    console.log("Current pool Tokens:", (await pool.reserveToken()).toString());
    
    // Add 100 PAR7E + 0.01 ETH
    const tokenAmount = 100n;
    const ethAmount = ethers.parseEther("0.01");
    
    const bal = await token.balanceOf(deployer.address);
    console.log("Deployer token balance:", bal.toString());
    
    console.log("Approving...");
    let tx = await token.approve(swapPoolAddress, tokenAmount);
    await tx.wait();
    
    console.log("Adding liquidity...");
    tx = await pool.addLiquidity(tokenAmount, { value: ethAmount });
    await tx.wait();
    
    console.log("Liquidity added!");
    console.log("New pool ETH:", ethers.formatEther(await pool.reserveETH()));
    console.log("New pool Tokens:", (await pool.reserveToken()).toString());
}
main();
