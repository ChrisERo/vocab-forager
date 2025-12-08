import browser from 'webextension-polyfill';
import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { loadBannerHtml } from "./fetch-banner";
import { addNavToButton } from "./utils";

function saveData(data: any) {
    const link = document.createElement('a');
    const dataBlob = new Blob([JSON.stringify(data, null, 4)], {type : 'application/json'});
    const url = window.URL.createObjectURL(dataBlob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'vocabForagerData.json' );
    link.click();
    link.remove();

}

loadBannerHtml();
addNavToButton('new-dict');
addNavToButton('edit-dict');
addNavToButton('see-sites');

const importPath = document.getElementById('import-data-path') as HTMLInputElement;
importPath.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;    
    const files = target.files;
    const reader = new FileReader();
    reader.addEventListener('load', (e) => {
        const data = JSON.parse(reader.result as string);
        const message: BSMessage = {
            messageType: BSMessageType.LoadExtensionData,
            payload: {
                data: data
            }
        };
        browser.runtime.sendMessage(message);
        importPath.value = '';

    });

    if (files !== null) {
        reader.readAsText(files[0]);
    }
});

document.getElementById('import-data')?.addEventListener('click', () => {
    document.getElementById('import-data-path')?.click();
});

document.getElementById('export-data')?.addEventListener('click', () => {
    const message: BSMessage = {
        messageType: BSMessageType.GetAllExtensionData,
        payload: null
    };
    browser.runtime.sendMessage(message).then(saveData);
});
