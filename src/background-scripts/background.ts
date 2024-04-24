import { DictionaryManager } from "./dictionary";
import { getLocalStorage, LocalStorage, NonVolatileBrowserStorage } from "./non-volatile-browser-storage";
import { ContextMenuManager } from "./contextmenu"
import { BSMessageType, isLabelEntryModRequest, isAddNewDictRequest, isBsMessage, isDictsOfLangRequest, isGetDataForLabelRequest, isGetDataForPageRequest, isGetUrlsOfDomainRequest, isLoadExtensionDataRequest, isPageDataPair, isSearchRequest, isSetActivationRequest, isUpdateDictionaryRequest } from "../utils/background-script-communication";
import { Dictionary, DictionaryIdentifier, isDictionaryID, SeeSiteData, SiteData } from "../utils/models";
import { getIndexedDBStorage, IndexedDBStorage } from "./indexed-db-nv-storage";

export const browserStorage: LocalStorage = getLocalStorage();
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
        console.log(`REQUEST TO BACKGROUND MADE: ${BSMessageType[request.messageType]}`);

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
                    const url = await dictionaryManager.getWordSearchURL(request.payload.word);
                    await openTab(url);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.StorePageData: {
                if (isPageDataPair(request.payload)) {
                    const data: SiteData = request.payload.data;
                    const url: string = request.payload.url;
                    await siteDateStorage.storePageData(data, url);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetPageData: {
                if (isGetDataForPageRequest(request.payload)) {
                    const data: SiteData =
                        await siteDateStorage.getPageData(request.payload.url);
                    sendResponse(data);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.DeletePageData: {
                if (isGetDataForPageRequest(request.payload)) {
                    await siteDateStorage.removePageData(request.payload.url);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetCurrentActivation: {
                const activation: boolean =
                    await browserStorage.getCurrentActivation();
                sendResponse(activation);
                break;
            }
            case BSMessageType.SetCurrentActivation: {
                if (isSetActivationRequest(request.payload)) {
                    await browserStorage.setCurrentActivation(
                        request.payload.isActivated
                    );
                    contextMenuManager.updateContextMenuBasedOnActivation(
                        request.payload.isActivated
                    );
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
                sendResponse();
                break;
            }
            case BSMessageType.GetAllDomains: {
                const domains: string[] = await siteDateStorage.getAllDomains();
                sendResponse(domains);
                break;
            }
            case BSMessageType.GetLabelsForSite: {
                if (isGetDataForPageRequest(request.payload)) {
                    const labels = await siteDateStorage.getLabelsOfSpecificSite(
                        request.payload.url
                    );
                    sendResponse(labels);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetURLsForLabel: {
                if (isGetDataForLabelRequest(request.payload)) {
                    const urls: string[] =
                        await siteDateStorage.getURLsOfSpecificLabels(
                            request.payload.label
                    );
                    const siteData: Promise<SiteData>[] = urls.map(
                         url => siteDateStorage.getPageData(url)
                    );
                    const seeSiteDataOutput: SeeSiteData[] = [];
                    for (let i = 0; i < urls.length; i++) {
                        const sd: SiteData = await siteData[i];
                        const data: SeeSiteData = {
                            url: urls[i],
                            title: sd.title
                        };
                        seeSiteDataOutput.push(data);
                    }
                    sendResponse(seeSiteDataOutput);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.AddLabelEntry: {
                if (isLabelEntryModRequest(request.payload)) {
                    await siteDateStorage.addLabelEntry(
                        request.payload.url,
                        request.payload.label
                    );
                    sendResponse();
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.RemoveLabelEntry: {
                if (isLabelEntryModRequest(request.payload)) {
                    await siteDateStorage.removeLabelEntry(
                        request.payload.url,
                        request.payload.label
                    );
                    sendResponse();
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetAllLabels: {
                const labels = await siteDateStorage.getAllLabels();
                sendResponse(labels);
                break;
            }
            case BSMessageType.GetSeeSiteData: {
                if (isGetUrlsOfDomainRequest(request.payload)) {
                    const data = await siteDateStorage.getSeeSiteDataOfDomain(
                        request.payload.schemeAndHost
                    );
                    sendResponse(data);
                } else {
                    logUnexpected('payload', request.payload);
                }
                break;
            }
            case BSMessageType.GetAllExtensionData: {
                const globalD: Promise<any> =
                    browserStorage.getAllStorageData();
                const siteD: Promise<any> = siteDateStorage.getAllStorageData();
                const globalData: any = await globalD;
                const siteData: any = await siteD;
                const response = {
                    ...globalData,
                    ...siteData
                };
                sendResponse(response);
                break;
            }
            case BSMessageType.LoadExtensionData: {
                if (isLoadExtensionDataRequest(request.payload)) {
                    // Upload data to localStorage
                    const onlyGlobalData:{[key: string]: any} = {};
                    onlyGlobalData[browserStorage.isActivatedKey] =
                        request.payload.data[browserStorage.isActivatedKey];
                    onlyGlobalData[browserStorage.dictionaryKey] =
                        request.payload.data[browserStorage.dictionaryKey];
                    const isActivated: boolean =
                        await browserStorage.uploadExtensionData(onlyGlobalData);
                    contextMenuManager.updateContextMenuBasedOnActivation(isActivated);
                    // Upload data to IndexedDB
                    await siteDateStorage.uploadExtensionData(request.payload.data);
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

/**
 * Converts function of type HandlerType into a function that can be used as onMessage
 * listener. Please see following link
 *
 * https://stackoverflow.com/questions/53024819/sendresponse-not-waiting-for-async-function-or-promises-resolve
 *
 * @param handler HandlerType object that we want to convert to actual handler
 * @returns function that invokes handler, but returns an actual boolean instead of a
 */
function makeRealHandler(handler: HandlerType) {
    return (message: any, sender: any, sendResponse: sendResponseFunction): boolean => {
        handler(message, sender, sendResponse);
        // once/if bug gets fixed, can remove this middle-step
        return true;  // return true regardless of output to keep connection alive
    }
}

export let indexedDBStorage: IndexedDBStorage;  // exposed for test usage;
const listenerSetupPromise: Promise<void> =  // Promise for unittests
    getIndexedDBStorage(browserStorage)
        .then((siteDataStorage: IndexedDBStorage) => {
            indexedDBStorage = siteDataStorage;
            const asyncHandler: HandlerType = makeHandler(siteDataStorage);
            chrome.runtime.onMessage.addListener(makeRealHandler(asyncHandler));
});

const contextMenuSetup = contextMenuManager.setUpContextMenus();

export const backgroundWorkerPromise: Promise<any[]> = Promise.all([
    listenerSetupPromise,
    contextMenuManager
]);
