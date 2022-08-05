import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { Dictionary, DictionaryIdentifier } from "../utils/models";
import { loadBannerHtml } from "./fetch-banner";
import { makeLanguageSelection, setUpDictsAndLangsElements } from "./selection-dict";
import { setInputElementDefaultValue } from "./utils";

/**
 * Resets styles for choose_dictionary, show-status, and mod_dict_items to original state.
 */
function resetStyles(): void {
    (document.getElementById('choose_dictionary') as HTMLElement).style.display = 
                'none';
            (document.getElementById('show-status') as HTMLElement).style.display = 
                'none';
            (document.getElementById('mod_dict_items') as HTMLElement).style.display = 
                'inline';
}

/**
 * Sets up content of select items under chose_dictionary div
 */
 function setUpItems() {
    const currentDictId: DictionaryIdentifier = {language: '', index: -1};
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
            (langs: string[]) =>  {
                makeLanguageSelection(langs, currentDictId);
                setUpDictsAndLangsElements(langs, currentDictId);
            });
    });
}

/**
 * Outputs name of dictionary selected in dictionaries select element
 * Assumes textContent of option in dictionaries select element represents name of
 * dictinoary with correspoding index
 */
 function getSelectedDictName() {
    const dictionaries = document.getElementById('dictionaries') as HTMLSelectElement;
    const selectedIndex = dictionaries.selectedIndex;
    return dictionaries.options[selectedIndex].text;
}

/**
 * Returns {language, index} object representing the dictionary selected
 */
 function getSelectedDictId(): DictionaryIdentifier | null {
    const langSelect = document.getElementById('languages') as HTMLSelectElement;

    const dictSelect = document.getElementById('dictionaries') as HTMLSelectElement
    const dictIndex = dictSelect.selectedIndex;

    if (langSelect.selectedIndex === -1 || dictIndex === -1) {
        return null;
    }

    const language = langSelect.options[langSelect.selectedIndex];
    const langStr = language.text;
    return {language: langStr, index: dictIndex};
}

loadBannerHtml();
setUpItems();

// Setup link buttons
const dleteDictElement = document.getElementById('delete-dict') as HTMLElement;
dleteDictElement.addEventListener("click", () => {
    const dict = getSelectedDictId();
    const dictName = getSelectedDictName();
    if (dict !== null) {
        const mssg: BSMessage = {
            messageType: BSMessageType.DeleteExitingDictionary,
            payload: dict
        };
        chrome.runtime.sendMessage(mssg, (isDelete: boolean) => {
            if (isDelete) {
                setUpItems(); // Reset select items
                // Confirm Deletion
                const status = document.getElementById('show-status') as HTMLElement;
                status.textContent = `${dictName} Deleted`;
                status.style.display = 'inherit';
            }
        });
    }
});

const editDict = document.getElementById('edit_dict') as HTMLElement;
editDict.addEventListener("click", () =>  {
    const dictInfo = getSelectedDictId();
    if (dictInfo !== null) {
        const message: BSMessage = {
            messageType: BSMessageType.GetExistingDictionary,
            payload: dictInfo
        };
        chrome.runtime.sendMessage(message, (dict: Dictionary) => {
            if (dict.name === '' && dict.url === '') {
                return;
            }

            setInputElementDefaultValue('lang', dictInfo['language']);
            setInputElementDefaultValue('name', dict['name']);
            setInputElementDefaultValue('url', dict['url']);

            resetStyles();
        });
    }
});


const saveElem = document.getElementById('save_dict') as HTMLElement;
saveElem.addEventListener("click", () => {
    const dictInfo = getSelectedDictId();
    if (dictInfo === null) {
        return;
    }

    const newDict: Dictionary =  {
        url: (document.getElementById('url') as HTMLInputElement).value,
        name: (document.getElementById('name') as HTMLInputElement).value
    };
    const message: BSMessage = {
        messageType: BSMessageType.UpdateExistingDictionary,
        payload: {
            language: (document.getElementById('lang') as HTMLInputElement).value,
            index: dictInfo,
            content:newDict
        }
    }

    chrome.runtime.sendMessage(message, (result) => {
            setUpItems();
            resetStyles();

            // Confirm result
            let status = document.getElementById('show-status') as HTMLElement;
            status.textContent = `${newDict.name} Modified`;
            status.style.display = 'inherit';
    });
});
