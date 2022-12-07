import { SiteData } from "../utils/models";
import { NonVolatileBrowserStorage } from "./non-volatile-browser-storage";


export const DB_NAME = 'vocab-forager';
export const DB_VERSION = 1;

 /*
    https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
    https://stackoverflow.com/questions/71451848/how-to-use-indexeddb-from-chrome-extension-service-workers
    https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
    https://dev.to/anobjectisa/local-database-and-chrome-extensions-indexeddb-36n
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
     * 
     * @returns value of db object
     */
    getDB():  IDBDatabase | null {
        return this.db;
    }

    /**
     * Given the url to a website, returns the page-specific metadata for said site
     * 
     * @param url - url of a website
     */
     getPageData(url: string): Promise<SiteData | null> {
        let schemeAndHost: string;
        let urlPath: string;
        const indexOfSchemeEnd = url.indexOf('://')
        const indexOfHostEnd = url.indexOf('/', indexOfSchemeEnd + 3);
        if (indexOfHostEnd === -1) {
            schemeAndHost = url;
            urlPath = '';
        } else {
            schemeAndHost = url.substring(0, indexOfHostEnd);
            urlPath = url.substring(indexOfHostEnd);
        }

        if (this.db !== null) {
            const getTransaction = this.db.transaction(IndexedDBStorage.TABLE_NAME, "readonly");
            const objectStore = getTransaction.objectStore(IndexedDBStorage.TABLE_NAME);
            const osIndex = objectStore.index('url');
            
            return new Promise((resolve, reject) => {
                getTransaction.onerror = (ex) =>  {
                    console.error(`Failed to get site data: ${ex}`)
                }
                const getRequest = osIndex.get([schemeAndHost, urlPath]);
                getRequest.onsuccess = (event: any) => {  // TODO: make sure that null returned if nothing found
                    let siteData: SiteData | null = event.target.result as (SiteData | null)
                    if (siteData === null) {
                        siteData = {
                            wordEntries: [],
                            missingWords: [],
                        };;
                    }

                    resolve(siteData);
                }
            });
        } else {
            return new Promise((resolve, reject) => {
                resolve(null);
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