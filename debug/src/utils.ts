import { UTxO } from "@meshsdk/core";
import { csl } from "@meshsdk/core-csl";
import {
  js_get_required_inputs_to_resolve,
  js_get_tx_outs_utxo,
} from "@sidan-lab/whisky-js-nodejs";

export const getTxIns = (txHex: string): string[] => {
  const cslTx = csl.FixedTransaction.from_hex(txHex);
  const txBody = cslTx.body();
  const cslInputs: any[] = JSON.parse(txBody.inputs().to_json());
  return cslInputs.map((i) => `${i.transaction_id}#${i.index}`);
};

export const getTxOuts = (txHex: string): UTxO[] => {
  return JSON.parse(js_get_tx_outs_utxo(txHex).get_data());
};
