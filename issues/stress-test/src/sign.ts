import { AppWalletKeyType, MeshWallet } from "@meshsdk/core";
import { writeFileSync } from "fs";
import rawTxs from "./raw-txs-2.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const signingKey: AppWalletKeyType = {
    type: "mnemonic",
    words: process.env.SEED_PHRASE!.split(" "),
  };

  const wallet = new MeshWallet({
    key: signingKey,
    networkId: 0,
  });

  console.log(`Signing ${rawTxs.length} transactions...`);

  const signedTxs: string[] = [];
  for (const txHex of rawTxs) {
    const signedTx = await wallet.signTx(txHex, true);
    signedTxs.push(signedTx);
  }

  writeFileSync("src/txs-2.json", JSON.stringify(signedTxs, null, 2));
  console.log(`Done. Signed ${signedTxs.length} transactions → src/txs.json`);
}

main().catch(console.error);
