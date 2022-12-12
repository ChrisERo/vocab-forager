import { DB_NAME, DB_VERSION, getIndexedDBStorage, IndexedDBStorage } from "./indexed-db-nv-storage";
import "fake-indexeddb/auto";
import { GlobalDictionaryData, SiteData } from "../utils/models";
import { combineUrl } from "../utils/utils";
import { getLocalStorage } from "./non-volatile-browser-storage";


class MockLocalStorage implements chrome.storage.LocalStorageArea {

    private storage: {[key: string]: any};
    QUOTA_BYTES: number;

    constructor() {
        this.storage = {};
        this.QUOTA_BYTES = -1;
    }

    getBytesInUse(callback: (bytesInUse: number) => void): void;
    getBytesInUse(keys?: string | string[] | null | undefined): Promise<number>;
    getBytesInUse(keys: string | string[] | null, callback: (bytesInUse: number) => void): void;
    getBytesInUse(keys?: unknown, callback?: unknown): void | Promise<number> {
        throw new Error("Method not implemented.");
    }
    clear(): Promise<void>;
    clear(callback?: (() => void) | undefined): void;
    clear(callback?: unknown): void | Promise<void> {
        return new Promise<void>((resolve, _) => {
            this.storage = {};
            resolve();
        });
    }

    set(items: { [key: string]: any; }): Promise<void> {
        return new Promise<void>((resolve, _) => {
            const keys = Object.keys(items);
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                this.storage[k] = items[k];
            }
            resolve();
        });
    }

    remove(keys: string | string[]): Promise<void> {
        return new Promise<void>((resolve, _) => {
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                delete this.storage[k];
            }
            resolve();
        });
    }

    get(callback: (items: { [key: string]: any; }) => void): void;
    get(keys?: string | string[] | { [key: string]: any; } | null | undefined): Promise<{ [key: string]: any; }>;
    get(keys: string | string[] | { [key: string]: any; } | null, callback: (items: { [key: string]: any; }) => void): void;
    get(keys?: unknown, callback?: unknown): void | Promise<{ [key: string]: any; }> {
        return new Promise<object>((resolve, _) => {
            if (keys == null) {
                resolve({ ...this.storage });
            } else if (typeof keys === 'string' || keys instanceof String) {
                resolve(this.storage[keys as string]);
            } else {
                let keysList: string[];
                if (Array.isArray(keys)) {
                    keysList = keys;
                } else {
                    keysList = Object.keys(keys);
                }

                const returnObject: any = {};
                for (let i = 0; i < keysList.length; i++) {
                    const k = keysList[i];
                    returnObject[k] = this.storage[k];
                }

                resolve(returnObject);
            }
        });
    }
}

global.chrome = {
    storage: {
        local: new MockLocalStorage(),
        sync: {
            ...new MockLocalStorage(),
            MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE: -1,
            QUOTA_BYTES_PER_ITEM: -1,
            MAX_ITEMS: -1,
            MAX_WRITE_OPERATIONS_PER_HOUR: -1,
            MAX_WRITE_OPERATIONS_PER_MINUTE: -1,
        } as chrome.storage.SyncStorageArea,
        session: new MockLocalStorage(),
        managed: new MockLocalStorage(),
        onChanged: {} as chrome.storage.StorageChange,
    }
} as unknown as typeof chrome;

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

    test('getDictionaryData', () => {
        const dao: IndexedDBStorage = new IndexedDBStorage();
        try {
            const globalDictData: GlobalDictionaryData = {
                languagesToResources: { 
                    'ESP': [
                        {
                            name: 'Dict1', 
                            url: 'http://www.dict1.com/{word}'
                        }, 
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                    'FRA': [
                        {
                            name: 'WordReference', 
                            url: 'https://www.wordreference.com/fren/{word}',
                        }
                    ]
                }, 
                currentDictionary: {language: 'ESP', index: 1}
            };
            dao.setDictionaryData(globalDictData);
        } catch (ex: any) {
            expect(ex.message).toBe('IndexedDBStorage does not store dictionary data');
        }
      });
      
    test('getDictionaryData', async () => {
        const dao: IndexedDBStorage = new IndexedDBStorage();
        try {
            const result = await dao.getDictionaryData();
            throw Error(`getDictionaryData() succeeded, returning ${result}`)
        } catch (ex: any) {
            expect(ex.message).toBe('IndexedDBStorage does not store dictionary data');
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

    test('Setup load localStorage', async () => {
        const dataToStore: any = {
            'is_activated': false,
            'https://www.articles.fake.net/articles/334567': { 
                schemeAndHost: 'https://www.articles.fake.net',
                urlPath: '/articles/334567',
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
            'https://www.articles.fake.net/articles/456701': {
                schemeAndHost: 'https://www.articles.fake.net',
                urlPath: '/articles/456701', 
                wordEntries: [
                    {
                        word: 'manzana',
                        startOffset: 33,
                        endOffset: 44,
                        nodePath: [[9,6,3,0], [10,6,3,0]]
                    },
                    {
                        word: 'banana',
                        startOffset: 45,
                        endOffset: 12,
                        nodePath: [[9,6,3,0], [9,7,3,0]]
                    }
                ], 
                missingWords: []
            },
            'https://www.articles.net/articles/798054': {
                schemeAndHost: 'https://www.articles.net',
                urlPath: '/articles/798054', 
                wordEntries: [
                    {
                        word: 'eucaristía',
                        startOffset: 4,
                        endOffset: 7,
                        nodePath: [[9,6,3,0], [0,7,3,0]]
                    },
                ], 
                missingWords: ['vino']
            },
            'foo': 'bar',
        };

        await chrome.storage.local.clear();
        await chrome.storage.local.set(dataToStore);

        dao = new IndexedDBStorage();
        await dao.setUp(getLocalStorage());

        let indexedDBData = await dao.getAllStorageData()
        expect(Object.keys(indexedDBData).length).toEqual(3);
        delete dataToStore.foo;
        delete dataToStore.is_activated;
        expect(indexedDB)
      });

    test('Get IndexedDBStorage Convenience Function', async () => {
        dao = getIndexedDBStorage();
        expect(dao).not.toEqual(null);
        await new Promise((r) => setTimeout(r, 1000));
        expect(dao.getDB()).not.toEqual(null);
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
    ])('Get and Put SiteData Test: %#', async (urls: string[], siteDatae: SiteData[], count: number[]) => {
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

    it.each([
        [  // Nothing
            [],
            [],
            [0],
        ],
        [  // Remove non-existant SiteData
            ['https://www.fakesite.com/noexist'],
            [null],
            [0, 0],
        ],
        [  // Write new article then remove
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
                null
            ],
            [1, 0, 0]
        ],
        [  // Write new 2 new articles and delete one of them
            [
                "https://www.articles.com", 
                "https://www.articles.com/article2",
                "https://www.articles.com", 
            ],   
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
                }, 
                null
            ],
            [1, 2, 1, 1]
        ],
        [  // Update same article  then delete, then re-add
            [
                "https://www.articles.com/article1", 
                "https://www.articles.com/article1", 
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
                null,
                null,
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
            [1, 0, 0, 1, 1]
        ],
    ])('Add and Remove data Test: %#', async (urls: string[], siteDatae: (SiteData | null)[], count: number[]) => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();
        expect(internalDB).not.toEqual(null);

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const dataToStore = siteDatae[i];
            if (dataToStore === null) {
                await dao.removePageData(url);
            } else {
                await dao.storePageData(dataToStore, url);

            }

            // Want to test if change in count first
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

            if (dataToStore === null) {
                const storedData: SiteData = await dao.getPageData(url);
                expect(storedData.missingWords).toEqual([]);
                expect(storedData.wordEntries).toEqual([]);
            } else {
                const storedData: SiteData = await dao.getPageData(url);
                expect(storedData.missingWords).toEqual(dataToStore.missingWords);
                expect(storedData.wordEntries).toEqual(dataToStore.wordEntries);
            }
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

    test('Get All Site Data', async () => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();
        expect(internalDB).not.toEqual(null);
        let dataToStore = [
            { 
                schemeAndHost: 'https://www.articles.fake.net',
                urlPath: '/articles/334567',
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
                schemeAndHost: 'https://www.articles.fake.net',
                urlPath: '/articles/456701', 
                wordEntries: [
                    {
                        word: 'manzana',
                        startOffset: 33,
                        endOffset: 44,
                        nodePath: [[9,6,3,0], [10,6,3,0]]
                    },
                    {
                        word: 'banana',
                        startOffset: 45,
                        endOffset: 12,
                        nodePath: [[9,6,3,0], [9,7,3,0]]
                    }
                ], 
                missingWords: []
            }
        ];
        dataToStore.forEach(async (x) => {
            await dao.storePageData(x, combineUrl(x.schemeAndHost, x.urlPath))
        });

        const getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(2);
        expect(getResults['https://www.articles.fake.net/articles/334567'])
            .toEqual(dataToStore[0]);
        expect(getResults['https://www.articles.fake.net/articles/456701'])
            .toEqual(dataToStore[1]);
    });

    test('Upload Extension Data', async () => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();
        expect(internalDB).not.toEqual(null);
        let dataToStore = {
            'https://www.articles.fake.net/articles/334567': { 
                schemeAndHost: 'https://www.articles.fake.net',
                urlPath: '/articles/334567',
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
            'https://www.articles.fake.net/articles/456701': {
                schemeAndHost: 'https://www.articles.fake.net',
                urlPath: '/articles/456701', 
                wordEntries: [
                    {
                        word: 'manzana',
                        startOffset: 33,
                        endOffset: 44,
                        nodePath: [[9,6,3,0], [10,6,3,0]]
                    },
                    {
                        word: 'banana',
                        startOffset: 45,
                        endOffset: 12,
                        nodePath: [[9,6,3,0], [9,7,3,0]]
                    }
                ], 
                missingWords: []
            },
            'https://www.articles.net/articles/798054': {
                schemeAndHost: 'https://www.articles.net',
                urlPath: '/articles/798054', 
                wordEntries: [
                    {
                        word: 'eucaristía',
                        startOffset: 4,
                        endOffset: 7,
                        nodePath: [[9,6,3,0], [0,7,3,0]]
                    },
                ], 
                missingWords: ['vino']
            }
        };

        await dao.uploadExtensionData(dataToStore);
        const getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(3);
        expect(getResults).toEqual(dataToStore);
    });

    test('Get All Site URLs', async () => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();
        expect(internalDB).not.toEqual(null);
        let dataToStore = {
            'https://www.articles.fake.net/articles/334567': { 
                schemeAndHost: 'https://www.articles.fake.net',
                urlPath: '/articles/334567',
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
            'https://www.articles.fake.net/articles/456701': {
                schemeAndHost: 'https://www.articles.fake.net',
                urlPath: '/articles/456701', 
                wordEntries: [
                    {
                        word: 'manzana',
                        startOffset: 33,
                        endOffset: 44,
                        nodePath: [[9,6,3,0], [10,6,3,0]]
                    },
                    {
                        word: 'banana',
                        startOffset: 45,
                        endOffset: 12,
                        nodePath: [[9,6,3,0], [9,7,3,0]]
                    }
                ], 
                missingWords: []
            },
            'https://www.articles.net/articles/798054': {
                schemeAndHost: 'https://www.articles.net',
                urlPath: '/articles/798054', 
                wordEntries: [
                    {
                        word: 'eucaristía',
                        startOffset: 4,
                        endOffset: 7,
                        nodePath: [[9,6,3,0], [0,7,3,0]]
                    },
                ], 
                missingWords: ['vino']
            }
        };

        await dao.uploadExtensionData(dataToStore);
        const getResults = await dao.getAllPageUrls();
        expect(getResults.length).toBe(3);
        const keys = Object.keys(dataToStore);
        keys.forEach((x) => {
            expect(getResults).toContain(x);
        });
    });
});
