let vocabulario_data = []; // objects representing hilighted sections of current page
const HILIGHT_CLASS = 'vocabulario_hilighted'; // class of hilighted sections in html page
let previous_on_mouse_up = document.onmouseup; // action onmouseup before extension 
                                               //took effect
/**
 * Imports hilights.css, which contains styleing for elements of class HILIGHT_CLASS
 */
async function add_hilight_style_sheet() {
    // links don't work since href uses browser's current domain
    let hilight_style_sheet = document.createElement('style')
    hilight_style_sheet.innerHTML = "\
    .vocabulario_hilighted { \
        background-color: #ffff01; \
        display: inline;\
    } \
    .vocabulario_hilighted:hover {\
        border: 1.5px solid #6afff3;\
        cursor: pointer;\
    }";
    document.head.appendChild(hilight_style_sheet);
}

add_hilight_style_sheet(); // import style sheet

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
 * Uses currently-selected (default) dictionary to lookup word(s) in selected
 * 
 * @param {String} word - user-selected text in document
 * (assumed to be valid given current DOM)
 */
function lookup_word(word) { // TODO: move this to other content script after tab made
    if (word != '') {
        console.log(`lookingup: ${word}`);
        let get_url = browser.runtime.sendMessage({type: 'search_word_url', word: word});
        get_url.then(function (response) {
            let url = response;
            console.log(url);
            window.open(url, '_blank');
        });
    }
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
    surrounding_node.setAttribute('class', HILIGHT_CLASS);
    surrounding_node.addEventListener('click', function () {
        let word = this.textContent;
        lookup_word(word);

    })
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


let is_activated = false; // Stores last value of is_activated read by this script

/**
 * Querries data regarding vocabulary stored for current page and hilights specified
 * vocabulary
 */
function set_up_content() {
    let load_data_for_page = browser.runtime.sendMessage(
        {type: 'get_page_vocab', page: window.location.href });
    load_data_for_page.then(function (result) {
        vocabulario_data = result.data;
        let i;
        for (i = 0; i < vocabulario_data.length; i++) {
            hilight_json_data(vocabulario_data[i]);
            // TODO: make this a try-catch and test with Diccionario in italix dle.rae.es
        }

        // On Selection made, either hilight selected or lookup its text
        // Add this after promise completion to avoid "race condition" with new hilights
        previous_on_mouse_up = document.onmouseup;
        document.onmouseup = function () {
            let selected = window.getSelection();
            log_selection(selected);
        };
    },
    function (failReason) {
        alert('Data Failed to Load: ' + failReason); // Show failiure, for debugging
    });
}

/**
 * Removes hilights and their functinoality from page
 * NOTE that the css originally introduced is kept, but it should not do anything
 * ALSO: This does not revert the page back to its original DOM structure.
 * TODO: Consider removing css here also
 */
function tear_down_content() {
        let hilights = document.getElementsByClassName(HILIGHT_CLASS);
        // Move children (original) nodes to element's position
        while (hilights.length > 0) { // for loos don't work since elements removed
            // inspired heavily by
            // https://plainjs.com/javascript/manipulation/unwrap-a-dom-element-35/
            let element = hilights[0];
            let parent = element.parentNode;
            while (element.firstChild) {
                parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
        }

        // Undo onmouseup setup
        let temp = previous_on_mouse_up
        document.onmouseup = previous_on_mouse_up;
        previous_on_mouse_up = temp;
}

// Load data from memory and use to hilight things previously selected
let get_init_setup = browser.runtime.sendMessage({type: 'get_activation', page: window.location.href });
get_init_setup.then( function (result) {
    is_activated = result;
    if (is_activated) {
        set_up_content();
    }
});

// Listen for whether to activate or deactivate extension hilighting
browser.runtime.onMessage.addListener(request => {
    console.log('REQUEST MADE TO CONTENT');
    if (request.type == 'activation_form_pop') {
        let mssg = request.checked;
        if (!is_activated && mssg) {
            is_activated = mssg;
            location.reload(); // Can't call set_up_content: tear_down_content notes
        } else if (is_activated && !mssg) {
            is_activated = mssg;
            tear_down_content();
        }
    } else {
        console.log('CONTENT_REQUEST UNKNOWN');
        console.log(`CONTENT_REQUEST ${request.type}`);
    }
  });
