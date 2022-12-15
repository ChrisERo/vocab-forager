import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { loadBannerHtml } from "./fetch-banner";


const DOMAIN_LIST_ELEMENT = document.getElementById('list-of-domains') as HTMLElement;
const URL_LIST_ELEMENT =  document.getElementById('list-of-urls') as HTMLElement;

const DELETE_BUTTON = document.getElementById('delete-sites') as HTMLElement;
const REFRESH_DOMAIN_BUTTON = document.getElementById('domains-button') as HTMLElement;

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

    URL_LIST_ELEMENT.appendChild(formElement);
}

/**
 * Queries non-volatile storage of add-on for all urls with specified domain that have 
 * highlights and presents them in website with the option of either deleting them, or opening the url
 */
function getSites(domain: string): void {
    const message: BSMessage = {
        messageType: BSMessageType.GetURLSOfDomain,
        payload: {schemeAndHost: domain}
    }
    chrome.runtime.sendMessage(message, (urls: string[]) => {
        urls.sort();
        for (let i = 0; i < urls.length; i++) {
            addURLOption(urls[i]);
        }
    });    
}

/**
 * Appends checkbox and non-styled link to url as an option under list-of-urls div.
 *
 * @param url url for which to make checkbox
 */
function addDomainOption(domain: string): void {
    const formElement = document.createElement('div');
    formElement.setAttribute('class', 'alt_form_element');

    const label = document.createElement('div');
    label.textContent = domain;
    label.addEventListener('click', () => { // Clear domains list and populate url list
        DELETE_BUTTON.style.display = 'block';
        REFRESH_DOMAIN_BUTTON.style.display = 'block';
        DOMAIN_LIST_ELEMENT.innerHTML = '';
        getSites(domain);
    });

    formElement.append(label);
    DOMAIN_LIST_ELEMENT.appendChild(formElement);
}

function getDomains() {
    const message: BSMessage = {
        messageType: BSMessageType.GetAllDomains,
        payload: null
    }
    chrome.runtime.sendMessage(message, (domains: string[]) => {
        domains.sort();
        for (let i = 0; i < domains.length; i++) {
            addDomainOption(domains[i]);
        }
    });    
}

function refreshPageWithDomains() {
    URL_LIST_ELEMENT.innerHTML = '';
    DELETE_BUTTON.style.display = 'none';
    REFRESH_DOMAIN_BUTTON.style.display = 'none';
    getDomains();
}


loadBannerHtml();
refreshPageWithDomains();

// Delete all urls that were checked by user from non-volatile storage
DELETE_BUTTON.addEventListener('click', () => {
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
   
    refreshPageWithDomains();
});

// Delete all urls that were checked by user from non-volatile storage
REFRESH_DOMAIN_BUTTON.addEventListener('click', refreshPageWithDomains);

