import { DictionaryManager } from "./dictionary";
import { getLocalStorage, LocalStorage, NonVolatileBrowserStorage } from "./non-volatile-browser-storage";
import {ContextMenuManager} from "./contextmenu"
import { BSMessageType, isAddNewDictRequest, isBsMessage, isDictsOfLangRequest, isGetDataForPageRequest, isGetUrlsOfDomainRequest, isLoadExtensionDataRequest, isPageDataPair, isSearchRequest, isSetActivationRequest, isUpdateDictionaryRequest } from "../utils/background-script-communication";
import { Dictionary, DictionaryIdentifier, isDictionaryID, SiteData } from "../utils/models";
import { isNewActivatedState } from "../utils/content-script-communication";
import { getIndexedDBStorage, IndexedDBStorage } from "./indexed-db-nv-storage";

const browserStorage: LocalStorage = getLocalStorage();
const siteDateStorage: IndexedDBStorage = getIndexedDBStorage(browserStorage);
const dictionaryManager: DictionaryManager = new DictionaryManager(browserStorage);
const contextMenuManager: ContextMenuManager = new ContextMenuManager(browserStorage);
let defineTabId: number | null = null;

type sendResponseFunction = (response?: any) => void; 


/**
 * Logs that an unexpected value was asociated with a particular key
 * 
 * @param key 
 * @param value 
 */
function logUnexpected(key: string, value: any) {
    console.error(`unexpected ${key}: ${JSON.stringify(value)}`);
}

/**
 * Creates a new, active tab with specified url and and stores tab's id for future
 * searches 
 * 
 * @param url url in which to open new tab
 */
function openNewDefineTab(url: string): void {
    const message: chrome.tabs.CreateProperties = {
        active: true,
        url: url
    };
    chrome.tabs.create(message).then((newTab) => {
        if (newTab.id) {
            defineTabId = newTab.id;
        } else {
            console.error(`Created new tab without id for url: ${url}`);
        }
    });
}


/**
 * 
 * @param id tab id to query
 * @returns true if tab with id already exists and false otherwise
 */
async function isTabCurrentlyOpen(id: number): Promise<boolean> {
    try {
        let t = await chrome.tabs.get(id);
        return t.id === defineTabId;
    } catch {  // Not present
        return false;
    }
}

/**
 * Opens either an existing tab with id defineTabId if one exists. If this id is null or
 * no such tab exists, opens new tab and stores its id in defineTabId variable
 * 
 * @param url url with which to open tab
 */
async function openTab(url: string): Promise<void> {
    if (defineTabId !== null && await isTabCurrentlyOpen(defineTabId)) {
        const updateMessage: chrome.tabs.UpdateProperties = {
            active: true,
            url: url
        }
        chrome.tabs.update(defineTabId, updateMessage);
    } else {
        openNewDefineTab(url);
    }
}

/**
 * Listens for calls to functions from any of the 
 * background scripts and executes them.
 * 
 * Using a listener per background script caused errors, in particular
 * when loading popup menu for the first time.
 */
 function handler(request: any, _: chrome.runtime.MessageSender, sendResponse: sendResponseFunction): boolean {    
    if (!isBsMessage(request)) {
       logUnexpected("request structure", request);
       return false;
    }

    console.log(`REQUEST TO BACKGROUND MADE: ${request.messageType}`);

    switch (request.messageType) {
        case BSMessageType.DictsOfLang: {
            if (isDictsOfLangRequest(request.payload)) {
                dictionaryManager
                    .getDictionariesOfLanguage(request.payload.language)
                    .then((response) => sendResponse(response));
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetCurrentDictionary: {
            dictionaryManager.getCurrentDictionaryId().then((response) => sendResponse(response));
            break;
        }
        case BSMessageType.GetLanguages : {
            dictionaryManager.getLanguages().then((response) => sendResponse(response));
            break;
        }
        case BSMessageType.SetCurrentDictionary: {
            if (isDictionaryID(request.payload)) {
                dictionaryManager.setcurrentDictinoary(request.payload).then(() => sendResponse());
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetExistingDictionary : {
            if (isDictionaryID(request.payload)) {
                dictionaryManager.getDictionaryFromIdentifier(request.payload).then((response) => sendResponse(response));
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.UpdateExistingDictionary: {
            if (isUpdateDictionaryRequest(request.payload)) {
                let data: Dictionary = request.payload.content;
                let index: DictionaryIdentifier = request.payload.index;
                let language: string = request.payload.language;
                dictionaryManager.modifyExistingDictionary(index, language, data).then(() => sendResponse());
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.AddNewDictionary: {
            if (isAddNewDictRequest(request.payload)) {
                const dict: Dictionary = request.payload.dict;
                const langauge: string = request.payload.lang;
                dictionaryManager.addDictionary(dict, langauge).then(() => sendResponse());
            }
            break;
        }
        case BSMessageType.DeleteExitingDictionary: {
            if (isDictionaryID(request.payload)) {
                dictionaryManager.removeDictionary(request.payload).then((result) => sendResponse(result));
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.SearchWordURL: {
            if (isSearchRequest(request.payload)) {
                dictionaryManager.getWordSearchURL(request.payload.word).then(openTab);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.StorePageData: {
            if (isPageDataPair(request.payload)) {
                let data: SiteData = request.payload.data;
                let url: string = request.payload.url;
                siteDateStorage.storePageData(data, url);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetPageData: {
            if (isGetDataForPageRequest(request.payload)) {
                siteDateStorage.getPageData(request.payload.url).then((data) => sendResponse(data));
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.DeletePageData: {
            if (isGetDataForPageRequest(request.payload)) {
                siteDateStorage.removePageData(request.payload.url);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetCurrentActivation: {
            browserStorage.getCurrentActivation().then((result) => sendResponse(result));
            break;
        }
        case BSMessageType.SetCurrentActivation: {
            if (isSetActivationRequest(request.payload)) {
                browserStorage.setCurrentActivation(request.payload.isActivated);
                contextMenuManager.updateContextMenuBasedOnActivation(request.payload.isActivated);
                // tab notification done by activaters, so nothing else to do
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.ShowDeleteHighlightsCM: {
            contextMenuManager.exposeDeleteContextMenu();
            sendResponse();
            break;
        }
        case BSMessageType.HideDeleteHighlightsCM: {
            contextMenuManager.hideDeleteContextMenu();
            break;
        }
        case BSMessageType.GetAllDomains: {
            siteDateStorage.getAllDomains().then((response) => sendResponse(response));
            break;
        }
        case BSMessageType.GetURLSOfDomain: {
            siteDateStorage.getAllDomains().then((response) => sendResponse(response));
            if (isGetUrlsOfDomainRequest(request.payload)) {
                siteDateStorage.getUrlsOfDomain(request.payload.schemeAndHost).then((response) => sendResponse(response));
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetAllExtensionData: {
            const globalD = browserStorage.getAllStorageData();
            const siteD = siteDateStorage.getAllPageUrls();
            globalD.then((globalData) => {
                siteD.then((siteData) => {
                    const response = {
                        ...globalData,
                        ...siteData
                    };
                    sendResponse(response)
                });
            });
            break;
        }
        case BSMessageType.LoadExtensionData: {
            if (isLoadExtensionDataRequest(request.payload)) {
                const onlyGlobalData:{[key: string]: any} = {};
                onlyGlobalData[browserStorage.isActivatedKey] = request.payload.data[browserStorage.isActivatedKey];
                onlyGlobalData[browserStorage.dictionaryKey] = request.payload.data[browserStorage.dictionaryKey];
                browserStorage.uploadExtensionData(onlyGlobalData).then((response) =>
                    contextMenuManager.updateContextMenuBasedOnActivation(response)
                );
                siteDateStorage.uploadExtensionData(request.payload.data);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        default: {
            logUnexpected('messageType', request.messageType);
        }
    }

    return true;  // needed because https://stackoverflow.com/questions/54126343/how-to-fix-unchecked-runtime-lasterror-the-message-port-closed-before-a-respon
 }


contextMenuManager.setUpContextMenus();
chrome.runtime.onMessage.addListener(handler);

