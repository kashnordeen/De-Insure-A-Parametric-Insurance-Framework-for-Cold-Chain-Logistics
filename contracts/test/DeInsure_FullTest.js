const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeInsure Smart Contract Unit & Security Test Suite", function () {
  let DeInsure, deInsure;
  let insurer, client, oracle1, oracle2, oracle3, unauthorizedUser;
  let premium, coverage;

  beforeEach(async function () {
    [insurer, client, oracle1, oracle2, oracle3, unauthorizedUser] = await ethers.getSigners();
    
    premium = ethers.parseEther("0.1");
    coverage = ethers.parseEther("1.0");

    DeInsure = await ethers.getContractFactory("DeInsure");
    deInsure = await DeInsure.deploy(
      client.address,
      oracle1.address,
      oracle2.address,
      oracle3.address,
      premium,
      coverage
    );
  });

  it("Should initialize contract in Created state with correct parameters", async function () {
    expect(await deInsure.currentState()).to.equal(0); // State.Created
    expect(await deInsure.insurer()).to.equal(insurer.address);
    expect(await deInsure.client()).to.equal(client.address);
  });

  it("Should allow Insurer to fund escrow and Client to pay premium", async function () {
    await deInsure.connect(insurer).fundEscrow({ value: coverage });
    expect(await deInsure.currentState()).to.equal(1); // State.Funded_Escrow

    await deInsure.connect(client).payPremium({ value: premium });
    expect(await deInsure.currentState()).to.equal(2); // State.Active_Transit
  });

  it("Should execute 2-of-3 Multi-Sig Consensus and settle claim payout", async function () {
    await deInsure.connect(insurer).fundEscrow({ value: coverage });
    await deInsure.connect(client).payPremium({ value: premium });

    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("telemetry_payload_001"));

    // Oracle 1 votes YES
    await deInsure.connect(oracle1).submitSpoilageVote(1, true, dummyHash, "0x", insurer.address);
    expect(await deInsure.currentState()).to.equal(2); // Still Active_Transit (1/3 vote)

    // Oracle 2 votes YES -> 2/3 consensus reached -> State Settled_Claim
    await expect(deInsure.connect(oracle2).submitSpoilageVote(1, true, dummyHash, "0x", insurer.address))
      .to.emit(deInsure, "ClaimSettled")
      .withArgs(client.address, coverage);

    expect(await deInsure.currentState()).to.equal(3); // State.Settled_Claim
  });

  it("Should reject votes from unauthorized addresses", async function () {
    await deInsure.connect(insurer).fundEscrow({ value: coverage });
    await deInsure.connect(client).payPremium({ value: premium });

    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("telemetry_payload_001"));

    await expect(
      deInsure.connect(unauthorizedUser).submitSpoilageVote(1, true, dummyHash, "0x", insurer.address)
    ).to.be.revertedWith("Not an authorized oracle node");
  });

  it("Should prevent duplicate votes from the same Oracle node", async function () {
    await deInsure.connect(insurer).fundEscrow({ value: coverage });
    await deInsure.connect(client).payPremium({ value: premium });

    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("telemetry_payload_001"));

    await deInsure.connect(oracle1).submitSpoilageVote(1, true, dummyHash, "0x", insurer.address);

    await expect(
      deInsure.connect(oracle1).submitSpoilageVote(1, true, dummyHash, "0x", insurer.address)
    ).to.be.revertedWith("Oracle node already voted for this journey");
  });
});
