let vocabulario_data = [];
document.body.style.border = "5px solid red"; // TODO: Delete once code finalized, currently use to make sure things are workign

// Initialization code for testing memory retreival'
let storage_counter = 0; // used fore local storage purposes
function hilight_json_data(json_data) {
    let range = store_data_to_range(json_data); 
    let surrounding_node = document.createElement('div');
    surrounding_node.setAttribute("id", `word_${storage_counter}`);
    storage_counter += 1;
    surrounding_node.setAttribute('style', 'background-color: #ffff01; display: inline;')
    range.surroundContents(surrounding_node);
}

function storeNode(node) {
    let node_child_indecies = []; // indecies of elements in parents' child array, with last element being child of root
    let current_node = node;
    let root_node = document.body; // TODO: Fill this in
    while (current_node != root_node) {
        let parent_node = current_node.parentNode;

        // get index of current_node in list of parent
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

   return node_child_indecies; // TODO: return this to store in localStorage

}

function selection_to_store_data(selection) {
    let word = selection.toString();
    let range = selection.getRangeAt(0);
    let data = {
        'word': word, // TODO: Useless for now, but maybe try to use for check later
        'startOffset': range.startOffset,
        'endOffset': range.endOffset,
        'startNodePath': storeNode(range.startContainer),
        'endNodePath': storeNode(range.endContainer) 
    };
    console.log(`ATTEMPT: ${JSON.stringify(data)}`);
    return data;
}

function node_path_to_node(node_path) {
    let node = document.body;
    for (i=node_path.length-1; i >= 0; i--) {
        node = node.childNodes[node_path[i]];
    }
    return node;
}

function store_data_to_range(store_data) {
    let range = document.createRange();
    range.setStart(node_path_to_node(store_data.startNodePath), store_data.startOffset);
    range.setEnd(node_path_to_node(store_data.endNodePath), store_data.endOffset);
    return range;
}

function log_selection() {
    let selected = window.getSelection();
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

// Load data from memory and use to hilight things previously selected

let load_data_for_page = browser.runtime.sendMessage({type: 'get_page_vocab', page: window.location.href });
load_data_for_page.then(function (result) {
    vocabulario_data = result.data;
    console.log(`RECEIVED: ${JSON.stringify(vocabulario_data)}`);
    console.log(result)
    let i;
    for (i = 0; i < vocabulario_data.length; i++) {
        hilight_json_data(vocabulario_data[i]); // TODO: make this a try-catch and test with Diccionario in italix dle.rae.es
    }

    document.onmouseup = log_selection; // add this after promise completion to avoid "race condition" when making new hilights
},
function (failReason) {
    alert('Data Failed to Load: ' + failReason);
    document.onmouseup = log_selection;
});
