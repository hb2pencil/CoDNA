subview = function(subviewName){
    return "<div data-subview='" + subviewName + "'></div>";
};

// From http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
// Sort of like Python's new string formatting method. Handy when one wants to do some large string substitutions.
String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};

// ## Helper
Helper = function() {};

// Takes in a javascript date object and pretty-prints it to a string which is returned.
Helper.formatDate = function(dt, time) {
    if(time == undefined) time = true;
    var string = ['January', 'February', 'March',
        'April', 'May', 'June',
        'July', 'August', 'September',
        'October', 'November', 'December'][dt.getMonth()] +
        ' ' + dt.getDate() + ', ' + dt.getFullYear();
    if(time){
        // Thanks to http://stackoverflow.com/questions/5250244/jquery-date-formatting
        // for the quick fix for hours, minutes and seconds
        string += '   ' +
        ('0'+dt.getHours()).substr(-2,2) + ':' +
        ('0'+dt.getMinutes()).substr(-2,2);
    }
    return string;
};

// Build a sorting key for the sorttable library to sort the date field used in the table view.
Helper.getDateSortKey = function(dt) {
    return String(dt.getFullYear()) + ('0'+dt.getMonth()).substr(-2, 2) +
        ('0'+dt.getDate()).substr(-2, 2) + ('0'+dt.getHours()).substr(-2,2) +
        ('0'+dt.getMinutes()).substr(-2,2)+('0'+dt.getSeconds()).substr(-2,2);
};

// Take two lists, interpret as sets, and return true if subset_l is a subset of superset_l
Helper.isSubset = function(subset_l, superset_l) {
    var superset = {};
    for (var i = 0; i < superset_l.length; ++i) {
        superset[superset_l[i]] = true;
    }
    for (var i = 0; i < subset_l.length; ++i) {
        if (!superset.hasOwnProperty(subset_l[i])) {
            return false;
        }
    }
    return true;
};

// Generate a string describing a given article revisions' edit categories
Helper.toClassString = function(rc){
    return rc.split(';').map(function(c) { return ({
            'a': 'edit',
            'b': 'add',
            'c': 'remove',
            'd': 'reorganize',
            'e': 'cite',
            'f': 'vandalize',
            'g': 'unvandalize',
            'x': 'unclassified'
        })[c]; }).join(', ');
};

// Generate a string describing a given talk page revision entry's revision categories.
Helper.toTalkClassString = function(d) {
    var ret = "";
    if (d.att) ret += "attitude, ";
    if (d.crit) ret += "criticism, ";
    if (d.inf) ret += "informative, ";
    if (d.perf) ret += "performative, ";
    return ret.substring(0,ret.length-2);
};

// Return absolute max (disregarding sign) of func(arr[i])
Helper.absMax = function(arr, func){
    if (!(arr instanceof Array) || (arr.length < 1)) return undefined;
    var max = func(arr[0]);
    for (var i = 1; i < arr.length; ++i) {
        max = Math.max(max, Math.abs(func(arr[i])));
    }
    return max;
};
