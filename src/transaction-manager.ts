import * as ClientStorage from './storage';

const COOKIE_KEY = 'a0.spajs.txs.';
const getTransactionKey = (state: string) => `${COOKIE_KEY}${state}`;

interface Transaction {
  nonce: string;
  scope: string;
  audience: string;
  appState?: any;
  code_verifier: string;
  redirect_uri: string;
}
interface Transactions {
  [key: string]: Transaction;
}
export default class TransactionManager {
  private readonly transactions: Transactions;

  constructor() {
    this.transactions = {};
    this.init();
  }

  public async init() {
    const keys = await ClientStorage.getAllKeys();
    const cookieKeys = keys.filter(k => k.startsWith(COOKIE_KEY));

    if (typeof window !== 'undefined') {
      cookieKeys.forEach(async key => {
        const state = key.replace(COOKIE_KEY, '');
        this.transactions[state] = await ClientStorage.get<Transaction>(key);
      });
    }
  }

  public async create(state: string, transaction: Transaction) {
    this.transactions[state] = transaction;
    await ClientStorage.save(getTransactionKey(state), transaction);
  }

  public get(state: string): Transaction {
    return this.transactions[state];
  }

  public async remove(state: string) {
    delete this.transactions[state];
    await ClientStorage.remove(getTransactionKey(state));
  }
}
