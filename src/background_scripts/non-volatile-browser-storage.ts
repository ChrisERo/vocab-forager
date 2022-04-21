import {GlobalDictionaryData, SiteData} from "../utils/models"

/**
 * Interfacce for retrieving and writing data needed for functionality of content scripts
 */
export interface NonVolatileBrowserStorage {    
    /**
     * Querries whether extension should be activated or not from from extension's 
     * non-volatile storage. If value is not set, initializes value to false.
     * 
     * @returns true if extension is currently activated, and false otherwise
     */
    getCurrentActivation(): boolean;
    
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
    getPageData(site: string): SiteData;

     /**
     * Saves page-specific metadata in non-volatile storage.
     * 
     * @param siteData - metadata for particular web url
     * @param page - url corresponding to data from siteData
     */
      storePageData(siteData: SiteData, page: string): void;

    /**
     * Gets all dictionary-related data stored in non-volatile source
     */
    getDictionaryData(): GlobalDictionaryData;

    /**
     * Sets data pertaining to global dictionary to GlobalDictionaryData
     * @param gdd 
     */
    setDictionaryData(gdd: GlobalDictionaryData): void;

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

    getCurrentActivation(): boolean {
        const notActivatedStringRep = '0';  // value of isActivatedKey if not activated

        let my_activation: string|null = window.localStorage.getItem(this.isActivatedKey);
        let activationStatus: boolean;
        if (my_activation === null) {
            activationStatus = false;
            window.localStorage.setItem(this.isActivatedKey, notActivatedStringRep);
        } else {
            activationStatus = Boolean(parseInt(my_activation));
        }

        return activationStatus;
    }

     setCurrentActivation(is_activated: boolean): void {
        let my_activation: StoredActivatedState = Number(is_activated) as StoredActivatedState;
        window.localStorage.setItem(this.isActivatedKey, my_activation.toString());
    }

    storePageData(siteData: SiteData, page: string): void {
        let saveData: string = JSON.stringify(siteData);
        if (saveData === '{}') {
            window.localStorage.removeItem(page);
        } else {
            window.localStorage.setItem(page, saveData);
        }
    }

    getPageData(site: string): SiteData {
        let page_vocab: string|null =  window.localStorage.getItem(site);
        if (page_vocab == null) {
            return {
                wordEntries: [],
                missingWords: [],
            };
        } else {
            return JSON.parse(page_vocab) as SiteData;
        }
    }

    getDictionaryData(): GlobalDictionaryData {
        let dictsRaw: string|null = window.localStorage.getItem(this.dictionaryKey);
        if (dictsRaw == null) {
            return {
                languagesToResources: {},
                currentDictionary: {language: '', index: -1}
            };
        }

        return JSON.parse(dictsRaw) as GlobalDictionaryData;
    }

    setDictionaryData(gdd: GlobalDictionaryData): void {
        window.localStorage.setItem(this.dictionaryKey, JSON.stringify(gdd));
    }
}



/**
 * 
 * @returns default NonVolatileBrowserStorage implementation
 */
export function getNonVolatileStorage(): NonVolatileBrowserStorage {
    return new LocalStorage('is_activated', 'dicts');
}