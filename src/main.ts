import { BitcoinWallet } from "./bitcoin";
import {
    getCryptoCurrencyById,
    parseCurrencyUnit,
} from "@ledgerhq/live-common/lib/currencies";
import { registerTransportModule } from "@ledgerhq/live-common/lib/hw";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import implementLibcore from "@ledgerhq/live-common/lib/libcore/platforms/nodejs";
import { setSupportedCurrencies } from "@ledgerhq/live-common/lib/data/cryptocurrencies";
import { Ethereum } from "./ethereum";
const {} = require("@ledgerhq/live-common/lib/bridge");


// provide a libcore implementation
implementLibcore({
    lib: () => require("@ledgerhq/ledger-core"),
    dbPath: "./test-data", //local db folder will be created
});

// configure which transport are available
registerTransportModule({
    id: "hid",
    open: (devicePath) => TransportNodeHid.open(devicePath),
    disconnect: () => Promise.resolve(),
});

async function run_bitcoin_example(currencyId: String) {
    const currency = getCryptoCurrencyById(currencyId);
    const bitcoin = new BitcoinWallet(currency);
    await bitcoin.init();

    await bitcoin.printNewAddress();
    await bitcoin.printBalance();

    const satoshi = parseCurrencyUnit(currency.units[0], "0.001");
    const account = await bitcoin.getAccount();
    let recipient = account.freshAddress;
    console.log(`Sending ${satoshi} satoshi to address: ${recipient} `);
    await bitcoin.sendToAddress(satoshi, recipient);
}

async function run_ethereum_example(currencyId: String) {
    const currency = getCryptoCurrencyById(currencyId);
    const ethereum = new Ethereum(currency);
    await ethereum.init();

    await ethereum.printNewAddress();
    await ethereum.printBalance();

    const wei = parseCurrencyUnit(currency.units[0], "0.01");
    const account = await ethereum.getAccount();
    let recipient = account.freshAddress;
    console.log(`Sending ${wei} wei to address: ${recipient} `);
    await ethereum.sendToAddress(wei, recipient);
}

async function main() {
    // configure which coins to enable
    // let currencyId = "ethereum_ropsten";
    let currencyId = "bitcoin_testnet";
    setSupportedCurrencies([currencyId]);
    if (currencyId === "ethereum_ropsten") {
        await run_ethereum_example(currencyId);
    } else if (currencyId === "bitcoin_testnet") {
        await run_bitcoin_example(currencyId);
    } else {
        console.error("Unsupported currency");
    }
}

main();
