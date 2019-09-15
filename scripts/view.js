/**
 * Controller part of the MVC
 *
 * Holds the data (MODEL) in <this._data> and the layout (VIEW)
 * in <this._layout>. This class acts as the manager for stepping
 * through the algorithm, 
 */
class DataView {

    constructor(index, svg, layout, data, runID) {
        this._index = index;
        this._svg = svg;
        this._frames = data.frames;
        this._meta = data.meta;
        this._inverse = new CommandStack();
        this._isPlaying = false;
        this._stepwise = false;
        this._reverse = false;
        this._playSpeed = 800;

        this.setLayout(layout, data.data, data.settings ? data.settings[1] : undefined, runID);

        this._frameIndex = -1;
        this._stepIndex = -1;
        this._stepCount = 0;
        this.countMaxSteps();
        this._blocked = false;
        // Update progress bar counts
        updateProgressBar(this._index, this._stepCount, this._maxSteps);
    }

    get name() {
        return this._meta.filename;
    }

    get isPlaying() {
        return this._isPlaying;
    }

    set stepWise(val) {
        this._stepwise = val;
    }

    set reverse(val) {
        this._reverse = val;
    }

    get reverse() {
        this._reverse;
    }

    set speed(val) {
        this._playSpeed = val;
    }

    get speed() {
        return this._playSpeed;
    }

    // Count the number of steps in all frames
    countMaxSteps() {
        this._maxSteps = 0;
        for (let frame of this._frames) {
            this._maxSteps += frame.length;
        }
    }

    // Set a new layout according to <layout>(String) and refresh the model using <data>
    updateLayout(layout, data) {
        this.setLayout(layout, data.data, data.settings ? data.settings[1] : undefined, this._meta.filename);
        this.draw();

        // Redo all frames before current frame
        for (let i = 0; i < this._frameIndex; ++i) {
            this._layout.doFrame(this._frames[i]);
        }
        // Redo all steps of current frame
        for (let i = 0; i < this._stepIndex; ++i) {
            let step = this._frames[this._frameIndex][i];
            if (Array.isArray(step[0])) {
                this._layout.doFrame(step);
            } else {
                this._layout.doStep(step[0], step[1]);
            }
        }
        // Update layout
        this._layout.update();
    }

    // Kill particle interval and stop automatic playthrough
    kill() {
        this._layout.kill();
        this.pause();
    }

    // Called when changing the layout for a run
    // Constructs the new layout according to <layout> and
    // refreshes the model using <data>
    setLayout(layout, data, settings, runID) {
        // Refresh data
        this._data = new GraphData(data);
        // Construct new layout
        switch(layout) {
            case 'force':
                this._layout = new ForceLayout(this._svg, this._data, runID, settings);
                if (this._meta.particles) this._layout.enableParticles();
                break;
            case 'circle': this._layout = new CircleLayout(this._svg, this._data, runID, settings); break;
            case 'scatter': this._layout = new ScatterPlot(this._svg, this._data, runID, settings); break;
            default: throw 'view.js - invalid layout for view';
        }
    }

    // Pause automatic playthrough
    pause() {
        if (this._reverse)
            togglePlayReverse(true, this._index);
        else
            togglePlay(true, this._index);

        this._isPlaying = false;
        if (this._interval) {
            clearTimeout(this._interval);
            this._interval = undefined;
        }
    }

    // Start automatic playthrough
    play() {
        this._isPlaying = true;
        if (this._reverse) {
            togglePlayReverse(false, this._index);
            if (this._stepwise)
                this._interval = setTimeout(this.prevStepCallback.bind(this), 500);
            else
                this._interval = setTimeout(this.prevFrameCallback.bind(this), 500);
        } else {
            togglePlay(false, this._index);
            if (this._stepwise)
                this._interval = setTimeout(this.nextStepCallback.bind(this), 500);
            else
                this._interval = setTimeout(this.nextFrameCallback.bind(this), 500);
        }
    }

    // Callback for automatic playthrough of steps (reverse)
    prevStepCallback() {
        playAudio(this._index);
        this.prevStep();
        if (!this._interval)
            return;
        this._interval = setTimeout(this.prevStepCallback.bind(this), this._playSpeed);
    }

     // Callback for automatic playthrough of frames (reverse)
    prevFrameCallback() {
        playAudio(this._index);
        this.prevFrame();
        if (!this._interval)
            return;
        this._interval = setTimeout(this.prevFrameCallback.bind(this), this._playSpeed);
    }

     // Callback for automatic playthrough of steps (forward)
    nextStepCallback() {
        playAudio(this._index);
        this.doStep();
        if (!this._interval)
            return;
        this._interval = setTimeout(this.nextStepCallback.bind(this), this._playSpeed);
    }

     // Callback for automatic playthrough of frames (forward)
    nextFrameCallback() {
        playAudio(this._index);
        this.doFrame();
        if (!this._interval)
            return;
        this._interval = setTimeout(this.nextFrameCallback.bind(this), this._playSpeed);
    }

    // Draw the graph
    draw() {
        this._layout.draw();
    }

    // Reset playthrough
    reset(graph) {
        this.pause();
        this._reverse = false;
        this._frameIndex = -1;
        this._stepIndex = -1;
        this._stepCount = 0;
        this._data.nodes = graph.nodes;
        this._data.links = graph.links;
        this._inverse.reset();
        updateProgressBar(this._index, this._stepCount, this._maxSteps);
    }

    // Apply the next frame
    doFrame() {
        this.setNextFrame();
        // If we reached the last step of the last frame, do nothing
        if (!this.hasFrame()) {
            if (!this.hasStep())
                return this.pause();
        }

        let frame = this._frames[this._frameIndex].slice(this._stepIndex);
        let success = this._layout.doFrame(frame, this._inverse);

        this._stepIndex = this._frames[this._frameIndex].length;
        // If somehow our frame did not do anything (empty steps), do the next frame
        if (!success) {
            this.doFrame()
        } else {
            this._stepCount += frame.length;
            this._layout.update();
            updateProgressBar(this._index, this._stepCount, this._maxSteps);
        }
    }

    // Apply the next step
    doStep() {
        this.setNextStep();
        // If we reached the last step of the last frame, do nothing
        if (!this.hasStep() && !this.hasFrame()) {
            return this.pause();
        }

        let success;
        let step = this._frames[this._frameIndex][this._stepIndex];
        if (Array.isArray(step[0])) {
            success = this._layout.doFrame(step, this._inverse);
        } else {
            success = this._layout.doStep(step[0], step[1], this._inverse);
        }

        if (!success) {
            this.doStep();
        } else {
            this._layout.update();
            this._stepCount++;
            updateProgressBar(this._index, this._stepCount, this._maxSteps);
        }
    }

    // Apply the previous frame
    prevFrame() {
        let before = this._stepIndex > 0 && this.hasStep() ? this._stepIndex+1 : 0;
        if (this._frameIndex <= 0 && this._stepIndex < 0) {
            this._frameIndex = -1;
            return this.pause();
        }
        this.setPreviousFrame();

        let frame = this._inverse.popFrame();
        if (frame === undefined) {
            if (this.hasFrame()) 
                this._stepCount -= this._frames[this._frameIndex].length-before;
            return;
        }
        let success = this._layout.doFrame(frame);

        // If the frame was empty, reverse another frame
        if (!success) {
            this.prevFrame();
        } else {
            this._layout.update();
            this._stepCount -= this._frames[this._frameIndex].length-before;
            updateProgressBar(this._index, this._stepCount, this._maxSteps);
        }

        if (this._frameIndex >= 0) {
            this._frameIndex--;
            if (this._frameIndex >= 0)
                this._stepIndex = this._frames[this._frameIndex].length;
        }
    }

    // Apply the previous step
    prevStep() {
        if (this._stepIndex < 0 && this._frameIndex < 0) {
            return this.pause();
        }
        this.setPreviousStep();

        let success;
        let step = this._inverse.popStep();
        if (step === undefined) {
            if (this._stepCount > 0)
                updateProgressBar(this._index, --this._stepCount, this._maxSteps);
            return;
        }
        // If we have a nested step, treat it like a frame
        if (Array.isArray(step[0])) {
            success = this._layout.doFrame(step);
        } else {
            success = this._layout.doStep(step[0], step[1]);
        }

        // If the frame was empty, reverse another step
        if (!success) {
            this.prevStep();
        } else {
            this._layout.update();
            this._stepCount--;
            updateProgressBar(this._index, this._stepCount, this._maxSteps);
        }
    }

    // Returns wether the current <frameIndex> is valid
    hasFrame() {
        return this._frameIndex < this._frames.length;
    }

    // Returns wether the current <frameIndex> is valid
    hasStep() {
        return this.hasFrame() ? (this._frameIndex < 0 || this._stepIndex < this._frames[this._frameIndex].length) : false;
    }

    // Set to next frame if possible
    setNextFrame() {
        if (!this.hasStep() && !this.hasFrame()) {
            return;
        }
        if (this._stepIndex == -1 || !this.hasStep()) {
            this._frameIndex++;
            this._stepIndex = 0;
        }
        if (this._frameIndex < this._frames.length) {
            this._inverse.setNextFrame();
        }
    }

    // Set to next step if possible
    setNextStep() {
        this._stepIndex++;
        if (!this.hasStep()) {
            if (!this.hasFrame())
                return;
            return this.setNextFrame();
        }
        if (this._frameIndex < 0) {
            this._stepIndex = -1;
            return this.setNextFrame();
        }
    }

    // Set to previous frame if possible
    setPreviousFrame() {
        if (!this.hasFrame() || this._frameIndex >= 0 && this._stepIndex < 0) {
            this._frameIndex--;
        }
        this._stepIndex = -1;
    }

    // Set to previous step if possible
    setPreviousStep() {
        this._stepIndex--;
        if (this._stepIndex < 0) {
            this._frameIndex--;
            if (this._frameIndex >= 0)
                this._stepIndex = this._frames[this._frameIndex].length-1;
        }
    }
}

/**
 * Class that holds all graph data (MODEL)
 */
class GraphData {

    constructor(data) {
        this._nodes = data.nodes;
        this._links = data.links;
        this.initNodeMap();
        this.initLinkMap();
    }

    // Construct node map (id -> index in node array) from node data
    initNodeMap() {
        this._nodeMap = {};
        for (let i = 0; i < this._nodes.length; ++i) {
            this._nodeMap[this._nodes[i].id] = i;
        }
    }

    // Construct edge map (id -> index in edge array) from edge data
    initLinkMap() {
        this._linkMap = {};
        for (let i = 0; i < this._links.length; ++i) {
            this._linkMap[this._links[i].id] = i;
        }
    }

    // Returns whether there are nodes in the graph
    hasNodes() {
        return this._nodes.length > 0;
    }

    // Returns whether there are edges in the graph
    hasLinks() {
        return this._links.length > 0;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Settings
    ///////////////////////////////////////////////////////////////////////////

    set nodes(nodes) {
        this._nodes = nodes;
        this.initNodeMap();
    }

    set links(links) {
        this._links = links;
        this.initLinkMap();
    }

    // Clear all data
    clear() {
        this._nodes = [];
        this._nodeMap = {};
        this._links = [];
        this._linkMap = {};
    }

    // Set node <id> value to <value>
    setNodeValue(id, value) {
        let n = this.node(id);
        if (n) n.value = value;
    }

    // Set edge <id> value to <value>
    setLinkValue(id, value) {
        let l = this.link(id);
        if (l) l.value = value;
    }

    // Set node <id> style class to <className>
    setNodeClass(id, className) {
        let n = this.node(id);
        if (n) n.styleClass = className;
    }

    // Set edge <id> style class to <className>
    setLinkClass(id, className) {
        let l = this.link(id);
        if (l) l.styleClass = className;
    }

    // Set edge <id> direction to <direction>
    setLinkDirection(id, direction) {
        let l = this.link(id);
        if (l) l.direction = direction;
    }

    // TODO: do i still need this? (doubt)
    // Set node <id> coordinates (x,y) to <x> and <y>
    setNodeCoords(id, x, y) {
        let n = this.node(id);
        if (n) {
            n.x = x;
            n.y = y;
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // Getter
    ///////////////////////////////////////////////////////////////////////////

    // Get node array (careful)
    get nodes() {
        return this._nodes;
    }

    // Get links array (careful)
    get links() {
        return this._links;
    }

    // Get the node <id>
    node(id) {
        let index = this._nodeMap[id];
        if (index != undefined)
            return this._nodes[index];
    }

    // Get the edge <id>
    link(id) {
        let index = this._linkMap[id];
        if (index != undefined)
            return this._links[index];
    }

    // Get the style class of node <id>
    getNodeClass(id) {
        let n = this.node(id);
        if (n && n.styleClass) {
            let s = n.styleClass.lastIndexOf('-');
            return n.styleClass.slice(0, s);
        }
    }

    // Get the style class of edge <id>
    getLinkClass(id) {
        let n = this.link(id);
        if (n && n.styleClass) {
            let s = n.styleClass.lastIndexOf('-');
            return n.styleClass.slice(0, s);
        }
    }

    // Get direction for edge <id>
    getLinkDirection(id) {
        let l = this.link(id);
        if (l) return l.direction;
    }


    ///////////////////////////////////////////////////////////////////////////
    // Add/Remove nodes and edges
    ///////////////////////////////////////////////////////////////////////////

    // Add a new node
    pushNode(node) {
        this._nodes.push(node);
        this._nodeMap[node.id] = this._nodes.length-1;
    }

    // Add a new edge
    pushLink(link) {
        this._links.push(link);
        this._linkMap[link.id] = this._links.length-1;
    }

    // Remove node with <id>
    removeNode(id) {
        let idx = this._nodeMap[id];
        if (idx) {
            this._nodes.splice(idx, 1);
            for (let i = idx; i < this._nodes.length; ++i) {
                this._nodeMap[this._nodes[i].id] = i;
            }
            return true;
        }
        return false;
    }

    // Remove edge with <id>
    removeLink(id) {
        let idx = this._linkMap[id];
        if (idx >= 0) {
            this._links.splice(idx, 1);
            for (let i = idx; i < this._links.length; ++i) {
                this._linkMap[this._links[i].id] = i;
            }
            return true;
        }
        return false;
    }

    // Remove all edges satisfying boolean function <func>
    removeLinks(func) {
        this._links = this.links.filter(func);
        // Reconstruct edge map
        this.initLinkMap();
    }

    // Remove all ndoes satisfying boolean function <func>
    removeNodes(func) {
        this._nodes = this._nodes.filter(func);
        // Reconstruct node map
        this.initNodeMap();
    }
}
