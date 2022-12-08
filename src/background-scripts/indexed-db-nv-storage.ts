import { SiteData } from "../utils/models";
import { parseURL } from "../utils/utils";
import { NonVolatileBrowserStorage } from "./non-volatile-browser-storage";


export const DB_NAME = 'vocab-forager';
export const DB_VERSION = 1;


export interface IDBSiteData extends SiteData {
    schemeAndHost: string;
    urlPath: string;
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
export class IndexedDBStorage {
    // name of table to use
    public static readonly TABLE_NAME = 'site-data';
    // index  mapping database version to trnasform function to move from previous version of table to said table
    private static readonly TRANSFORMS = [() => {}, IndexedDBStorage.v1Creation];

    private db: IDBDatabase | null = null;  // database connection object

    async getCurrentActivation(): Promise<boolean> {
        throw Error('Current Activation is not stored in IndexedDBStorage')
    }

     setCurrentActivation(isActivated: boolean): void {
        throw Error('Current Activation is not stored in IndexedDBStorage')
    }

    setUp(): Promise<IDBDatabase> {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const openRequest = indexedDB.open(DB_NAME, DB_VERSION);
            openRequest.onerror = function (event) {
              reject("Problem opening DB: " + event);
            }
            openRequest.onupgradeneeded = (event: any) => {
                console.log(`Upgrading ${DB_NAME} to ${event.newVersion} from ${event.oldVersion}`)
                const db: IDBDatabase = event.target.result;
                for (let i = Math.max(0, event.oldVersion); i <= event.newVersion; i++) {
                    const func = IndexedDBStorage.TRANSFORMS[i];
                    func(db);  // Will likely need changing for future, but fine for now
                }

            };
            openRequest.onsuccess = (event: any) => {
                this.db = event.target.result as IDBDatabase;
                console.log('this.db set');
                resolve(this.db);
            };
        });
    }

    /**
     * @returns value of db connection for this object
     */
    getDB():  IDBDatabase | null {
        return this.db;
    }
    
    getPageData(url: string): Promise<SiteData> {
        if (this.db !== null) {
            const urlList = parseURL(url);
            const schemeAndHost: string = urlList[0];
            const urlPath: string = urlList[1];

            const getTransaction = this.db.transaction(IndexedDBStorage.TABLE_NAME, "readonly");
            const objectStore = getTransaction.objectStore(IndexedDBStorage.TABLE_NAME);
            const osIndex = objectStore.index('url');
            
            return new Promise((resolve, reject) => {
                const getRequest = osIndex.get([schemeAndHost, urlPath]);
                getRequest.onerror = (ex) =>  {
                    console.error(`Failed to get site data: ${ex}`)
                };
                getRequest.onsuccess = (event: any) => {  // TODO: make sure that null returned if nothing found
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
        } else {
            return new Promise((resolve, reject) => {
                reject('IndexedDB object not initialized');
            });
        }
     }

     /**
      * Either adds a new SiteData entry to the TABLE_NAME table or updates an existing one
      * if siteData's url index matches an existing entry.
      * 
      * @param siteData  data to store in IndexedDB
      * @param url url corresponding to siteData
      */
     storePageData(siteData: SiteData, url: string): Promise<void> {
        const thisDB = this.db
        if (thisDB !== null) {
            return new Promise((resolve, reject) => {
                const siteDataToStore = siteDataToIDBSiteData(siteData, url);
                const writeTransaction = thisDB.transaction(IndexedDBStorage.TABLE_NAME, "readwrite");
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.TABLE_NAME);
    
                const request = objectStore.put(siteDataToStore, [siteDataToStore.schemeAndHost, siteDataToStore.urlPath]);
                request.onerror = (err) => {
                    reject(`Unexpected error when saving ${url} ` + err);
                };
                request.onsuccess = (event: any) => {
                    resolve();
                };
            });
        } else {
             return new Promise((resolve, reject) => {
                reject('IndexedDB object not initialized');
            });
        }
    }

    removePageData(url: string): Promise<void> {
        const thisDB = this.db
        if (thisDB !== null) {
            return new Promise((resolve, reject) => {
                const urlAsArray = parseURL(url);
                const schemeAndHost = urlAsArray[0];
                const urlPath = urlAsArray[1];

                const writeTransaction = thisDB.transaction(IndexedDBStorage.TABLE_NAME, "readwrite");
                const objectStore = writeTransaction.objectStore(IndexedDBStorage.TABLE_NAME);
                const osIndex = objectStore.index('url');
    
                const request = objectStore.delete([schemeAndHost, urlPath]);
                request.onerror = (err) => {
                    reject(`Unexpected error when saving ${url} ` + err);
                };
                request.onsuccess = (event: any) => {
                    resolve();
                };
            });
        } else {
             return new Promise((resolve, reject) => {
                reject('IndexedDB object not initialized');
            });
        }
    }    


    private static v1Creation(db: IDBDatabase): void {
        // Create an objectStore for this database
       const objectStore = db.createObjectStore(IndexedDBStorage.TABLE_NAME, { autoIncrement: true });

       // define what data items the objectStore will contain
       objectStore.createIndex('schemeAndHost', 'schemeAndHost', { unique: false });
       objectStore.createIndex('url', ['schemeAndHost', 'urlPath'], { unique: true });
   }
}