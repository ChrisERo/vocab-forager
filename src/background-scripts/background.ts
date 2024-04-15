import { DictionaryManager } from "./dictionary";
import { getLocalStorage, LocalStorage, NonVolatileBrowserStorage } from "./non-volatile-browser-storage";
import {ContextMenuManager} from "./contextmenu"
import { BSMessagePayload, BSMessageType, isLabelEntryModRequest, isAddNewDictRequest, isBsMessage, isDictsOfLangRequest, isGetDataForLabelRequest, isGetDataForPageRequest, isGetUrlsOfDomainRequest, isLoadExtensionDataRequest, isPageDataPair, isSearchRequest, isSetActivationRequest, isUpdateDictionaryRequest } from "../utils/background-script-communication";
import { Dictionary, DictionaryIdentifier, isDictionaryID, SeeSiteData, SiteData } from "../utils/models";
import { isNewActivatedState } from "../utils/content-script-communication";
import { getIndexedDBStorage, IndexedDBStorage } from "./indexed-db-nv-storage";

const browserStorage: LocalStorage = getLocalStorage();
export const dictionaryManager: DictionaryManager = new DictionaryManager(browserStorage);
export const contextMenuManager: ContextMenuManager = new ContextMenuManager(browserStorage);

type sendResponseFunction = (response?: any) => void;

export type HandlerType = (message: any,
                           sender: any,
                           sendResponse: sendResponseFunction)
                           => Promise<boolean>;

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
function openNewDefineTab(url: string): Promise<void> {
    const message: chrome.tabs.CreateProperties = {
        active: true,
        url: url
    };

    return  new Promise<void>(async (resolve, reject) => {
        await chrome.tabs.create(message).then(async (newTab) => {
            if (newTab.id) {
                await browserStorage.setTabId(newTab.id);
                resolve();
            } else {
                console.error(`Created new tab without id for url: ${url}`);
                reject();
            };
        });
    });
}


/**
 * Checks to see if there is a tab open in browser (session) with id equal to id.
 *
 * @param id tab id to query
 * @param expectedTabId tab id that id should match
 * @returns true if tab with id already exists and false otherwise
 */
async function isTabCurrentlyOpen(id: number, expectedTabId: number): Promise<boolean> {
    try {
        const t = await chrome.tabs.get(id);
        return t.id === expectedTabId;  // If need be, we can add checks on tab's URL
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
    const definedTabId = await browserStorage.getTabId();
    if (definedTabId !== null && await isTabCurrentlyOpen(definedTabId, definedTabId)) {
        const updateMessage: chrome.tabs.UpdateProperties = {
            active: true,
            url: url
        }
        await chrome.tabs.update(definedTabId, updateMessage);
    } else {
        await openNewDefineTab(url);
    }
}

/**
 * Listens for calls to functions from any of the
 * background scripts and executes them.
 *
 * Using a listener per background script caused errors, in particular
 * when loading popup menu for the first time.
 */
export function makeHandler(siteDateStorage: Readonly<IndexedDBStorage>): HandlerType {
    return async (request: any, _: chrome.runtime.MessageSender,
                  sendResponse: sendResponseFunction): Promise<boolean> => {
        if (!isBsMessage(request)) {
            logUnexpected("request structure", request);
            return false;
        }
        console.log(`REQUEST TO BACKGROUND MADE: ${request.messageType}`);

        switch (request.messageType) {
            case BSMessageType.DictsOfLang: {
                if (isDictsOfLangRequest(request.payload)) {
                    const response = await dictionaryManager
                        .getDictionariesOfLanguage(request.payload.language);
                    sendResponse(response);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetCurrentDictionary: {
                const response = await dictionaryManager.getCurrentDictionaryId();
                sendResponse(response);
                break;
            }
            case BSMessageType.GetLanguages : {
                const languagesList = await dictionaryManager.getLanguages();
                sendResponse(languagesList);
                break;
            }
            case BSMessageType.SetCurrentDictionary: {
                if (isDictionaryID(request.payload)) {
                    await dictionaryManager.setCurrentDictionary(request.payload);
                    sendResponse();
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetExistingDictionary : {
                if (isDictionaryID(request.payload)) {
                    const dict = await dictionaryManager.getDictionaryFromIdentifier(request.payload);
                    sendResponse(dict);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.UpdateExistingDictionary: {
                if (isUpdateDictionaryRequest(request.payload)) {
                    const data: Dictionary = request.payload.content;
                    const index: DictionaryIdentifier = request.payload.index;
                    const language: string = request.payload.language;
                    await dictionaryManager.modifyExistingDictionary(
                        index,
                        language,
                        data
                    );
                    sendResponse();
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.AddNewDictionary: {
                if (isAddNewDictRequest(request.payload)) {
                    const dict: Dictionary = request.payload.dict;
                    const language: string = request.payload.lang;
                    await dictionaryManager.addDictionary(dict, language);
                    sendResponse();
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.DeleteExitingDictionary: {
                if (isDictionaryID(request.payload)) {
                    const deletedSomething: boolean = await dictionaryManager.removeDictionary(request.payload);
                    sendResponse(deletedSomething);
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
            case BSMessageType.GetLabelsForSite: {
                if (isGetDataForPageRequest(request.payload)) {
                    siteDateStorage.getLabelsOfSpecificSite(request.payload.url).then((response) => sendResponse(response));
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetURLsForLabel: {
                if (isGetDataForLabelRequest(request.payload)) {
                    siteDateStorage.getURLsOfSpecificLabels(request.payload.label).then((urls: string[]) => {
                        const siteDataPromises = urls.map(url => siteDateStorage.getPageData(url));
                        Promise.all(siteDataPromises).then(siteData => {
                            const seeSiteDataOutput: SeeSiteData[] = [];
                            for (let i = 0; i < urls.length; i++) {
                                const data: SeeSiteData = {
                                    url: urls[i],
                                    title: siteData[i].title
                                };
                                seeSiteDataOutput.push(data);
                            }
                            sendResponse(seeSiteDataOutput);
                        });
                    });
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.AddLabelEntry: {
                if (isLabelEntryModRequest(request.payload)) {
                    siteDateStorage.addLabelEntry(request.payload.url, request.payload.label)
                        .then(() => sendResponse());
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.RemoveLabelEntry: {
                if (isLabelEntryModRequest(request.payload)) {
                    siteDateStorage.removeLabelEntry(request.payload.url, request.payload.label)
                        .then(() => sendResponse());
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetAllLabels: {
                siteDateStorage.getAllLabels().then((response) => sendResponse(response));
                break;
            }
            case BSMessageType.GetSeeSiteData: {
                if (isGetUrlsOfDomainRequest(request.payload)) {
                    siteDateStorage.getSeeSiteDataOfDomain(request.payload.schemeAndHost).then((response) => sendResponse(response));
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetAllExtensionData: {
                const globalD = browserStorage.getAllStorageData();
                const siteD = siteDateStorage.getAllStorageData();
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
                    // Upload data to localStorage
                    const onlyGlobalData:{[key: string]: any} = {};
                    onlyGlobalData[browserStorage.isActivatedKey] = request.payload.data[browserStorage.isActivatedKey];
                    onlyGlobalData[browserStorage.dictionaryKey] = request.payload.data[browserStorage.dictionaryKey];
                    browserStorage.uploadExtensionData(onlyGlobalData).then((response) =>
                        contextMenuManager.updateContextMenuBasedOnActivation(response)
                    );
                    // Upload data to IndexedDB
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
}

const listenerSetupPromise: Promise<void> =  // Promise for unittests
    getIndexedDBStorage(browserStorage)
        .then((siteDataStorage: Readonly<IndexedDBStorage>) => {
            chrome.runtime.onMessage.addListener(makeHandler(siteDataStorage));
});

const contextMenuSetup = contextMenuManager.setUpContextMenus();

export const backgroundWorkerPromise: Promise<any[]> = Promise.all([
    listenerSetupPromise,
    contextMenuManager
]);
