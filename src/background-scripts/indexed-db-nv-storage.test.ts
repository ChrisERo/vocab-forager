import { DB_NAME, DB_VERSION, getIndexedDBStorage, IDBSiteData, IndexedDBStorage, MAX_LABEL_LENGTH } from "./indexed-db-nv-storage";
import "fake-indexeddb/auto";  // needs to come after indexed-db-nv-storage import
import { GlobalDictionaryData, SeeSiteData, SiteData } from "../utils/models";
import { combineUrl, parseURL } from "../utils/utils";
import { getLocalStorage, LocalStorage } from "./non-volatile-browser-storage";
import { setUpMockBrowser } from "../__mocks__/chrome";
import browser from "webextension-polyfill";


type queryFunction = (a: IndexedDBStorage) => void;

setUpMockBrowser();

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
            throw new Error("Should have thrown exception");
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
        browser.storage.local.clear();
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
        expect(internalDB.version).toBeGreaterThanOrEqual(DB_VERSION);
        expect(internalDB.name).toBe(DB_NAME);
        expect(internalDB.objectStoreNames).toContain(IndexedDBStorage.SITE_DATA_TABLE);

        const transaction = internalDB.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
        const objectStore = transaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
        expect(objectStore.indexNames).toContain('schemeAndHost');
        expect(objectStore.indexNames).toContain('url');

        const transaction2 = internalDB.transaction(IndexedDBStorage.LABEL_TABLE, 'readonly');
        const objectStore2 = transaction2.objectStore(IndexedDBStorage.LABEL_TABLE);
        expect(objectStore2.indexNames).toContain('label');
        expect(objectStore2.indexNames).toContain('url');
        expect(objectStore2.keyPath).toStrictEqual(['label', 'schemeAndHost', 'urlPath'])

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
            'dicts': {},
        };

        await browser.storage.local.clear();
        await browser.storage.local.set(dataToStore);

        dao = new IndexedDBStorage();
        const localStorage: LocalStorage = getLocalStorage();
        expect(await localStorage.getAllPageUrls()).toHaveLength(3);

        await dao.setUp(localStorage);
        expect(dao['setUpCompleted']).toBe(true);
        let indexedDBData = await dao.getAllStorageData()
        expect(Object.keys(indexedDBData).length).toEqual(3);
        expect(await localStorage.getAllPageUrls()).toHaveLength(0);
      });

    test('Get IndexedDBStorage Convenience Function', async () => {
        dao = await getIndexedDBStorage();
        expect(dao).not.toEqual(null);
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
                const transaction = internalDB.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
                const objectStore = transaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
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
            const transaction = internalDB.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
            const objectStore = transaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
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
                const transaction = internalDB.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
                const objectStore = transaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
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
            const transaction = internalDB.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
            const objectStore = transaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
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
        const ps = dataToStore.map(async (x) => {
            await dao.storePageData(x, combineUrl(x.schemeAndHost, x.urlPath))
        });
        await Promise.all(ps);

        const getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(2);
        expect(getResults['https://www.articles.fake.net/articles/334567'])
            .toEqual(dataToStore[0]);
        expect(getResults['https://www.articles.fake.net/articles/456701'])
            .toEqual(dataToStore[1]);
    });

    test('Get All Site Data with Labels', async () => {
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
        const ps = dataToStore.map(async (x) => {
            const url = combineUrl(x.schemeAndHost, x.urlPath);
            await dao.storePageData(x, url);
            await dao.addLabelEntry(url, x.wordEntries[0].word);
            if (x.wordEntries.length > 1) {
                await dao.addLabelEntry(url, x.wordEntries[1].word);
            }
        });
        await Promise.all(ps);

        const getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(2);

        expect(getResults['https://www.articles.fake.net/articles/334567'])
            .toEqual({...dataToStore[0], labels: ['comida']});
        expect(getResults['https://www.articles.fake.net/articles/456701'])
            .toEqual({...dataToStore[1], labels: ['banana', 'manzana']});
    });

    test('Remove all words of a SiteData entry', async () => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();
        expect(internalDB).not.toEqual(null);
        let dataToStore: IDBSiteData[] = [
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
                missingWords: ["foo", "bar"],
                title: 'Fake News Article #334567',
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
                missingWords: [],
            }
        ];
        dataToStore.forEach(async (x) => {
            await dao.storePageData(x, combineUrl(x.schemeAndHost, x.urlPath))
        });
        let getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(2);

        await dao.storePageData({wordEntries: [], missingWords: [], title: 'DeletePlease'},
            'https://www.articles.fake.net/articles/456701');
        getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(1);
        expect(getResults['https://www.articles.fake.net/articles/334567'])
            .toEqual(dataToStore[0]);

        await dao.storePageData({wordEntries: [], missingWords: [], title: 'DeletePlease'},
            'https://www.articles.fake.net/articles/456701');
        getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(1);
        expect(getResults['https://www.articles.fake.net/articles/334567'])
            .toEqual(dataToStore[0]);

        await dao.storePageData({wordEntries: [], missingWords: [], title: 'DeletePlease'},
            'https://www.articles.fake.net/fake');
        getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(1);
        expect(getResults['https://www.articles.fake.net/articles/334567'])
            .toEqual(dataToStore[0]);

        await dao.storePageData({wordEntries: [], missingWords: [], title: 'SecondDelete'},
            'https://www.articles.fake.net/articles/334567');
        getResults = await dao.getAllStorageData();
        expect(Object.keys(getResults).length).toBe(0);
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

    test('Upload Extension Data With Labels', async () => {
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
                missingWords: [],
                labels: ['comida', 'frutas',],
            },
            'https://www.articles.net/articles/798054': {
                labels: ['luterano'],
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

    test('Get All Site Domains', async () => {
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

        const getResults = await dao.getAllDomains();
        expect(getResults.length).toBe(2);
        const keys = Object.keys(dataToStore);
        keys.forEach((x) => {
            expect(getResults).toContain(parseURL(x)[0]);
        });
    });

    test('Get All Sites for 1 Domain', async () => {
        dao = new IndexedDBStorage();
        const internalDB: IDBDatabase = await dao.setUp();
        expect(internalDB).not.toEqual(null);
        let dataToStore: { [subject: string]: IDBSiteData} = {
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
                title: 'Test Article',
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

        const getResults = await dao.getSeeSiteDataOfDomain('https://www.articles.fake.net');
        expect(getResults.length).toBe(2);

        const keys = Object.keys(dataToStore);
        keys.forEach((x) => {
            const urlSplit = parseURL(x);
            if (urlSplit[0] === 'https://www.articles.fake.net') {
                const expectedResult: SeeSiteData = {url: x};
                const rawData = dataToStore[x];
                if (rawData.title !== undefined) {
                    expectedResult.title = rawData.title;
                }

                expect(getResults).toContainEqual(expectedResult);
            }
       });
    });

    it.each([
        [
            'Add Label for existing site',
            ['addLabel'],
            [['https://www.articles.fake.net/articles/334567', "News"]],
            [[1,1]]
        ],
        [
            'Add Multiple Labels',
            ['addLabel', 'addLabel', 'addLabel', 'addLabel'],
            [
                ['https://www.articles.fake.net/articles/334567', "News"],
                ['https://www.articles.fake.net/articles/334567', "Lies"],
                ['https://www.articles.net/articles/798054', 'News'],
                ['https://www.articles.net/articles/798054', 'Facts']
            ],
            [[1,1], [2, 1], [1, 2], [2,1]]
        ],
        [
            'Remove Label for existing site',
            ['addLabel', 'removeLabel'],
            [
                ['https://www.articles.fake.net/articles/334567', "News"],
                ['https://www.articles.fake.net/articles/334567', "News"]
            ],
            [[1,1],[0,0]]
        ],
        [
            'Multiple Remove Label Operations',
            ['addLabel', 'addLabel', 'addLabel', 'addLabel',
            'removeLabel', 'removeLabel', 'addLabel', 'removeLabel', 'removeLabel'],
            [
                ['https://www.articles.fake.net/articles/334567', "News"],
                ['https://www.articles.fake.net/articles/334567', "Lies"],
                ['https://www.articles.net/articles/798054', 'News'],
                ['https://www.articles.net/articles/798054', 'Facts'],
                ['https://www.articles.net/articles/798054', 'Facts'],
                ['https://www.articles.net/articles/798054', 'News'],
                ['https://www.articles.net/articles/798054', 'Sports'],
                ['https://www.articles.fake.net/articles/334567', "Lies"],
                ['https://www.articles.fake.net/articles/334567', "News"],
            ],
            [[1,1], [2, 1], [1, 2], [2,1],
             [1,0], [0, 1], [1, 1], [1, 0], [0, 0]]
        ],
        [
            'Remove URLs',
            ['addLabel', 'addLabel', 'addLabel', 'addLabel', 'removeURL'],
            [
                ['https://www.articles.fake.net/articles/334567', "News"],
                ['https://www.articles.fake.net/articles/334567', "Lies"],
                ['https://www.articles.net/articles/798054', 'News'],
                ['https://www.articles.net/articles/798054', 'Facts'],
                'https://www.articles.fake.net/articles/334567',
            ],
            [[1,1], [2, 1], [1, 2], [2,1], null]
        ],
        [
            'Get ALL Labels',
            ['getAllLabels', 'addLabel', 'addLabel', 'addLabel', 'addLabel', 'getAllLabels',
            'removeURL', 'getAllLabels', 'removeLabel', 'getAllLabels'],
            [
                null,
                ['https://www.articles.fake.net/articles/334567', "News"],
                ['https://www.articles.fake.net/articles/334567', "Lies"],
                ['https://www.articles.net/articles/798054', 'News'],
                ['https://www.articles.net/articles/798054', 'Facts'],
                null,
                'https://www.articles.fake.net/articles/334567',
                null,
                ['https://www.articles.net/articles/798054', 'Facts'],
                null,
            ],
            [[], [1,1], [2, 1], [1, 2], [2,1], ['News', 'Lies', 'Facts'], null,
            ['News', 'Facts'], [1, 0], ['News']]
        ],
        [
            'Remove label entries that do not exist',
            ['addLabel', 'addLabel', 'addLabel', 'addLabel',
            'removeLabel', 'removeLabel', 'removeLabel', 'removeLabel'],
            [
                ['https://www.articles.fake.net/articles/334567', "News"],
                ['https://www.articles.fake.net/articles/334567', "Lies"],
                ['https://www.articles.net/articles/798054', 'News'],
                ['https://www.articles.net/articles/798054', 'Facts'],
                ['https://www.articles.fake.net/articles/334567', 'ImaginaryLabel'],
                ['https://www.articles.fake.net/articles/334567', 'Facts'],
                ['https://www.articles.fake.net', 'Lies'],
                ['https://www.articles.net/articles/798054', 'Facts'],
            ],
            [[1,1], [2, 1], [1, 2], [2,1], [2, 0], [2, 1], [0, 1], [1, 0]]
        ],
        [
            'Add invalid label entries',
            ['addLabel', 'addLabel', 'addLabel', 'addLabel', 'addLabel', 'addLabel', 'addLabel', 'addLabel', 'addLabel'],
            [
                ['https://www.articles.fake.net/articles/334567', "News"],
                ['https://www.articles.fake.net/articles/334567', "Lies"],
                ['https://www.articles.net/articles/798054', 'News'],
                ['https://www.articles.net/articles/798054', 'Facts'],
                ['https://www.articles.net/articles/798054', ''],
                ['https://www.articles.net/articles/798054', '   '],
                ['https://www.articles.net/articles/798054', ' \t\n\r'],
                ['https://www.articles.net/articles/798054', 'qwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnm1234567890-+='],
                ['https://www.articles.net/articles/798054', 'qwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnm1234567890-+'],

            ],
            [[1,1], [2, 1], [1, 2], [2,1], [2, 0], [2, 0], [2, 0], [2, 0], [3, 1]]
        ],
        [
            'Add label entries or fake URLs',
            ['addLabel', 'addLabel', 'addLabel', 'addLabel', 'addLabel', 'addLabel'],
            [
                ['https://www.articles.fake.net/articles/334567', "News"],
                ['https://www.articles.fake.net/articles/334567', "Lies"],
                ['https://www.articles.net/articles/798054', 'News'],
                ['https://www.articles.net/articles/798054', 'Facts'],
                ['https://www.planetpizza.com', 'Food'],
                ['https://www.planetpizza.com', 'Facts'],
            ],
            [[1,1], [2, 1], [1, 2], [2,1], [0, 0], [0, 1]]
        ],
    ])('Test Label Actions: %s', async (_description: string, actions: string[],
            paramsArray: any[], expectedArray: any[]) => {
        // Check Test Parameters
        expect(actions.length).toBe(paramsArray.length);
        expect(paramsArray.length).toBe(expectedArray.length);

        // Set Up Test and Run
        const dataToStore: any = {
            'is_activated': true,
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
            'dicts': {},
        };

        await browser.storage.local.clear();
        await browser.storage.local.set(dataToStore);
        dao = new IndexedDBStorage();
        const localStorage: LocalStorage = getLocalStorage();
        expect(dao.getDB()).toBeNull();
        await dao.setUp(localStorage);

        for (let i = 0; i < actions.length; i++) {
            switch (actions[i]) {
                case "addLabel":
                    const params: [string, string] = paramsArray[i] as [string, string];
                    await dao.addLabelEntry(params[0], params[1]);

                    const expected: [number, number] = expectedArray[i] as [number, number];
                    const urlLabels: string[] = await dao.getLabelsOfSpecificSite(params[0]);
                    const labelURLs = await dao.getURLsOfSpecificLabels(params[1]);
                    if (params[1].trim().length > 0 && params[1].trim().length <= MAX_LABEL_LENGTH && dataToStore[params[0]] !== undefined) {
                        expect(urlLabels).toContain(params[1]);
                        expect(labelURLs).toContain(params[0]);
                    } else {
                        expect(urlLabels).not.toContain(params[1]);
                        expect(labelURLs).not.toContain(params[0]);
                    }
                    expect(urlLabels).toHaveLength(expected[0]);
                    expect(labelURLs).toHaveLength(expected[1]);
                    break;
                case "removeLabel":
                    const params2: [string, string] = paramsArray[i] as [string, string];
                    await dao.removeLabelEntry(params2[0], params2[1]);

                    const expected2: [number, number] = expectedArray[i] as [number, number];
                    const urlLabels2: string[] = await dao.getLabelsOfSpecificSite(params2[0]);
                    expect(urlLabels2).not.toContain(params2[1]);
                    expect(urlLabels2).toHaveLength(expected2[0]);
                    const labelURLs2 = await dao.getURLsOfSpecificLabels(params2[1]);
                    expect(labelURLs2).not.toContain(params2[0]);
                    expect(labelURLs2).toHaveLength(expected2[1]);
                    break;
                case "removeURL":
                    const params3: string = paramsArray[i] as string;
                    const oldSiteLabels: string[] = await dao.getLabelsOfSpecificSite(params3);
                    const promiseLabelsToOldLabelsLength = oldSiteLabels.map(async label => {
                        const urls = await dao.getURLsOfSpecificLabels(label);
                        return urls.length;
                    });
                    const labelsToOldLabelsLength =
                        await Promise.all(promiseLabelsToOldLabelsLength);

                    await dao.removePageData(params3);

                    const labels = await dao.getLabelsOfSpecificSite(params3);
                    expect(labels).toHaveLength(0);
                    for (let i = 0; i < oldSiteLabels.length; i++) {
                        const label = oldSiteLabels[i];
                        const urls = await dao.getURLsOfSpecificLabels(label);
                        const oldLen = labelsToOldLabelsLength[i];
                        expect(urls).toHaveLength(Math.max(0, oldLen - 1));
                    }
                    break;
                case 'getAllLabels':
                    const allLabels: string[] = await dao.getAllLabels();
                    const expected4: string[] = expectedArray[i] as string[];
                    expect(allLabels).toHaveLength(expected4.length);
                    expect(allLabels).toEqual(expect.arrayContaining(expected4));
                    expect(expected4).toEqual(expect.arrayContaining(allLabels));
                    break;
                default:
                    throw new Error('Unexpected action ' + actions[i]);

            }
        }

    });

    it.each([
        ['https://www.articles.com/a1', 1],
        ['https://www.articles.com/a2', 2],
        ['https://www.articles.com/a3', null],
        ['https://test.fakenews.com/flying-pigs', 3],
        ['https://test.fakenews.com', 4],
        ['https://www.google.com', null],
    ])('Test Get page ID: %s %d', async (targetUrl: string, targetPageId: number | null) => {
        const indexedDBStorage: IndexedDBStorage = new IndexedDBStorage();
        indexedDBStorage.setUp();
        const storedUrls: string[] = [
            'https://www.articles.com/a1',
            'https://www.articles.com/a2',
            'https://test.fakenews.com/flying-pigs',
            'https://test.fakenews.com',
        ];
        const storeSiteData: SiteData[] = [
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
            {
                wordEntries: [
                    {
                        word: 'uva',
                        startOffset: 33,
                        endOffset: 44,
                        nodePath: [[9,6,3,0], [10,6,3,0]]
                    }
                ],
                missingWords: []
            },
            {
                wordEntries: [
                ],
                missingWords: ['hamburgesa']
            }

        ];
        for (let i = 0; i < storedUrls.length; i++) {
            const url = storedUrls[i];
            const data = storeSiteData[i];
            await indexedDBStorage.storePageData(data, url);
        }
        expect((await indexedDBStorage.getAllPageUrls()).length).toBe(4);
        const pageId = await indexedDBStorage.getPageId(targetUrl);
        expect(pageId).toBe(targetPageId);
        if (pageId !== null) {
            const pageData: IDBSiteData = (await indexedDBStorage.getPageDataById(pageId)) as IDBSiteData;
            const [schemeAndHost, urlPath] = parseURL(targetUrl);
            const expectation = {
                ...storeSiteData[pageId - 1],
                schemeAndHost,
                urlPath,
                id: pageId
            }
            expect(pageData).toEqual(expectation);
        }

        indexedDBStorage.getDB()?.close();  // Needed so that beforeEach can be executed, clearing state for next test(s)
    });

it.each([
        [
            1,
            {
                id: 1,
                schemeAndHost: 'https://www.articles.com',
                urlPath: '/a1',
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
        ],
        [
            2,
            {
                id: 2,
                schemeAndHost: 'https://www.articles.com',
                urlPath: '/a2',
                labels: ['orchards', 'spanish'],
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
        ],
        [
            3,
            {
                id: 3,
                schemeAndHost: 'https://test.fakenews.com',
                urlPath: '/flying-pigs',
                wordEntries: [
                    {
                        word: 'uva',
                        startOffset: 33,
                        endOffset: 44,
                        nodePath: [[9,6,3,0], [10,6,3,0]]
                    }
                ],
                missingWords: []
            },
        ],
        [
            4,
            {
                id: 4,
                schemeAndHost: 'https://test.fakenews.com',
                urlPath: '',
                labels: ['fast-food'],
                wordEntries: [],
                missingWords: ['hamburgesa']
            }

        ]
    ])('Test Get page data by ID: %d %d', async (targetPageId: number, expectedData: IDBSiteData) => {
        const indexedDBStorage: IndexedDBStorage = new IndexedDBStorage();
        indexedDBStorage.setUp();
        const storedUrls: string[] = [
            'https://www.articles.com/a1',
            'https://www.articles.com/a2',
            'https://test.fakenews.com/flying-pigs',
            'https://test.fakenews.com',
        ];
        const storeSiteData: SiteData[] = [
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
            {
                wordEntries: [
                    {
                        word: 'uva',
                        startOffset: 33,
                        endOffset: 44,
                        nodePath: [[9,6,3,0], [10,6,3,0]]
                    }
                ],
                missingWords: []
            },
            {
                wordEntries: [],
                missingWords: ['hamburgesa']
            }

        ];
        const labelEntries = [
            ['https://www.articles.com/a2', 'spanish'],
            ['https://www.articles.com/a2', 'orchards'],
            ['https://test.fakenews.com', 'fast-food']
        ];
        for (let i = 0; i < storedUrls.length; ++i) {
            const url = storedUrls[i];
            const data = storeSiteData[i];
            await indexedDBStorage.storePageData(data, url);
        }
        for (let i = 0; i < labelEntries.length; ++i) {
            const [url, label] = labelEntries[i];
            await indexedDBStorage.addLabelEntry(url, label);
        }
        expect((await indexedDBStorage.getAllPageUrls()).length).toBe(4);
        const result = await indexedDBStorage.getPageDataById(targetPageId);
        expect(result).toEqual(expectedData);
        indexedDBStorage.getDB()?.close();  // Needed so that beforeEach can be executed, clearing state for next test(s)
    });

    it.each([
        [
            'getAllDomains',
            async (dao: IndexedDBStorage) => {
                const domains = await dao.getAllDomains();
                expect(domains.length).toBe(2);
            }
        ],
        [
            'getAllPageUrls',
            async (dao: IndexedDBStorage) => {
                const urls = await dao.getAllPageUrls();
                expect(urls.length).toBe(3);
            }
        ],
        [
            'getAllStorageData',
            async (dao: IndexedDBStorage) => {
                const data = await dao.getAllStorageData();
                expect(Object.keys(data)).toHaveLength(3);
            }
        ],
        [
            'getPageData',
            async (dao: IndexedDBStorage) => {
                const url = 'https://www.articles.fake.net/articles/456701';
                const wordEntriesExpected =  [
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
                ];
                const storeData = await dao.getPageData(url);
                expect(storeData.missingWords).toEqual([]);
                expect(storeData.wordEntries).toEqual(wordEntriesExpected);

            }
        ],
        [
            'storePageData',
            async (dao: IndexedDBStorage) => {
                const data =  {
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
                await dao.storePageData(data,'https://www.foobar.com/yahoo');
                let storeData = await dao.getPageData('https://www.foobar.com/yahoo');
                storeData = {...storeData};
                delete (storeData as any)['id'];
                expect(storeData).toEqual(data);
                const sites = await dao.getAllPageUrls();
                expect(sites).toHaveLength(4);
            }
        ],
        [
            'removePageData',
            async (dao: IndexedDBStorage) => {
                await dao.removePageData('https://www.articles.fake.net/articles/334567');
                const storeData = await dao.getPageData('https://www.foobar.com/yahoo');
                const emptySiteData: SiteData = {
                    wordEntries: [],
                    missingWords: []
                };
                expect(storeData).toEqual(emptySiteData);
                const sites = await dao.getAllPageUrls();
                expect(sites).toHaveLength(2);
            }
        ],
        [
            'getSeeSiteDataOfDomain',
            async (dao: IndexedDBStorage) => {
                let data: SeeSiteData[] = await dao.getSeeSiteDataOfDomain('https://www.articles.fake.net');
                expect(data).toHaveLength(2);
                data = await dao.getSeeSiteDataOfDomain('https://www.articles.net');
                expect(data).toHaveLength(1);
            }
        ],
        [
            'uploadExtensionData',
            async (dao: IndexedDBStorage) => {
                const dataToStore = {
                    'http://rettiwt.com/articles/334567': {
                        schemeAndHost: 'http://rettiwt.com',
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
                };
                const succeeded: boolean = await dao.uploadExtensionData(dataToStore);
                expect(succeeded).toBeTruthy();

                let data: SeeSiteData[] = await dao.getSeeSiteDataOfDomain('https://www.articles.fake.net');
                expect(data).toHaveLength(0);
                data = await dao.getSeeSiteDataOfDomain('https://www.articles.net');
                expect(data).toHaveLength(0);
                data = await dao.getSeeSiteDataOfDomain('http://rettiwt.com');
                expect(data).toHaveLength(1);
            }
        ]
    ])('%s async test', async (name: string, executeQuery: queryFunction) => {
        const dataToStore: any = {
            'is_activated': true,
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
            'dicts': {},
        };

        await browser.storage.local.clear();
        await browser.storage.local.set(dataToStore);
        dao = new IndexedDBStorage();
        const localStorage: LocalStorage = getLocalStorage();
        expect(dao.getDB()).toBeNull();
        dao.setUp(localStorage);
        await executeQuery(dao);
        expect(dao.getDB()).not.toBeNull();
        dao.getDB()?.close();
    });
});
