import { first, map, reduce, tap } from "rxjs/operators";
import { Wallet } from "./wallet";

const {
    getCurrencyBridge,
    getAccountBridge,
} = require("@ledgerhq/live-common/lib/bridge");
const {
    getCryptoCurrencyById,
    formatCurrencyUnit,
} = require("@ledgerhq/live-common/lib/currencies");

export class BitcoinWallet implements Wallet {
    private currencyBridge: any;
    private initialized: boolean;
    private currency: any;

    constructor(private currencyId: String) {
        if (this.currencyId !== "bitcoin_testnet") {
            throw new Error("Wallet only supports testnet bitcoin");
        }
    }

    public async init() {
        this.currency = getCryptoCurrencyById(this.currencyId);

        // currency bridge is the interface to scan accounts of the device
        this.currencyBridge = getCurrencyBridge(this.currency);
        // some currency requires some data to be loaded (today it's not highly used but will be more and more)
        await this.currencyBridge.preload();

        this.initialized = true;
    }

    /**
     * Loads the account from your stick. Only public for testing purposes.
     */
    public async getAccount(): Promise<any> {
        const currency = this.currency;
        const deviceId = ""; // in HID case
        // in our case, we don't need to paginate
        const syncConfig = { paginationConfig: {} };

        return await this.currencyBridge
            .scanAccounts({ currency, deviceId, syncConfig })
            .pipe(
                // @ts-ignore
                // there can be many accounts, for the sake of this example we take the first one
                first((e) => e.type === "discovered" && e.account.index == 0),
                // @ts-ignore
                map((e) => e.account)
            )
            .toPromise()
            .catch((error) => {
                console.error(error); //log error
                throw error;
            });
    }

    public async printNewAddress() {
        let account = await this.getAccount();
        console.log(`${account.name} new address: ${account.freshAddress}`);
    }

    /**
     * syncs account and prints balance
     */
    public async printBalance() {
        let account = await this.refreshedAccount();
        console.log(
            `with balance of ${formatCurrencyUnit(
                account.unit,
                account.balance
            )} ${account.unit.name}`
        );
    }

    /**
     * refresh account, actually not needed as initial loading returns up2date account
     */
    private async refreshedAccount() {
        const scannedAccount = await this.getAccount();
        // account bridge is the interface to sync and do transaction on our account
        const accountBridge = getAccountBridge(scannedAccount);
        const syncConfig = { paginationConfig: {} };
        // Minimal way to synchronize an account.
        return await accountBridge
            .sync(scannedAccount, syncConfig)
            // @ts-ignore
            .pipe(reduce((a, f) => f(a), scannedAccount))
            .toPromise();
    }

    public async sendToAddress(amount: any, recipient: String) {
        const account = await this.getAccount();

        // account bridge is the interface to sync and do transaction on our account
        const accountBridge = getAccountBridge(account);
        // We prepare a transaction
        let transaction = accountBridge.createTransaction(account);
        transaction = accountBridge.updateTransaction(transaction, {
            amount,
            recipient,
        });
        transaction = await accountBridge.prepareTransaction(
            account,
            transaction
        );

        // We can always get the status. used for form validation and meta info (like calculated fees)
        const status = await accountBridge.getTransactionStatus(
            account,
            transaction
        );
        console.log({ status });

        // we can't broadcast the transaction if there are errors
        const errors = Object.values(status.errors);
        if (errors.length) {
            // @ts-ignore
            errors.forEach((error) => console.error(error.message));
            throw errors[0];
        }

        const deviceId = ""; // in HID case

        console.log("Sending transaction to ledger for signing");
        // We're good now, we can sign the transaction with the device
        const signedOperation = await accountBridge
            .signOperation({ account, transaction: transaction, deviceId })
            .pipe(
                tap((e) => console.log(e)), // log events
                // there are many events. we just take the final signed
                // @ts-ignore
                first((e) => e.type === "signed"),
                // @ts-ignore
                map((e) => e.signedOperation)
            )
            .toPromise()
            .catch((error) => {
                console.error(error);
            });

        // We can then broadcast it
        const operation = await accountBridge.broadcast({
            account,
            signedOperation,
        });

        // the transaction is broadcasted!
        // the resulting operation is an "optimistic" response that can be prepended to our account.operations[]
        console.log(`broadcasted with txid: ${operation.hash}`);
    }

    private getCurrencyBridge(): any {
        if (!this.initialized) {
            throw new Error("Wallet not initialized");
        }
        return this.currencyBridge;
    }
}
