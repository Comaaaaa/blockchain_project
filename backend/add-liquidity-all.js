const { ethers } = require('ethers');
require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const path = require('path');

function loadAddresses() {
    const addressesPath = path.join(__dirname, '..', 'blockchain', 'deployed-addresses.json');
    if (fs.existsSync(addressesPath)) {
        return JSON.parse(fs.readFileSync(addressesPath, 'utf-8'));
    }

    return {
        ComplianceRegistry: process.env.COMPLIANCE_REGISTRY_ADDRESS,
        PropertyToken_PAR7E: process.env.PROPERTY_TOKEN_ADDRESS,
        TokenSwapPool: process.env.TOKEN_SWAP_POOL_ADDRESS,
    };
}

async function ensureWhitelisted(compliance, addressToCheck, label) {
    if (!addressToCheck || addressToCheck === ethers.ZeroAddress) {
        throw new Error(`${label} address is missing`);
    }

    const isCompliant = await compliance.isCompliant(addressToCheck);
    if (!isCompliant) {
        console.log(`Whitelisting ${label} (${addressToCheck})...`);
        const tx = await compliance.addToWhitelist(addressToCheck);
        await tx.wait();
    }
}

async function ensureDexPairAndLiquidity({
    name,
    token,
    tokenAddress,
    wethAddress,
    deployer,
    compliance,
    tokenAmount,
    ethAmount,
    routerAddress,
    factoryAddress,
}) {
    if (!routerAddress || !factoryAddress || !wethAddress) {
        console.log(`[${name}] Skipped: missing router/factory/weth env vars`);
        return;
    }

    const routerAbi = [
        'function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) external payable returns (uint amountToken,uint amountETH,uint liquidity)',
    ];
    const factoryAbi = [
        'function getPair(address tokenA, address tokenB) external view returns (address pair)',
        'function createPair(address tokenA, address tokenB) external returns (address pair)',
    ];

    const router = new ethers.Contract(routerAddress, routerAbi, deployer);
    const factory = new ethers.Contract(factoryAddress, factoryAbi, deployer);

    let pairAddress = await factory.getPair(tokenAddress, wethAddress);
    if (!pairAddress || pairAddress === ethers.ZeroAddress) {
        console.log(`[${name}] Creating pair...`);
        const tx = await factory.createPair(tokenAddress, wethAddress);
        await tx.wait();
        pairAddress = await factory.getPair(tokenAddress, wethAddress);
    }

    if (!pairAddress || pairAddress === ethers.ZeroAddress) {
        throw new Error(`[${name}] Pair creation failed`);
    }

    console.log(`[${name}] Pair address: ${pairAddress}`);

    await ensureWhitelisted(compliance, pairAddress, `${name} pair`);
    await ensureWhitelisted(compliance, routerAddress, `${name} router`);

    console.log(`[${name}] Approving router...`);
    let tx = await token.approve(routerAddress, ethers.MaxUint256);
    await tx.wait();

    console.log(`[${name}] Adding liquidity...`);
    tx = await router.addLiquidityETH(
        tokenAddress,
        tokenAmount,
        0,
        0,
        deployer.address,
        Math.floor(Date.now() / 1000) + 60 * 15,
        { value: ethAmount }
    );
    await tx.wait();

    console.log(`[${name}] Liquidity added`);
}

async function main() {
    if (!process.env.RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY) {
        throw new Error('Missing RPC_URL or DEPLOYER_PRIVATE_KEY in backend/.env');
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

    const addresses = loadAddresses();

    const tokenAddress = process.env.PROPERTY_TOKEN_ADDRESS || addresses.PropertyToken_PAR7E;
    const swapPoolAddress = addresses.TokenSwapPool;
    const complianceAddress = addresses.ComplianceRegistry;

    const uniRouterAddr = process.env.UNISWAP_V2_ROUTER_ADDRESS;
    const uniFactoryAddr = process.env.UNISWAP_V2_FACTORY_ADDRESS;
    const sushiRouterAddr = process.env.SUSHISWAP_V2_ROUTER_ADDRESS;
    const sushiFactoryAddr = process.env.SUSHISWAP_V2_FACTORY_ADDRESS;
    const wethAddress = process.env.WETH_ADDRESS;

    const tokenAbi = ["function approve(address spender, uint256 amount) external returns (bool)", "function balanceOf(address account) external view returns (uint256)"];
    const poolAbi = ["function addLiquidity(uint256 tokenAmount) external payable returns (uint256)", "function reserveETH() external view returns (uint256)", "function reserveToken() external view returns (uint256)"];
    const complianceAbi = ["function isCompliant(address account) external view returns (bool)", "function addToWhitelist(address account) external"];

    if (!tokenAddress || !complianceAddress) {
        throw new Error('Missing token or compliance address (deployed-addresses.json or env)');
    }

    const token = new ethers.Contract(tokenAddress, tokenAbi, deployer);
    const compliance = new ethers.Contract(complianceAddress, complianceAbi, deployer);
    const pool = swapPoolAddress ? new ethers.Contract(swapPoolAddress, poolAbi, deployer) : null;

    const tokenAmount = BigInt(process.env.DEX_TOKEN_LIQUIDITY || '200');
    const ethAmount = ethers.parseEther(process.env.DEX_ETH_LIQUIDITY || '0.0208');

    console.log('Using deployer:', deployer.address);
    console.log('Token address:', tokenAddress);

    const tokenBalance = await token.balanceOf(deployer.address);
    if (tokenBalance < tokenAmount) {
        throw new Error(`Insufficient token balance. Need ${tokenAmount}, have ${tokenBalance}`);
    }

    // --- 1. Internal Pool Liquidity ---
    if (pool) {
        const reserveETH = await pool.reserveETH();
        const reserveToken = await pool.reserveToken();

        let internalPoolEthAmount;
        if (reserveToken > 0n) {
            internalPoolEthAmount = (tokenAmount * reserveETH) / reserveToken + 100n;
        } else {
            internalPoolEthAmount = ethAmount;
        }

        console.log('Approving internal pool...');
        let tx = await token.approve(swapPoolAddress, ethers.MaxUint256);
        await tx.wait();

        console.log('Adding liquidity to internal pool...');
        try {
            tx = await pool.addLiquidity(tokenAmount, { value: internalPoolEthAmount });
            await tx.wait();
            console.log('Internal pool liquidity added');
        } catch (e) {
            console.log('Internal pool addLiquidity failed:', e.shortMessage || e.message);
        }
    }

    // --- 2. Uniswap/Sushiswap V2 Liquidity ---
    await ensureDexPairAndLiquidity({
        name: 'Uniswap',
        token,
        tokenAddress,
        wethAddress,
        deployer,
        compliance,
        tokenAmount,
        ethAmount,
        routerAddress: uniRouterAddr,
        factoryAddress: uniFactoryAddr,
    });

    await ensureDexPairAndLiquidity({
        name: 'Sushiswap',
        token,
        tokenAddress,
        wethAddress,
        deployer,
        compliance,
        tokenAmount,
        ethAmount,
        routerAddress: sushiRouterAddr,
        factoryAddress: sushiFactoryAddr,
    });

    console.log('DEX setup complete');
}
main()
    .then(() => console.log('Done'))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
