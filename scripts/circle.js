/**
 * Class representing a circular layout (VIEW)
 */
class CircleLayout extends Layout {

    constructor(svg, data, runID, settings) {
        super(svg, data, runID);

        this.diameter = Math.min(this._width, this._height);
        this.radius = this.diameter / 2;
        this.innerRadius = this.radius - 120;

        // style class and shape names
        this._className = "circular";

        this.defaultSettings();
        if (settings && settings[this._className]) {
            this.customSettings(settings[this._className]);
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // Settings
    ///////////////////////////////////////////////////////////////////////////

    // Get default value for setting <name>
    default(name, isNode=true) {
        if (isNode) {
            switch(name) {
                case 'shape': return 'text';
                case 'size':
                case 'sizex':
                case 'sizey':
                default: break;
            }
        } else {
            switch(name) {
                case 'shape': return 'path';
                default: break;
            }
        }
    }

    // Set default settings values
    defaultSettings() {
        this.nodeShape = this.default('shape');
        this.linkShape = this.default('shape', false);
    }

    // Add default event listener for a single node
    defaultEventListenerNode(elem) {
        this.onNodeEventSingle(elem, "mouseover", this.mouseOver)
        this.onNodeEventSingle(elem, "mouseout", this.mouseOut)
    }

    ///////////////////////////////////////////////////////////////////////////
    // Drawing
    ///////////////////////////////////////////////////////////////////////////

    // Draw (initial) graph
    draw() {
        let zoom = d3.zoom()
            .scaleExtent([-1, 5])
            .on("zoom", this.zoomView.bind(this));

        this._svg = this._svg.call(zoom);

        this.clusters = d3.cluster()
            .size([360, this.innerRadius]);

        this.line = d3.radialLine()
            .curve(d3.curveBundle.beta(0.5))
            .radius(function(d) { return d.y; })
            .angle(function(d) { return d.x / 180 * Math.PI; });

        let stuff = this._svg.append("g")
            .attr("transform", "translate(" + this._width/2 + "," + this._height/2 + ")")
            .attr("width", this._width)
            .attr("height", this._height);

        this.groupLink = stuff.append("g");
        this.groupNode = stuff.append("g");

        this.update();
    }

    // Update layout visualization given data in this._data
    update() {
        this.graphHierarchy();

        this.root.sort(function(a, b) { return a.data.id - b.data.id; });
        this.clusters(this.root);

        this.cleanStyleClasses();
        this.updateDefault();
        this.updateStyleClasses();

        this.nodes = this.groupNode.selectAll(this.getClassString('nodes'));
        this.links = this.groupLink.selectAll(this.getClassString('links'));
    }

    // Update all nodes and links in the default style class
    updateDefault() {
        let addListener = this.defaultEventListenerNode.bind(this);

        let selection = this.root.descendants(); //.slice(1); TODO
        this.nodes = this.groupNode.selectAll(this.nodeShape+'.'+this.nodeClass);
        this.nodes = this.nodes.data(selection.filter(this.selector.bind(this)), this.key);
        this.nodes.exit().remove();
        this.nodes = this.nodes.enter()
            .append(this.nodeShape)
                .attr("class", this._runID+' '+this._className+" "+this.nodeClass)
                .attr("dy", "0.31em")
                .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
                .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
                .text(function(d) { if (d.data.id >= 0) return d.data.id; }) // TODO: revert ot label?
                .each(function(d) { addListener(d3.select(this)); })
            .merge(this.nodes)
                .attr('data-class', function(d) { return d.data.styleClass; });

        this.links = this.groupLink.selectAll(this.linkShape+'.'+this.linkClass);
        this.links = this.links.data(this.neighbours(selection).filter(this.selector.bind(this)), this.key);
        this.links.exit().remove();
        this.links = this.links.enter()
            .append(this.linkShape)
                .attr("class", this._runID+' '+this._className+" "+this.linkClass)
                .attr("d", this.line)
            .merge(this.links)
                .attr('data-class', function(d) { return d.styleClass; });
    }

    // Not actually needed yet, because everything can be set via CSS
    updateStyleClasses() {
        if (this._styleHandler.empty())
            return;

        let addListener = this.defaultEventListenerNode.bind(this);

        function handleStyleClass(list) {
            let name = list[0];
            let obj = list[1];

            let addListener = this.defaultEventListenerNode.bind(this);

            if (obj.isNode) {
                let selection = this.root.leaves().filter(function(d) { return d.data.styleClass === name; });
                let tmpNodes = this.groupNode.selectAll(obj.shape+'.'+name);
                tmpNodes = tmpNodes.data(selection, this.key);
                tmpNodes.exit().remove();
                tmpNodes.enter()
                    .append(obj.shape)
                        .attr("class", this._runID+' '+this._className+' '+this.nodeClass+' '+name)
                        .attr("dy", "0.31em")
                        .attr('data-class', name)
                        .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
                        .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
                        .text(function(d) { if (d.data.id >= 0) return d.data.id; }) // TODO: revert ot label?
                        .each(function(d) { addListener(d3.select(this)); })
                    .merge(tmpNodes);
            } else {
                let selection = this.neighbours(this.root.leaves()).filter(function(d) { return d.styleClass === name; });
                let tmpLinks = this.groupLink.selectAll(obj.shape+'.'+name);
                tmpLinks = tmpLinks.data(selection, this.key);
                tmpLinks.exit().remove();
                tmpLinks.enter()
                    .append(obj.shape)
                        .attr('data-class', name)
                        .attr("class", this._runID+' '+this._className+' '+this.linkClass+' '+name)
                        .attr("d", this.line)
                    .merge(tmpLinks);
            }
        }
        Object.entries(this._styleHandler.classes).forEach(handleStyleClass.bind(this));
    }

    cleanStyleClasses() {
        if (this._styleHandler.empty())
            return;

        function handleStyleClass(list) {
            let name = list[0];
            let obj = list[1];

            if (obj.isNode) {
                let selection = this._data.nodes.filter(function(d) { return d.styleClass === name; });
                let tmpNodes = this.groupNode.selectAll(obj.shape+'.'+name);
                tmpNodes = tmpNodes.data(selection, this.key);
                tmpNodes.exit().remove();
            } else {
                let selection = this._data.links.filter(function(d) { return d.styleClass === name; });
                let tmpLinks = this.groupLink.selectAll(obj.shape+'.'+name);
                tmpLinks = tmpLinks.data(selection, this.key);
                tmpLinks.exit().remove();
            }
        }
        Object.entries(this._styleHandler.classes).forEach(handleStyleClass.bind(this));
    }

    ///////////////////////////////////////////////////////////////////////////
    // Modify data
    ///////////////////////////////////////////////////////////////////////////

    // Change a node attribute (e.g. class, value, id, ...)
    setNodeAttr(nodeID, attrName, attrValue) {
        this.nodes
            .filter(function(n) { return n.data.id === nodeID; })
            .attr(attrName, attrValue);
    }

    // Change a link attribute (e.g. class, value, id, ...)
    setLinkAttr(linkID, attrName, attrValue) {
        this.links
            .filter(function(l, i) { return l.data.id === linkID; })
            .attr(attrName, attrValue);
    }

    ///////////////////////////////////////////////////////////////////////////
    // Event callbacks
    ///////////////////////////////////////////////////////////////////////////

    // Set a callback for node text values
    nodeText(callback) {
        if (this.nodeShape !== "text")
            throw "circle.js: cannot set text of non-text svg element";

        this.nodes
            .text(callback.bind(this));
    }

    ///////////////////////////////////////////////////////////////////////////
    // Data Preprocessing
    ///////////////////////////////////////////////////////////////////////////

    // Lazily construct the graph hierarchy from class names.
    graphHierarchy() {
        this.root = d3.hierarchy({ id: -1, label: "root", value: -1, children: this._data.nodes });
    }

    // Return a list of imports for the given array of nodes.
    neighbours(nodes) {
        let map = {},
            imports = [];

        // Compute a map from id to node
        nodes.forEach(function(d, i) {
            map[d.data.id] = d;
        });

        // For each node, construct a link from the source to target
        this._data.links.forEach(function(elem, i) {
            let p = map[elem.source].path(map[elem.target]);
            p.styleClass = elem.styleClass;
            imports.push(p);
        });

        return imports;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Default callbacks for events
    ///////////////////////////////////////////////////////////////////////////

    zoomView() {
        this.groupNode.attr("transform", d3.event.transform);
        this.groupLink.attr("transform", d3.event.transform);
    }

    mouseOver(d) {
        this.links
            .classed("link--target", function(l) { return l[0].data.id === d.data.id || l[2].data.id === d.data.id; });

        this.nodes
            .classed("node--source", function(n) { return n.data.id === d.data.id; });
    }

    mouseOut(d) {
        this.links
            .classed("link--target", false)

        this.nodes
            .classed("node--source", false);
    }

    ///////////////////////////////////////////////////////////////////////////
    // Utility
    ///////////////////////////////////////////////////////////////////////////

    selector(d) {
        if (!d.data)
            return super.selector(d);
        return d.data.styleClass === undefined || d.data.styleClass === '' || !this._styleHandler.has(d.data.styleClass);
    }
}
