# TODOs - featuring bugs and already implemented funtionalities

Gui prototype 2 using [D3](https://d3js.org) library.

### TODOs

Short list of TODOs not covered in the issues, so we dont forget.

- [ ] MCG format not quite correct
    - set up 'meta', 'graph', 'frames' distinction in some way (missing '{}' around primary object)


- [x] Automatic pause/play
    - [x] play/pause button
    - [x] play reverse?
    - [x] differentiate between steps and frames
    - [x] progress bar
- [x] Pareto-Front (scatter plot)
    - [x] 2D random data
    - [ ] 3D ?

#### Functionality

- [ ] translate rects a little, so the center is where the link starts/ends
- [ ] add file ids that are not the file names (for safety)
- [ ] incorporate directedness of edges
- [ ] circular layout: append to root, dont create anew every update (possible?)
- [ ] add offset to arrows so they can be seen properly

**Done**

- [x] add speed options for automatic playback
- [x] add zoom functionality
- [x] add edge styles (shapes, like arrows)
- [x] rotate reverse play icon
- [x] dont produce empty css custom style classes
- [x] improve frame efficiency
- [x] separate node and link style classes in settings
- [x] scan run directory on server start
- [x] how to deal with custom style classes for different layouts ?
- [x] figure out how to deal with stuff like changing shapes depending on the style class (somewhat)
- [x] add basic style classes (from file)
- [x] refresh data on layout switch
- [x] fix circular layout not positioning new nodes correctly
- [x] fix circular layout dying when adding links
- [x] make views assignable
- [x] make run files compatible with dsl specification
- [x] when nodes are deleted (and adjacent edges), we need to store the adding of those edges as inverse operations somehow
- [x] skip empty frames
- [x] make steps/frames return a success indicator to be able to skip *empty* frames
- [x] update **layout** class to be compatible with dsl specification
- [x] general update pattern: add/delete nodes

#### Bugs

- [ ] switching from circular -> force does not conserve graph state, other way around works though
- [ ] progress bar values get fucked up after multiple runs (when switching between forward and reverse)

**Done**

- [x] circular layout does weird progress things when doing *prev step*
- [x] why do we always have to call `simulation.restart()` for nodes to be in the right place?
- [x] `updateStyleClasses()` before and after `updateDefault()` ?
- [x] when reversing operations, shapes from style classes are not applied
- [x] prev step does not update progress bar
- [x] node size in force layout does not reset for custom style classes?
- [x] custom style for circular layout is buggy (example graph)
    - duplicate text nodes
- [x] edge width in force layout is not applied for custom style classes
- [x] deleting nodes in force layout produces an error
- [x] circular layout is empty on data reload
- [x] **IMPORTANT** current solution for style classes with different shapes and stuff kinda dies
- [x] shape/size style class properties only work properly the first time
    - must either call tick (not so nice, everything wobbles and inefficient - or update element position manually)
- [x] when doint **prev step** on nested step, frame counter gets fucked
- [x] error when switching data set and circle layout is selected
- [x] when going to the very last step, 'prevFrame' only goes to second, not first, frame
- [x] when reverse adding a node, somehow the node is not rendered but exists ?
- [x] when skipping empty steps somehow the frame/step-counter gets fucked up (i think), anyway, clicking through previous steps ends before reaching the first step

#### Not so important

- [ ] add config file to project
- [ ] particles as a visualization feature?
- [ ] sound

**Done**

- [x] rename main project .js file
- [x] nicer looking buttons (somewhat nicer)

### Open Questions

- [ ] Enforce text in circular layout?
- [ ] Do we want a command that sets complete graph data? (i used one, because i need it to reverse the 'R' command)
- [ ] Add a layout flag for the style classes? Then there can be different styles for each layout.
- [ ] Should there be an *unclass* operation (or should it be a *class* operations with an empty string)?
- [ ] What about labels when adding nodes or edges?
- [ ] Should custom callbacks be possible? (like what to do when hovering over a node)
    - **Answer**: Maybe, but not as important (right now).
- [ ] How much (of the layout) should be configurable, and in what way? (node/edge colors, node/edge display style like transparency and edge thickness)

**Done**

- [x] Should edges be removed automatically, and/or should the option be present to configure it that way?
    - **Answer**: Yes, adjacent edges should be removed automatically!
    - This requires dealing with *empty* steps, like deleting an edge that was already deleted beforehand!
- [x] What kind of metadata do we have/want?
    - Author
    - Title
    - Instance
    - ... etc. (still open)
