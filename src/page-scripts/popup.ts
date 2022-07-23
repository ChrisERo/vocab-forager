import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { CSMessage, CSMessageType } from "../utils/content-script-communication";
import { Dictionary, DictionaryIdentifier, isNullDictionaryID } from "../utils/models";
import { loadBannerHtml } from "./fetch-banner";
import { makeDictionarySelection, makeLanguageSelection } from "./selection-dict";

/**
 * Adds action listeners for all button elements in popup page
 */
function initButtons(): void {
    // Navigate to page for making new dictionary
    const newDictElem = document.getElementById('new_dict') as HTMLElement;
    newDictElem.addEventListener('click', () => {
        chrome.tabs.create({
            url:'new_dict.html'
        });
    });

    const indexElem = document.getElementById('index') as HTMLElement;
    indexElem.addEventListener('click', () => {
        chrome.tabs.create({
            url:'index.html'
        });
    });

    // Setup toggle button to what non-volatile state dictates
    const getActive: BSMessage = {
        messageType: BSMessageType.GetCurrentActivation,
        payload: null
    };
    chrome.runtime.sendMessage(getActive, (isActive: boolean) => {
        const activeToggle = document.getElementById('activate') as HTMLInputElement;
        activeToggle.checked = isActive;
        activeToggle.addEventListener('change',  () => {
            const setChecked: BSMessage = {
                messageType: BSMessageType.SetCurrentActivation,
                payload: {
                    isActivated: activeToggle.checked
                }
            };
            chrome.runtime.sendMessage(setChecked); 
            // Send message to currently all tabs to update based on
            // Since have value already, no need to act after this change
            const get_tabs = chrome.tabs.query({});
            get_tabs.then((tabs) => {
                for (let i = 0; i < tabs.length; i++) {
                    const tab = tabs[i];
                    // TODO: make this with value
                    const message: CSMessage = {
                        messageType: CSMessageType.ActivationStateChange
                    }
                    if (tab.id !== undefined) {
                        chrome.tabs.sendMessage(tab.id, message);
                    }
                }
            });
        });
    });
}

/**
 * Populates dictionary selection in website with all dictionaries in non-volatile storage
 * belonging to particular langauge. If dictInfo.language === langauge, then dictInfo's
 * index is selected as the current value of select element
 * 
 * @param dictInfo - information on where some dictionary is located
 * @param language - langauge for which to query dictionaries
 */
function updateDictionarySelection(dictInfo: DictionaryIdentifier, language: string) {
    let getDictsRequest: BSMessage = {
        messageType: BSMessageType.DictsOfLang,
        payload: {
            language: language
        }
    };
    chrome.runtime.sendMessage(getDictsRequest, 
        (result: Dictionary[]) => makeDictionarySelection(result, dictInfo));
}

/**
 * Makes nescessary queries to populate popup webpage with the content it needs along with
 * several related listeners
 * 
 * @param dictInfo - current dictionary of extension
 * @param langs - list of languages stored in extension
 */
function processRequestedData(dictInfo: DictionaryIdentifier, langs: string[]): void {
        let dictionary_selection = [];  // selection of dictionaries for script
        // Once all set, initialize languages array and add relevant event listeners
        makeLanguageSelection(langs, dictInfo);

        // Get dictionaries from current_dict_info info and initialize
        // dictinoary comboboxes if current_dict exists
        if (langs.length > 0) {
            let langToSearch = isNullDictionaryID(dictInfo) ? langs[0] : dictInfo.language;
            updateDictionarySelection(dictInfo, langToSearch);
        }

        // Get new dictionaries associated with new selected langauge and populate 
        // selection of dictionaries with result
        document.getElementById('languages')?.addEventListener('change', 
            function(this: HTMLSelectElement) {
                const myLang = langs[parseInt(this.value)];
                updateDictionarySelection(dictInfo, myLang);
            }
        );

        // change current dictionary (in both volatile and non-volatile memory)
        document.getElementById('dictionaries')?.addEventListener("click", 
            function (this: HTMLSelectElement) {
                const languageSelect = (document.getElementById('languages') as HTMLSelectElement);
                const myLang = langs[parseInt(languageSelect.value)];
                const dictIndex = parseInt(this.value);
                
                let setDictMssg: BSMessage = {
                    messageType: BSMessageType.SetCurrentDictionary,
                    payload: {
                        index: dictIndex,
                        language: myLang
                    }
                }
                chrome.runtime.sendMessage(setDictMssg);
                dictInfo.language = myLang;
                dictInfo.index = dictIndex;
            }
        );

        // Change currentDi (in both volatile and non-volatile memory)
        // TODO: Determine if this duplication is needed and remove if not
        document.getElementById('dictionaries')?.addEventListener("change", 
        function (this: HTMLSelectElement) {
            const languageSelect = (document.getElementById('languages') as HTMLSelectElement);
            const myLang = langs[parseInt(languageSelect.value)];
            const dictIndex = parseInt(this.value);
            
            let setDictMssg: BSMessage = {
                messageType: BSMessageType.SetCurrentDictionary,
                payload: {
                    index: dictIndex,
                    language: myLang
                }
            }
            chrome.runtime.sendMessage(setDictMssg);
            dictInfo.language = myLang;
            dictInfo.index = dictIndex;
        }
    );
}


// id for current dictionary
export const currentDictId: DictionaryIdentifier = {language: '', index: -1};

loadBannerHtml();
initButtons();

let getDictReq: BSMessage = {
    messageType: BSMessageType.GetCurrentDictionary,
    payload: null
}
chrome.runtime.sendMessage(getDictReq, (cd: DictionaryIdentifier) => {
    currentDictId.language = cd.language;
    currentDictId.index = cd.index;
    let getLangsReq: BSMessage = {
        messageType: BSMessageType.GetLanguages,
        payload: null
    };
    chrome.runtime.sendMessage(getLangsReq, 
        (langs: string[]) => processRequestedData(currentDictId, langs))
});
