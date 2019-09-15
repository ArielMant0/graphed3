/**
 * Class that stores inverse graph/layout operations
 * divided into frames in a array that operates like a stack.
 *
 * The last frame is always the array in the last slot of the array
 */
class CommandStack {

    constructor() {
        this.reset();
    }

    // Get number of frames
    get frames() {
        return this._stack.length;
    }

    // Get number of steps in current frame
    get steps() {
        return this._stack[this._stack.length-1].length;
    }

    // Clear the stack
    reset() {
        this._stack = [];
    }

    // Mark current frame as finished by pushing a new empty array
    setNextFrame() {
        this._stack.push([]);
    }

    // Returns whether the stack is empty
    isEmpty() {
        return this._stack.length === 0;
    }

    // Push a new step onto the stack (may be nested)
    push(op, params) {
        if (!op) {
            // Nested step, so there are several steps (as arrays) stored in params
            this._stack[this._stack.length-1].push(params);
        } else {
            // Normal step made up of the operator and parameters
            this._stack[this._stack.length-1].push([op, params]);
        }
    }

    // Pop the last step from the stack
    popStep() {
        // TODO: throw exception again (when all commands are implemented)
        if (this.isEmpty()) {
            console.log('command-stack.js - pop (step) on empty stack');
            return;
        }

        let index = this._stack.length-1;
        // we dont need to check if index is 0, isEmpty() already does that
        if (this._stack[index].length === 0) {
            this._stack.pop();
            return;// this.popStep();
        }

        let elem = this._stack[index].pop();
        if (this._stack[index].length === 0) {
            this._stack.pop();
        }
        return elem;
    }

    // Pop the last frame from the stack
    popFrame() {
        // TODO: throw exception again (when all commands are implemented)
        if (this.isEmpty()) {
            console.log('command-stack.js - pop (frame) on empty stack');
            return;
        }

        // If current frame is empty
        if (this._stack[this._stack.length-1].length === 0) {
            this._stack.pop();
            return ;//this.popFrame();
        }

        // TODO: maybe without reversing ?
        return this._stack.pop().reverse();
    }
}
