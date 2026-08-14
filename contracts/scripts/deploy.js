const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const signers = await hre.ethers.getSigners();
  const insurer = signers[0];
  const client = signers[1] || signers[0];
  const oracle1 = signers[2] || signers[0];
  const oracle2 = signers[3] || signers[0];
  const oracle3 = signers[4] || signers[0];

  console.log("Deploying DeInsure Smart Contract on network:", hre.network.name);
  console.log("Insurer (Deployer):", insurer.address);
  console.log("Client:", client.address);
  console.log("Oracle 1:", oracle1.address);
  console.log("Oracle 2:", oracle2.address);
  console.log("Oracle 3:", oracle3.address);

  const premium = hre.ethers.parseEther("0.01"); // 0.01 ETH
  const coverage = hre.ethers.parseEther("0.1"); // 0.1 ETH

  const DeInsure = await hre.ethers.getContractFactory("DeInsure");
  const deInsure = await DeInsure.deploy(
    client.address,
    oracle1.address,
    oracle2.address,
    oracle3.address,
    premium,
    coverage
  );

  await deInsure.waitForDeployment();
  const contractAddress = await deInsure.getAddress();

  console.log("DeInsure contract deployed to:", contractAddress);

  const artifactPath = path.join(__dirname, "../artifacts/contracts/DeInsure.sol/DeInsure.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const deploymentData = {
    address: contractAddress,
    network: hre.network.name,
    abi: artifact.abi,
    insurer: insurer.address,
    client: client.address,
    oracles: [oracle1.address, oracle2.address, oracle3.address],
    premium: premium.toString(),
    coverage: coverage.toString(),
    deployedAt: new Date().toISOString()
  };

  const outputPath = path.join(__dirname, "../deployed_contract.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("Deployment details saved to:", outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
