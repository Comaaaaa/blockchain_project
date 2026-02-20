const hre = require("hardhat");

async function main() {
  const complianceAddr = "0xB59a52567f7AEb9D68418f93F4B55ef0aA1C92e7";
  const swapPoolAddr = "0xD1a3687612F35EC341CAd6bA7EAE6619d2F53776";
  const tokenAddr = "0x6678Cdd02F2cd95dEeC93154489389A4102F54FC"; // PAR7E
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const compliance = await hre.ethers.getContractAt("ComplianceRegistry", complianceAddr);
  console.log("Is Deployer compliant?", await compliance.isCompliant(deployer.address));
  console.log("Is SwapPool compliant?", await compliance.isCompliant(swapPoolAddr));

  const token = await hre.ethers.getContractAt("PropertyToken", tokenAddr);
  console.log("Deployer token balance:", (await token.balanceOf(deployer.address)).toString());
  console.log("Allowance:", (await token.allowance(deployer.address, swapPoolAddr)).toString());

  const swapPool = await hre.ethers.getContractAt("TokenSwapPool", swapPoolAddr);
  
  try {
    const tx = await swapPool.addLiquidity(1n, { value: 104000000000000n });
    await tx.wait();
    console.log("Success");
  } catch (error) {
    console.error(error);
  }
}
main();
