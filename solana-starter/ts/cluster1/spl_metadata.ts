import wallet from "../../../wallet/turbin3-wallet.json";
// import wallet from "../../../wallet/dev-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createMetadataAccountV3,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs,
  DataV2Args,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

// Define our Mint address
const mint = publicKey(process.env.MINT_ADDRESS || "");

// Create a UMI connection
const umi = createUmi("https://api.devnet.solana.com");
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(irysUploader());
umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

const image =
  "https://gateway.irys.xyz/8YcD7oLtSswqCakFwMZd3MxF5cu3PFDdSZnRT22v4WXN";

(async () => {
  try {
    // Start here
    let accounts: CreateMetadataAccountV3InstructionAccounts = {
      mint,
      mintAuthority: signer,
    };

    const metadata = {
      name: "TURBIN3 Z41",
      symbol: "T3Z41",
      description: "I made this token while learning Solana in Turbin3",
      image: image,
      properties: {
        files: [
          {
            type: "image/png",
            uri: image,
          },
        ],
      },
    };
    const myUri = await umi.uploader.uploadJson(metadata);
    console.log("Your metadata URI: ", myUri);

    let data: DataV2Args = {
      name: "TURBIN3 Z41",
      symbol: "T3Z41",
      uri: myUri,
      sellerFeeBasisPoints: 1,
      creators: [{ address: signer.publicKey, verified: true, share: 100 }],
      collection: null,
      uses: null,
    };
    let args: CreateMetadataAccountV3InstructionArgs = {
      data,
      isMutable: false,
      collectionDetails: null,
    };
    let tx = createMetadataAccountV3(umi, {
      ...accounts,
      ...args,
    });
    let result = await tx.sendAndConfirm(umi);
    console.log(bs58.encode(result.signature));
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();

// Your metadata URI:  https://gateway.irys.xyz/FGNkbnK3hzcQPCmNb3fz4HLvDX7tynLjdcn5sBqZhHji
// 2YWcS3ocDTHEzd9k7pkLahFFbDaV7SLfvE3ZWv7Aur4JPweqXS7UeLKAZgRUCvvyC4fUohNcscfjbSCEiwEayq6v
