import browser from 'webextension-polyfill';
import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { CSMessage, CSMessageType } from "../utils/content-script-communication";
import { Dictionary, DictionaryIdentifier, isNullDictionaryID } from "../utils/models";
import { loadBannerHtml } from "./fetch-banner";
import { makeDictionarySelection, makeLanguageSelection, setUpDictsAndLangsElements } from "./selection-dict";
import { addNavToButton } from "./utils";

/**
 * Adds action listeners for all button elements in popup page
 */
function initButtons(): void {
    // Navigate to page for making new dictionary
    addNavToButton('new-dict');
    addNavToButton('index');

    // Setup toggle button to what non-volatile state dictates
    const getActive: BSMessage = {
        messageType: BSMessageType.GetCurrentActivation,
        payload: null
    };
    browser.runtime.sendMessage(getActive).then(response => {
        const isActive: boolean = response as boolean;
        const activeToggle = document.getElementById('activate') as HTMLInputElement;
        activeToggle.checked = isActive;
        activeToggle.addEventListener('change',  () =>  {
            // Notify background script and all content scripts
            let isActive = activeToggle.checked;
            const setChecked: BSMessage = {
                messageType: BSMessageType.SetCurrentActivation,
                payload: {
                    isActivated: isActive
                }
            };
            browser.runtime.sendMessage(setChecked); 
            // Send message to currently all tabs to update based on new state we set
            const get_tabs = browser.tabs.query({});
            get_tabs.then((tabs: browser.Tabs.Tab[]) => {
                for (let i = 0; i < tabs.length; i++) {
                    const tab = tabs[i];
                    // TODO: make this with value
                    const message: CSMessage = {
                        messageType: CSMessageType.ActivationStateChange,
                        payload: {newActivatedState: isActive},
                    }
                    if (tab.id !== undefined) {
                        browser.tabs.sendMessage(tab.id, message);
                    }
                }
            });
            });
        });
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

        setUpDictsAndLangsElements(langs, dictInfo);

        // change current dictionary (in both volatile and non-volatile memory)
        document.getElementById('dictionaries')?.addEventListener("click", 
            function (this: HTMLSelectElement) {
                const languageSelect = (document.getElementById('languages') as HTMLSelectElement);
                
                if (languageSelect.value === '' || this.value === "") {
                    console.log("No dictionary to select")
                    return;
                }

                const myLang = langs[parseInt(languageSelect.value)];
                const dictIndex = parseInt(this.value);
                
                let setDictMssg: BSMessage = {
                    messageType: BSMessageType.SetCurrentDictionary,
                    payload: {
                        index: dictIndex,
                        language: myLang
                    }
                }
                browser.runtime.sendMessage(setDictMssg);
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
            browser.runtime.sendMessage(setDictMssg);
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
browser.runtime.sendMessage(getDictReq).then((cd: any) => {
    const dictId = cd as DictionaryIdentifier;
    currentDictId.language = dictId.language;
    currentDictId.index = dictId.index;
    let getLangsReq: BSMessage = {
        messageType: BSMessageType.GetLanguages,
        payload: null
    };
    browser.runtime.sendMessage(getLangsReq).then(
        (langs: unknown) => processRequestedData(currentDictId, langs as string[]))
});
