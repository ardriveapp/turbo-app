// send x402 upload request

import { readFileSync } from "node:fs";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";
import { baseSepolia } from "viem/chains";
import {
    createData,
    EthereumSigner,
} from "@dha-team/arbundles/build/node/esm/index";

const defaultUploadUrl = "https://upload.ardrive.dev/x402/data-item/signed";
// const defaultUploadUrl = "http://localhost:3000/x402/data-item/signed";
const defaultDataPath = "../uploads/52MiB.54852509byte.txt";
const defaultEvmPkeyPath =
    "src/0x20c1DF6f3310600c8396111EB5182af9213828Dc.eth.pk.txt";

const uploadUrl = process.argv.includes("--url")
    ? process.argv[process.argv.indexOf("--url") + 1]
    : process.env.UPLOAD_URL || defaultUploadUrl;

const dataPath = process.argv.includes("--path")
    ? process.argv[process.argv.indexOf("--path") + 1]
    : process.env.FILE_PATH || defaultDataPath;

const evmWalletPathOrPkey = process.argv.includes("--wallet")
    ? process.argv[process.argv.indexOf("--wallet") + 1]
    : process.env.EVM_WALLET_PATH || defaultEvmPkeyPath;

let evmPkey: string;
if (evmWalletPathOrPkey.startsWith("0x")) {
    evmPkey = evmWalletPathOrPkey;
} else {
    evmPkey = readFileSync(evmWalletPathOrPkey, "utf-8").trim();
}

const localData = readFileSync(dataPath);

async function uploadData() {
    // Create a wallet client
    const account = privateKeyToAccount(evmPkey as any);
    const client = createWalletClient({
        account,
        transport: http(),
        chain: baseSepolia,
    });

    // Wrap the fetch function with payment handling
    const fetchWithPay = wrapFetchWithPayment(
        fetch,
        client as any,
        BigInt(2_000_000) // 2 USDC in base units (6 decimals
    );
    const signer = new EthereumSigner(evmPkey);
    const dataItem = createData(localData, signer);
    await dataItem.sign(signer);

    // Make a request that may require payment
    const response = await fetchWithPay(uploadUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
        },
        body: dataItem.getRaw() as BodyInit,
    });
    console.log("response", response);

    const data = await response.json();
    console.log("data", data);
}

uploadData().catch((error) => {
    console.error("Error uploading data:", error);
});