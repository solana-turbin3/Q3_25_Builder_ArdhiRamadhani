import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";


async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.vault as Program<Vault>;

  const vaultState = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("state"), provider.publicKey.toBuffer()],
    program.programId
  )[0];
  const vault = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultState.toBytes()],
    program.programId
  )[0];

  console.log("Initializing vault");
  const tx = await program.methods
    .initialize()
    .accountsPartial({
      user: provider.wallet.publicKey,
      vaultState,
      vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  console.log(
    `Init success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${tx}?cluster=devnet`
  );
  console.log("\nVault Info", await provider.connection.getAccountInfo(vault));
}

main().catch(console.error);
