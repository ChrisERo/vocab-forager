browser.contextMenus.create({
    id: "activation",
    title: get_current_activation() ? 'Deactivate': 'Activate',
    contexts: ["all"],
    icons: get_current_activation() ? {"16": "../icons/deactivation.svg"} : {"16": "../icons/activation.svg"}
  });
  browser.contextMenus.create({
    id: "separator-1",
    type: "separator",
    contexts: ["all"]
  });

function expose_delete_cm() {
    browser.contextMenus.create({
        id: "delete_hilight",
        title: 'Delete Hilight',
        contexts: ["all"],
        icons: {
            "16": "../icons/red_x.svg"
        }
      });
      browser.contextMenus.refresh();
}

function remove_delete_cm() {
    browser.contextMenus.remove('delete_hilight');
    // Don't Refresh so that menu remains while mouse goes towards it
}

/**
 * Changes contents of activation context menu depending on the value of is_activated,
 * If is_activated is true, give user option to deactivate addon, else, provide option to
 * activate addon
 *
 * @param {boolean} is_activated - Boolean representing whether addon is activated
 *                                 should reflect value in non-volatile memory
 */
function update_activation_context_menu(is_activated) {
    let context_menu_id = 'activation';
    if (is_activated) {
        browser.contextMenus.update(context_menu_id, {
            title: 'Deactivate',
            icons: {"16": "../icons/deactivation.svg"}
        });
    } else {
        browser.contextMenus.update(context_menu_id, {
            title: 'Activate',
            icons: {"16": "../icons/activation.svg"}
        });
    }
} 

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'activation') {
        let is_checked = get_current_activation();
        is_checked = !is_checked;
        set_current_activation(is_checked);
        update_activation_context_menu(is_checked);
        browser.contextMenus.refresh();

        // TODO: make this a utility and use in popul and listener
        let get_tabs = browser.tabs.query({});
        get_tabs.then(function (tabs) {
            // Send message to currently all tabs to update based on
            for (let tab of tabs) {
               browser.tabs.sendMessage(tab.id,{type: 'activation_from_pop',
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
    console.log(`REQUEST TO BACKGROUND MADE: ${request.type}`);
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
        update_activation_context_menu(request.is_activated);
        sendResponse();
    } else if (request.type === 'expose_delete_hilight') {
        expose_delete_cm();
        sendResponse();
    } else if (request.type === 'remove_delete_hilight') {
        remove_delete_cm()
        sendResponse();
    } else if (request.type === 'get_dictionary_from_info') {
        let data = get_dictionary_from_info(request.dict_info);
        sendResponse(data);
    } else if (request.type === 'edit_dict') {
        modify_existing_dictionary(request.dict_info, request.dict);
        sendResponse();
    } else if (request.type === 'delete_dict') {
        let result = delete_dict(request.dict_ref);
        sendResponse(result);
    } else {
        console.log(`CONTENT_REQUEST UNKNOWN: ${request.type}`);
    }
}

browser.runtime.onMessage.addListener(handler);
