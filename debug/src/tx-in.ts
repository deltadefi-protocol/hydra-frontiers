import txs from "./txs.json";
import { getTxIns } from "./utils";

const main = async () => {
  for (const txHex of txs) {
    const txIns = getTxIns(txHex);
    const targetInput =
      "c78930879716ae7726eff3b8ecc38d7093efcfb45bc7137bf8abcd25f47e57ae#512";
    for (const txIn of txIns) {
      if (txIn === targetInput) {
        console.log("Found target tx, txHex: ", txHex);
      }
    }
  }
};

main();
