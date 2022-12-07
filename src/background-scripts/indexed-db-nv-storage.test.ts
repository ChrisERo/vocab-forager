import { DB_NAME, DB_VERSION, IndexedDBStorage } from "./indexed-db-nv-storage";
import "fake-indexeddb/auto";


describe('IndexedDBStorage Fails when required to', () => {
    test('setCurrentActivation', () => {
        const dao: IndexedDBStorage = new IndexedDBStorage();
        try {
            dao.setCurrentActivation(true);
        } catch (ex: any) {
            expect(ex.message).toBe('Current Activation is not stored in IndexedDBStorage');
        }
      });
      test('getCurrentActivation', async () => {
        const dao: IndexedDBStorage = new IndexedDBStorage();
        try {
            const result: boolean = await dao.getCurrentActivation();
            throw Error(`getCurrentActivation() succeeded, returning ${result}`)
        } catch (ex: any) {
            expect(ex.message).toBe('Current Activation is not stored in IndexedDBStorage');
        }
      });
});

describe('IndexedDBStorage SiteDataStorage', () => {
    let dao: IndexedDBStorage;

    beforeEach(() => {
        indexedDB.deleteDatabase(DB_NAME);
    });

    afterEach(() => {
        let db = dao.getDB();
        if (db !== null) {
            db.close();
        }
    });

    test('SetUp on Clean Slate', async () => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();

        expect(internalDB).toBeInstanceOf(IDBDatabase);
        expect(internalDB).toBe(dao.getDB());
        expect(internalDB.version).toBe(DB_VERSION);
        expect(internalDB.name).toBe(DB_NAME);
        expect(internalDB.objectStoreNames).toContain(IndexedDBStorage.TABLE_NAME);
        
        const transaction = internalDB.transaction(IndexedDBStorage.TABLE_NAME, 'readonly');
        const objectStore = transaction.objectStore(IndexedDBStorage.TABLE_NAME);
        expect(objectStore.indexNames).toContain('schemeAndHost');
        expect(objectStore.indexNames).toContain('url');
      });
});