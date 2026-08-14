const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeInsure Contract Suite", function () {
  let DeInsure;
  let deInsure;
  let insurer, client, oracle1, oracle2, oracle3, hardwareDevice;
  const premium = ethers.parseEther("0.1");
  const coverageAmount = ethers.parseEther("1.0");

  beforeEach(async function () {
    [insurer, client, oracle1, oracle2, oracle3, hardwareDevice] = await ethers.getSigners();

    DeInsure = await ethers.getContractFactory("DeInsure");
    deInsure = await DeInsure.connect(insurer).deploy(
      client.address,
      oracle1.address,
      oracle2.address,
      oracle3.address,
      premium,
      coverageAmount
    );
    await deInsure.waitForDeployment();
  });

  it("Should initialize in Created state with correct parameters", async function () {
    expect(await deInsure.currentState()).to.equal(0); // State.Created
    expect(await deInsure.insurer()).to.equal(insurer.address);
    expect(await deInsure.client()).to.equal(client.address);
    expect(await deInsure.premium()).to.equal(premium);
    expect(await deInsure.coverageAmount()).to.equal(coverageAmount);
  });

  it("Should allow Insurer to fund escrow", async function () {
    await expect(deInsure.connect(insurer).fundEscrow({ value: coverageAmount }))
      .to.emit(deInsure, "StateChanged")
      .withArgs(1); // State.Funded_Escrow

    expect(await deInsure.currentState()).to.equal(1);
  });

  it("Should allow Client to pay premium and activate transit", async function () {
    await deInsure.connect(insurer).fundEscrow({ value: coverageAmount });

    const insurerBalanceBefore = await ethers.provider.getBalance(insurer.address);

    await expect(deInsure.connect(client).payPremium({ value: premium }))
      .to.emit(deInsure, "StateChanged")
      .withArgs(2); // State.Active_Transit

    const insurerBalanceAfter = await ethers.provider.getBalance(insurer.address);
    expect(insurerBalanceAfter - insurerBalanceBefore).to.equal(premium);
    expect(await deInsure.currentState()).to.equal(2);
  });

  it("Should settle claim automatically upon 2-out-of-3 Oracle spoilage consensus with valid device ECDSA signature", async function () {
    await deInsure.connect(insurer).fundEscrow({ value: coverageAmount });
    await deInsure.connect(client).payPremium({ value: premium });

    const journeyId = 1;
    const telemetryHash = ethers.keccak256(ethers.toUtf8Bytes("temp:25.0,hum:60,vib:2.0"));
    
    // Sign with hardware device private key
    const signature = await hardwareDevice.signMessage(ethers.getBytes(telemetryHash));

    // Oracle 1 votes spoilage
    await deInsure.connect(oracle1).submitSpoilageVote(journeyId, true, telemetryHash, signature, hardwareDevice.address);
    expect(await deInsure.currentState()).to.equal(2); // Still Active_Transit

    const clientBalanceBefore = await ethers.provider.getBalance(client.address);

    // Oracle 2 votes spoilage -> triggers 2/3 consensus
    await expect(deInsure.connect(oracle2).submitSpoilageVote(journeyId, true, telemetryHash, signature, hardwareDevice.address))
      .to.emit(deInsure, "StateChanged")
      .withArgs(3) // State.Settled_Claim
      .to.emit(deInsure, "ClaimSettled")
      .withArgs(client.address, coverageAmount);

    const clientBalanceAfter = await ethers.provider.getBalance(client.address);
    expect(clientBalanceAfter - clientBalanceBefore).to.equal(coverageAmount);
    expect(await deInsure.currentState()).to.equal(3);
  });

  it("Should return escrow to insurer upon Safe Journey Completion", async function () {
    await deInsure.connect(insurer).fundEscrow({ value: coverageAmount });
    await deInsure.connect(client).payPremium({ value: premium });

    const insurerBalanceBefore = await ethers.provider.getBalance(insurer.address);

    await expect(deInsure.connect(insurer).completeJourneySafe())
      .to.emit(deInsure, "StateChanged")
      .withArgs(4) // State.Completed_Safe
      .to.emit(deInsure, "SafeCompletion")
      .withArgs(insurer.address, coverageAmount);

    expect(await deInsure.currentState()).to.equal(4);
  });
});
