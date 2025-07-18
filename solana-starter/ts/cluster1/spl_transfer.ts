import {
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import wallet from "../../../wallet/turbin3-wallet.json";
import wallet2 from "../../../wallet/dev-wallet.json";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
const keypair2 = Keypair.fromSecretKey(new Uint8Array(wallet2));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey(process.env.MINT_ADDRESS || "");

// Recipient address
const to = new PublicKey(keypair2.publicKey);

(async () => {
  try {
    // Get the token account of the fromWallet address, and if it does not exist, create it
    const from = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey
    );
    // Get the token account of the toWallet address, and if it does not exist, create it
    const toWallet = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      to
    );
    // Transfer the new token to the "toTokenAccount" we just created
    const signature = await transfer(
      connection,
      keypair,
      from.address,
      toWallet.address,
      keypair.publicKey,
      10_000_000n
    );
    console.log(`Success Transfering token: ${signature}`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
