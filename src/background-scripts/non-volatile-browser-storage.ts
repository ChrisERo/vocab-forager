import {GlobalDictionaryData, isEmpty, SiteData} from "../utils/models"


/**
 * Interface for retrieving and writing data needed for functionality of content scripts
 */
export interface NonVolatileBrowserStorage {
    /**
     * Queries whether extension should be activated or not from from extension's 
     * non-volatile storage. If value is not set, initializes value to false.
     * 
     * @returns true if extension is currently activated, and false otherwise
     */
    getCurrentActivation(): Promise<boolean>;
    
    /**
     * Sets in non-volatile storage whether the extension should be activated
     * 
     * @param is_activated - whether extension should be activated on pages or not
     * */
    setCurrentActivation(is_activated: boolean): void;

    /**
     * Given the url to a website, returns the page-specific metadata for said site
     * 
     * @param site - url of a website
     */
    getPageData(site: string): Promise<SiteData>;

    /**
     * Returns array of all URLs stored in non-volatiel storage
     */
    getAllPageUrls(): Promise<string[]>;

    /**
     * Returns all data stored in non-volatile storage as a JSON-compatible object
     */
    getAllStorageData(): Promise<any>;

    /**
    * Saves page-specific metadata in non-volatile storage.
    * 
    * @param siteData - metadata for particular web url
    * @param page - url corresponding to data from siteData
    */
    storePageData(siteData: SiteData, page: string): void;

    /**
     * Removes data for a partucluar webpage url from non-volatile storage
     * @param url - url corresponding to data from siteData
     */
    removePageData(url: string): void;    

    /**
     * Gets all dictionary-related data stored in non-volatile source
     */
    getDictionaryData(): Promise<GlobalDictionaryData>;

    /**
     * Sets data pertaining to global dictionary to GlobalDictionaryData
     * @param gdd 
     */
    setDictionaryData(gdd: GlobalDictionaryData): void;

    /**
     * Overrides all extension data stored in non-volatile storage present
     * 
     * @param data Data to store into non-volatile storage
     * @return boolean value whose return value depends on specific implementation
     */
    uploadExtensionData(data: any): Promise<boolean>;
}

type StoredActivatedState = 1|0;  // type of data the represents data stored in activated state

/**
 * Implementation of NonVolatileBrowserStorage with localStorage being the non-volatile 
 * data source.
 */
class LocalStorage implements NonVolatileBrowserStorage {
    readonly isActivatedKey: string;
    readonly dictionaryKey: string;

    constructor(isActivatedKey: string, dictionaryKey: string) {
        this.isActivatedKey = isActivatedKey;
        this.dictionaryKey = dictionaryKey;
    }

    private async getFromLS(key: string): Promise<any|null> {
        const fetchedResults = await chrome.storage.local.get(key);
    
        if (!fetchedResults.hasOwnProperty(key)) {
            return null;
        }

        return fetchedResults[key];
    }

    private setInLS(key: string, value: any): void {
        const payload = {
            [key]: value
        }
        chrome.storage.local.set(payload);
    }

    private removeFromLS(key: string): void {
        chrome.storage.local.remove(key);
    }

    private async getAllEntireLS(): Promise<{[key: string]: any}> {
        return chrome.storage.local.get(null);
    }
    
    async getCurrentActivation(): Promise<boolean> {
        let myActivation: boolean = false;
        let isActivated: boolean|null = await this.getFromLS(this.isActivatedKey);
        
        if (isActivated === null) {
            this.setCurrentActivation(myActivation);
        } else {
            myActivation = isActivated;
        }
    
        return myActivation;
    }

     setCurrentActivation(isActivated: boolean): void {
        this.setInLS(this.isActivatedKey, isActivated);
    }

    storePageData(siteData: SiteData, page: string): void {
        if (isEmpty(siteData)) {
           this.removeFromLS(page);
        } else {
            this.setInLS(page, siteData);
        }
    }

    removePageData(url: string): void {
        this.removeFromLS(url);
    }
    
    getAllStorageData(): Promise<any> {
        return this.getAllEntireLS();
    }
    
    async getAllPageUrls(): Promise<string[]> {
        let nonVolatileMemory = await this.getAllEntireLS();
        const response: string[] = [];
        for (let key in nonVolatileMemory) {
            if (this.isURL(key)) { 
                response.push(key);
            }
        }

        return response;
    }

    async getPageData(site: string): Promise<SiteData> {
        let siteData: SiteData|null = await this.getFromLS(site);
        if (siteData === null) {
            return {
                wordEntries: [],
                missingWords: [],
            };;
        }
        return siteData;
    }

    async getDictionaryData(): Promise<GlobalDictionaryData> {
        let dictsRaw: GlobalDictionaryData|null = await this.getFromLS(this.dictionaryKey);
        if (dictsRaw === null) {
            return {
                languagesToResources: {},
                currentDictionary: {language: '', index: -1}
            };
        }

        return dictsRaw;
    }

    setDictionaryData(gdd: GlobalDictionaryData): void {
        this.setInLS(this.dictionaryKey, gdd);
    }

    /**
     * Overrides all extension data stored in non-volatile storage present
     * in data and returns activation status in data
     * 
     * @param data Data to store into non-volatile storage
     */
    async uploadExtensionData(data: any): Promise<boolean> {
        await chrome.storage.local.clear();
        await chrome.storage.local.set(data);
        return this.getCurrentActivation();
    }

    /**
     * @param key entry inside LocalStorage
     * @returns true if key corresponds to an entry for a URL and false otherwise
     */
    private isURL(key: string): boolean {
        return key !== this.dictionaryKey && key !== this.isActivatedKey;
    }
}

/**
 * 
 * @returns default NonVolatileBrowserStorage implementation
 */
export function getNonVolatileStorage(): NonVolatileBrowserStorage {
    return new LocalStorage('is_activated', 'dicts');
}