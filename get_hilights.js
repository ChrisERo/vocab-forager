document.body.style.border = "5px solid red";

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

function log_selection() {
    let selected = window.getSelection();
    if (selected.toString() != '') {
        let store_data = selection_to_store_data(selected);
        // MOCK STORAGE and RETREIVAL
        let range = store_data_to_range(store_data);

        // after simulated retreival from non-volatile storage
        let surrounding_node = document.createElement('div');
        surrounding_node.setAttribute("id", "my_id");
        surrounding_node.setAttribute('style', 'background-color: #ffff01; display: inline;')
        range.surroundContents(surrounding_node);
    }
}

document.onmouseup = log_selection;  // set action up
