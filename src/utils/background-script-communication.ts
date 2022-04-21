import { Dictionary, DictionaryIdentifier, SiteData } from "./models";

/**
 * Types of messages that can be sent to background script listener for processing
 */
 export enum BSMessageType {
    DictsOfLang,
    GetCurrentDictionary,
    SetCurrentDictionary,
    GetExistingDictionary,
    UpdateExistingDictionary,
    DeleteExitingDictionary,
    GetLanguages,
    SearchWordURL,
    StorePageData,
    GetDataForPage,
    GetCurrentActivation,
    SetCurrentActivation,
    ShowDeleteHighlightsCM,
    HideDeleteHighlightsCM,
}

/**
 * Request to set activation state
 */
 export interface SetActivationRequest {
    isActivated: boolean;
}

/**
 * Returns true if and only if object provided is a SetActivationRequest
 */
 export function isSetActivationRequest(mssg: any): mssg is SetActivationRequest {
    let temp = mssg as SetActivationRequest;
    return temp.isActivated !== undefined;
}

/**
 * Request to get all dictionaries of a particular language
 */
export interface DictsOfLangRequest {
    language: string;
}

/**
 * Returns true if and only if object provided is a DictsOfLangRequest
 */
 export function isDictsOfLangRequest(mssg: any): mssg is DictsOfLangRequest {
    let temp = mssg as DictsOfLangRequest;
    return temp.language !== undefined;
}

/**
 * Message indicating word for which we must generate a search url
 */
 export interface SearchRequest {
    word: string;
}

/**
 * Returns true if and only if object provided is a SearchRequest
 */
 export function isSearchRequest(mssg: any): mssg is SearchRequest {
    let temp = mssg as SearchRequest;
    return temp.word !== undefined;
}

/**
 * Pairing of page meta-data with url corresponding to said page
 */
 export interface PageDataPair {
    url: string;
    data: SiteData;
}

/**
 * Returns true if and only if object provided is a PageDataPair
 */
 export function isPageDataPair(mssg: any): mssg is PageDataPair {
    let temp = mssg as PageDataPair;
    return temp.url !== undefined && temp.data !== undefined;
}

/**
 * Request to get data for particular page
 */
 export interface GetDataForPage {
    url: string;
}

/**
 * Returns true if and only if object provided is a GetDataForPage
 */
 export function isGetDataForPageRequest(mssg: any): mssg is GetDataForPage {
    let temp = mssg as GetDataForPage;
    return temp.url !== undefined;
}

/**
 * Request to update existing dictionary
 */
 export interface UpdateDictionaryRequest {
     language: string;
     index: DictionaryIdentifier;
     content: Dictionary;
}

/**
 * Returns true if and only if object provided is a GetDataForPage
 */
 export function isUpdateDictionaryRequest(mssg: any): mssg is UpdateDictionaryRequest {
    let temp = mssg as UpdateDictionaryRequest;
    return temp.language !== undefined && temp.index !== undefined && temp.content !== undefined;
}


export type BSMessagePayload = DictsOfLangRequest|SearchRequest|DictionaryIdentifier|
    PageDataPair|SetActivationRequest|UpdateDictionaryRequest|null;

/**
 * Message that can be sent to background script listener
 */
 export interface BSMessage {
    messageType: BSMessageType;
    payload: BSMessagePayload;

}

/**
 * Returns true if and only if object provided is a BSMessage
 */
export function isBsMessage(mssg: any): mssg is BSMessage {
    let temp = mssg as BSMessage;
    return temp.messageType !== undefined && temp.payload !== undefined;
}
