/**
 * Takes list of objects representing all hilighted text in page
 * and saves them in extension's localStorage.
 * 
 * @param {Array} json_data - list of JSON objects representing all
 *  hilighted sections of a webpage
 * @param {String} page - page corresponding to data from json_data
 */
function store_data(json_data, page) {
    let save_data = JSON.stringify(json_data);
    window.localStorage.setItem(page, save_data);
    console.log(`Data Stored: ${save_data}`);
}

/**
 * Given the url to a website, returns the list of objects representing
 * hilights logged for said site 
 * 
 * @param {String} site - url of a website
 */
function get_page_vocab(site) {
    console.log('Made it in ehre');
    let page_vocab =  window.localStorage.getItem(site);
    if (page_vocab == null) {
        return [];
    } else {
        return JSON.parse(page_vocab);
    }
}
