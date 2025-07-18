import {
  Connection,
  Keypair,
  SystemProgram,
  PublicKey,
  Commitment,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  Program,
  Wallet,
  AnchorProvider,
  Address,
  BN,
} from "@coral-xyz/anchor";
import { WbaVault, IDL } from "./programs/wba_vault";
// import wallet from "../../../wallet/dev-wallet.json";
import wallet from "../../../wallet/turbin3-wallet.json";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Commitment
const commitment: Commitment = "finalized";

// Create a devnet connection
const connection = new Connection("https://api.devnet.solana.com");

// Create our anchor provider
const provider = new AnchorProvider(connection, new Wallet(keypair), {
  commitment,
});

// Create our program
const program = new Program<WbaVault>(
  IDL,
  "D51uEDHLbWAxNfodfQDv7qkp8WZtxrhi3uganGbNos7o" as Address,
  provider
);

// Create a random keypair
const vaultState = new PublicKey("Ave3wBYkjoEAhD3oK8aPDB5BSZ4WkYiAXNH4ETH32mxJ");
// Create the PDA for our enrollment account
// Seeds are "auth", vaultState
const seedsAuth: Array<Buffer> = [Buffer.from("auth"), vaultState.toBuffer()];
const [vaultAuth] = PublicKey.findProgramAddressSync(
  seedsAuth,
  program.programId
);

// Create the vault key
// Seeds are "vault", vaultAuth
const seedsVault: Array<Buffer> = [Buffer.from("vault"), vaultAuth.toBuffer()];
const [vault] = PublicKey.findProgramAddressSync(seedsVault, program.programId);

const mint = new PublicKey("AiCf8fJ59amkdkyFi866K7pE6zSVWx4msmL9p7WjNfj5");

// Execute our enrollment transaction
(async () => {
  try {
    // Get the token account of the fromWallet address, and if it does not exist, create it
    const ownerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey
    );
    // Get the token account of the fromWallet address, and if it does not exist, create it
    const vaultAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      vaultAuth,
      true
    );
    
    const signature = await program.methods
      .withdrawSpl(new BN(10_000_000n))
      .accounts({
        owner: keypair.publicKey,
        ownerAta: ownerAta.address,
        vaultState: vaultState,
        vaultAuth: vaultAuth,
        vaultAta: vaultAta.address,
        tokenMint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
    .signers([
        keypair
    ]).rpc();
    console.log(`Withdraw success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
