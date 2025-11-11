const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of SupplyChainProvenance...\n");

  const [owner, producer, certifier, distributor, retailer] = await ethers.getSigners();

  console.log(`Using deployer account: ${owner.address}`);

  const SupplyChainProvenance = await ethers.getContractFactory("SupplyChainProvenance");
  const contract = await SupplyChainProvenance.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`Deployment complete — contract address: ${contractAddress}\n`);

  console.log("Registering participants and assigning roles...\n");

  // Fix: Use assignCertifier instead of assignCertifyingAuthority
  await contract.assignProducer(producer.address, "Colombian Coffee Farms Ltd");
  console.log("Added producer: Colombian Coffee Farms Ltd");

  await contract.assignCertifier(certifier.address, "Quality Assurance Labs");
  console.log("Added certifier: Quality Assurance Labs");

  await contract.assignDistributor(distributor.address, "Pacific Logistics Corp");
  console.log("Added distributor: Pacific Logistics Corp");

  await contract.assignRetailer(retailer.address, "Premium Coffee House");
  console.log("Added retailer: Premium Coffee House\n");

  console.log("=== Deployment Summary ===");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Owner: ${owner.address}`);
  console.log(`\n=== Assigned Roles ===`);
  console.log(`Producer: ${producer.address}`);
  console.log(`Certifier: ${certifier.address}`);
  console.log(`Distributor: ${distributor.address}`);
  console.log(`Retailer: ${retailer.address}`);
  
  console.log(`\n=== Import These Accounts into MetaMask ===\n`);
  console.log("Producer:");
  console.log(`  Address: ${producer.address}`);
  console.log(`  Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d\n`);
  
  console.log("Certifier:");
  console.log(`  Address: ${certifier.address}`);
  console.log(`  Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a\n`);
  
  console.log("Distributor:");
  console.log(`  Address: ${distributor.address}`);
  console.log(`  Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6\n`);
  
  console.log("Retailer:");
  console.log(`  Address: ${retailer.address}`);
  console.log(`  Private Key: 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
