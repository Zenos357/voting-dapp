import { network } from "hardhat";

async function main() {
  // Initialize ethers using Hardhat 3 network creation pattern
  const { ethers } = await network.create();

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();

  const contractAddress = await voting.getAddress();
  console.log("Voting contract deployed to:", contractAddress);

  // Register initial candidates so ballot is populated
  console.log("Registering candidates...");
  let tx = await voting.addCandidate("Candidate Alpha");
  await tx.wait();

  tx = await voting.addCandidate("Candidate Beta");
  await tx.wait();

  tx = await voting.addCandidate("Zenos");
  await tx.wait();

  console.log("✅ 3 Candidates successfully registered on-chain!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});