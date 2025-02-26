import { PublicKey, AddressLookupTableProgram, ComputeBudgetProgram, Transaction, sendAndConfirmTransaction, Connection } from "@solana/web3.js"
import { Keypair } from "@solana/web3.js/src/keypair"
import base58 from 'bs58'
import { readJson, sleep } from "./utils"
import { PRIVATE_KEY, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "./constants"

const commitment = "confirmed"

const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
 const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})

const closeLut = async () => {
  
  // const wallets = walletsData.map((kp) => Keypair.fromSecretKey(base58.decode(kp)))
  const walletsData = readJson("lut.json")
  
  const lookupTableAddress = new PublicKey(walletsData[0])
  const cooldownTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }),
    AddressLookupTableProgram.deactivateLookupTable({
      lookupTable: lookupTableAddress, // Address of the lookup table to deactivate
      authority: mainKp.publicKey, // Authority to modify the lookup table
    })
  )
  const coolDownSig = await sendAndConfirmTransaction(connection, cooldownTx, [mainKp])
  console.log("Cool Down sig:", coolDownSig)

  await sleep(200000)
  
  const closeTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }),
    AddressLookupTableProgram.closeLookupTable({
      lookupTable: lookupTableAddress, // Address of the lookup table to close
      authority: mainKp.publicKey, // Authority to close the LUT
      recipient: mainKp.publicKey, // Recipient of the reclaimed rent balance
    })
  )
  const closeSig = await sendAndConfirmTransaction(connection, closeTx, [mainKp])
  console.log("Close LUT Sig:", closeSig)
}


closeLut()