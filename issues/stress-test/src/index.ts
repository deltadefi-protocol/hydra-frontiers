import { calculateTxHash, csl } from "@meshsdk/core-csl";
import { writeFileSync } from "fs";
import txs from "./txs-2.json";

interface TxResult {
  order: number;
  batchNum: number;
  txHash: string;
  status: number;
  elapsedMs: number;
}

const HYDRA_API_URL = "http://127.0.0.1:4009/transaction";
const REQUEST_PER_SECOND = 100;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const prevTxs: Record<string, number> = {};

export const getTxIns = (txHex: string): string[] => {
  const cslTx = csl.FixedTransaction.from_hex(txHex);
  const txBody = cslTx.body();
  const cslInputs: any[] = JSON.parse(txBody.inputs().to_json());
  return cslInputs.map((i) => `${i.transaction_id}`);
};

async function submitTx(
  signedTx: string,
  order: number,
  batchNum: number,
): Promise<TxResult> {
  const txHash = calculateTxHash(signedTx);
  const txIns = getTxIns(signedTx);

  const start = performance.now();

  const response = await fetch(HYDRA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "Witnessed Tx ConwayEra",
      description: "Ledger Cddl Format",
      cborHex: signedTx,
    }),
  });
  const elapsedMs = parseFloat((performance.now() - start).toFixed(2));

  console.log(
    `[${order}] Submitted tx: ${txHash} - Status: ${response.status} - ${elapsedMs}ms`,
  );

  if (response.status !== 202) {
    const errorText = await response.text();
    console.error(
      `    - Error submitting tx: ${txHash} - Status: ${response.status} - ${errorText}`,
    );
  }

  txIns.forEach((txIn) => {
    if (prevTxs[txIn] || prevTxs[txIn] === 0) {
      console.log(
        `    - Warning: TxIn ${txIn} is produced in tx #${prevTxs[txIn]}`,
      );
    }
  });

  prevTxs[txHash] = order;

  return { order, batchNum, txHash, status: response.status, elapsedMs };
}

async function main() {
  const totalBatches = Math.ceil(txs.length / REQUEST_PER_SECOND);
  const results: TxResult[] = [];

  for (let i = 0; i < txs.length; i += REQUEST_PER_SECOND) {
    const batchNum = Math.floor(i / REQUEST_PER_SECOND) + 1;
    const batch = txs.slice(i, i + REQUEST_PER_SECOND);

    console.log(
      `\nBatch ${batchNum}/${totalBatches} - Submitting ${batch.length} txs...`,
    );

    const batchResults = await Promise.all(
      batch.map((txHex, idx) => submitTx(txHex, i + idx, batchNum)),
    );
    results.push(...batchResults);

    if (i + REQUEST_PER_SECOND < txs.length) {
      await delay(1000);
    }
  }

  writeFileSync(
    `./result/batch-${REQUEST_PER_SECOND}.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    `\nDone. Submitted ${txs.length} transactions. Results saved to elapsed.json`,
  );
}

main().catch(console.error);
