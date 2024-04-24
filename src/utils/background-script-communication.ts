import { Dictionary, DictionaryIdentifier, isDictionary, isDictionaryID, isSiteData, SiteData } from "./models";

/**
 * Types of messages that can be sent to background script listener for processing
 */
export enum BSMessageType {
    DictsOfLang,
    GetCurrentDictionary,
    SetCurrentDictionary,
    AddNewDictionary,
    GetExistingDictionary,
    UpdateExistingDictionary,
    DeleteExitingDictionary,
    GetLanguages,
    SearchWordURL,
    StorePageData,
    DeletePageData,
    GetPageData,
    GetCurrentActivation,
    SetCurrentActivation,
    ShowDeleteHighlightsCM,
    HideDeleteHighlightsCM,
    GetAllDomains,
    GetSeeSiteData,
    GetAllExtensionData,
    LoadExtensionData,
    GetLabelsForSite,
    GetURLsForLabel,
    AddLabelEntry,
    RemoveLabelEntry,
    GetAllLabels
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
    return temp != null && temp.isActivated !== undefined;
}

/**
 * Request to get site-related data for a particular label.
 */
export interface GetDataForLabel {
    label: string;
}

export function isGetDataForLabelRequest(mssg: any): mssg is  GetDataForLabel {
    let temp = mssg as GetDataForLabel;
    return temp != null && temp.label !== undefined;

}

/**
 * Request for performing operation on particular site-label pair
 */
export interface LabelEntryModRequest {
    label: string;
    url: string;
}

export function isLabelEntryModRequest(mssg: any): mssg is  LabelEntryModRequest {
    let temp = mssg as LabelEntryModRequest;
    return temp != null && temp.label !== undefined && temp.url !== undefined;
}

/**
 * Request to add new dictionary to non-volatile db
 */
 export interface AddNewDictRequest {
    dict: Dictionary;
    lang: string;
}

/**
 * Returns true if and only if object provided is a SetActivationRequest
 */
 export function isAddNewDictRequest(mssg: any): mssg is AddNewDictRequest {
    let temp = mssg as AddNewDictRequest;
    return temp != null && temp.lang !== undefined && isDictionary(temp.dict);
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
    return temp != null && temp.language !== undefined;
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
    return temp != null && temp.word !== undefined;
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
    return temp != null && temp.url !== undefined && isSiteData(temp.data);
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
    return temp != null && temp.url !== undefined;
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
    return temp != null && temp.language !== undefined && isDictionaryID(temp.index) && isDictionary(temp.content);
}

/**
 * Request to load extension data
 */
 export interface LoadExtensionDataRequest {
    data: any;
}

/**
* Returns true if and only if object provided is a GetDataForPage
*/
export function isLoadExtensionDataRequest(mssg: any): mssg is LoadExtensionDataRequest {
   let temp = mssg as LoadExtensionDataRequest;
   return temp != null && temp.data !== undefined;
}

/**
 * Request to get all URLs of a given domain
 */
export interface GetAllURLsOfDomainRequest {
    schemeAndHost: string;
}

/**
* Returns true if and only if object provided is a GetDataForPage
*/
export function isGetUrlsOfDomainRequest(mssg: any): mssg is GetAllURLsOfDomainRequest {
   let temp = mssg as GetAllURLsOfDomainRequest;
   return temp != null && temp.schemeAndHost !== undefined;
}

export type BSMessagePayload = DictsOfLangRequest|SearchRequest|DictionaryIdentifier|
    PageDataPair|SetActivationRequest|GetDataForPage|UpdateDictionaryRequest|
    AddNewDictRequest|LoadExtensionDataRequest|GetAllURLsOfDomainRequest|
    LabelEntryModRequest|GetDataForLabel|null;

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
    return temp != null && temp.messageType !== undefined && temp.payload !== undefined;
}
