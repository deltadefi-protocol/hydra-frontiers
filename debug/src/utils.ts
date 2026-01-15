import { BlockfrostProvider, Output, TxIn, UTxO } from "@meshsdk/core";
import { csl } from "@meshsdk/core-csl";
import { js_get_tx_outs_utxo } from "@sidan-lab/whisky-js-nodejs";
import dotenv from "dotenv";

dotenv.config();

const bfApiKey = process.env.BLOCKFROST_API_KEY || "";

export const getTxIns = (txHex: string): string[] => {
  const cslTx = csl.FixedTransaction.from_hex(txHex);
  const txBody = cslTx.body();
  const cslInputs: any[] = JSON.parse(txBody.inputs().to_json());
  return cslInputs.map((i) => `${i.transaction_id}#${i.index}`);
};

export const getTxOuts = (txHex: string): UTxO[] => {
  return JSON.parse(js_get_tx_outs_utxo(txHex).get_data());
};

export const blockfrost = new BlockfrostProvider(bfApiKey);
