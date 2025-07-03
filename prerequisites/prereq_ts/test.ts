import { Keypair } from "@solana/web3.js";
import wallet from "../../wallet/turbin3-wallet.json";
const kp = Keypair.fromSecretKey(new Uint8Array(wallet));
console.log(kp.publicKey);
