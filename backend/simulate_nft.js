require('dotenv').config();
const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    const contractAddress = '0x221D82b6C453e81Bd22c23E41eA766FC81122E10'; // from user's output
    const listingIdOnchain = 1n; // from DB (prop-002 -> token ID 1 -> listing 1?)
    const priceWei = 1000000000000000n; // 0.001 ETH
    
    const abi = ["function buyListing(uint256 listingId) external payable"];
    const iface = new ethers.Interface(abi);
    const data = iface.encodeFunctionData("buyListing", [listingIdOnchain]);
    
    const tx = {
        to: contractAddress,
        data: data,
        value: priceWei,
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
