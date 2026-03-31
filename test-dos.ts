const API_URL = "http://localhost:3000/multipart";

async function testDoS() {
  console.log("🛑 Testing DoS Protection (Limit 1,000 parts)...");
  
  const res = await fetch(`${API_URL}/urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      uploadId: "fake-id", 
      fileKey: "fake-key", 
      partsCount: 1001 
    })
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));

  if (res.status === 400) {
    console.log("✅ DoS Protection confirmed! Request blocked.");
  } else {
    console.log("❌ DoS Protection FAILED! Request was not blocked.");
  }
}

testDoS().catch(console.error);

export {};
