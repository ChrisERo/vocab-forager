import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { Dictionary, DictionaryIdentifier, isNullDictionaryID } from "../utils/models";

function createSelection<Type>(selectionId: string, arr: Type[], 
    arrElemToString: (x: Type) => string,
    currentDictInfo: DictionaryIdentifier|null, 
    conditionForSelecting: (x: Type) => boolean): HTMLSelectElement|null {

    let select = document.getElementById(selectionId) as HTMLSelectElement;
    select.innerHTML = "";
    let valueToSelect: string|null = null;
    for (let i = 0; i < arr.length; i++) {
        let iString: string = `${i}`;
        let z = document.createElement("option");
        z.setAttribute("value", `${i}`);
        let t = document.createTextNode(arrElemToString(arr[i]));
        z.appendChild(t);
        select.appendChild(z);

        if (conditionForSelecting(arr[i])) {
            valueToSelect = iString;
        }
    }

    // Only set selection if valueToSelect is set
    if (valueToSelect !== null) {
       select.value = valueToSelect;
    }

    return select;
}

/**
 * Sets selection of dicitonaries for dictionaries combobox. Should all be associated
 * with the language selected in languages combobox.
 *
 * @param dictionaryOptions - dictionary objects to include in cobobox
 * @param currentDictInfo - data used to find dictionary initial selection,
 * assumed to be compatible with given dictionary_selection
 */
 export function makeDictionarySelection(dictionaryOptions: Dictionary[], currentDictInfo: DictionaryIdentifier|null) {
    const getDictName = (x: Dictionary) => x.name;
    const falseF = (x: Dictionary) => false;
    let select = createSelection('dictionaries', dictionaryOptions, getDictName, currentDictInfo, falseF);
    if (select !== null) {
        // Use current_dict_info to get default selection
        if (currentDictInfo !== null) {
            let valueToSelect = `${currentDictInfo.index}`;
            select.value = valueToSelect;
        } else if (select.childNodes.length > 0) { 
            // if there is anything to select, just choose the first one
            select.value = '0';
        }
    }
}

/**
 * Sets selection of languages for languages selection element. 
 * Sets initial value to that indicated by currentDictInfo only if said field is not null
 *
 * Assume same current_dict_info data used for both this function and
 * make_dictionary_selection at any point in time.
 *
 * @param languages - array of all languages stored in extensions for making dictionaries
 * @param currentDictInfo - data used to identify unique dictinoary
 */
export function makeLanguageSelection(languages: string[], currentDictInfo: DictionaryIdentifier|null): void {
    const extraCondition = (x: string) => currentDictInfo !== null && x === currentDictInfo.language
    const identityF = (x: string) => x;
    createSelection('languages', languages, identityF, currentDictInfo, extraCondition);
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
 * Function for initialising and setting up select elements for ids of langauges and 
 * dictionaries
 * 
 * @param langs collection of all languages currently supported in Dictionary 
 * @param dictInfo specific dictInfo to set as initial selection
 */
export function setUpDictsAndLangsElements(langs: string[], dictInfo: DictionaryIdentifier): void {
    // Get dictionaries from dictInfo info and initialize
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
}