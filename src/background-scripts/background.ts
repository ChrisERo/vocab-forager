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
    console.error(`unexpected ${key}: ${JSON.stringify(value)}`);
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
                dictionaryManager.getWordSearchURL(request.payload.word).then((result) => sendResponse(result));
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
                browserStorage.getPageData(request.payload.url).then((data) => sendResponse(data));
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
            browserStorage.getCurrentActivation().then((result) => sendResponse(result));
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
            browserStorage.getAllPageUrls().then((response) => sendResponse(response));
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

