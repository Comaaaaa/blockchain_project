const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Create/fund an explicit Uniswap V2 pair for PropertyToken_PAR7E on Sepolia.
 *
 * Required env vars:
 * - UNISWAP_V2_ROUTER_ADDRESS
 * - UNISWAP_V2_FACTORY_ADDRESS
 * - WETH_ADDRESS
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error("Missing blockchain/deployed-addresses.json");
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const tokenAddress = addresses.PropertyToken_PAR7E;
  const complianceAddress = addresses.ComplianceRegistry;

  const routerAddress = process.env.UNISWAP_V2_ROUTER_ADDRESS;
  const factoryAddress = process.env.UNISWAP_V2_FACTORY_ADDRESS;
  const wethAddress = process.env.WETH_ADDRESS;

  if (!tokenAddress || !complianceAddress) {
    throw new Error("Missing PropertyToken_PAR7E or ComplianceRegistry address");
  }
  if (!routerAddress || !factoryAddress || !wethAddress) {
    throw new Error("Set UNISWAP_V2_ROUTER_ADDRESS, UNISWAP_V2_FACTORY_ADDRESS and WETH_ADDRESS");
  }

  const token = await hre.ethers.getContractAt("PropertyToken", tokenAddress);
  const compliance = await hre.ethers.getContractAt("ComplianceRegistry", complianceAddress);

  const routerAbi = [
    "function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) external payable returns (uint amountToken,uint amountETH,uint liquidity)",
  ];
  const factoryAbi = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  ];

  const router = new hre.ethers.Contract(routerAddress, routerAbi, deployer);
  const factory = new hre.ethers.Contract(factoryAddress, factoryAbi, deployer);

  const tokenLiquidity = BigInt(process.env.UNISWAP_TOKEN_LIQUIDITY || "200");
  const ethLiquidity = hre.ethers.parseEther(process.env.UNISWAP_ETH_LIQUIDITY || "0.2");

  console.log("Approving router...");
  const approveTx = await token.approve(routerAddress, tokenLiquidity);
  await approveTx.wait();

  console.log("Adding liquidity to Uniswap V2...");
  const deadline = Math.floor(Date.now() / 1000) + 60 * 15;
  const addTx = await router.addLiquidityETH(
    tokenAddress,
    tokenLiquidity,
    0,
    0,
    deployer.address,
    deadline,
    { value: ethLiquidity }
  );
  await addTx.wait();

  const pairAddress = await factory.getPair(tokenAddress, wethAddress);
  if (!pairAddress || pairAddress === hre.ethers.ZeroAddress) {
    throw new Error("Pair creation failed");
  }

  const isCompliant = await compliance.isCompliant(pairAddress);
  if (!isCompliant) {
    console.log("Whitelisting Uniswap pair in ComplianceRegistry...");
    const wlTx = await compliance.addToWhitelist(pairAddress);
    await wlTx.wait();
  }

  console.log("Uniswap V2 integration ready");
  console.log(JSON.stringify({ routerAddress, factoryAddress, wethAddress, pairAddress }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
