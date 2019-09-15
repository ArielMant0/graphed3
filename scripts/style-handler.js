/**
 * Class that handles custom styles for a layout
 */
class StyleHandler {

    constructor() {
        // Object storing style class settings which can be
        // accessed using the style classes name
        this._classes = {};
    }

    get classes() {
        return this._classes;
    }

    // Return whether there are custom style classes
    empty() {
        return Object.keys(this._classes).length === 0;
    }

    // Add a new class with name <name>
    add(name, styleClass) {
        this._classes[name] = styleClass;
    }

    // Remove the class with name <name>
    remove(name) {
        if (this._classes.name)
            this._classes[name] = undefined;
    }

    // Returns whether style class with name <name> exists
    has(name) {
        return this._classes[name] !== undefined;
    }

    // Get all style class names for node classes
    getNodeNames() {
        let result = [];
        Object.entries(this._classes).forEach(
            ([key, obj]) => {
                if (obj.isNode) result.push(key);
            }
        );
        return result;
    }

    // Get all style class names for edge classes
    getLinkNames() {
        let result = [];
        Object.entries(this._classes).forEach(
            ([key, obj]) => {
                if (!obj.isNode) result.push(key);
            }
        );
        return result;
    }

    // Get the SVG size attribute string and value for 
    // the style class with name <name>
    getSizeAttr(name) {
        if (!this._classes[name])
            throw 'style-handler.js - invalid style class';

        let result = [];
        switch(this._classes[name].shape) {
            case 'circle': result.push(['r', this._classes[name].sizex]); break;
            case 'ellipse':
                result.push(['rx', this._classes[name].sizex]);
                result.push(['ry', this._classes[name].sizey]);
                break;
            case 'rect':
                result.push(['width', this._classes[name].sizex]);
                result.push(['height', this._classes[name].sizey]);
                break;
            default: throw 'style-handler.js - invalid shape: '+this._classes[name].shape;
        }
        return result;
    }

    // Get the SVG positio attribute string and value for 
    // the style class with name <name>
    getPositionAttr(name) {
        if (!this._classes[name])
            throw 'style-handler.js - invalid style class';

        switch(this._classes[name].shape) {
            case 'circle':
            case 'ellipse': return ['cx', 'cy'];
            case 'rect': return ['x', 'y'];
            default: throw 'style-handler.js - invalid shape';
        }
        return result;
    }
}
