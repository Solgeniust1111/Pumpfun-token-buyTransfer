import { VersionedTransaction, Keypair, SystemProgram, Transaction, Connection, ComputeBudgetProgram, TransactionInstruction, TransactionMessage, AddressLookupTableProgram, PublicKey, SYSVAR_RENT_PUBKEY, sendAndConfirmTransaction } from "@solana/web3.js"
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createTransferInstruction, getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import { openAsBlob } from "fs";
import base58 from "bs58"

import { DESCRIPTION, DISTRIBUTION_WALLETNUM, FILE, global_mint, JITO_FEE, PRIVATE_KEY, PUMP_PROGRAM, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, SUB_PRIVATE_KEY, SWAP_AMOUNT, TELEGRAM, TOKEN_CREATE_ON, TOKEN_NAME, TOKEN_SHOW_NAME, TOKEN_SYMBOL, TWITTER, WEBSITE } from "./constants"
import { readJson, saveDataToFile, sleep } from "./utils"
import { createAndSendV0Tx, execute } from "./executor/legacy"
import { PumpFunSDK } from "./src/pumpfun";
import { executeJitoTx } from "./executor/jito";
import { displayStatus } from "./status"

const commitment = "confirmed"

const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})
const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
const mainWalllet = Keypair.fromSecretKey(base58.decode(SUB_PRIVATE_KEY))
let kps: Keypair[] = []
const transactions: VersionedTransaction[] = []
const mintKp = Keypair.generate()

// const mintKp = Keypair.fromSecretKey(base58.decode("LHkkEvTRv4k8f5c8x8GZPuRieQLSVWZj7t6FvWs5mFwaVCmTjkNTf7a6yELGR1E5mB1fZkBm9XVeoZi2vAQP1bG"))
// const mintAddress = new PublicKey("ATyeiG6GGXQjHzG3MuNTTMRaZiDTSCxpSjNuAbaUpump")

// const mintAddress = mintKp.publicKey
const mintAddress = new PublicKey("GKPwzpmbzH6EEhcVRRnSbfMJwVQZDsTCojz16oKdpump")

let sdk = new PumpFunSDK(new AnchorProvider(connection, new NodeWallet(new Keypair()), { commitment }));

const main = async () => {

  // saveDataToFile([base58.encode(mintKp.secretKey)], "mint.json")

  // saveDataToFile([], "mint.json")

  // const createBuyIxs: TransactionInstruction[] = []
  // const tokenCreationIxs = await createTokenTx()

  // createBuyIxs.push(...tokenCreationIxs);
  // const amount = await connection.getBalance(mainKp.publicKey)

  // const ix = await makeBuyIx(mainKp, amount * 0.98)
  // createBuyIxs.push(...ix.ix)

  // const latestBlockhash = await connection.getLatestBlockhash()

  // const tokenCreationBuyTx = new VersionedTransaction(
  //   new TransactionMessage({
  //     payerKey: mainKp.publicKey,
  //     recentBlockhash: latestBlockhash.blockhash,
  //     instructions: createBuyIxs
  //   }).compileToV0Message()
  // )

  // tokenCreationBuyTx.sign([mainKp, mintKp])
  // transactions.push(tokenCreationBuyTx)


  ///////////////////////////////////
  const tranTokenIx = await transferTokenIx(mainWalllet, mintAddress)
  const latestBlock = await connection.getLatestBlockhash()

  const tokenTransferTx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: mainWalllet.publicKey,
      recentBlockhash: latestBlock.blockhash,
      instructions: tranTokenIx
    }).compileToV0Message()
  )
  tokenTransferTx.sign([mainWalllet])
  transactions.push(tokenTransferTx)
  transactions.map(async (tx, i) => console.log(i, " | ", tx.serialize().length, "bytes | \n", (await connection.simulateTransaction(tx, { sigVerify: true }))))
  // await executeJitoTx(transactions, mainWalllet, commitment)
  await sleep(10000)
}


// create token instructions
const createTokenTx = async () => {
  const tokenInfo = {
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    description: DESCRIPTION,
    showName: TOKEN_SHOW_NAME,
    createOn: TOKEN_CREATE_ON,
    twitter: TWITTER,
    telegram: TELEGRAM,
    website: WEBSITE,
    file: await openAsBlob(FILE),
  };
  let tokenMetadata = await sdk.createTokenMetadata(tokenInfo);

  let createIx = await sdk.getCreateInstructions(
    mainKp.publicKey,
    tokenInfo.name,
    tokenInfo.symbol,
    tokenMetadata.metadataUri,
    mintKp
  );

  const tipAccounts = [
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  ];
  const jitoFeeWallet = new PublicKey(tipAccounts[Math.floor(tipAccounts.length * Math.random())])
  return [
    SystemProgram.transfer({
      fromPubkey: mainKp.publicKey,
      toPubkey: jitoFeeWallet,
      lamports: Math.floor(JITO_FEE * 10 ** 9),
    }),
    createIx
  ]
}

// make buy instructions
const makeBuyIx = async (kp: Keypair, buyAmount: number) => {
  let buyIx = await sdk.getBuyInstructionsBySolAmount(
    kp.publicKey,
    mintAddress,
    BigInt(buyAmount),
    BigInt(10000),
    commitment
  );

  return buyIx

}

const transferTokenIx = async (Kp: Keypair, mint: PublicKey) => {
  const sendTokenIx: TransactionInstruction[] = []
  sendTokenIx.push(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250_000 })
  )
  const ix = await makeBuyIx(Kp, Math.floor(SWAP_AMOUNT * 10 ** 9))
  sendTokenIx.push(...ix.ix)
  const tokenBalance = ix.buyAmount
  const sourceAta = getAssociatedTokenAddressSync(mint, Kp.publicKey);
  for (let i = 0; i < DISTRIBUTION_WALLETNUM; i++) {
    const subKp = Keypair.generate()
    kps.push(subKp)
    const destinationAta = getAssociatedTokenAddressSync(mint, subKp.publicKey);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      subKp.publicKey,
      sourceAta,
      Kp.publicKey,
      mint
    )
    sendTokenIx.push(createTransferInstruction(sourceAta, destinationAta, Kp.publicKey, Math.floor(Number(tokenBalance) / DISTRIBUTION_WALLETNUM)))
  }

  return sendTokenIx
}


main()

