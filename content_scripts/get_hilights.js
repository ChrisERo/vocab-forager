let vocabulario_data = []; // objects representing hilighted sections of current page
const HILIGHT_CLASS = 'vocabulario_hilighted'; // class of hilighted sections in html page

let storage_counter = 0; // used fore local storage purposes

/**
 * Gets node alluded to by node_path in html document
 * 
 * Assumes node_path represents a valid node in the document's DOM
 * 
 * @param {Array} node_path  - Array of integers where each element [i] represents the 
 * index of a node in the parent node [i+1], with the last element being a child node of
 * the body element.
 */
function node_path_to_node(node_path) {
    let node = document.body;
    for (i=node_path.length-1; i >= 0; i--) {
        node = node.childNodes[node_path[i]];
    }
    return node;
}

/**
 * Takes object representing hilighted section and returns Range of that selection.
 * 
 * Assumes store_data represents valid selection (has correct range data) in html page
 * 
 * @param {Object} store_data - object representing selection, seeselection_to_store_data
 * for object specifications
 */
function store_data_to_range(store_data) {
    let range = document.createRange();
    range.setStart(node_path_to_node(store_data.startNodePath), store_data.startOffset);
    range.setEnd(node_path_to_node(store_data.endNodePath), store_data.endOffset);
    return range;
}

/**
 * Given a representation of user-selected text, wrap selection around
 * div tags with style for hilighting
 * 
 * @param {Object} json_data - object representing selection
 */
function hilight_json_data(json_data) {
    let range = store_data_to_range(json_data); 
    let surrounding_node = document.createElement('div');
    surrounding_node.setAttribute("id", `word_${storage_counter}`);
    storage_counter += 1;
    surrounding_node.setAttribute('style', 'background-color: #ffff01; display: inline;');
    surrounding_node.setAttribute('class', HILIGHT_CLASS);
    range.surroundContents(surrounding_node);
}


/**
 * Given a Node, returns a list of integers representing the path from the Body node
 * to node, see node_path_to_node() for more details
 * 
 * @param {Node} node Node in document's DOM
 */
function storeNode(node) {
    let node_child_indecies = []; // indecies of elements in parents' child array, 
                                  // with last element being child of root
    let current_node = node;
    let root_node = document.body;
    while (current_node != root_node) {
        let parent_node = current_node.parentNode;

        // Get index of current_node in list of parent
        let current_node_index = null;
        for (i = 0; i < parent_node.childNodes.length; i++) {
            if (parent_node.childNodes[i] === current_node) {
                current_node_index = i;
                break;
            }
        }

        node_child_indecies.push(current_node_index);
        current_node = parent_node;
    }

   return node_child_indecies;
}

/**
 * Takes selection and converts to a Javascript Object that can be
 * Easily stored.
 * 
 * @param {Selection} selection - user-selected text in document
 */
function selection_to_store_data(selection) {
    let word = selection.toString();
    let range = selection.getRangeAt(0);
    let data = {
        'word': word, // Useless for now, but will be good for quiz implementation
        'startOffset': range.startOffset,
        'endOffset': range.endOffset,
        'startNodePath': storeNode(range.startContainer),
        'endNodePath': storeNode(range.endContainer) 
    };
    console.log(`ATTEMPT: ${JSON.stringify(data)}`);
    return data;
}

/**
 * Given selection, stores hilight in non-volatile storage and hilights text, wrapping
 * it in a div with css class HILIGHT_CLASS
 * 
 * @param {Selection} selected - user-selected text in document 
 * (assumed to be valid given current DOM)
 */
function log_selection(selected) {
    if (selected.toString() != '') {
        let json_data = selection_to_store_data(selected);

        vocabulario_data.push(json_data);
        let save_data = browser.runtime.sendMessage({type: 'store_data', data: vocabulario_data, page:  window.location.href});
        save_data.then(function (result) {
            hilight_json_data(json_data);
        },
        function (failReason) {
            alert('Data Failed to Save: ' + failReason);
            local_vocabulario_data.pop()
        });
    }
}

/**
 * Uses currently-selected (default) dictionary to lookup word(s) in selected
 * 
 * @param {Selection} selected - user-selected text in document 
 * (assumed to be valid given current DOM)
 */
function lookup_selection(selected) { // TODO: move this to other content script after tab made
    let word = selected.toString();
    if (word != '') {
        console.log(`lookingup: ${word}`);
        let get_url = browser.runtime.sendMessage({type: 'search_word_url', word: word});
        get_url.then(function (response) {
            let url = response;
            console.log(url)
            window.open(url, '_blank');
        });
    }
}

// Load data from memory and use to hilight things previously selected
let load_data_for_page = browser.runtime.sendMessage({type: 'get_page_vocab', page: window.location.href });
load_data_for_page.then(function (result) {
    vocabulario_data = result.data;
    let i;
    for (i = 0; i < vocabulario_data.length; i++) {
        hilight_json_data(vocabulario_data[i]); 
        // TODO: make this a try-catch and test with Diccionario in italix dle.rae.es
    }

    // On Selection made, either hilight selected or lookup its text
    // Add this after promise completion to avoid "race condition" with new hilights
    document.onmouseup = function () {
        let selected = window.getSelection();   
        if (false) { // TODO: Develop this while making context menu
            lookup_selection(selected);
        } else {
            log_selection(selected);
        }
    };
},
function (failReason) {
    alert('Data Failed to Load: ' + failReason); // Show failiure, for debugging
});
