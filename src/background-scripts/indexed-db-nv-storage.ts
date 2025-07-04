import { GlobalDictionaryData, isEmpty, isSiteData, SeeSiteData, SiteData } from "../utils/models";
import { combineUrl, parseURL } from "../utils/utils";
import { LocalStorage, NonVolatileBrowserStorage } from "./non-volatile-browser-storage";


export const DB_NAME = 'vocab-forager';
export const DB_VERSION = 3;

export const MAX_LABEL_LENGTH = 64;

type SiteDataMap =  {[url: string]: SiteData}

export interface IDBSiteData extends SiteData {
    id?: number;
    schemeAndHost: string;
    urlPath: string;
    labels?: string[];
}

function siteDataToIDBSiteData(siteData: SiteData, url: string): IDBSiteData {
    const urlList = parseURL(url);
    const schemeAndHost: string = urlList[0];
    const urlPath: string = urlList[1];

    const siteDataToStore = siteData as any;
    siteDataToStore.schemeAndHost = schemeAndHost;
    siteDataToStore.urlPath = urlPath;
    return siteDataToStore;
}

/**
 * NonVolatileBrowserStorage DAO used to store SiteData inside IndexedDB
 */
export class IndexedDBStorage implements NonVolatileBrowserStorage {
    // name of table to use
    public static readonly SITE_DATA_TABLE = 'site-data';
    public static readonly LABEL_TABLE = 'label-data';
    public static readonly TEMP_TABLE = 'TEMP';

    // list of actions to perform after IDBDatabase has been requested successfully
    //     added to mostly by actions in ON_UPGRADE_CALLBACKS
    //     elements are removed after they are completed.
    private static readonly POST_UPGRADE_ACTIONS: ((db: IDBDatabase) => Promise<void>)[] = [];

    // index  mapping database version to transform function to move from previous version of table to said table
    private static readonly ON_UPGRADE_CALLBACKS = [
        () => {console.error("SHOULD NOT BE HERE"); return Promise.resolve();}, // noop
        IndexedDBStorage.v1Creation,
        IndexedDBStorage.addSubjectTable,
        IndexedDBStorage.addSiteDataIdKey,
    ];

    // boolean flag indicating whether the setUp command has been fully ran to completion .
    //     This means that all required database upgrade action have been executed.
    //     This mostly reffers to action within ON_UPGRADE_CALLBACKS, unless
    //     updating from DB_VERSION 0.
    private setUpCompleted:boolean = false;

    private db: IDBDatabase | null = null;  // database connection object
    private dbPromise: Promise<IDBDatabase> | null = null;

    
    setUp(oldStorage?: LocalStorage): Promise<IDBDatabase> {
        return this.setUpCompleted
            ? this.dbPromise as Promise<IDBDatabase>
            : this.setUpHelper(oldStorage);
    }


    private setUpHelper(oldStorage?: LocalStorage, dbVersion: number = DB_VERSION): Promise<IDBDatabase> {
        if (this.db != null) {  // needed so that new version of database can be requested
            this.db.close();
        }

        this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            const openRequest = indexedDB.open(DB_NAME, dbVersion);
            openRequest.onerror = function (event: any) {
              reject(`Problem opening DB ${DB_NAME}:${dbVersion}: ${event.target.error}`);
            };
            let shouldPullSiteDataFromLS: boolean = false;
            let upgradesCompletedPromise: null | Promise<void[]> = null;
            openRequest.onupgradeneeded = (event: any) => {
                console.log(`Upgrading ${DB_NAME} to ${event.newVersion} from ${event.oldVersion}`);
                shouldPullSiteDataFromLS = event.oldVersion <= 0;

                const db: IDBDatabase = event.target.result;
                let transaction: IDBTransaction = event.target.transaction;
                // Only perform transformations asociated with newer versions (older transforms not needed)
                const updateOperations: Promise<void>[] = [];
                for (let i = Math.max(0, event.oldVersion) + 1; i <= event.newVersion; i++) {
                    console.log(`Performing IndexedDB Transform ${i}`);
                    const func = IndexedDBStorage.ON_UPGRADE_CALLBACKS[i];
                    updateOperations.push(func(db, transaction));
                }
                upgradesCompletedPromise = Promise.all(updateOperations)
            };
            openRequest.onsuccess = async (event: any) => {
                if (upgradesCompletedPromise !== null) {
                    await upgradesCompletedPromise;
                }
                this.db = event.target.result as IDBDatabase;
                while (IndexedDBStorage.POST_UPGRADE_ACTIONS.length > 0) {
                    // only remove action after it has completed successfully
                    const action = IndexedDBStorage.POST_UPGRADE_ACTIONS[0];
                    await action(this.db);
                    IndexedDBStorage.POST_UPGRADE_ACTIONS.shift();
                }

                console.log('this.db set');
                if (shouldPullSiteDataFromLS && oldStorage !== undefined) {
                    // Use fact that localStorage mimics upload/download data format
                    console.log('Transferring any old localStorage http data to indexedDB');
                    const oldData = await oldStorage.getAllStorageData();
                    await this.uploadExtensionData(oldData);

                    // Using suboptimal-simple approach since this is out of critical path
                    console.log('Loading Completed, Removing useless data from localStorage');
                    const oldUrls = await oldStorage.getAllPageUrls();
                    for (let i = 0; i < oldUrls.length; i++) {
                        oldStorage.removePageData(oldUrls[i]);
                    }
                }
                this.setUpCompleted = true;
                resolve(this.db);
            };
        });

        return this.dbPromise;
    }

    getPageId(url: string): Promise<number | null> {
        const query = (db: IDBDatabase): Promise<number | null> => {
            const urlList = parseURL(url);
            const schemeAndHost: string = urlList[0];
            const urlPath: string = urlList[1];

            const getTransaction = db.transaction(IndexedDBStorage.SITE_DATA_TABLE, "readonly");
            const objectStore = getTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
            const osIndex = objectStore.index('url');

            return new Promise((resolve) => {
                const getRequest = osIndex.getKey([schemeAndHost, urlPath]);
                getRequest.onerror = (ex) =>  {
                    console.error(`Failed to get site data ID: ${ex}`)
                    resolve(null);
                };
                getRequest.onsuccess = (event: any) => {
                    console.log(event)
                    let result = event.target.result as (number | null | undefined);
                    if (result === undefined) {
                        result = null;
                    }

                    resolve(result);
                };
            });
        };

        return this.runQuery(query);
    }

    getPageDataById(id: number): Promise<IDBSiteData | null> {
        const query = (db: IDBDatabase): Promise<IDBSiteData | null> => {
            const getTransaction = db.transaction(IndexedDBStorage.SITE_DATA_TABLE, "readonly");
            const objectStore = getTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
            return new Promise((resolve) => {
                const getRequest = objectStore.get(id);
                getRequest.onerror = (ex) =>  {
                    console.error(`Failed to get site data: ${ex}`)
                    resolve(null);
                };
                getRequest.onsuccess = async (event: any) => {
                    let siteData: IDBSiteData | undefined | null =
                        event.target.result as (IDBSiteData | undefined);
                    if (siteData === undefined) {
                        resolve(null);
                        return;
                    }
                    const urlOfSite: string = combineUrl(siteData.schemeAndHost, siteData.urlPath);
                    const labels = await this.getLabelsOfSpecificSite(urlOfSite);
                    if (labels !== null && labels.length > 0) {
                        siteData = {...siteData, labels};
                    }
                    resolve(siteData);
                };
            });
        };

        return this.runQuery(query);
    }

    getPageData(url: string): Promise<SiteData> {
        const query = (db: IDBDatabase): Promise<SiteData> => {
            const urlList = parseURL(url);
            const schemeAndHost: string = urlList[0];
            const urlPath: string = urlList[1];

            const getTransaction = db.transaction(IndexedDBStorage.SITE_DATA_TABLE, "readonly");
            const objectStore = getTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
            const osIndex = objectStore.index('url');

            return new Promise((resolve) => {
                const getRequest = osIndex.get([schemeAndHost, urlPath]);
                getRequest.onerror = (ex) =>  {
                    console.error(`Failed to get site data: ${ex}`)
                };
                getRequest.onsuccess = (event: any) => {
                    let siteData: SiteData | undefined = event.target.result as (SiteData | undefined)
                    if (siteData === undefined) {
                        siteData = {
                            wordEntries: [],
                            missingWords: [],
                        };
                    }

                    resolve(siteData);
                };
            });
        };

        return this.runQuery(query);
    }

     /**
      * Either adds a new SiteData entry to the TABLE_NAME table or updates an existing one
      * if siteData's url index matches an existing entry.
      *
      * @param siteData  data to store in IndexedDB
      * @param url url corresponding to siteData
      */
     storePageData(siteData: SiteData, url: string): Promise<void> {
        const siteDataToStore = siteDataToIDBSiteData(siteData, url);
        if (isEmpty(siteDataToStore)) {
            return this.removePageData(url);
        }

        const query = (db: IDBDatabase): Promise<void> => {
            return new Promise((resolve, reject) => {
                const writeTransaction = db.transaction(IndexedDBStorage.SITE_DATA_TABLE, "readwrite");
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
                // URL check before storeing object is more full proof
                //   (though we can change this in future PR)
                const osIndex = objectStore.index('url');
                const urlList = parseURL(url);
                const schemeAndHost: string = urlList[0];
                const urlPath: string = urlList[1];
                const searchForEntry = osIndex.get([schemeAndHost, urlPath]);
                searchForEntry.onerror = (err: any) => {
                    reject(`Unexpected error when querying data ${url} | ${err.target.error}`);
                };
                searchForEntry.onsuccess = (event: any) => {
                    const result = event.target.result as IDBSiteData | undefined;
                    if (result !== undefined) {
                        siteDataToStore.id = result.id;
                    }
                    const request = objectStore.put(siteDataToStore);
                    request.onerror = (err: any) => {
                        reject(`Unexpected error when storing page data for ${url} | ${err.target.error}`);
                    };
                    request.onsuccess = () => {
                        resolve();
                    };
                }; 
            });
        };

        return this.runQuery(query);
    }

    /**
     * Returns a list containing each label used to classify a site stored by extension
     *
     * @returns a list of strings, each representing a unique label used to mark at least
     * one of the sites for which we have SiteData for.
     */
    getAllLabels(): Promise<string[]> {
        const query = (db: IDBDatabase): Promise<string[]> => {
            return new Promise((resolve, reject) => {
                const readTransaction = db.transaction(IndexedDBStorage.LABEL_TABLE, 'readonly');
                const objectStore = readTransaction.objectStore(IndexedDBStorage.LABEL_TABLE);
                const osIndex = objectStore.index('label');

                const request = osIndex.openKeyCursor();
                request.onerror = (err) => {
                    reject(`Unexpected error when getting all SiteData:` + err);
                };
                const result: Set<string> = new Set<string>();
                request.onsuccess = (event: any) => {
                    let cursor: IDBCursor | null = event.target.result;
                    if (cursor) {
                        result.add(cursor.key as string);
                        cursor.continue();
                    } else {
                        resolve(Array.from(result));
                    }
                };
            });
        };

        return this.runQuery(query);
    }


    /**
     * Adds entry in IndexedDB associating specified url with a label. If label is only
     * filled with empty spaces or is empty, this is a noop, but a console log is
     * recorded.
     *
     * @param url URL of site
     * @param label string representing a label
     * @returns empty promise
     */
    addLabelEntry(url: string, labelTemp: string): Promise<void> {
        const label = labelTemp.trim();
        const query = (db: IDBDatabase): Promise<void> => {
            return new Promise(async (resolve, reject) => {
                if (label.length === 0 || label.length > MAX_LABEL_LENGTH) {
                    console.log(`Attempted to add label [${labelTemp}] to ${url}, it has either 0 or more than ${MAX_LABEL_LENGTH} characters`);
                    resolve();
                    return;
                }
                const siteData = await this.getPageData(url);
                if (siteData.wordEntries.length === 0 &&
                    siteData.missingWords.length === 0) {
                    console.log(`Cannot add label entry ${label} ${url} since no site data is present`);
                    resolve();
                    return;
                }

                const schemePathSeparation: string[] = parseURL(url);
                const writeTransaction = db.transaction(IndexedDBStorage.LABEL_TABLE, "readwrite");
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.LABEL_TABLE);

                const obj = {
                    'label': label,
                    'schemeAndHost': schemePathSeparation[0],
                    'urlPath': schemePathSeparation[1],
                };
                const request = objectStore.put(obj);
                request.onerror = (err) => {
                    reject(`Unexpected error when saving ${url} ` + err);
                };
                request.onsuccess = () => {
                    resolve();
                };
            });
        };

        return this.runQuery(query);
    }

    /**
     * Removes association between a url and a label if one exists, otherwise, noop. Does
     * nothing if label is empty (save for white spaces).
     *
     * @param url URL of site
     * @param label string representing a label
     * @returns void promise
     */
    removeLabelEntry(url: string, label: string): Promise<void> {
        label = label.trim();
        const query = (db: IDBDatabase): Promise<void> => {
            return new Promise((resolve, reject) => {
                if (label.length === 0) {
                    console.log(`Attempted to add empty subject to ${url}`);
                    resolve();
                }

                const schemePathSeparation: string[] = parseURL(url);
                const writeTransaction = db.transaction(IndexedDBStorage.LABEL_TABLE, "readwrite");
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.LABEL_TABLE);

                const request = objectStore.delete([label, schemePathSeparation[0], schemePathSeparation[1]]);
                request.onerror = (err) => {
                    reject(`Unexpected error when saving ${url} ` + err);
                };
                request.onsuccess = () => {
                    resolve();
                };
            });
        };

        return this.runQuery(query);
    }

    /**
     * Compiles a list of all labels associated with specific url
     *
     * @param url url for which to query for
     * @returns list of all labels associated with specific url
     */
    getLabelsOfSpecificSite(url: string): Promise<string[]> {
        const query = (db: IDBDatabase): Promise<string[]> => {
            return new Promise((resolve, reject) => {
                const schemePathSeparation: string[] = parseURL(url);
                const writeTransaction = db.transaction(IndexedDBStorage.LABEL_TABLE, "readwrite");
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.LABEL_TABLE);

                const labelIndex = objectStore.index('url');
                const request = labelIndex.openKeyCursor(IDBKeyRange.only(schemePathSeparation));
                request.onerror = (err: any) => {
                    reject(`Unexpected error when querying labels for ${url}: ${err.target.error} `);
                };
                const results: string[] = [];
                request.onsuccess = (event: any) => {
                    let cursor: IDBCursor | null = event.target.result;
                    if (cursor) {
                        const key = cursor.primaryKey  as string[];
                        results.push(key[0]);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
            });
        };

        return this.runQuery(query);
    }

    /**
     * Compiles a list of all URLs associated with specific label
     *
     * @param label label for which to query for
     * @returns list of all urls associated with specific label
     */
    getURLsOfSpecificLabels(label: string): Promise<string[]> {
        const query = (db: IDBDatabase): Promise<string[]> => {
            return new Promise((resolve, reject) => {
                const writeTransaction = db.transaction(IndexedDBStorage.LABEL_TABLE, "readwrite");
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.LABEL_TABLE);

                const labelIndex = objectStore.index('label');
                const request = labelIndex.openKeyCursor(IDBKeyRange.only(label));
                request.onerror = (err) => {
                    reject(`Unexpected error when querying urls for ${label}: ${err}`);
                };
                const results: string[] = [];
                request.onsuccess = (event: any) => {
                    let cursor: IDBCursor | null = event.target.result;
                    if (cursor) {
                        const key = cursor.primaryKey  as string[];
                        const schemeAndHost = key[1];
                        const path = key[2];
                        const url = combineUrl(schemeAndHost, path);
                        results.push(url);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
            });
        };

        return this.runQuery(query);
    }

    removePageData(url: string): Promise<void> {
        const query = (db: IDBDatabase): Promise<void> => {
            return new Promise((resolve, reject) => {
                const urlAsArray = parseURL(url);
                const schemeAndHost = urlAsArray[0];
                const urlPath = urlAsArray[1];

                const writeTransaction = db.transaction(
                    [IndexedDBStorage.SITE_DATA_TABLE, IndexedDBStorage.LABEL_TABLE],
                    "readwrite"
                );
                writeTransaction.onerror = (err: any) => {
                    reject(`Unexpected error deleteing ${url} ${err.target.error}`);
                };
                writeTransaction.oncomplete = () => {
                    resolve();
                };

                const objectStoreSiteData = writeTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
                const siteDateIndex = objectStoreSiteData.index('url');
                const objectStoreLabels = writeTransaction.objectStore(IndexedDBStorage.LABEL_TABLE);
                const labelIndex = objectStoreLabels.index('url');

                // Find SiteData entry corresponding to url, if one exists, delete it along with
                // corresponding label entries
                const getSiteDataForIndex = siteDateIndex.get([schemeAndHost, urlPath]);
                getSiteDataForIndex.onerror = (err: any) => {
                    reject(`Unexpected error getting ${url} ${err.target.error}`);
                };
                getSiteDataForIndex.onsuccess = (event: any) => {
                    const result = event.target.result as IDBSiteData | undefined;
                    if (result == undefined) {
                        resolve();
                        return;
                    }
                    const deleteSiteDataRequest = objectStoreSiteData.delete(result.id as number);
                    deleteSiteDataRequest.onerror = (err: any) => {
                        reject(`Unexpected error deleting ${url} ${err.target.error}`);
                    };
                    deleteSiteDataRequest.onsuccess = () => {
                        const labelEntriesCursor = labelIndex.openKeyCursor(IDBKeyRange.only(urlAsArray));
                        labelEntriesCursor.onsuccess = (event: any) => {
                            const cursor: IDBCursor | null = event.target.result;
                            if (cursor) {
                                objectStoreLabels.delete(cursor.primaryKey);
                                cursor.continue();
                            }
                        }; 
                    };
                }; 
            });
        };

        return this.runQuery(query);
    }

    /**
     * Returns all data stored in non-volatile storage as a JSON-compatible object
     */
    getAllStorageData(): Promise<SiteDataMap> {
        const query = (db: IDBDatabase): Promise<SiteDataMap> => {
            return new Promise((resolve, reject) => {
                const writeTransaction = db.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);

                const request = objectStore.getAll();
                request.onerror = (err) => {
                    reject(`Unexpected error when getting all SiteData:` + err);
                };
                request.onsuccess = (event: any) => {
                    const rawData = event.target.result as IDBSiteData[];
                    const result:  {[subject: string]: SiteData} = {};
                    const rawDataPromises = rawData.map(async (x) => {
                        x = {...x}  // make shallow copy of the object
                        const url = combineUrl(x.schemeAndHost, x.urlPath);
                        const labels: string[] = await this.getLabelsOfSpecificSite(url);
                        if (labels.length !== 0) {
                            x.labels = labels;
                        }
                        delete x.id ;
                        result[url] = x;
                    });
                    Promise.all(rawDataPromises).then(() => resolve(result));
                };
            });
        };

        return this.runQuery(query);
    }

    getAllPageUrls(): Promise<string[]> {
        const query = (db: IDBDatabase): Promise<string[]> => {
            return new Promise((resolve, reject) => {
                const writeTransaction = db.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
                const osIndex = objectStore.index('url');

                const request = osIndex.openKeyCursor();
                request.onerror = (err) => {
                    reject(`Unexpected error when getting all SiteData:` + err);
                };

                const result: string[] = [];
                request.onsuccess = (event: any) => {
                    let cursor: IDBCursor | null = event.target.result;
                    if (cursor) {
                        const indexKey = cursor.key as string[];
                        const url: string = combineUrl(indexKey[0], indexKey[1]);
                        result.push(url);
                        cursor.continue();
                    } else {
                        resolve(result);
                    }
                };
            });
        };

        return this.runQuery(query);
    }

    getAllDomains(): Promise<string[]> {
        const query = (db: IDBDatabase): Promise<string[]> => {
            return new Promise((resolve, reject) => {
                const readTransaction = db.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
                const objectStore = readTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
                const osIndex = objectStore.index('schemeAndHost');

                // There is no function to just get all values of an index:
                // https://stackoverflow.com/questions/53590913/how-to-get-all-idbindex-key-values-instead-of-object-store-primary-keys
                const request = osIndex.openKeyCursor();
                request.onerror = (err) => {
                    reject(`Unexpected error when getting all SiteData:` + err);
                };
                const result: Set<string> = new Set<string>();
                request.onsuccess = (event: any) => {
                    let cursor: IDBCursor | null = event.target.result;
                    if (cursor) {
                        result.add(cursor.key as string);
                        cursor.continue();
                    } else {
                        resolve(Array.from(result));
                    }
                };
            });
        };

        return this.runQuery(query);
    }

    getSeeSiteDataOfDomain(schemeAndHost: string): Promise<SeeSiteData[]> {
        const query = (db: IDBDatabase): Promise<SeeSiteData[]> => {
            return new Promise((resolve, reject) => {
                const readTransaction = db.transaction(IndexedDBStorage.SITE_DATA_TABLE, 'readonly');
                const objectStore = readTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
                const osIndex = objectStore.index('schemeAndHost');

                const request = osIndex.openCursor(schemeAndHost);
                request.onerror = (err) => {
                    reject(`Unexpected error when getting all SiteData:` + err);
                };

                const result: SeeSiteData[] = [];
                request.onsuccess = (event: any) => {
                    const cursor: IDBCursorWithValue | null = event.target.result;
                    if (cursor) {
                        const value = cursor.value as IDBSiteData;
                        const valueToStore: SeeSiteData = {
                            url: combineUrl(value.schemeAndHost, value.urlPath),
                        };
                        if (value.title !== undefined) {
                            valueToStore.title = value.title;
                        }

                        result.push(valueToStore);
                        cursor.continue();
                    } else {
                        resolve(result);
                    }
                };
            });
        };

        return this.runQuery(query);
    }

    /**
     * Clears all site data from IndexedDB and proceeds to write all data provided by user
     *
     * @param data
     * @returns true if operations succeeded completely and false otherwise
     */
    uploadExtensionData(data: any): Promise<boolean> {
        const query = (db: IDBDatabase): Promise<boolean> => {
            return new Promise((resolve) => {
                const writeTransaction = db.transaction([IndexedDBStorage.SITE_DATA_TABLE, IndexedDBStorage.LABEL_TABLE], "readwrite");
                writeTransaction.onerror = (err) => {
                    console.error(`Unexpected error when deleting all SiteData:` + err);
                    resolve(false);
                };
                writeTransaction.oncomplete = () => {
                    const writeTransaction = db.transaction([IndexedDBStorage.SITE_DATA_TABLE, IndexedDBStorage.LABEL_TABLE], "readwrite");
                    const siteDataObjectStore = writeTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
                    const labelObjectStore = writeTransaction.objectStore(IndexedDBStorage.LABEL_TABLE);
                    for (let key in data) {
                        if (data.hasOwnProperty(key)) {
                            const element = data[key];
                            if (isSiteData(element)) {
                                const elementToStore = siteDataToIDBSiteData(element, key);
                                if (elementToStore.labels !== undefined) {
                                    const labels = elementToStore.labels;
                                    for (let i = 0; i < labels.length; i++) {
                                        const labelDataEntry = {
                                            'label': labels[i],
                                            'schemeAndHost': elementToStore.schemeAndHost,
                                            'urlPath': elementToStore.urlPath
                                        }
                                        labelObjectStore.put(labelDataEntry);
                                    }
                                }
                                siteDataObjectStore.put(elementToStore);
                            }
                        }
                    }
                    resolve(true);
                };

                let objectStore = writeTransaction.objectStore(IndexedDBStorage.SITE_DATA_TABLE);
                objectStore.clear();
                objectStore = writeTransaction.objectStore(IndexedDBStorage.LABEL_TABLE);
                objectStore.clear();
            });
        };

        return this.runQuery(query);
    }

    getCurrentActivation(): Promise<boolean> {
        throw Error('Current Activation is not stored in IndexedDBStorage')
    }

     setCurrentActivation(isActivated: boolean): Promise<void> {
        throw Error('Current Activation is not stored in IndexedDBStorage')
    }

    getDictionaryData(): Promise<GlobalDictionaryData> {
        throw Error('IndexedDBStorage does not store dictionary data');
    }

    setDictionaryData(gdd: GlobalDictionaryData): Promise<void> {
        throw Error('IndexedDBStorage does not store dictionary data');
    }

    /**
     * @returns value of db connection for this object
     */
    getDB():  IDBDatabase | null {
        return this.db;
    }

    private runQuery<Type>(query: (a: IDBDatabase) => Promise<Type>): Promise<Type>  {
        if (this.db !== null) {
            return query(this.db);
        } else {
            if (this.dbPromise === null) {
                throw Error('IndexedDBStorage does not store dictionary data');
            } else {
                return this.dbPromise.then((value) => query(value));
            }
        }
    }

    /**
     * Creates an object store used to map URLs to the web data pertinent to that page.
     *
     * @param db database connection object with which to create object stores
     */
    private static v1Creation(db: IDBDatabase, _: IDBTransaction): Promise<void> {
        console.log('Adding siteData table');
        // Create an objectStore for this database
        const objectStore = db.createObjectStore(IndexedDBStorage.SITE_DATA_TABLE, { autoIncrement: true });

        // define what data items the objectStore will contain
        objectStore.createIndex('url', ['schemeAndHost', 'urlPath'], { unique: true });
        objectStore.createIndex('schemeAndHost', 'schemeAndHost', { unique: false });
        return Promise.resolve();
    }

    /**
     * Creates an object store containing mappings of subjects to URLs, where each entry
     * corresponds of a single subject-url pairing
     *
     * @param db database connection object with which to create object stores
     */
    private static addSubjectTable(db: IDBDatabase, _: IDBTransaction): Promise<void> {
        console.log('Adding label table');
        const objectStore = db.createObjectStore(IndexedDBStorage.LABEL_TABLE,
            { keyPath: ['label', 'schemeAndHost', 'urlPath'] }
        );
        objectStore.createIndex('url', ['schemeAndHost', 'urlPath'], { unique: false });
        objectStore.createIndex('label', 'label', { unique: false });
        return Promise.resolve();
    }

    /** 
     * Adds id key to SITE_DATA_TABLE objectstore
    *
     * @param db database connection object with which to create object stores
     * @param transaciton transaction entity associated with onupdated action 
     */
    private static async addSiteDataIdKey(db: IDBDatabase, transaction: IDBTransaction): Promise<void> {
        await IndexedDBStorage.copySiteDataIntoTemp(db, transaction);
        await IndexedDBStorage.recreateSiteDataObjectStore(db, transaction);
        IndexedDBStorage.deleteTempTable(db);
        return;
    }

    private static copySiteDataIntoTemp(db: IDBDatabase, transaction: IDBTransaction): Promise<void> {
        console.log("Starting Process of Adding KEY to site data table")
        db.createObjectStore(
            IndexedDBStorage.TEMP_TABLE , 
            {autoIncrement: true, keyPath: 'id'}
        );
        return IndexedDBStorage.copyDatabaseContents(
            transaction,
            IndexedDBStorage.SITE_DATA_TABLE,
            IndexedDBStorage.TEMP_TABLE
        ); 
    }

    private static recreateSiteDataObjectStore(db: IDBDatabase, transaction: IDBTransaction): Promise<void> {
        console.log("DELETEING OLD TABLE")
        db.deleteObjectStore(IndexedDBStorage.SITE_DATA_TABLE);
        console.log("DELETION COMPLETE")

        console.log("Recreating SiteData Object Store");
        const newStore = db.createObjectStore(
                IndexedDBStorage.SITE_DATA_TABLE,
                { keyPath: 'id', autoIncrement: true }
        );
        newStore.createIndex('url', ['schemeAndHost', 'urlPath'], { unique: true });
        newStore.createIndex('schemeAndHost', 'schemeAndHost', { unique: false });
        return IndexedDBStorage.copyDatabaseContents(
            transaction,
            IndexedDBStorage.TEMP_TABLE,
            IndexedDBStorage.SITE_DATA_TABLE,
        ); 
    }

    private static deleteTempTable(db: IDBDatabase): void {
        console.log("DELETEING TEMP TABLE")
        db.deleteObjectStore(IndexedDBStorage.TEMP_TABLE);
        console.log("DELETION COMPLETE");
    }

    private static copyDatabaseContents(transaction: IDBTransaction,
                                        sourceStoreName: string, 
                                        destStoreName: string): Promise<void> {
        return new Promise<void>( (resolve) => {
            console.log(`COPYING DATA FROM ${sourceStoreName} to ${destStoreName}`);
            const sourceStore = transaction.objectStore(sourceStoreName);
            const destStore= transaction.objectStore(destStoreName);
            sourceStore.openCursor().onsuccess = (event: Event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const data = cursor.value;
                    destStore.put(data);
                    cursor.continue();
                } else {
                    console.log(`COMPLETED COPY ${sourceStoreName} -> ${destStoreName}`);
                    resolve();
                    return;
                }
            };
        });
    }
}

/**
 * Constructs and IndexedDBStorage and initializes it, returning a Promise that evaluates
 * to a IndexedDBStorage object if successful.
 *
 * @param ls NonVolatileBrowserStorage object from which to obtain previously-stored data
 * @returns IndexedDBStorage that will eventually complete calling its set up function
 */
 export async function getIndexedDBStorage(ls?: LocalStorage): Promise<IndexedDBStorage> {
    console.log(`starting setup`);
    const nonVolatileStorage = new IndexedDBStorage();
    await nonVolatileStorage.setUp(ls);
    return nonVolatileStorage;
}
