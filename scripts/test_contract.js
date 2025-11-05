async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // UPDATE THIS
  
  const [owner, producer, certifier1, certifier2, distributor1, distributor2, retailer] = await ethers.getSigners();
  
  const SupplyChainProvenance = await ethers.getContractFactory("SupplyChainProvenance");
  const contract = SupplyChainProvenance.attach(contractAddress);
  
  console.log("\n--- Running supply chain workflow test ---\n");

  // Step 1: Producer creates product with quantity
  console.log("Step 1 — producer: creating a new product (with quantity)...");
  const tx1 = await contract.connect(producer).createProduct(
    "Colombian Coffee Beans",
    "Premium Arabica from high altitude farms",
    "Medellín, Colombia",
    100
  );

  const receipt1 = await tx1.wait();

  // read productId from ProductCreated event
  let productId;
  for (const log of receipt1.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "ProductCreated") {
        productId = parsed.args.productId ?? parsed.args[0];
        break;
      }
    } catch (e) {
      // ignore logs that don't match
    }
  }

  if (!productId) {
    console.warn("Warning: ProductCreated event not found in receipt — defaulting to id = 1");
    productId = 1;
  }

  // normalize product id and print
  const pid = typeof productId.toNumber === "function" ? productId.toNumber() : Number(productId);
  console.log(`Product created — id: ${pid}, quantity: 100\n`);
  
  // Step 2: Get product info
  console.log("Step 2 — fetching product details...");
  const info = await contract.getProductInfo(pid);
  console.log(`   Name: ${info[1]}`);
  console.log(`   Producer: ${info[3]}`);
  console.log(`   QR Code: ${info[5]}`);
  console.log(`   Total quantity: ${info[6]}`);
  console.log(`   Status: ${info[9]}\n`);
  
  // Step 3: Certifier tests product
  console.log("Step 3 — certifier: recording test results...");
  const tx2 = await contract.connect(certifier1).testProduct(
    pid,
    "Quality Lab, Bogota",
    "Passed all organic certification tests. Grade: AAA"
  );
  await tx2.wait();
  const info2 = await contract.getProductInfo(pid);
  console.log(`Product tested — status: ${info2[9]}\n`);
  
  // Step 4: Certifier ships product
  console.log("Step 4 — certifier: arranging shipment to logistics partner...");
  const tx3 = await contract.connect(certifier1).shipProduct(
    pid,
    "Pacific Logistics Warehouse, Los Angeles",
    "Shipped via air freight",
    100
  );
  await tx3.wait();
  console.log("Shipment recorded (100 units)\n");
  
  // Step 5: Distributor receives product
  console.log("Step 5 — distributor: acknowledging receipt...");
  const tx4 = await contract.connect(distributor1).receiveProduct(
    pid,
    "Los Angeles Distribution Center",
    "Received in good condition, stored at 15°C",
    100
  );
  await tx4.wait();
  console.log("Distributor confirmed receipt\n");
  
  // Step 6: Distributor ships to retailer
  console.log("Step 6 — distributor: shipping to retailer...");
  const tx5 = await contract.connect(distributor1).shipProduct(
    pid,
    "Premium Coffee House, Seattle",
    "Express delivery, refrigerated transport",
    100
  );
  await tx5.wait();
  console.log("Shipped to retailer (100 units)\n");
  
  // Step 7: Retailer receives product
  console.log("Step 7 — retailer: receiving product into store inventory...");
  const tx6 = await contract.connect(retailer).receiveProduct(
    pid,
    "Premium Coffee House Store #12, Seattle",
    "Product ready for sale, added to inventory",
    100
  );
  await tx6.wait();
  const info3 = await contract.getProductInfo(pid);
  console.log(`Final status: ${info3[9]}\n`);
  
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
  
  console.log("✅ Complete workflow executed successfully!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
