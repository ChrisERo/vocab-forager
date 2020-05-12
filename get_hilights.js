document.body.style.border = "5px solid red";

function storeNode(node) {
    let ups = []; // indecies of elements in parents' child array, with last element being child of root
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

        ups.push(current_node_index);
        current_node = parent_node;
    }
    console.log(JSON.stringify(ups)) // TODO: return this to store in localStorage

}

function log_selection() {
    let selected = window.getSelection();
    if (selected.toString() != '') {
        let rangee = selected.getRangeAt(0);
        storeNode(rangee.startContainer);
        console.log(`SELECTED: ${selected.toString()}, ${JSON.stringify(rangee)}`);

        // after simulated retreival from non-volatile storage
        let surrounding_node = document.createElement('div');
        surrounding_node.setAttribute("id", "my_id");
        surrounding_node.setAttribute('style', 'background-color: #ffff01; display: inline;')
        rangee.surroundContents(surrounding_node);
    }
}

document.onmouseup = log_selection;  // set action up

