// De-Insure Multi-Network Deployer (Hardhat Localhost & Public EVM Testnets)
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=================================================");
  console.log("  De-Insure Smart Contract Deployment");
  console.log("  Network:", hre.network.name);
  console.log("=================================================");

  const [deployer, client, oracle1, oracle2, oracle3] = await hre.ethers.getSigners();

  console.log("Deployer (Insurer) Address:", deployer.address);
  console.log("Client Address            :", client ? client.address : deployer.address);

  const oracleAddr1 = oracle1 ? oracle1.address : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const oracleAddr2 = oracle2 ? oracle2.address : "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const oracleAddr3 = oracle3 ? oracle3.address : "0x90F79bf6EB2c4f8090B5E0B4966c43F9C5F10080";

  const premium = hre.ethers.parseEther("0.1");
  const coverage = hre.ethers.parseEther("1.0");

  const DeInsure = await hre.ethers.getContractFactory("DeInsure");
  const deInsure = await DeInsure.deploy(
    client ? client.address : deployer.address,
    oracleAddr1,
    oracleAddr2,
    oracleAddr3,
    premium,
    coverage
  );

  await deInsure.waitForDeployment();
  const contractAddress = await deInsure.getAddress();

  console.log("\n[SUCCESS] DeInsure Contract Deployed to:", contractAddress);

  // Fund Escrow automatically
  const fundTx = await deInsure.fundEscrow({ value: coverage });
  await fundTx.wait();
  console.log("[SUCCESS] Insurer Funded Coverage Escrow (1.0 ETH)");

  const deployedInfo = {
    network: hre.network.name,
    address: contractAddress,
    insurer: deployer.address,
    client: client ? client.address : deployer.address,
    oracleNodes: [oracleAddr1, oracleAddr2, oracleAddr3],
    premium: "0.1 ETH",
    coverage: "1.0 ETH",
    txHash: fundTx.hash,
    deployedAt: new Date().toISOString()
  };

  const outputPath = path.join(__dirname, "../deployed_contract.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployedInfo, null, 2));
  console.log("[SUCCESS] Contract manifest exported to 'contracts/deployed_contract.json'\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
