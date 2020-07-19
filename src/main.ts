import { BitcoinWallet } from "./bitcoin";
const {
    getCryptoCurrencyById,
    parseCurrencyUnit,
} = require("@ledgerhq/live-common/lib/currencies");
const {} = require("@ledgerhq/live-common/lib/bridge");

import Transport from "@ledgerhq/hw-transport-node-hid-noevents";
const { registerTransportModule } = require("@ledgerhq/live-common/lib/hw");
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const implementLibcore = require("@ledgerhq/live-common/lib/libcore/platforms/nodejs")
    .default;
const {
    setSupportedCurrencies,
} = require("@ledgerhq/live-common/lib/data/cryptocurrencies");

const currencyId = "bitcoin_testnet";
const currency = getCryptoCurrencyById(currencyId);
let bitcoin = "0.001";
const satoshi = parseCurrencyUnit(currency.units[0], bitcoin);
// configure which coins to enable
setSupportedCurrencies([currencyId]);

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

async function main() {
    const bitcoin = new BitcoinWallet(currencyId);
    await bitcoin.init();

    await bitcoin.printNewAddress();
    await bitcoin.printBalance();

    const account = await bitcoin.getAccount();
    let recipient = account.freshAddress;
    console.log(`Sending ${satoshi} satoshi to address: ${recipient} `);
    await bitcoin.sendToAddress(satoshi, recipient);
}

main();
