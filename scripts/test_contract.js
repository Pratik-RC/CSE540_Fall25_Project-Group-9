async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // UPDATE THIS
  
  const [owner, producer, certifier, distributor, retailer] = await ethers.getSigners();
  
  const SupplyChainProvenance = await ethers.getContractFactory("SupplyChainProvenance");
  const contract = SupplyChainProvenance.attach(contractAddress);
  
  console.log("\n--- Running supply chain workflow test (with physical possession) ---\n");

  // Step 1: Producer creates product
  console.log("Step 1 — producer: creating a new product...");
  const tx1 = await contract.connect(producer).createProduct(
    "Colombian Coffee Beans",
    "Premium Arabica from high altitude farms",
    "Medellín, Colombia",
    100
  );

  const receipt1 = await tx1.wait();

  // Read productId from event
  let productId;
  for (const log of receipt1.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "ProductCreated") {
        productId = parsed.args.productId ?? parsed.args[0];
        break;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!productId) {
    console.warn("Warning: ProductCreated event not found — defaulting to id = 1");
    productId = 1;
  }

  const pid = typeof productId.toNumber === "function" ? productId.toNumber() : Number(productId);
  console.log(`✅ Product created — id: ${pid}, quantity: 100`);
  console.log(`   Current holder: Producer\n`);
  
  // Step 2: Producer ships to certifier
  console.log("Step 2 — producer: shipping to certifier for testing...");
  const tx2 = await contract.connect(producer).shipProduct(
    pid,
    "certifier",
    "Quality Lab, Bogota",
    "Sending for quality certification",
    100
  );
  await tx2.wait();
  console.log(`✅ Shipped to certifier (100 units)`);
  console.log(`   Status: In Transit\n`);
  
  // Step 3: Certifier receives product
  console.log("Step 3 — certifier: receiving product for testing...");
  const tx3 = await contract.connect(certifier).receiveProduct(
    pid,
    "Quality Lab, Bogota",
    "Received for quality testing",
    100
  );
  await tx3.wait();
  console.log(`✅ Certifier received product`);
  console.log(`   Current holder: Certifier\n`);
  
  // Step 4: Certifier tests product
  console.log("Step 4 — certifier: conducting quality tests...");
  const tx4 = await contract.connect(certifier).testProduct(
    pid,
    "Quality Lab, Bogota",
    "Passed all organic certification tests. Grade: AAA"
  );
  await tx4.wait();
  console.log(`✅ Product tested and certified`);
  console.log(`   Current holder: Certifier (still)\n`);
  
  // Step 5: Certifier ships to distributor
  console.log("Step 5 — certifier: shipping to distributor...");
  const tx5 = await contract.connect(certifier).shipProduct(
    pid,
    "distributor",
    "Pacific Logistics Warehouse, Los Angeles",
    "Certified product, shipped via air freight",
    100
  );
  await tx5.wait();
  console.log(`✅ Shipped to distributor (100 units)`);
  console.log(`   Status: In Transit\n`);
  
  // Step 6: Distributor receives product
  console.log("Step 6 — distributor: receiving shipment...");
  const tx6 = await contract.connect(distributor).receiveProduct(
    pid,
    "Los Angeles Distribution Center",
    "Received in good condition, stored at 15°C",
    100
  );
  await tx6.wait();
  console.log(`✅ Distributor received product`);
  console.log(`   Current holder: Distributor\n`);
  
  // Step 7: Distributor ships to retailer
  console.log("Step 7 — distributor: shipping to retailer...");
  const tx7 = await contract.connect(distributor).shipProduct(
    pid,
    "retailer",
    "Premium Coffee House, Seattle",
    "Express delivery, refrigerated transport",
    100
  );
  await tx7.wait();
  console.log(`✅ Shipped to retailer (100 units)`);
  console.log(`   Status: In Transit\n`);
  
  // Step 8: Retailer receives product
  console.log("Step 8 — retailer: receiving final delivery...");
  const tx8 = await contract.connect(retailer).receiveProduct(
    pid,
    "Premium Coffee House Store #12, Seattle",
    "Product ready for sale, added to inventory",
    100
  );
  await tx8.wait();
  const finalInfo = await contract.getProductInfo(pid);
  console.log(`✅ Retailer received product`);
  console.log(`   Current holder: Retailer`);
  console.log(`   Final status: ${finalInfo[9]}`);
  console.log(`   Fully delivered: ${finalInfo[10]}\n`);
  
  // Display complete journey
  console.log("=== Complete Product Journey ===\n");
  
  const journeyCount = await contract.getJourneyLogCount(pid);
  const journeyCountNum = typeof journeyCount.toNumber === "function" ? journeyCount.toNumber() : Number(journeyCount);
  console.log(`Total journey entries: ${journeyCountNum}\n`);

  for (let i = 0; i < journeyCountNum; i++) {
    const [action, actor, actorName, timestamp, location, notes] = await contract.getJourneyLog(pid, i);
    const date = new Date(Number(timestamp) * 1000).toLocaleString();
    
    console.log(`Entry ${i + 1}`);
    console.log(`  Action:   ${action}`);
    console.log(`  Actor:    ${actorName}`);
    console.log(`  Location: ${location}`);
    console.log(`  When:     ${date}`);
    console.log(`  Notes:    ${notes}`);
    console.log("");
  }
  
  console.log("✅ Complete workflow executed successfully!");
  console.log("📦 Product traveled through entire supply chain with physical possession transfer\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
