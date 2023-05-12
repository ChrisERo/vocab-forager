import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { SeeSiteData, SiteData } from "../utils/models";
import { loadBannerHtml } from "./fetch-banner";
import {setUpEditPage as setUpEditPageMode} from "./edit-site-data";


const DOMAIN_LIST_ELEMENT = document.getElementById('domains') as HTMLDataListElement;
const LABEL_LIST_ELEMENT = document.getElementById('labels') as HTMLDataListElement;
const URL_LIST_ELEMENT =  document.getElementById('list-of-urls') as HTMLElement;

const SEARCH = document.getElementById('search') as HTMLElement;
const DELETE_BUTTON = document.getElementById('delete-sites') as HTMLElement;
const REFRESH_PAGE_BUTTON = document.getElementById('domains-button') as HTMLElement;
const MODIFY_SITE_DATA_BUTTON = document.getElementById('mod-site-data-button') as HTMLElement;

const DOMAIN_INPUT = document.getElementById('domain-input') as HTMLInputElement;
const LABEL_INPUT = document.getElementById('label-input') as HTMLInputElement;


/**
 * Appends checkbox and non-styled link to url as an option under list-of-urls div.
 *
 * @param data SeeSiteData used to create html element next to checkbox
 */
function addURLOption(data: SeeSiteData): void {
    const formElement = document.createElement('div');
    formElement.setAttribute('class', 'alt_form_element');

    const my_checkbox = document.createElement('input');
    my_checkbox.setAttribute('type', 'checkbox');
    my_checkbox.setAttribute('id', data.url);
    my_checkbox.setAttribute('name', data.url);
    formElement.append(my_checkbox);

    const label = document.createElement('a');
    label.setAttribute('href', data.url);
    label.setAttribute('target', '_blank');
    label.textContent = data.title === undefined ? data.url : data.title;
    formElement.append(label);

    URL_LIST_ELEMENT.appendChild(formElement);
}

/**
 * Queries non-volatile storage of add-on for all SiteData per request provided by
 * background script for specific request passed in.
 * presents them in web-app with the option of either deleting them, editting them, or
 * opening the url.
 */
function getSites(message: BSMessage): void {
    chrome.runtime.sendMessage(message, (data: SeeSiteData[]) => {
        data.sort((a, b) => {
            const titleA = a.title === undefined ? a.url : a.title;
            const titleB = b.title === undefined ? b.url : b.title;
            return titleA.localeCompare(titleB);
        });

        for (let i = 0; i < data.length; i++) {
            addURLOption(data[i]);
        }
    });
}

function getSiteSearchInput(): BSMessage {
    if (DOMAIN_INPUT.value.length > 0) {
        const domain = DOMAIN_INPUT.value;
        return {
            messageType: BSMessageType.GetSeeSiteData,
            payload: {schemeAndHost: domain}
        };
    } else if (LABEL_INPUT.value.length > 0) {
        const label = LABEL_INPUT.value;
        return {
            messageType: BSMessageType.GetURLsForLabel,
            payload: {label}
        };
    } else {
        throw 'No search source is activated!';
    }
}

/**
 * Adds option element to HTML element list used for searching for sites in extension:
 * e.g. domain and labels.
 *
 * @param grouping text for which to create a "searchable" option
 * @param dataListElement element list in which we plan to append the new option
 */
function addDomainOption(grouping: string, dataListElement: HTMLDataListElement): void {
    const option = document.createElement('option');
    option.textContent = grouping;
    option.setAttribute('value', grouping);
    dataListElement.appendChild(option);
}

function selectOption() {
    DELETE_BUTTON.style.display = 'inline-block';
    REFRESH_PAGE_BUTTON.style.display = 'inline-block';
    MODIFY_SITE_DATA_BUTTON.style.display = 'inline-block';
    SEARCH.style.display = 'none';

    const message = getSiteSearchInput();
    getSites(message);
}


/**
 * Generic function for populating a specific datalist element with all relevant options
 * stored in extension
 *
 * @param messageType type of request to send background script to collect data
 * @param listElement datalist element in which to add options
 */
function getSpecificGroupingClass(messageType: BSMessageType, listElement: HTMLDataListElement) {
    const message: BSMessage = {
        messageType: messageType,
        payload: null
    }
    chrome.runtime.sendMessage(message, (searchKeys: string[]) => {
        searchKeys.sort();
        for (let i = 0; i < searchKeys.length; i++) {
            addDomainOption(searchKeys[i], listElement);
        }
    });

}

function setUpPageInit() {
    URL_LIST_ELEMENT.innerHTML = '';
    DELETE_BUTTON.style.display = 'none';
    REFRESH_PAGE_BUTTON.style.display = 'none';
    MODIFY_SITE_DATA_BUTTON.style.display = 'none';
    SEARCH.style.display = 'in-block';
    clearEditPageData();

    getSpecificGroupingClass(BSMessageType.GetAllDomains, DOMAIN_LIST_ELEMENT);
    getSpecificGroupingClass(BSMessageType.GetAllLabels, LABEL_LIST_ELEMENT);
}


/**
 * Start executing JavaScript/TypeScript code for page
 */

loadBannerHtml();
setUpPageInit();

// Add Event Listeners to clear out unneeded search results
DOMAIN_INPUT.addEventListener('focus', (event) => {
    LABEL_INPUT.value = '';
});
LABEL_INPUT.addEventListener('focus', (event) => {
    DOMAIN_INPUT.value = '';
});

// Use search input to query specific data
SEARCH.addEventListener('click', selectOption);

// Delete all urls that were checked by user from non-volatile storage
DELETE_BUTTON.addEventListener('click', () => {
    const checkBoxes = document.querySelectorAll('input[type=checkbox]:checked');
    for (let i = 0; i < checkBoxes.length; i++) {
        const url = checkBoxes[i].id;
        const removeMsg: BSMessage = {
            messageType: BSMessageType.DeletePageData,
            payload: {
                url
            }
        };
        chrome.runtime.sendMessage(removeMsg);
    }

    setUpPageInit();
});

MODIFY_SITE_DATA_BUTTON.addEventListener('click', () => {
    const checkBoxes = document.querySelectorAll('input[type=checkbox]:checked');
    if (checkBoxes.length !== 1) {
        const errMsg = `Multiple boxes have been checked ${checkBoxes.length}`;
        console.error(errMsg);
    }
    const url = checkBoxes[0].id;
    const request = {
        messageType: BSMessageType.GetPageData,
        url: url,
    };
    const pageData: Promise<SiteData> = chrome.runtime.sendMessage(request);
    request.messageType = BSMessageType.GetLabelsForSite;
    const labelData: Promise<string[]> = chrome.runtime.sendMessage(request);

    // Disable buttons from search sites as move towards specific site page
    DELETE_BUTTON.style.display = 'none';
    REFRESH_PAGE_BUTTON.style.display = 'none';
    MODIFY_SITE_DATA_BUTTON.style.display = 'none';

    setUpEditPageMode(url, pageData, labelData, setUpPageInit);
})

// Delete all urls that were checked by user from non-volatile storage
REFRESH_PAGE_BUTTON.addEventListener('click', setUpPageInit);
function clearEditPageData() {
    throw new Error("Function not implemented.");
}

