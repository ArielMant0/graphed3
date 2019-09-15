/**
 * Basic layout class (VIEW)
 *
 * Must implement update in subclass
 */ 
class Layout {

    constructor(svg, data, runID) {
        this._svgID = svg;
        this._svg = d3.select(svg);
        this._data = data;
        this._runID = runID;
        
        this.nodeClass = "default-node";
        this.linkClass = "default-link";

        this._width = $(svg).width();
        this._height = $(svg).height();

        this._styleHandler = new StyleHandler();
    }

    set svg(svg) {
        this._svg = svg;
        this._svgID = svg.attr('id');
    }

    set data(data) {
        this._data = data;
    }

    // Stops the particle system
    kill() {
        if (this.inter) {
            clearInterval(this.inter);
        }
    }

    // Set custom settings values
    customSettings(settings) {
        if (settings.nodes) {
            Object.entries(settings.nodes).forEach(
                ([key, value]) => {
                    if (key === 'nodeDefault') {
                        this.nodeShape = value.shape ? value.shape : this.default('shape');
                        this.nodeX = value.sizex ? value.sizex : this.default('sizex');
                        this.nodeY = value.sizey ? value.sizey : this.default('sizey');
                        if (value.size)
                            this.nodeX = value.size;
                    } else {
                        if (!value.shape) value.shape = this.default('shape');
                        if (!value.sizex) value.sizex = this.default('sizex');
                        value.isNode = true;
                        this._styleHandler.add(key+'-node', value);
                    }
                }
            );
        }
        if (settings.edges) {
            Object.entries(settings.edges).forEach(
                ([key, value]) => {
                    if (key === 'edgeDefault') {
                        this.linkShape = value.shape ? value.shape : this.default('shape', false);
                        this.linkSize = value.size ? value.size : this.default('size', false);
                    } else {
                        if (!value.shape) value.shape = this.default('shape', false);
                        if (!value.size) value.size = this.default('size', false);
                        value.isNode = false;
                        this._styleHandler.add(key+'-link', value);
                    }
                }
            );
        }
        // TODO: shadows etc.
    }

    // Add svg definition of an arrow head
    addArrowDefs() {
        this._svg.append("defs").selectAll("marker")
            .data(["arrow-head"])      // Different link/path types can be defined here
            .enter().append("marker")    // This section adds in the arrows
                .attr("id", String)
                .attr("viewBox", "0 0 12 12")
                .attr("refX", 6)
                .attr("refY", 6)
                .attr("markerWidth", 4)
                .attr("markerHeight", 4)
                .attr("orient", "auto")
            .append("path")
                .attr("d", "M2,2 L10,6 L2,10 L6,6 L2,2");
    }

    ///////////////////////////////////////////////////////////////////////////
    // Getters for data
    ///////////////////////////////////////////////////////////////////////////

    // Get node with <id> (wrapped so it can be overloaded)
    getNode(id) {
        return this._data.node(id);
    }

    // Get edge with <id> (wrapped so it can be overloaded)
    getLink(id) {
        return this._data.link(id);
    }

    // Get node style class with <id> (wrapped so it can be overloaded)
    getNodeClass(id) {
        return this._data.getNodeClass(id);
    }

    // Get edge style class with <id> (wrapped so it can be overloaded)
    getLinkClass(id) {
        return this._data.getLinkClass(id);
    }

    // Get link direction with <id> (wrapped so it can be overloaded)
    getLinkDirection(id) {
        return this._data.getLinkDirection(id);
    }

    // Set ID as key for data in layouts
    key(d) {
        return d.id;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Modify data
    ///////////////////////////////////////////////////////////////////////////

    // Remove graph nodes and edges
    clearGraph() {
        this._data.clear();
    }

    // Set graph nodes and edges
    loadGraph(nodes, links) {
        this._data.nodes = nodes;
        this._data.links = links;
    }

    // Add a new node
    addNode(id, value=1, label="no label", className=undefined) {
        this._data.pushNode({ "id": id, "value": value, "label": label });
        if (className)
            this._data.setNodeClass(id, className);
    }

    // Add a new edge
    addLink(id, source, target, value=1, direction=0, label="no label", className=undefined) {
        if (Array.isArray(value) && value.length === 0) {
            value = 1;
        }
        this._data.pushLink({ "id": id, "source": source, "target": target, "value": value, "label": label });
        if (className)
            this._data.setLinkClass(id, className);
    }

    // Remove node with <id>
    deleteNode(id) {
        this.removeAdjacentLinks(id);
        this._data.removeNode(id);
    }

    // Remove edge with <id>
    deleteLink(id) {
        this._data.removeLink(id);
    }

    // Set node <id> value
    setNodeValue(id, value) {
        this._data.setNodeValue(id, value);
    }

    // Set edge <id> value
    setLinkValue(id, value) {
        this._data.setLinkValue(id, value);
    }

    // Set node style class
    setNodeClass(id, className) {
        this._data.setNodeClass(id, className);
    }

    // Set edge style class
    setLinkClass(id, className) {
        this._data.setLinkClass(id, className);
    }

    // Set edge direction
    setLinkDirection(id, direction) {
        this._data.setLinkDirection(id, direction);
    }

    // Get all incident edges for node with ID <id>
    // TODO: rename method to be accurate (getIncidentLinks)
    getAdjacentLinks(id) {
        return this._data.links.filter(function(d) { return d.source === id || d.target === id; });
    }

    // Remove all links incident to node with ID <id>
    // TODO: rename method to be accurate (removeIncidentLinks)
    removeAdjacentLinks(id) {
        this._data.removeLinks(function(d) { return d.source !== id && d.target !== id; });
    }

    ///////////////////////////////////////////////////////////////////////////
    // Event callbacks
    ///////////////////////////////////////////////////////////////////////////

    // Add event listener for nodes
    onNodeEvent(name, callback) {
        this.nodes.on(name, callback.bind(this));
    }

    // Add event listener for edges
    onLinkEvent(name, callback) {
        this.links.on(name, callback.bind(this));
    }

    // Add a callback for a single node
    onNodeEventSingle(node, name, callback) {
        node.on(name, callback.bind(this));
    }

    // Add a callback for a single edge
    onLinkEventSingle(link, name, callback) {
        link.on(name, callback.bind(this));
    }

    // Add a drag callback for all nodes
    nodeDrag(start, drag, end) {
        this.nodes
            .call(d3.drag()
                .on("start", start.bind(this))
                .on("drag", drag.bind(this))
                .on("end", end.bind(this)));
    }

    // Add a drag callback for a single node
    nodeDragSingle(node, start, drag, end) {
        node.call(d3.drag()
                .on("start", start.bind(this))
                .on("drag", drag.bind(this))
                .on("end", end.bind(this)));
    }

    // Add a drag callback for edges
    linkDrag(start, drag, end) {
        this.links
            .call(d3.drag()
                .on("start", start.bind(this))
                .on("drag", drag.bind(this))
                .on("end", end.bind(this)));
    }

    ///////////////////////////////////////////////////////////////////////////
    // Apply steps and frames
    ///////////////////////////////////////////////////////////////////////////

    // Applies frame 'frame' which is a list of steps
    doFrame(frame, inverse=undefined) {
        let success = false;
        for (let i = 0; i < frame.length; ++i) {
            if (Array.isArray(frame[i][0])) {
                success = this.doFrame(frame[i], inverse) || success;
            } else {
                success = this.doStep(frame[i][0], frame[i][1], inverse) || success;
            }
        }
        return success;
    }

    // Applies step made up of operand 'op' and the list of parameters 'params'
    doStep(op, params, inverse=undefined) {
        let inv, opInv = op;
        switch (op) {
            // Set/Unset item class
            case 'nc':
                let nc = params.length == 1 ? '' : params[1]+'-node';
                if (inverse) {
                    let nodeClass = this.getNodeClass(params[0]);
                    if (nodeClass) {
                        inv = [params[0], nodeClass];
                    } else {
                        inv = [params[0], ""];
                    }
                }
                this.setNodeClass(params[0], nc); break;
            case 'ec':
                let ec = params.length == 1 ? '' : params[1]+'-link';
                if (inverse) {
                    let linkClass = this.getLinkClass(params[0]);
                    if (linkClass) {
                        inv = [params[0], linkClass];
                    } else {
                        inv = [params[0], ""];
                    }
                }
                this.setLinkClass(params[0], ec); break;
            // Set item value
            case 'nw':
                if (inverse) {
                    inv = [params[0], this.getNode(params[0]).value];
                }
                this.setNodeValue(params[0], params[1]); break;
            case 'ew':
                if (inverse) {
                    inv = [params[0], this.getLink(params[0]).value];
                }
                this.setLinkValue(params[0], params[1]); break;
            // Add item
            case 'n':
                this.addNode(...params)
                if (inverse) {
                    opInv = 'N';
                    inv = [params[0]];
                } break;
            case 'e':
                this.addLink(...params)
                if (inverse) {
                    opInv = 'E';
                    inv = [params[0]];
                } break;
            // Remove item
            case 'N':
                if (inverse) {
                    let node = this.getNode(params[0]);
                    if (!node) {
                        return false;
                    }
                    opInv = undefined;
                    // node id, node label, node value, string indicating custom style class or empty string
                    inv = [['n', [node.id, node.value, node.label, node.styleClass]]];
                    let adj = this.getAdjacentLinks(node.id);
                    for (let link of adj) {
                        inv.push(['e', [link.id, link.source, link.target, link.value, 0, link.label, link.styleClass]])
                    }
                }
                this.deleteNode(params[0]); break;
            case 'E':
                if (inverse) {
                    let link = this.getLink(params[0]);
                    if (!link) {
                        return false;
                    }
                    opInv = 'e';
                    // edge id, edge source, edge target, edge label, edge value, string indicating custom style class or empty string
                    inv = [link.id, link.source, link.target, link.value, 0, link.label, link.styleClass];
                }
                this.deleteLink(params[0]); break;
            // Clear and set complete graph
            case 'R':
                if (inverse) {
                    opInv = 'G';
                    inv = [this._data.nodes, this._data.links];
                }
                this.clearGraph(); break;
            case 'G':
                if (inverse) {
                    op = 'R';
                }
                this.loadGraph(...params); break;
            case 'nl':
                if (inverse) {
                    inv = [params[0], this.getNode(params[0]).label]
                }
                this.setNodeLabel(params[0], params[1]); break;
            case 'el':
                if (inverse) {
                    inv = [params[0], this.getLink(params[0]).label]
                }
                this.setLinkLabel(params[0], params[1]); break;
            // Edge Direction
            case 'ed':
                if (inverse) {
                    inv = [params[0], this.getLinkDirection(params[0])];
                }
                this.setLinkDirection(params[0], params[1]); break;
            case 'et':
                let dir = this.getLinkDirection(params[0]);
                if (inverse) {
                    inv = [params[0], dir];
                }
                this.setLinkDirection(params[0], 1-dir); break;
            // Comments
            case 'c': case 'cs': case 'ch':
                if (window.debug) console.log('comment operation'); return true;
            // Solution Stuff
            case 's': case 'S':
                if (window.debug) console.log('solution operation'); return true;
            // Node Information
            case 'na': case 'nae': case 'nan': case 'nas': case 'nA':
                if (window.debug) console.log('node info operation'); return true;
            // Edge Information
            case 'ea': case 'eae': case 'ean': case 'eas': case 'eA':
                if (window.debug) console.log('node info operation'); return true;
            // If we don't know the operation, simply dont do anything and return true as 'success'
            default: console.log('sorry, i dont know operation \'', op, '\' (yet)'); return true;
        }
        if (inverse)
            inverse.push(opInv, inv);
        return true;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Utility
    ///////////////////////////////////////////////////////////////////////////

    // Calculate the sum of all values in d, wich can be a single value or an array,
    // but the result is always at least 1 (used for link width, which can't be 0)
    static sumValue(d) {
        let itemVal = d;
        if (Array.isArray(d)) {
            itemVal += d.reduce((acc, val) => acc + val, 0);
        }
        return Math.max(1,itemVal);
    }

    // Filter nodes and link regarding their style class (avoids redundant filtering in update)
    filterItems () {
        let list = { default: { nodes: [], links: [] }, nodes: {}, links: {} };
        for (let n of this._data.nodes) {
            if (this.selector(n)) {
                list.default.nodes.push(n);
            } else {
                if (!list.nodes[n.styleClass]) {
                    list.nodes[n.styleClass] = [n];
                } else {
                    list.nodes[n.styleClass].push(n);
                }
            }
        }
        for (let l of this._data.links) {
            if (this.selector(l)) {
                list.default.links.push(l);
            } else {
                if (!list.links[l.styleClass]) {
                    list.links[l.styleClass] = [l];
                } else {
                    list.links[l.styleClass].push(l);
                }
            }
        }
        return list;
    }

    // TODO: Might not be needed anymore
    selector(d) {
        return d.styleClass === undefined || d.styleClass === '' || !this._styleHandler.has(d.styleClass);
    }

    // Get a string that selects all elements/nodes/edges of the layout
    getClassString(filter) {
        switch (filter) {
            case 'all': return '.'+this._runID+'.'+this._className;
            case 'nodes': {
                let str = '.'+this._runID+'.'+this._className+'.'+this.nodeClass;
                for (let name of this._styleHandler.getNodeNames()) {
                    str += ', .'+this._runID+'.'+this._className+'.'+name;
                }
                return str;
            } break;
            case 'links': {
                let str = '.'+this._runID+'.'+this._className+'.'+this.linkClass;
                for (let name of this._styleHandler.getLinkNames()) {
                    str += ', .'+this._runID+'.'+this._className+'.'+name;
                }
                return str;
            } break;
            default: console.log('layout.js - invalid class filter'); return '';
        }
    }

    // Get SVG size attributes for <shape>
    getSizeAttr(shape) {
        let result = []
        switch(shape) {
            case 'circle': result.push(['r', this.nodeX]);
            case 'ellipse':
                result.push(['rx', this.nodeX]);
                result.push(['ry', this.nodeY]);
                break;
            case 'rect':
                result.push(['width', this.nodeX]);
                result.push(['height', this.nodeY]);
                break;
            default: throw 'layout.js - unsupported node shape';
        }
        return result;
    }

    // Get SVG x-position attribute for <shape>
    getNodeX(shape) {
        switch(shape) {
            case 'circle': case 'ellipse': return 'cx';
            case 'rect': return 'x';
            default: throw 'layout.js - unsupported node shape';
        }
    }

    // Get SVG y-position attribute for <shape>
    getNodeY(shape) {
        switch(shape) {
            case 'circle': case 'ellipse': return 'cy';
            case 'rect': return 'y';
            default: throw 'layout.js - unsupported node shape';
        }
    }
}
