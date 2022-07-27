import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { loadBannerHtml } from "./fetch-banner";


/**
 * Appends checkbox and non-styled link to url as an option under list-of-urls div.
 *
 * @param url url for which to make checkbox
 */
function addURLOption(url: string): void {
    const formElement = document.createElement('div');
    formElement.setAttribute('class', 'alt_form_element');

    const my_checkbox = document.createElement('input');
    my_checkbox.setAttribute('type', 'checkbox');
    my_checkbox.setAttribute('id', url);
    my_checkbox.setAttribute('name', url);
    formElement.append(my_checkbox);

    const label = document.createElement('div');
    label.setAttribute('href', url);
    label.setAttribute('target', '_blank');
    label.textContent = url;
    label.addEventListener('click', () => { // Open url in new tab (or window depending on client config)
        window.open(url, '_blank');
    });
    formElement.append(label);

    let listOfURLs = document.getElementById('list-of-urls') as HTMLElement;
    listOfURLs.appendChild(formElement);
}

/**
 * Querries non-volatile storage of add-on for all urls that have hilights and
 * presnets them in website with the option of either deleteing them, or opening the url
 */
function getSites() {
    const message: BSMessage = {
        messageType: BSMessageType.GetAllURLs,
        payload: null
    }
    chrome.runtime.sendMessage(message, (urls: string[]) => {
        urls.sort();
        for (let i = 0; i < urls.length; i++) {
            addURLOption(urls[i]);
        }
    });    
}


loadBannerHtml();
getSites();

// Delete all urls that were checked by user from non-volatile storage
(document.getElementById('delete-sites') as HTMLElement).addEventListener('click', () => {
    const checkBoxes = document.querySelectorAll('input[type=checkbox]:checked');
    for (let i = 0; i < checkBoxes.length; i++) {
        const url = checkBoxes[i].id;
        const removeMssg: BSMessage = {
            messageType: BSMessageType.DeletePageData,
            payload: {
                url
            }
        };
        chrome.runtime.sendMessage(removeMssg);
    }
    (document.getElementById('list-of-urls') as HTMLElement).innerHTML = '';
    getSites();
});

