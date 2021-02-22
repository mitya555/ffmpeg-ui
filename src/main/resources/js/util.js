//----------------------------------------------------------------------
//-- guarantees that window.name is a GUID, and that it would
//-- be preserved during this window's life time
//----------------------------------------------------------------------
//-- window.name will be set to "GUID-<SOME_RANDOM_GUID>"
//----------------------------------------------------------------------
function guid () {
	function s4 () { return Math.floor( Math.random() * 0x10000 /* 65536 */ ).toString(16); }
	return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}
if (!window.name.match(/^GUID-/)) {
	window.name = "GUID-" + guid();
}
/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
if ( !window.requestAnimationFrame ) {
	window.requestAnimationFrame = (function() {
		return window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
			window.setTimeout( callback, 1000 / 60 );
		};
	})();
}
/**
 * OOP class inheritance.
 */
function deriveFrom (child, parent) {
	child.prototype = Object.create(parent.prototype);
	child.prototype.baseclass = parent.prototype;
	child.prototype.constructor = child; // Reset the constructor from parent to child
}
/**
 * String hash code (Java style)
 */
String.prototype.hashCode = function () {
	var hash = 0, len = this.length;
	for (var i = 0; i < len; i++) {
		hash = ((hash << 5) - hash) + this.charCodeAt(i);
		hash |= 0; // Convert to 32bit integer
	}
	return hash >>> 0; // return unsigned
};
/**
 * htmlEncode()
 */
String.prototype.replaceAll = function(str1, str2, ignore) {
	return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
};
function htmlEncode(str) { return str.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
/**
 * String to hex and hex to string.
 */
String.prototype.hexEncode = function () {
	var hex, i;
	var result = "";
	for (i=0; i<this.length; i++) {
		hex = this.charCodeAt(i).toString(16);
		result += ("000"+hex).slice(-4);
	}
	return result;
}
String.prototype.hexDecode = function () {
	var j;
	var hexes = this.match(/.{1,4}/g) || [];
	var back = "";
	for(j = 0; j<hexes.length; j++) {
		back += String.fromCharCode(parseInt(hexes[j], 16));
	}
	return back;
}
function encodeId (id) {
	return id.replace(/[:\.]/g, "$&$&")
		.replace(/[^A-Za-z0-9_:\.]/g, function (match) {
			var c = match.charCodeAt(0);
			if (c < 16)	return ".0" + c.toString(16);
			if (c < 256)	return "." + c.toString(16);
			if (c < 4096)	return ":0" + c.toString(16);
			return ":" + c.toString(16);
		});
}
function decodeId (str) {
	return str.replace(/(^|[^\.])\.([A-Fa-f0-9]{2})/g, function (match, p1, p2) { return p1 + String.fromCharCode(parseInt(p2, 16)); })
		.replace(/(^|[^:]):([A-Fa-f0-9]{4})/g, function (match, p1, p2) { return p1 + String.fromCharCode(parseInt(p2, 16)); })
		.replace(/::|\.\./g, function (match) { return String.fromCharCode(match.charCodeAt(0)); });
}
function jqId ( id ) { return id.replace( /(:|\.|\[|\]|,)/g, "\\$1" ); }
function strCompare(str1, str2) { return str1 > str2 ? 1 : str1 < str2 ? -1 : 0; }
function $trimVal(selector) {
	var $txt = $(selector).first(), _val = $txt.val(), val = $.trim(_val);
	if (val !== _val)
		$txt.val(val);
	return val;
}

function getAdjustableRingBuffer(n) {
	var isObj = typeof n === 'object', len = 0;
	var status = isObj ? {} : typeof n === 'number' ? new Array(len = n) : new Array(len = parseInt(n)), pool = [];
	if (isObj)
		for (var i in n) {
			status[n[i]] = 0;
			pool.push({ i: n[i] });
			len++;
		}
	else
		for (var i = n - 1; i >= 0; i--) {
			status[i] = 0;
			pool.push({ i: i });
		}
	function logLenMsg() { if (debug_js && console) console.log('RingBuffer Length = ' + (len - pool.length)); }
	var list = pool.pop();
	list.next = list;
	var frames = { n: 0 };
	frames.next = frames;
	logLenMsg();
	return {
		get: function(frame_n) {
			var next = list.next;
			var min_n = frames.next.n, next_status, found;
			while (!(found = ((next_status = status[next.i]) === 0 || next_status < min_n)) && next !== list)
				next = next.next;
			if (!found) {
				if (pool.length > 0) {
					next = pool.pop();
					next.next = list.next;
					list.next = next;
					frames.next = { next: frames.next };
					logLenMsg();
				} else {
					next = list.next;
				}
			}/* else if (next !== list) {
				var _next = next;
				while (_next.next !== list) {
					if (status[_next.next.i]) === 0) {
						pool.push(_next.next);
						_next.next = _next.next.next;
						frames.next = frames.next.next;
					} else {
						_next = _next.next;
					}
				}
			}*/ // commented out above: releasing resources from the list back to the pool
			if (debug_js && status[next.i] !== 0)
				console.log('Dropped Frame # ' + status[next.i]);
			status[(list = next).i] = (frames = frames.next).n = frame_n;
			return list.i;
		},
		release: function(i) { status[i] = 0; }
	};
} 

function getRingBuffer(n) {
	var len = 0, status = {}, list = {}, frames = {};
	function listAddItem(list, item) { list._list = !list.list_ ? (list.list_ = item) : (list._list.next = item); }
	function listClose(list) { list._list.next = list.list_; return list.list_; }
	for (var i in n) {
		status[n[i]] = 0;
		listAddItem(list, { i: n[i] });
		listAddItem(frames, { n: 0 });
		len++;
	}
	list = listClose(list);
	frames = listClose(frames);
	if (debug_js && console)
		console.log('RingBuffer Length = ' + len);
	return {
		get: function(frame_n) {
			var next = list.next;
			var min_n = frames.next.n, next_status, found;
			while (!(found = ((next_status = status[next.i]) === 0 || next_status < min_n)) && next !== list)
				next = next.next;
			if (!found)
				next = list.next;
			if (debug_js && status[next.i] !== 0)
				console.log('Dropped Frame # ' + status[next.i]);
			status[(list = next).i] = (frames = frames.next).n = frame_n;
			return list.i;
		},
		release: function(i) { status[i] = 0; }
	};
} 

function getSimpleRingBuffer(n) {
	var len = n.length, ind = -1, status = {};
	var total = 0, dropped = 0, _dropped = 0;
	if (debug_js && console) {
		for (var i in n)
			status[n[i]] = 0;
		console.log('RingBuffer Length = ' + len);
		return {
			get: function(frame_n) {
				var i = n[ind = (ind + 1) % len];
				total++;
				if (status[i] !== 0) {
					_dropped++;
					//console.log('Dropped Frame # ' + status[i]);
				}
				if (total % 100 === 0) {
					dropped += _dropped;
					console.log('Total: ' + total + '; \t Dropped: ' + dropped + '; \t Ratio: ' + (total/dropped).toFixed(2) + '; \t Dropped (last 100): ' + _dropped + '; \t Ratio (last 100): ' + (100./_dropped).toFixed(2));
					_dropped = 0;
				}
				status[i] = frame_n;
				return i;
			},
			release: function(i) { status[i] = 0; }
		};
	} else {
		return {
			get: function(frame_n) { return n[ind = (ind + 1) % len]; },
			release: function(i) {}
		};
	}
} 
