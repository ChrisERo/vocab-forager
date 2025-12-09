import browser from 'webextension-polyfill';

/**
 * Add listener for click events on existing element with id pageName that navigates to
 * html page file whose name is pageName.
 * 
 * @param pageName name of page to make link to
 */
 export function addNavToButton(pageName: string): void {
    const htmle = document.getElementById(pageName) as HTMLElement;
    const url = browser.runtime.getURL(`web_pages/${pageName}.html`);
    htmle.addEventListener("click", () => {
        browser.tabs.create({ url });
    });
}

/**
 * Sets input HTML element with id as elemID with
 *  value.
 * @param elemID id of input element to modify
 * @param value value to place in element with id as elemID
 */
 export function setInputElementDefaultValue(elemID: string, value: string): void {
    const elem = document.getElementById(elemID) as HTMLInputElement;
    elem.value = value;
}