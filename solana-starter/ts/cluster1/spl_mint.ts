import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import wallet from "../../../wallet/turbin3-wallet.json";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 10_000_000n;

// Mint address
const mint = new PublicKey(
  process.env.MINT_ADDRESS || ""
);

(async () => {
  try {
    // Create an ATA
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey
    );
    console.log(`Your ata is: ${ata.address.toBase58()}`);
    // Mint to ATA
    const mintTx = await mintTo(
      connection,
      keypair,
      mint,
      ata.address,
      keypair.publicKey,
      token_decimals
    );
    console.log(`Your mint txid: ${mintTx}`);
  } catch (error) {
    console.log(`Oops, something went wrong: ${error}`);
  }
})();


// Your ata is: 4arP8UDXLRDYxis8GcMpoRQyvtVyyD77TCRwrmZjwNKb
// Your mint txid: 2DLHihhyT9r1YY8HLt8X2gnMZ3s7AkYzP78t2zovs8jnHHdxftQiowgUoS2wN32A9WKoi7jGL3dqN8yo261uwgS
