import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import {
  KeypairSigner,
  PublicKey,
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import { Marketplace } from "../target/types/marketplace";
import {
  createNft,
  findMasterEditionPda,
  findMetadataPda,
  mplTokenMetadata,
  verifySizedCollectionItem,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe("anchor-marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = provider.connection;

  const umi = createUmi(provider.connection);
  const payer = provider.wallet as NodeWallet;

  let nftMint: KeypairSigner = generateSigner(umi);
  let collectionMint: KeypairSigner = generateSigner(umi);

  const creatorWallet = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(payer.payer.secretKey)
  );
  const creator = createSignerFromKeypair(umi, creatorWallet);
  umi.use(keypairIdentity(creator));
  umi.use(mplTokenMetadata());

  let makerAta: anchor.web3.PublicKey;
  let takerAta: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  const maker = Keypair.generate();
  const taker = Keypair.generate();
  console.log(`Maker PublicKey: ${maker.publicKey.toString()}`);
  console.log(`Taker PublicKey: ${taker.publicKey.toString()}`);

  before(async () => {
    const makerAirdrop = await connection.requestAirdrop(
      maker.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    const takerAirdrop = await connection.requestAirdrop(
      taker.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: makerAirdrop,
      ...latestBlockhash,
    });
    await connection.confirmTransaction({
      signature: takerAirdrop,
      ...latestBlockhash,
    });

    await sleep(3000);

    await createNft(umi, {
      mint: collectionMint,
      name: "rugged NFT",
      symbol: "RGED",
      uri: "https://gateway.irys.xyz/3JS2U4gpVqsuDoKWNfx6CuvEXST35yQQd5jxMY1vy6LE",
      sellerFeeBasisPoints: percentAmount(5),
      collectionDetails: { __kind: "V1", size: 10 },
    }).sendAndConfirm(umi);
    console.log(
      `Succesfully Minted! Check out your TX here:\nhttps://explorer.solana.com/tx/${collectionMint.publicKey.toString()}?cluster=devnet`
    );
    console.log("Mint Address: ", collectionMint.publicKey);

    await createNft(umi, {
      mint: nftMint,
      name: "rugged NFT",
      symbol: "RGED",
      uri: "https://gateway.irys.xyz/3JS2U4gpVqsuDoKWNfx6CuvEXST35yQQd5jxMY1vy6LE",
      sellerFeeBasisPoints: percentAmount(5),
      collection: { verified: false, key: collectionMint.publicKey },
      tokenOwner: publicKey(maker.publicKey),
    }).sendAndConfirm(umi);
    console.log(
      `Succesfully Minted to maker Check out your TX here:\nhttps://explorer.solana.com/tx/${collectionMint.publicKey.toString()}?cluster=devnet`
    );
    console.log("Mint Address: ", collectionMint.publicKey);

    const collectionMetadata = findMetadataPda(umi, {
      mint: collectionMint.publicKey,
    });
    const collectionMasterEdition = findMasterEditionPda(umi, {
      mint: collectionMint.publicKey,
    });
    const nftMetadata = findMetadataPda(umi, { mint: nftMint.publicKey });

    console.log("verifying...");
    await verifySizedCollectionItem(umi, {
      metadata: nftMetadata,
      collectionAuthority: creator,
      collectionMint: collectionMint.publicKey,
      collection: collectionMetadata,
      collectionMasterEditionAccount: collectionMasterEdition,
    }).sendAndConfirm(umi);
    console.log("Collection NFT Verified");

    makerAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        maker,
        new anchor.web3.PublicKey(nftMint.publicKey),
        maker.publicKey
      )
    ).address;

    takerAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        taker,
        new anchor.web3.PublicKey(nftMint.publicKey),
        taker.publicKey
      )
    ).address;

    vault = await anchor.utils.token.associatedAddress({
      mint: new anchor.web3.PublicKey(nftMint.publicKey),
      owner: listing,
    });
  });

  const program = anchor.workspace.Marketplace as Program<Marketplace>;

  const MARKETPLACE_SEED = "marketplace";
  const TREASURY_SEED = "treasury";
  const REWARDS_SEED = "rewards";
  const name = "test-marketplace";

  const [marketplacePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(MARKETPLACE_SEED), Buffer.from(name)],
    program.programId
  );

  // Derive treasury PDA
  const [treasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(TREASURY_SEED), marketplacePda.toBuffer()],
    program.programId
  );

  // Derive reward mint PDA
  const [rewardsMintPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(REWARDS_SEED), marketplacePda.toBuffer()],
    program.programId
  );

  const [listing] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      marketplacePda.toBuffer(),
      new anchor.web3.PublicKey(nftMint.publicKey as PublicKey).toBuffer(),
    ],
    program.programId
  );

  const fee = 5;
  const price = new anchor.BN(1);

  it("Is initialized!", async () => {
    try {
      console.log("Initializing marketplace...");

      const tx = await program.methods
        .initialize(name, fee)
        .accountsPartial({
          admin: provider.wallet.publicKey,
          marketplace: marketplacePda,
          treasury: treasuryPda,
          rewardMint: rewardsMintPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([provider.wallet.payer])
        .rpc();

      console.log("Marketplace initialized successfully!");
      console.log("Transaction signature:", tx);

      // Verify the marketplace account was created
      const marketplaceAccount = await program.account.marketplace.fetch(
        marketplacePda
      );
      console.log("Marketplace account:", marketplaceAccount);
    } catch (error) {
      console.error("Initialization failed:", error);
      throw error;
    }
  });

  it("List!", async () => {
    const nftMetadata = findMetadataPda(umi, { mint: nftMint.publicKey });
    const nftEdition = findMasterEditionPda(umi, { mint: nftMint.publicKey });

    const tx = await program.methods
      .list(price)
      .accountsPartial({
        maker: maker.publicKey,
        marketplace: marketplacePda,
        makerMint: nftMint.publicKey,
        collectionMint: collectionMint.publicKey,
        makerAta,
        metadata: new anchor.web3.PublicKey(nftMetadata[0]),
        vault,
        masterEdition: new anchor.web3.PublicKey(nftEdition[0]),
        listing,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
    console.log("\nListing NFT to marketplace");
    console.log("Transaction signature:", tx);
  });

  // it("Delisting!", async () => {
  //   const tx = await program.methods.delist()
  //   .accountsPartial({
  //     maker: maker.publicKey,
  //     marketplace: marketplacePda,
  //     makerMint: nftMint.publicKey,
  //     makerAta,
  //     listing,
  //     vault,
  //     systemProgram: anchor.web3.SystemProgram.programId,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //   })
  //   .signers([maker])
  //   .rpc();
  //   console.log("\nDelisting NFT");
  //   console.log("Transaction signature:", tx);
  // });

  it("Purchase Initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .purchase()
      .accountsPartial({
        taker: taker.publicKey,
        maker: maker.publicKey,
        makerMint: nftMint.publicKey,
        marketplace: marketplacePda,
        takerAta,
        vault,
        rewardsMint: rewardsMintPda,
        listing,
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();
    console.log("\nPurchase NFT");
    console.log("Transaction signature:", tx);
  });
});

const sleep = (milisecond: number) => {
  return new Promise((resolve) => setTimeout(resolve, milisecond));
};
