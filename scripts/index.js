window.debug = false;

// List of views (max 4)
let views = [], viewNum = 1;
// Bootstrap class string for pause icon
let pauseString = 'glyphicon glyphicon-pause';
// Bootstrap class string for play icon
let playString = 'glyphicon glyphicon-play';

// Audio
let sound = new Audio('/public/bass-drum.wav');
let playSound = false;

// Add event listeners and load single run view
document.addEventListener("DOMContentLoaded", function(event) {
    registerEventListener();
    loadRunView($('#s-view'));
});

// Add event listeners to view buttons
function registerEventListener() {
    $('#nav-list').click(function(e) {
        loadRunView(getEventTarget(e));
    });
}

// Initialize a new view with index <viewIndex> and draw it
function initView(data, viewIndex, runID) {
    if (data === undefined)
        throw 'index.js - no run data defined/found';
    if (viewIndex === undefined || viewIndex > 3)
        throw 'index.js - missing or incorrect view index';

    if (data.settings)
        $('#view-style-'+viewIndex).html(data.settings[0]);
    if (views[viewIndex])
        views[viewIndex].kill();

    views[viewIndex] = new DataView(viewIndex, "#svg-"+viewIndex, getNewLayout(viewIndex), data, runID);
    updateSpeed(viewIndex);
    updateSteps(viewIndex);
    drawView(viewIndex);
}

// Refresh view with index <viewIndex>
function refreshView(data, viewIndex) {
    if (data === undefined)
        throw 'index.js - no run data defined/found';
    if (viewIndex === undefined || viewIndex > 3)
        throw 'index.js - missing or incorrect view index';

    views[viewIndex].kill();
    views[viewIndex].reset(data.data);
    drawView(viewIndex);
}

// Draw view with index <viewIndex>
function drawView(viewIndex) {
    clearView(viewIndex)
    views[viewIndex].draw();
}

// Draw SVG for view with index <viewIndex>
function clearView(viewIndex) {
    d3.select('#svg-'+viewIndex).selectAll('*').remove();
}

// Get layout string for view with index <index>
function getNewLayout(index) {
    return $('#layout-select-'+index).val();
}

// Update the layout for a view - called by select
function updateLayout(event) {
    let target = getEventTarget(event);
    let viewIndex = target.id.split('-')[2];

    sendAjaxJSON('/runs/'+views[viewIndex].name+'/dsl', function(data) {
        clearView(viewIndex);
        views[viewIndex].updateLayout(getNewLayout(viewIndex), data);
    });
}

// Update playthrough speed for view with index <viewIndex> - called by slider
function updateSpeed(viewIndex) {
    if (views[viewIndex]) {
        let wasRunning = views[viewIndex].isPlaying;
        if (wasRunning) views[viewIndex].pause();
        let slider = $('#play-speed-'+viewIndex);

        let min = parseInt(slider.attr('min'));
        let max = parseInt(slider.attr('max'));
        let val = slider.val();
        views[viewIndex].speed = min + max - val;
        if (viewIndex === 0) {
            sound.playbackRate = Math.min(3.0, Math.max(0.5, val/((max+min)/4)));
        }
        if (wasRunning) views[viewIndex].play();
    }
}

// Toggle stepwise playthrough for view with index <viewIndex>
function updateSteps(viewIndex) {
    if (views[viewIndex]) {
        views[viewIndex].stepWise = $('#play-steps-'+viewIndex).prop('checked');
    }
}

// Uncheck all checkboxes for view with index <viewIndex>
// except the one with name <special>
function uncheckAll(special, viewIndex) {
    $('.run-checkbox').each(function(index, e) {
        let idx = e.id.lastIndexOf('-');
        let name = e.id.slice(0, idx);
        let vidx = parseInt(e.id.slice(idx+1));
        if (vidx === viewIndex && name !== special) {
            e.checked = false;
        }
    });
}

// Load run data for run with name <name> and for view with index <viewIndex>
function loadRunData(name, viewIndex) {
    sendAjaxJSON('/runs/'+name+'/dsl', initView, [viewIndex, name]);
}

// Refresh run data for run with name <name> and for view with index <viewIndex
function refreshRunData(name, viewIndex) {
    sendAjaxJSON('/runs/'+name+'/refresh', refreshView, [viewIndex])
}

// Load run list
function loadRunList() {
    sendAjaxListeners('get', '/runs', '#main-aside', function() {
        $('.run-checkbox').change(function(e) {
            if (this.checked) {
                let idx = this.id.lastIndexOf('-');
                let tmp = this.id.slice(0, idx);
                let viewIndex = parseInt(this.id.slice(idx+1));
                loadRunData(tmp, viewIndex);
                uncheckAll(tmp, viewIndex);
            } else {
                this.checked = true;
            }
        });
    });
}

// Load run view (1|2|4) and add event listeners
function loadRunView(target) {
    let viewID = target.id;
    viewNum = 1;
    switch (viewID) {
        case 'd-view': viewNum = 3; break;
        case 'q-view': viewNum = 4; break;
        default: break;
    }
    sendAjaxListeners('get', '/runs/'+viewID, '#main-view', function() {
        for (let i = 0; i < viewNum; ++i) {
            if (views[i]) {
                views[i].kill();
                views[i] = undefined;
            }
            $("#layout-select-"+i).change(function(e) {
                d3.select('#svg-'+i).selectAll('*').remove();
                updateLayout(e);
            });
            $('#next-frame-'+i).click(function() {
                if (views[i]) views[i].doFrame();
            });
            $('#next-step-'+i).click(function() {
                if (views[i]) views[i].doStep();
            });
            $('#prev-frame-'+i).click(function() {
                if (views[i]) views[i].prevFrame();
            });
            $('#prev-step-'+i).click(function() {
                if (views[i]) views[i].prevStep();
            });
            $('#reset-all-'+i).click(function() {
                if (views[i]) refreshRunData(views[i].name, i);
            });
            $('#play-speed-'+i).change(function() {
                updateSpeed(i);
            })
            $('#play-'+i).click(function() {
                if (views[i]) {
                    if (!views[i].isPlaying) {
                        views[i].reverse = false;
                        views[i].play();
                    } else {
                        views[i].pause();
                        let current = views[i].reverse;
                        views[i].reverse = false;
                        if (current) views[i].play()
                    }
                }
            });
            $('#play-reverse-'+i).click(function() {
                if (views[i]) {
                    if (!views[i].isPlaying) {
                        views[i].reverse = true;
                        views[i].play();
                    } else {
                        views[i].pause();
                        let current = views[i].reverse;
                        views[i].reverse = true;
                        if (!current) views[i].play()
                    }
                }
            });
            $('#play-steps-'+i).change(function() {
                if (views[i]) {
                    let wasRunning = views[i].isPlaying;
                    if (this.checked) {
                        views[i].pause();
                        views[i].stepWise = true;
                        if (wasRunning) views[i].play();
                    } else {
                        views[i].pause();
                        views[i].stepWise = false;
                        if (wasRunning) views[i].play();
                    }
                }
            });
        }
        loadRunList();
    });
}

// Toggle play button icon for view with index <viewIndex
function togglePlay(play, viewIndex) {
    let span = $('#play-'+viewIndex+' span').removeClass()
    span.addClass(play ? playString : pauseString);
}

// Toggle reverse play button icon for view with index <viewIndex
function togglePlayReverse(play, viewIndex) {
    let span = $('#play-reverse-'+viewIndex+' span').removeClass()
    span.addClass(play ? playString : pauseString);
}

// Update the progress bar for view with index <viewIndex
function updateProgressBar(viewIndex, count, max) {
    let prog = $('#progress-'+viewIndex);
    prog.css('width', (count/max)*100+'%');
    prog.attr('aria-valuemin', 0);
    prog.attr('aria-valuemax', max);
    prog.attr('aria-valuenow', count);
    prog = $('#progress-'+viewIndex+' span');
    prog.html(count+' / '+max);
}

// Play audio
function playAudio(viewIndex) {
    if (sound.paused && viewIndex === 0 && playSound) sound.play();
}

 // Pause audio
function pauseAudio() {
    sound.pause();
}

///////////////////////////////////////////////////////////////////////////
// Utility
///////////////////////////////////////////////////////////////////////////

// Get target of an event (like list item of a list)
function getEventTarget(e) {
    e = e || window.event;
    return e.target || e.srcElement;
}

// Send an ajax request for JSON data
function sendAjaxJSON(url, func, params=undefined) {
    $.getJSON(url, function(data) {
        if (params)
            func(data, ...params);
        else
            func(data);
    });
}

// Send an ajax request which calls some callback on success
function sendAjaxListeners(method, url, elem, func, params=undefined, body=undefined) {
    var req = new XMLHttpRequest();
    req.addEventListener('load', function() {
        document.querySelector(elem).innerHTML = this.responseText;
        if (params)
            func(...params);
        else
            func();
    });

    req.open(method, url);
    if (method === "get" || method === "GET")
        req.send();
    else
        req.send(body);
}
