import { loadBannerHtml } from "./fetch-banner";

/**
 * Add listener for click events on existing element with id pageName that navigates to
 * html page file whose name is pageName.
 * 
 * @param pageName name of page to make link to
 */
function addNavToButton(pageName: string): void {
    const htmle = document.getElementById(pageName) as HTMLElement;
    htmle.addEventListener("click", () => {
        window.location.href = `${pageName}.html`;
    });
}

loadBannerHtml();
addNavToButton('new_dict');
addNavToButton('edit_dict');
addNavToButton('see_sites')
