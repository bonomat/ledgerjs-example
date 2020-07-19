import { BitcoinWallet } from "./bitcoin";
import {
    getCryptoCurrencyById,
    parseCurrencyUnit,
} from "@ledgerhq/live-common/lib/currencies";
import { registerTransportModule } from "@ledgerhq/live-common/lib/hw";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import implementLibcore from "@ledgerhq/live-common/lib/libcore/platforms/nodejs";
import { setSupportedCurrencies } from "@ledgerhq/live-common/lib/data/cryptocurrencies";
const {} = require("@ledgerhq/live-common/lib/bridge");

// configure which coins to enable
let currencyId = "bitcoin_testnet";
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

main();
