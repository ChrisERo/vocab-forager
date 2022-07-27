import { DictionaryManager } from "./dictionary";
import { getNonVolatileStorage, NonVolatileBrowserStorage } from "./non-volatile-browser-storage";
import {ContextMenuManager} from "./contextmenu"
import { BSMessageType, isAddNewDictRequest, isBsMessage, isDictsOfLangRequest, isGetDataForPageRequest, isPageDataPair, isSearchRequest, isSetActivationRequest, isUpdateDictionaryRequest } from "../utils/background-script-communication";
import { Dictionary, DictionaryIdentifier, isDictionaryID, SiteData } from "../utils/models";
import { isNewActivatedState } from "../utils/content-script-communication";

const browserStorage: NonVolatileBrowserStorage = getNonVolatileStorage();
const dictionaryManager: DictionaryManager = new DictionaryManager(browserStorage);
const contextMenuManager: ContextMenuManager = new ContextMenuManager(browserStorage);

type sendResponseFunction = (response?: any) => void; 


function logUnexpected(key: string, value: any) {
    console.error(`unexpected ${key}: ${value}`);
}

/**
 * Listens for calls to functions from any of the 
 * background scripts and executes them.
 * 
 * Using a listener per background script caused errors, in particular
 * when loading popup menu for the first time.
 */
 function handler(request: any, _: chrome.runtime.MessageSender, sendResponse: sendResponseFunction): void {
    console.log(`REQUEST TO BACKGROUND MADE: ${request.type}`);
    
    if (!isBsMessage(request)) {
       logUnexpected("request structure", request);
       return;
    }

    switch (request.messageType) {
        case BSMessageType.DictsOfLang: {
            if (isDictsOfLangRequest(request.payload)) {
                let result = dictionaryManager.getDictionariesOfLanguage(
                    request.payload.language
                );
                sendResponse(result);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetCurrentDictionary: {
            let response = dictionaryManager.getCurrentDictionaryId();
            sendResponse(response);
            break;
        }
        case BSMessageType.GetLanguages : {
            let response = dictionaryManager.getLanguages();
            sendResponse(response);
            break;
        }
        case BSMessageType.SetCurrentDictionary: {
            if (isDictionaryID(request.payload)) {
                let result = dictionaryManager.setcurrentDictinoary(request.payload);
                sendResponse(result);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetExistingDictionary : {
            if (isDictionaryID(request.payload)) {
                let result = dictionaryManager.getDictionaryFromIdentifier(request.payload);
                sendResponse(result);
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
                dictionaryManager.modifyExistingDictionary(index, language, data);
                sendResponse();
            } else {
                logUnexpected('payload', request.payload);
            }
        }
        case BSMessageType.AddNewDictionary: {
            if (isAddNewDictRequest(request.payload)) {
                const dict: Dictionary = request.payload.dict;
                const langauge: string = request.payload.lang;
                dictionaryManager.addDictionary(dict, langauge);
                sendResponse();
            }
        }
        case BSMessageType.DeleteExitingDictionary: {
            if (isDictionaryID(request.payload)) {
                let result = dictionaryManager.removeDictionary(request.payload);
                sendResponse(result);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.SearchWordURL: {
            if (isSearchRequest(request.payload)) {
                let result = dictionaryManager.getWordSearchURL(request.payload.word);
                sendResponse(result);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.StorePageData: {
            if (isPageDataPair(request.payload)) {
                let data: SiteData = request.payload.data;
                let url: string = request.payload.url;
                browserStorage.storePageData(data, url);
                sendResponse();
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetPageData: {
            if (isGetDataForPageRequest(request.payload)) {
                let data: SiteData = browserStorage.getPageData(request.payload.url);
                sendResponse(data);
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.DeletePageData: {
            if (isGetDataForPageRequest(request.payload)) {
                browserStorage.removePageData(request.payload.url);
                sendResponse();
            } else {
                logUnexpected('payload', request.payload);
            }
            break;
        }
        case BSMessageType.GetCurrentActivation: {
            let result = browserStorage.getCurrentActivation();
            sendResponse(result);
            break;
        }
        case BSMessageType.SetCurrentActivation: {
            if (isSetActivationRequest(request.payload)) {
                browserStorage.setCurrentActivation(request.payload.isActivated);
                sendResponse();
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
        case BSMessageType.GetAllURLs: {
            const response: string[] = browserStorage.getAllPageUrls();
            sendResponse(response);
            break;
        }
        default: {
            logUnexpected('messageType', request.messageType);
        }
    }
 }


contextMenuManager.setUpContextMenus();
chrome.runtime.onMessage.addListener(handler);

