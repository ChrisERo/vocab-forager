browser.contextMenus.create({
    id: "activation",
    title: get_current_activation() ? 'Deactivate': 'Activate',
    contexts: ["all"]
    // TODO: Add Icon when Ready
  });

function expose_delete_cm() {
    browser.contextMenus.create({
        id: "delete_hilight",
        title: 'Delete Hilight',
        contexts: ["all"]
        // TODO: Add Icon when Ready
      });
      browser.contextMenus.refresh();
}

function remove_delete_cm() {
    browser.contextMenus.remove('delete_hilight');
    // Don't Refresh so that menu remains while mouse goes towards it
}


  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'activation') {
        let is_checked = get_current_activation();
        is_checked = !is_checked;
        set_current_activation(is_checked);

        browser.contextMenus.update(info.menuItemId, {
            title: is_checked ? 'Deactivate': 'Activate'
        });
        browser.contextMenus.refresh();

        // TODO: make this a utility and use in popul and listener
        let get_tabs = browser.tabs.query({});
        get_tabs.then(function (tabs) {
            // Send message to currently all tabs to update based on
            for (let tab of tabs) {
               browser.tabs.sendMessage(tab.id,{type: 'activation_form_pop',
               checked: is_checked})
            }
        });
    } else if (info.menuItemId === 'delete_hilight') {
        browser.tabs.sendMessage(tab.id,{type: 'delete_chosen'});
    }
  });

/**
 * Listens for calls to functions from any of the 
 * background scripts and executes them.
 * 
 * Using a listener per background script caused errors, in particular
 * when loading popup menu for the first time.
 */

function handler(request, sender, sendResponse) {
    console.log('REQUEST MADE');
    if (request.type == "get_dictionaries_from_langauge") {
        sendResponse(get_dictionaries_from_langauge(request.language));
    } else if (request.type == "get_current_dictionary_info") {
        sendResponse(get_current_dictionary_info());
    } else if (request.type == "get_languages") {
        sendResponse(get_languages());
    } else if (request.type == "set_current_dictionary") {
        set_current_dictionary(request.language, request.index);
        sendResponse();
    } else if (request.type == "search_word_url") {
        sendResponse(search_word_url(request.word));
    } else if (request.type == "store_data") {
        store_data(request.data, request.page);
        sendResponse({}); // Needed for "synchronus" behavior

    } else if (request.type == "get_page_vocab") {
        let vocab = get_page_vocab(request.page);
        sendResponse({data: vocab});
    } else if (request.type == 'get_activation') {
        let result = get_current_activation();
        sendResponse(result);
    } else if (request.type == 'activation_changed') {
        set_current_activation(request.is_activated);
        sendResponse();
    } else if (request.type === 'expose_delete_hilight') {
        expose_delete_cm();
        sendResponse();
    } else if (request.type === 'remove_delete_hilight') {
        remove_delete_cm()
        sendResponse();
    } else {
        console.log('REQUEST NOT SATISIFED');
        console.log(JSON.stringify(request));
    }
}

browser.runtime.onMessage.addListener(handler);
