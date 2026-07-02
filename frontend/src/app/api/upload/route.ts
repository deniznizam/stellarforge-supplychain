import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const pinataJwt = process.env.PINATA_JWT;

    // Graceful fallback to simulate IPFS hash generation if Pinata credentials are not provided
    if (!pinataJwt || pinataJwt === "YOUR_PINATA_JWT_TOKEN") {
      const mockHash = "Qm" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      return NextResponse.json({
        ipfsHash: `ipfs://${mockHash}`,
        message: "Demo Mode: Mock IPFS Hash generated safely on server-side."
      });
    }

    // Prepare Pinata request payload
    const pinataForm = new FormData();
    pinataForm.append("file", file);

    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        project: "StellarForge"
      }
    });
    pinataForm.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 0
    });
    pinataForm.append("pinataOptions", options);

    // Call Pinata API securely on server-side
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`
      },
      body: pinataForm
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata upload failed:", errorText);
      return NextResponse.json({ error: "Failed to pin file to IPFS via Pinata" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      ipfsHash: `ipfs://${data.IpfsHash}`
    });

  } catch (error: any) {
    console.error("Server API upload error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
