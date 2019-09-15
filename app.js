let express = require('express');
let fs      = require('fs');
let morgan  = require('morgan');
let app     = express();

// TODO: put default into config and parse args
let runDir = __dirname + '/runs';
let runStyleDir = __dirname + '/runs/styles'

// TODO: scan run directory for files
let runList = [];
fs.readdir(runDir, function(err, files) {
    if (err) {
        return console.log('error occured while scanning run directory');
    }
    files.forEach(function(file) {
        let stats = fs.statSync(runDir + '/' + file);
        if (stats.isFile()) {
            let raw = fs.readFileSync(runDir + '/' + file);
            let content = JSON.parse(raw);
            let endIndex = file.lastIndexOf('.');
            runList.push({ "name": content.meta.title, "file": file.substring(0,endIndex) });
        }
    });
});

// Store the number of views currently rendered
let viewCount;

app.use(morgan('dev'));
app.use('/public',express.static(__dirname + '/styles'));
app.use('/public',express.static(__dirname + '/scripts'));

app.set('views', __dirname + '/views');
app.engine('pug', require('pug').__express);

// Home
app.get('/', function (req, res) {
    res.render('proto.pug');
});

// List available runs
app.get('/runs', function(req, res) {
    res.render('run-list.pug', { runs: runList, count: viewCount });
});

// Show run view
app.get('/runs/:viewID([\\w-]+)', function(req, res) {
    switch(req.params.viewID) {
        case 'd-view': viewCount = 2; break;
        case 'q-view': viewCount = 4; break;
        default: viewCount = 1; break;
    }
    res.render('data-view.pug', { count: viewCount });
});

// Load selected run data - :runID(\w+)
app.get('/runs/:runID([\\w-]+)/dsl', function(req, res) {
    let run = loadRunData(req.params.runID);
    res.json({ meta: run.meta, data: run.graph, frames: run.frames, settings: run.settings });
});

app.get('/runs/:runID([\\w-]+)/refresh', function(req, res) {
    let run = loadRunData(req.params.runID, false);
    res.json({ data: run.graph });
});

// Start server
app.listen(8080, function () {
    console.log('Listening on port 8080!');
});

// Load data for a specific run - TODO: parse DSL
function loadRunData(runID, loadSettings=true) {
    let contents = fs.readFileSync(runDir + '/' + runID + '.mcg');
    let run = JSON.parse(contents);
    // Save file name in meta, so we can access it for the data reload in client
    run.meta.filename = runID;

    // Get style filename
    let styleFile = run.meta.style;
    if (styleFile && loadSettings) {
        // Parse style settings
        contents = fs.readFileSync(runStyleDir + '/' + styleFile + ".json");
        let style = JSON.parse(contents);

        // Generate css (where possible)
        let settings = {};
        let css = '';
        // Nodes
        if (style.nodeStyles) {
            Object.entries(style.nodeStyles).forEach(
                ([name, nc]) => {
                    for (let layout of ['force', 'circular']) {
                        let str = '';
                        if (name === "default") {
                            str += '.'+runID+'.'+layout+'.default-node {\n';
                            str += parseNodeStyle('nodeDefault', nc, settings, layout);
                            str += "}\n";
                        } else {
                            str += '.'+runID+'.'+layout+'[data-class=\"'+name+'-node\"] {\n';
                            str += parseNodeStyle(name, nc, settings, layout);
                            str += "}\n";
                        }
                        if (str.includes(";"))
                            css += str;
                    }
                }
            );
        }
        // Edges
        if (style.edgeStyles) {
            Object.entries(style.edgeStyles).forEach(
                ([name, ec]) => {
                    for (let layout of ['force', 'circular']) {
                        let str = '';
                        if (name === "default") {
                            str += '.'+runID+'.'+layout+'.default-link {\n';
                            str += parseEdgeStyle('nodeDefault', ec, settings, layout);
                            str += "}\n";
                        } else {
                            str += '.'+runID+'.'+layout+'[data-class=\"'+name+'-link\"] {\n';
                            str += parseEdgeStyle(name, ec, settings, layout);
                            str += "}\n";
                        }
                        if (str.includes(";"))
                            css += str;
                    }
                }
            );
        }
        // Save other settings (like shape)
        run.settings = [css, settings];
    }
    return run;
}

function parseNodeStyle(name, nodeClass, settings, layout) {
    let str = '';

    Object.entries(nodeClass).forEach(
        ([key, val]) => {
            switch(key) {
                case 'borderColor':
                    switch (layout) {
                        case 'flow':
                        case 'force': str += "\tstroke: " + val + ";\n"; break;
                        case 'circular': str += "\ttext-shadow: -1px 0 "+val+', 0 1px '+val+', 1px 0 '+val+', 0 -1px '+val+';\n';
                        default: break;
                    } break;
                case 'fillColor': str += "\tfill: " + val + ";\n"; break;
                case 'shape':
                    switch (layout) {
                        case 'flow':
                        case 'force': addSetting(layout, settings, key, name, val); break;
                        default: break;
                    } break;
                case 'size':
                case 'sizex':
                    switch (layout) {
                        case 'flow':
                        case 'force': addSetting(layout, settings, key, name, val); break;
                        case 'circular': str += '\tfont-size: '+val+'px;\n'; break;
                    } break;
                case 'sizey': addSetting(layout, settings, key, name, val); break;
                case 'opacity':
                    switch(layout) {
                        case 'flow':
                        case 'force': str += '\tfill-opacity: ' + val + ";\n"; break;
                        case 'circular': str += '\topacity: ' + val + ";\n"; break;
                    } break;
                default: console.log('unknown  node style option: ', key);
            }
        }
    );

    return str;
}

function parseEdgeStyle(name, edgeClass, settings, layout) {
    let str = '';

    Object.entries(edgeClass).forEach(
        ([key, val]) => {
            switch(key) {
                case 'fillColor': str += "\tstroke: " + val + ";\n"; break;
                case 'size':
                    switch(layout) {
                        case 'flow':
                        case 'force': addSetting(layout, settings, key, name, val, 'edges'); break;
                        case 'circular': str += '\tstroke-width: '+val+'px;\n'; break;
                        default: break;
                    } break;
                case 'opacity': str += '\tstroke-opacity: ' + val + ";\n"; break;
                case 'dashed': str += '\tstroke-dasharray: 5,5;\n'; break;
                case 'name': break;
                default: console.log('unknown edge style option: ', key);
            }
        }
    );

    return str;
}

function addSetting(layout, settings, name, className, value, which='nodes') {
    if (!settings[layout]) {
        settings[layout] = {};
    }

    if (!settings[layout][which]) {
        settings[layout][which] = {};
    }

    if (settings[layout][which][className]) {
        settings[layout][which][className][name] = value;
    } else {
        let obj = {};
        obj[name] = value;
        settings[layout][which][className] = obj;
    }
}
