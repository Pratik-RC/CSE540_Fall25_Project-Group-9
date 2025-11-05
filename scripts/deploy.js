async function main() {
  const [owner, producer, certifier1, certifier2, distributor1, distributor2, retailer] = await ethers.getSigners();
  
  console.log("\nStarting deployment of SupplyChainProvenance...\n");
  console.log(`Using deployer account: ${owner.address}`);
  
  const SupplyChainProvenance = await ethers.getContractFactory("SupplyChainProvenance");
  const contract = await SupplyChainProvenance.deploy();
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log(`Deployment complete — contract address: ${contractAddress}\n`);
  
  console.log("Registering participants and assigning roles...\n");
  
  await contract.assignProducer(producer.address, "Colombian Coffee Farms Ltd");
  console.log("Added producer: Colombian Coffee Farms Ltd");
  
  await contract.assignCertifyingAuthority(certifier1.address, "Global Quality Certifiers");
  console.log("Added certifier: Global Quality Certifiers");
  
  await contract.assignCertifyingAuthority(certifier2.address, "Organic Standards Bureau");
  console.log("Added certifier: Organic Standards Bureau");
  
  await contract.assignDistributor(distributor1.address, "Pacific Logistics Corp");
  console.log("Added distributor: Pacific Logistics Corp");
  
  await contract.assignDistributor(distributor2.address, "Express Global Shipping");
  console.log("Added distributor: Express Global Shipping");
  
  await contract.assignRetailer(retailer.address, "Premium Coffee House");
  console.log("Added retailer: Premium Coffee House");
  
  console.log(`\nSetup finished. You can use the address below to interact with the contract:\n${contractAddress}\n`);
  console.log("Account summary:");
  console.log(`  Owner:       ${owner.address}`);
  console.log(`  Producer:    ${producer.address}`);
  console.log(`  Certifier 1: ${certifier1.address}`);
  console.log(`  Certifier 2: ${certifier2.address}`);
  console.log(`  Distributor1: ${distributor1.address}`);
  console.log(`  Distributor2: ${distributor2.address}`);
  console.log(`  Retailer:    ${retailer.address}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
