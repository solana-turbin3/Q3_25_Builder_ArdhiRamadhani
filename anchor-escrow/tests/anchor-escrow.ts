import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { AnchorEscrow } from "../target/types/anchor_escrow";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  // TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { randomBytes } from "crypto";

describe("anchor-escrow", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();

  const connection = provider.connection;

  const program = anchor.workspace.AnchorEscrow as Program<AnchorEscrow>;

  // const tokenProgram = TOKEN_2022_PROGRAM_ID;
  const tokenProgram = TOKEN_PROGRAM_ID;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };

  const seed = new BN(randomBytes(8));

  const [maker, taker, mintA, mintB] = Array.from({ length: 4 }, () =>
    Keypair.generate()
  );

  const [makerAtaA, makerAtaB, takerAtaA, takerAtaB] = [maker, taker]
    .map((a) =>
      [mintA, mintB].map((m) =>
        getAssociatedTokenAddressSync(
          m.publicKey,
          a.publicKey,
          false,
          tokenProgram
        )
      )
    )
    .flat();

 
  const offer = PublicKey.findProgramAddressSync(
    [
      Buffer.from("offer"),
      maker.publicKey.toBuffer(),
      seed.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  )[0];

  
  const vault = getAssociatedTokenAddressSync(
    mintA.publicKey,
    offer,
    true,
    tokenProgram
  );


  const accounts = {
    maker: maker.publicKey,
    taker: taker.publicKey,
    tokenMintA: mintA.publicKey, 
    tokenMintB: mintB.publicKey, 
    makerTokenAccountA: makerAtaA, 
    makerTokenAccountB: makerAtaB, 
    takerTokenAccountA: takerAtaA, 
    takerTokenAccountB: takerAtaB,
    offer: offer,
    vault: vault,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId, 
    tokenProgram,
  };

  it("Airdrop and create mints", async () => {
    let lamports = await getMinimumBalanceForRentExemptMint(connection);
    let tx = new Transaction();
    tx.instructions = [
      ...[maker, taker].map((account) =>
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: account.publicKey,
          lamports: 10 * LAMPORTS_PER_SOL,
        })
      ),
      ...[mintA, mintB].map((mint) =>
        SystemProgram.createAccount({
          fromPubkey: provider.publicKey,
          newAccountPubkey: mint.publicKey,
          lamports,
          space: MINT_SIZE,
          programId: tokenProgram,
        })
      ),
      ...[
        { mint: mintA.publicKey, authority: maker.publicKey, ata: makerAtaA },
        { mint: mintB.publicKey, authority: taker.publicKey, ata: takerAtaB },
      ].flatMap((x) => [
        createInitializeMint2Instruction(
          x.mint,
          6,
          x.authority,
          null,
          tokenProgram
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          provider.publicKey,
          x.ata,
          x.authority,
          x.mint,
          tokenProgram
        ),
        createMintToInstruction(
          x.mint,
          x.ata,
          x.authority,
          1e9,
          undefined,
          tokenProgram
        ),
      ]),
    ];

    await provider.sendAndConfirm(tx, [mintA, mintB, maker, taker]).then(log);
  });

  it("Make Offer", async () => {
    await program.methods
      .makeOffer(seed, new BN(1e6), new BN(1e6)) // Fix: was makeOffer
      .accounts({ ...accounts })
      .signers([maker])
      .rpc()
      .then(confirm)
      .then(log);
  });

  xit("Refund", async () => {
    await program.methods
      .refundOffer()
      .accounts({ ...accounts })
      .signers([maker])
      .rpc()
      .then(confirm)
      .then(log);
  });

  it("Take Offer", async () => {
    try {
      // Create necessary ATAs first
      let setupTx = new Transaction();
      setupTx.instructions = [
        // Create taker's ATA for receiving tokenA
        createAssociatedTokenAccountIdempotentInstruction(
          taker.publicKey,
          takerAtaA,
          taker.publicKey,
          mintA.publicKey,
          tokenProgram
        ),
        // Create maker's ATA for receiving tokenB
        createAssociatedTokenAccountIdempotentInstruction(
          taker.publicKey, 
          makerAtaB,
          maker.publicKey,
          mintB.publicKey,
          tokenProgram
        ),
      ];

      await provider.sendAndConfirm(setupTx, [taker]).then(log);

      // Now take the offer
      await program.methods
        .takeOffer() // F
        .accounts({ ...accounts })
        .signers([taker])
        .rpc()
        .then(confirm)
        .then(log);
    } catch (e) {
      console.log(e);
      throw e;
    }
  });
});
