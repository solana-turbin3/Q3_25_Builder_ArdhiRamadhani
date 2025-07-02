import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, Wallet, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { IDL } from "./programs/Turbin3_prereq";
import wallet from "../devnet1-base58-wallet.json";

// Import keypair from secret JSON
const kp = Keypair.fromSecretKey(new Uint8Array(wallet));

// Mint to be used (should be a Keypair)
const mintTs = Keypair.generate(); // Assuming you're generating a new mint

const MPL_CORE_PROGRAM_ID = new PublicKey(
  "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"
);
const mintCollection = new PublicKey(
  "5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2"
);

// Create a Solana devnet connection
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Anchor provider and program
const provider = new AnchorProvider(connection, new Wallet(kp), {
  commitment: "confirmed",
});
const program = new Program(IDL as Idl, provider);

// Create the PDA for our enrollment account
const account_seeds = [Buffer.from("prereqs"), kp.publicKey.toBuffer()];

const [account_key, _account_bump] = PublicKey.findProgramAddressSync(
  account_seeds,
  program.programId
);

// EXECUTE initialize
(async () => {
  try {
    const txhash = await program.methods
      .initialize("Zenk41")
      .accounts({
        user: kp.publicKey,
        account: account_key,
        systemProgram: SystemProgram.programId,
      })
      .signers([kp])
      .rpc();

    console.log(
      `Success! Check out your TX here: https://explorer.solana.com/tx/${txhash}?cluster=devnet`
    );
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();

// // EXECUTE submitTs
(async () => {
  try {
    const txhash = await program.methods
      .submitTs()
      .accounts({
        user: kp.publicKey,
        account: account_key,
        mint: mintTs.publicKey,
        collection: mintCollection,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([kp, mintTs])
      .rpc();

    console.log(
      `Success! Check out your TX here: https://explorer.solana.com/tx/${txhash}?cluster=devnet`
    );
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
