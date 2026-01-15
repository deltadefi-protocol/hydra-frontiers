import txs from "./txs.json";
import { UTxO } from "@meshsdk/core";
import { getTxIns, getTxOuts } from "./utils";

const main = async () => {
  const resultTxs: string[] = [];
  const resultTxIn: Record<string, string[]> = {};
  for (const txHex of txs) {
    const txOuts: UTxO[] = getTxOuts(txHex);
    const targetUnit =
      "8770f37b00fc512127d1cdc0686bf9016ee1c681f0dc1a76f70452eb";

    for (const txOut of txOuts) {
      for (const asset of txOut.output.amount) {
        if (asset.unit === targetUnit) {
          const txIns = getTxIns(txHex);
          resultTxs.push(txHex);
          resultTxIn[txOut.input.txHash] = txIns;
          break;
        }
      }
    }
  }
  // console.log("Results: ", resultTxs);
  console.log("Result Tx Ins: ", resultTxIn);
};

main();
