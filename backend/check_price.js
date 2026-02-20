require('dotenv').config();
const { ethers } = require('ethers');
async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const contractAddress = '0xd3243096d2673A73d12bCef6D546dea5fdd03194';
    const abi = ["function tokenPrice() external view returns (uint256)"];
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const price = await contract.tokenPrice();
    console.log("Actual tokenPrice on chain:", price.toString());
}
main();
