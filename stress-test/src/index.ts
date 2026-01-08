import { calculateTxHash } from "@meshsdk/core-csl";
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


function buildTx (signedTx: string) {
  const tx = {
      type: "Witnessed Tx ConwayEra",
      description: "Ledger Cddl Format",
      cborHex: signedTx,
  };
  return tx;
}

async function submitTx(
  signedTx: string,
  order: number,
  batchNum: number
): Promise<TxResult> {
  const tx = buildTx(signedTx);
  const txHash = calculateTxHash(signedTx);
  const start = performance.now();

  const response = await fetch(HYDRA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tx),
  });
  const elapsedMs = parseFloat((performance.now() - start).toFixed(2));

  console.log(
    `[${order}] Submitted tx: ${txHash} - Status: ${response.status} - ${elapsedMs}ms`
  );

  return { order, batchNum, txHash, status: response.status, elapsedMs };
}

async function main() {
  const totalBatches = Math.ceil(txs.length / REQUEST_PER_SECOND);
  const results: TxResult[] = [];

  for (let i = 0; i < txs.length; i += REQUEST_PER_SECOND) {
    const batchNum = Math.floor(i / REQUEST_PER_SECOND) + 1;
    const batch = txs.slice(i, i + REQUEST_PER_SECOND);

    console.log(
      `\nBatch ${batchNum}/${totalBatches} - Submitting ${batch.length} txs...`
    );

    const batchResults = await Promise.all(
      batch.map((txHex, idx) => submitTx(txHex, i + idx, batchNum))
    );
    results.push(...batchResults);

    if (i + REQUEST_PER_SECOND < txs.length) {
      await delay(1000);
    }
  }

  writeFileSync(
    `./result/batch-${REQUEST_PER_SECOND}.json`,
    JSON.stringify(results, null, 2)
  );
  console.log(
    `\nDone. Submitted ${txs.length} transactions. Results saved to elapsed.json`
  );
}


async function mainWsSync () {
  const uri = "ws://127.0.0.1:4009/?history=no";
  const socket = new WebSocket(uri);

  var i = 0;
  var start: number = 0;
  const results: TxResult[] = [];

  const buildNewTx = (i: number) => {
    const tx = buildTx(txs[i]);

    const newTx = JSON.stringify({
        tag: "NewTx",
        transaction: tx,
    });

    return newTx;
  };

  socket.addEventListener("message", (e) => {
    const d = JSON.parse(e.data);
    if( d.tag == "SnapshotConfirmed" ) {
      const elapsedMs = parseFloat((performance.now() - start).toFixed(2));
      results.push({ order: i, batchNum: 0, txHash: "000...", status: 200, elapsedMs });

      i++;

      start = performance.now();

      if (i == txs.length - 1) {
        writeFileSync(
          "./result/batch-ws.json",
          JSON.stringify(results, null, 2)
        );
      } else {
        if ( i % 50 == 0 ){
          console.log(`Sending tx ${i}`);
        }
        socket.send(buildNewTx(i));
      }
    }
  });


  socket.addEventListener("open", () => {
    start = performance.now();
    socket.send(buildNewTx(i % txs.length));
  });
}

mainWsSync().catch(console.error);
// main().catch(console.error);
