import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { Dictionary } from "../utils/models";
import { loadBannerHtml } from "./fetch-banner";


/**
 * Stores dictObj in non-volatile memory, associating it with language
 * 
 * @param dictObj - Object representation of a dictionary. 
 * @param language - language for which dict_object is for
 */
 function storeDict(dictObj: Dictionary, language: string) {
    const addDictMssg: BSMessage = {
        messageType: BSMessageType.AddNewDictionary,
        payload: {
            dict: dictObj,
            lang: language,
        }
    }
    chrome.runtime.sendMessage(addDictMssg);
}

/**
 * Modifies show-status element of webpage so that it communicates that
 * dictionary dictName has been saved successfully
 *
 * @param dictName - name of dictionary that has just been created
 */
 function displayDone(dictName: string): void {
    const content = `Saved Dictionary ${dictName}`;
    const showStatusDiv = document.getElementById('show-status') as HTMLElement;
    showStatusDiv.textContent = content;
    showStatusDiv.style.display = 'inherit';
}


loadBannerHtml();

// Listener for invoking store_dictionary with propper data
const submitButton = document.getElementById('submit') as HTMLElement;
submitButton.addEventListener("click", () => {
    const uriElement = document.getElementById('url') as HTMLInputElement
    const uri = decodeURI(uriElement.value);

    const nameElement = document.getElementById('name') as HTMLInputElement;
    const dictName = nameElement.value;
    const dictObj: Dictionary = {name: dictName, url: uri};
    
    const langaugeElement = document.getElementById('lang') as HTMLInputElement;
    const langauge = langaugeElement.value;
    storeDict(dictObj, langauge);
    displayDone(dictObj.name);
});
