require('dotenv').config();
const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // contract address of PAR7E property token
    const contractAddress = '0xd3243096d2673A73d12bCef6D546dea5fdd03194'; // from the user's metamask output
    const amount = 1n;
    const tokenPrice = 52000000000000n;
    
    const abi = ["function buyTokens(uint256 amount) external payable"];
    const iface = new ethers.Interface(abi);
    const data = iface.encodeFunctionData("buyTokens", [amount]);
    
    const tx = {
        to: contractAddress,
        data: data,
        value: tokenPrice * amount,
        from: '0x643945A119dF978b39749139c327cF380c767F89' // Use deployer address as caller for simulation
    };
    
    try {
        const result = await provider.call(tx);
        console.log("Simulation success! Result:", result);
    } catch (e) {
        console.error("Simulation reverted!");
        if (e.data) {
            console.error("Revert data:", e.data);
            try {
                // Try to decode generic revert string
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], '0x' + e.data.slice(10));
                console.error("Revert reason:", decoded[0]);
            } catch(decErr) {}
        } else {
            console.error(e);
        }
    }
}
main();
