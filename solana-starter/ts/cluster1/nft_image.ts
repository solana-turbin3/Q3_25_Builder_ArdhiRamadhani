import wallet from "../../../wallet/turbin3-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { readFile } from "fs/promises";

// Create a devnet connection
const umi = createUmi("https://api.devnet.solana.com");

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));
(async () => {
  try {
    const imagePath = await readFile("./generug.png");

    const image = createGenericFile(imagePath, "generug.png", {
      contentType: "image/png",
    });

    const [myUri] = await umi.uploader.upload([image]);

    console.log(`this was your uri ${myUri}`);
  } catch (err) {
    console.log("Oops.. Something want wrong");
  }
})();
