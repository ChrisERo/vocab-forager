// TODO: Have class use IndexedDB
function store_data(json_data, page) {
    let save_data = JSON.stringify(json_data);
    window.localStorage.setItem(page, save_data);
    console.log(`Data Stored: ${save_data}`);
}

function get_page_vocab(site) {
    console.log('Made it in ehre');
    let page_vocab =  window.localStorage.getItem(site);
    if (page_vocab == null) {
        return [];
    } else {
        return JSON.parse(page_vocab);
    }
}
