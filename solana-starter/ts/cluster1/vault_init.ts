import {
  Connection,
  Keypair,
  SystemProgram,
  PublicKey,
  Commitment,
} from "@solana/web3.js";
import { Program, Wallet, AnchorProvider, Address } from "@coral-xyz/anchor";
import { WbaVault, IDL } from "./programs/wba_vault";
// import wallet from "../../../wallet/dev-wallet.json";
import wallet from "../../../wallet/turbin3-wallet.json";
/// J8qKEmQpadFeBuXAVseH8GNrvsyBhMT8MHSVD3enRgJz

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Commitment
const commitment: Commitment = "confirmed";

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
const vaultState = Keypair.generate();
console.log(`Vault public key: ${vaultState.publicKey.toBase58()}`);

// Create the PDA for our enrollment account
// Seeds are "auth", vaultState
const seedsAuth: Array<Buffer> = [
  Buffer.from("auth"),
  vaultState.publicKey.toBuffer(),
];
const [vaultAuth, bump] = PublicKey.findProgramAddressSync(
  seedsAuth,
  program.programId
);
// Create the vault key
// Seeds are "vault", vaultAuth
const seedsVault: Array<Buffer> = [Buffer.from("vault"), vaultAuth.toBuffer()];
const [vault] = PublicKey.findProgramAddressSync(seedsVault, program.programId);
// Execute our enrollment transaction
(async () => {
  try {
    const signature = await program.methods.initialize()
    .accounts({
        owner: keypair.publicKey,
        vaultState: vaultState.publicKey,
        vaultAuth: vaultAuth,
        vault: vault,
        systemProgram: SystemProgram.programId,
    }).signers([keypair, vaultState]).rpc();
    console.log(`Init success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();


// Vault public key: FQZfLpySi8d4ndVBZ5mWXhu8vuVCmNw81aZ61fi7sdte
// Init success! Check out your TX here:

// https://explorer.solana.com/tx/WCsw2tt3h5fXXm9fmYtwYqq7cR4huPFMExpyQ8yGj3pabtsBwDrKZNJ31PwQfgv9BHdazuYsro4Qdd8Wn7GKW8d?cluster=devnet

// Ave3wBYkjoEAhD3oK8aPDB5BSZ4WkYiAXNH4ETH32mxJ