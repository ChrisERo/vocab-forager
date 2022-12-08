import { DB_NAME, DB_VERSION, IndexedDBStorage } from "./indexed-db-nv-storage";
import "fake-indexeddb/auto";
import { SiteData } from "../utils/models";


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

      it.each([
        [  // Nothing
            [],
            [],
            [0],
        ],
        [  // Write new 2 new data points, same host, different paths
            [
                "https://www.articles.com/article1", 
                "https://www.articles.com/article2"],
            [
                { 
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ], 
                    missingWords: ["foo", "bar"]
                },
                { 
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        }
                    ], 
                    missingWords: []
                }
            ],
            [1, 2, 2]
        ],
        [  // Write new 2 new data points, same host, different paths 2
            [
                "https://www.articles.com", 
                "https://www.articles.com/article2"],
            [
                { 
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ], 
                    missingWords: ["foo", "bar"]
                },
                { 
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        }
                    ], 
                    missingWords: []
                }
            ],
            [1, 2, 2]
        ],
        [  // Write new 2 new data points,different hosts
            [
                "https://www.articles.com", 
                "https://www.real-articles.com/article2"],
            [
                { 
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ], 
                    missingWords: ["foo", "bar"]
                },
                { 
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        }
                    ], 
                    missingWords: []
                }
            ],
            [1, 2, 2]
        ],
        [  // Update same article
            [
                "https://www.articles.com/article1", 
                "https://www.articles.com/article1"],
            [
                { 
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ], 
                    missingWords: ["foo", "bar"]
                },
                { 
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        }
                    ], 
                    missingWords: []
                }
            ],
            [1, 1, 1]
        ],
        [  // Update same article 2
            [
                "https://www.articles.com/article1", 
                "https://www.articles.com/article1/"],
            [
                { 
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ], 
                    missingWords: ["foo", "bar"]
                },
                { 
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        }
                    ], 
                    missingWords: []
                }
            ],
            [1, 1, 1]
        ],
        [  // Update same article no path 1
            [
                "https://www.articles.com", 
                "https://www.articles.com"],
            [
                { 
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ], 
                    missingWords: ["foo", "bar"]
                },
                { 
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        }
                    ], 
                    missingWords: []
                }
            ],
            [1, 1, 1]
        ],
        [  // Update same article no path 2
            [
                "https://www.articles.com", 
                "https://www.articles.com/"],
            [
                { 
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ], 
                    missingWords: ["foo", "bar"]
                },
                { 
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        }
                    ], 
                    missingWords: []
                }
            ],
            [1, 1, 1]
        ],
        [  // add 2 articles because different protocol
            [
                "https://www.articles.com", 
                "http://www.articles.com"],
            [
                { 
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ], 
                    missingWords: ["foo", "bar"]
                },
                { 
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        }
                    ], 
                    missingWords: []
                }
            ],
            [1, 2, 2]
        ],
    ])('Save and Put SiteData Test: %#', async (urls: string[], siteDatae: SiteData[], count: number[]) => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();
        expect(internalDB).not.toEqual(null);

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const dataToStore = siteDatae[i];
            await dao.storePageData(dataToStore, url);

            const getAllData: Promise<number> = new Promise((resolve, reject) => {
                const transaction = internalDB.transaction(IndexedDBStorage.TABLE_NAME, 'readonly');
                const objectStore = transaction.objectStore(IndexedDBStorage.TABLE_NAME);
                const getTodo = objectStore.getAll();
                getTodo.onsuccess = (event: any) => {
                    resolve(getTodo.result.length)
                };
                getTodo.onerror = (err: any) => {
                    reject(err)
                }
            });
            const dataCount: number = await getAllData;
            expect(dataCount).toBe(count[i]);

            const storedData: SiteData = await dao.getPageData(url);
            expect(storedData.missingWords).toEqual(dataToStore.missingWords);
            expect(storedData.wordEntries).toEqual(dataToStore.wordEntries);
        };

        const getAllData: Promise<number> = new Promise((resolve, reject) => {
            const transaction = internalDB.transaction(IndexedDBStorage.TABLE_NAME, 'readonly');
            const objectStore = transaction.objectStore(IndexedDBStorage.TABLE_NAME);
            const getTodo = objectStore.getAll();
            getTodo.onsuccess = (event: any) => {
                resolve(getTodo.result.length);
            };
            getTodo.onerror = (err: any) => {
                reject(err);
            }
        });
        const dataCount: number = await getAllData;
        expect(dataCount).toBe(count[count.length - 1]);
    });

    test('Get non-existent data', async () => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();
        expect(internalDB).not.toEqual(null);

        const url = 'https://www.fake-google.com';
        const siteData =  { 
            wordEntries: [
                {
                    word: 'comida',
                    startOffset: 0,
                    endOffset: 13,
                    nodePath: [[9,6,3,0]]
                }
            ], 
            missingWords: ["foo", "bar"]
        };

        const storedData: SiteData = await dao.getPageData(url);
        expect(storedData.missingWords).toEqual([]);
        expect(storedData.wordEntries).toEqual([]);
      });
});