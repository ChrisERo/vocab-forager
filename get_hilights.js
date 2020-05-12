
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

// TODO: change all code to use SQLite later and partition better

document.body.style.border = "5px solid red";
let local_vocabulario_data = localStorage.getItem('vocabulario_data');

if (local_vocabulario_data == null) {
    local_vocabulario_data = [];
}
else {
    local_vocabulario_data = JSON.parse(local_vocabulario_data)
    let i;
    for (i = 0; i < local_vocabulario_data.length; i++) {
        hilight_json_data(local_vocabulario_data[i]);
    }
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
    console.log(`GOT: ${JSON.stringify(data)}`);
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


function store_data(json_data) {
    local_vocabulario_data.push(json_data);
    let save_data = JSON.stringify(local_vocabulario_data);
    localStorage.setItem('vocabulario_data', save_data);
}

function log_selection() {
    let selected = window.getSelection();
    if (selected.toString() != '') {
        let json_data = selection_to_store_data(selected);
        store_data(json_data);
        hilight_json_data(json_data); // TODO: Replace with standard selection.getRangeAt(0) once done
    }
}

document.onmouseup = log_selection;  // set action up
