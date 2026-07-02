import { 
  TransactionBuilder, 
  Networks, 
  Operation, 
  BASE_FEE,
  Address,
  xdr
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

/**
 * Builds, signs via Freighter, and submits a Soroban contract call transaction.
 * 
 * @param contractId Deployed contract address (C...)
 * @param method Method name to invoke
 * @param args Array of XDR-encoded arguments
 * @param senderAddress The connected user's Stellar address (G...)
 */
export async function signAndSubmitSorobanTx(
  contractId: string,
  method: string,
  args: any[],
  senderAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // 1. Fetch account sequence from Horizon Testnet
    const accountResponse = await fetch(`https://horizon-testnet.stellar.org/accounts/${senderAddress}`);
    if (!accountResponse.ok) {
      throw new Error(`Failed to fetch account sequence for ${senderAddress}`);
    }
    const accountData = await accountResponse.json();
    const sequenceNumber = accountData.sequence;

    // 2. Build the invoke contract operation
    // Soroban contract invocation uses the invokeHostFunction operation.
    // For general clients, we build a generic Transaction envelope.
    const mockAccount = {
      sequenceNumber: () => sequenceNumber,
      accountId: () => senderAddress,
      incrementSequenceNumber: () => {}
    };

    // We build the Soroban invoke operation
    const invokeOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        new xdr.InvokeContractArgs({
          contractAddress: Address.fromString(contractId).toScAddress(),
          functionName: method,
          args: args
        })
      ),
      auth: []
    });

    const tx = new TransactionBuilder(mockAccount as any, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
      timebounds: { minTime: 0, maxTime: 0 }
    })
      .addOperation(invokeOp)
      .build();

    // 3. Convert transaction to XDR and sign via Freighter
    const txXdr = tx.toXDR();
    
    // signTransaction expects transaction XDR and options (with network passphrase)
    const signedResult = await signTransaction(txXdr, {
      networkPassphrase: Networks.TESTNET
    });

    if (!signedResult) {
      throw new Error("Freighter signature rejected or returned empty.");
    }

    const signedTxXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;

    if (!signedTxXdr) {
      throw new Error("Could not retrieve signed TX XDR from Freighter payload.");
    }

    // 4. Submit signed XDR to Horizon
    const submitForm = new URLSearchParams();
    submitForm.append("tx", signedTxXdr);

    const submitResponse = await fetch("https://horizon-testnet.stellar.org/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: submitForm
    });

    const submitData = await submitResponse.json();
    if (!submitResponse.ok || submitData.status === "failed") {
      throw new Error(submitData.title || "Transaction submission failed.");
    }

    return {
      success: true,
      txHash: submitData.hash
    };

  } catch (err: any) {
    console.warn("Real-World transaction failure, falling back to simulator:", err.message);
    return {
      success: false,
      error: err.message || "Unknown error"
    };
  }
}
