
enterButtonClick = () => {};

$(function () {
	$('#enter-your-name-txt').keypress(function (e) {
		var code = e.keyCode || e.which;
		if (code === 13) {
			e.preventDefault();
			enterButtonClick(document.getElementById('enter-your-name-btn'));
		}
	}).focus();
});

// global variables
var sn = 0,
	ffmpeg_ids = {},
	current_device_name = {}, current_device_mode = {}, current_device_resolution = {}, current_device_fps = {},
	videos = {},
	keys = {}, // by ffmpeg_id
	name_hash = {}, // by ffmpeg_id
	audio_level = {}; // by name_hash

function createVideoCanvas (container, resizable, imgnum) {
	function createImage() { return /*$('<img style="visibility: hidden; display: none;" />').appendTo(container)[0]*/ new Image(); }
	if (!imgnum || typeof imgnum !== 'number')
		imgnum = 3; // browsers (at least IE) have internal image loaders pooling so Image elements pooling in javascript gives almost no gain in performance
	var image = [];
	for (var i = 0; i < imgnum; i++) image.push( createImage() );
	var // n = image.length, last_img = -1,
		videoImage, $videoImageContainer, videoImageContext,
		ringBuffer = getSimpleRingBuffer(image); // getRingBuffer(image);
	if (resizable)
		$videoImageContainer = $("<div class='video-container' style='position:absolute;width:0px;height:0px;'></div>").appendTo(container);
	videoImage = $("<canvas width='0' height='0'></canvas>").appendTo($videoImageContainer || container)[0];
	// create '2d' context; background color if no video present
	videoImageContext = videoImage.getContext( '2d' );
	videoImageContext.fillStyle = '#005337';
	videoImageContext.fillRect( 0, 0, videoImage.width, videoImage.height );				
	// assign image elements onload handler
	var init = true, curImage;
	function imageOnload() {
		if (init) {
			videoImage.width = this.width;
			videoImage.height = this.height;
		}
		videoImageContext.drawImage( curImage = this, 0, 0, videoImage.width, videoImage.height );
		ringBuffer.release(this);
		if (init) {
			init = false;
			if ($videoImageContainer) {
				$videoImageContainer.width(this.width);
				$videoImageContainer.height(this.height);
				$videoImageContainer.draggable().resizable({ aspectRatio: this.width / this.height }).on( "resize", function(event, ui) {
					var w = videoImage.width = ui.size.width, h = videoImage.height = ui.size.height;
					for (var i in image) { image[i].width = w; image[i].height = h; }
					videoImageContext.drawImage( curImage, 0, 0, w, h );
				})[0].resetToImageNaturalSize = function () {
					var _size = { width: curImage.naturalWidth, height: curImage.naturalHeight };
					$(this).width(_size.width).height(_size.height).triggerHandler( "resize", { size: _size });
				};
			}
		}
	}
	for (var i in image) image[i].onload = imageOnload;
	return {
		drawUri: function (frame_sn, uri) { /*image[last_img = (last_img + 1) % n]*/ringBuffer.get(frame_sn).src = uri; },
		destroy: function () {
			for (var i in image) image[i] = image[i].onload = null;
			//if ($videoImageContainer)
			//	$videoImageContainer.resizable( "destroy" ).draggable( "destroy" );
			($videoImageContainer || $(videoImage)).remove();
			$videoImageContainer = videoImage = null;
		}
	};
}

function checkboxClick(checkbox) {
	var key = checkbox.id, play = checkbox.checked;
	debug(`key = ${key}  ffmpeg_id = ${ffmpeg_ids[key]}`);
	_applet[play?'play':'stopPlayback'](ffmpeg_ids[key]);
}
function checkboxCallback(ffmpeg_id, playing) {
	var key = keys[ffmpeg_id];
	function setChecked() { var cb = document.getElementById(key); if (cb) { cb.checked = playing; } else { window.setTimeout(setChecked, 20); } }
	if (key) setChecked();
}

function videoCallback(ffmpeg_id, playing) {
	var key = keys[ffmpeg_id];
	if (playing) {
		videos[key] = createVideoCanvas("#video-chat-panel", true, img_num);
	} else {
		if (videos[key]) videos[key].destroy();
		delete videos[key];
	}
}

function audioLevelCallback(ffmpeg_id, level) {
	// debug("audio level " + level);
	var _name_hash = name_hash[ffmpeg_id];
	audio_level[_name_hash] = level;
	window.setTimeout(function () { $('#a' + _name_hash).css(audioLevelCss(level)); }, 0);
}
function audioLevelCss(level) {
	var _level = level < 0 ? 0 : level > 10 ? 10 : level, _pct = (10 - _level) * 10;
	return { 'background': 'linear-gradient(90deg, #ffffff ' + _pct + '%, #26ca28 ' + _pct + '%)' };
}

function removeFFmpeg(key) {
	var ffmpeg_id = ffmpeg_ids[key];
	if (ffmpeg_id) {
		_applet.stopPlayback(ffmpeg_id);
		_applet.removeFFmpegById(ffmpeg_id);
		delete ffmpeg_ids[key];
		delete current_device_name[key];
		delete current_device_mode[key];
		delete current_device_resolution[key];
		delete current_device_fps[key];
		if (videos[key]) videos[key].destroy();
		delete videos[key];
		delete keys[ffmpeg_id];
		delete name_hash[ffmpeg_id];
	}
}

function recreateFFmpeg(key, callback, param_arr) {
	var playing = false;
	var ffmpeg_id = ffmpeg_ids[key];
	if (ffmpeg_id) {
		playing = _applet.isPlaying(ffmpeg_id);
		removeFFmpeg(key);
	}
	ffmpeg_id = ffmpeg_ids[key] = _applet.createFFmpegId(playing, callback, param_arr);
	keys[ffmpeg_id] = key;
	name_hash[ffmpeg_id] = namesFromKey(key).name.hashCode();
	// if (playing)
	// 	_applet.play(ffmpeg_id);
}

var _op = {
	capture_video: 1,
	playback_video: 2,
	capture_audio: 3,
	playback_audio: 4,
	list_devices: 5,
	list_options: 6,
	capture_screen: 7
};

function renewFFmpeg(op, key, p1, p2, mode, resolution, fps) {
	switch (op) {

	case _op.capture_video:
		var options = [
			//'ffmpeg-r', '25',
			'ffmpeg-f:i', ffmpegSystem(),
			'ffmpeg-i', isWin() ? 'video=' + p1 : isMac() ? /\[(\d+)\]/g.exec(p1)[1] + ':' : '', // video device, e.g. "Logitech QuickCam E3500"
			'ffmpeg-c:v', 'libx264',
			'ffmpeg-preset', 'ultrafast',
			'ffmpeg-tune', 'zerolatency',
			//'ffmpeg-pix_fmt', 'yuv422p', // 'yuv420p',
			'ffmpeg-g', '50',
			'ffmpeg-an', '',
			'ffmpeg-f:o', 'flv',
			'ffmpeg-o', p2,			// rtmp url, e.g. "rtmp://10.44.43.244/rtmp/v"
			'debug', debug_java, // 'yes',
			'debug-ffmpeg', debug_ffmpeg, // 'yes',
		];
		if (isMac()) options.splice(options.length, 0, 'ffmpeg-framerate', '30', 'ffmpeg-pixel_format', 'yuyv422');
		var tmp, isMode = (mode && ((tmp = mode.split("="))[0] === "pixel_format" || tmp[0] === "vcodec") && tmp.length > 1 && tmp[1]);
		if (isMode) {
			options.push("ffmpeg-" + tmp[0]);
			options.push(tmp[1]);
		}
		if (resolution) {
			options.push("ffmpeg-video_size");
			options.push(resolution);
		}
		if (fps) {
			options.push("ffmpeg-framerate");
			options.push(fps);
			options.push("ffmpeg-r");
			options.push(fps);
		}
		recreateFFmpeg( key, 'checkboxCallback', options );
		current_device_name[key] = p1;
		if (isMode) { current_device_mode[key] = mode; } else { delete current_device_mode[key]; }
		if (resolution) { current_device_resolution[key] = resolution; } else { delete current_device_resolution[key]; }
		if (fps) { current_device_fps[key] = fps; } else { delete current_device_fps[key]; }
		break;

	case _op.playback_video: recreateFFmpeg( key, 'checkboxCallback,videoCallback', [
			//"ffmpeg-re", "",
			//"ffmpeg-f:i", "",
			"ffmpeg-i", p1,			// rtmp url, e.g. "rtmp://10.44.43.244/rtmp/v",
			//"ffmpeg-i", "rtmp://europaplus.cdnvideo.ru:1935/europaplus-live/eptv_main.sdp",
			//"ffmpeg-i", "rtmp://85.132.78.6:1935/live/muztv.stream",
			//"ffmpeg-i", "http://83.139.104.101/Content/HLS/Live/Channel(Sk_1)/index.m3u8",
			//"ffmpeg-map", "0:6",
			"ffmpeg-c:v", "mjpeg",
			"ffmpeg-q:v", "0.0",
 /* �-vsync parameter�
    Video sync method. For compatibility reasons old values can be specified as numbers. 
    Newly added values will have to be specified as strings always.
    �0, passthrough� - Each frame is passed with its timestamp from the demuxer to the muxer. 
    �1, cfr� - Frames will be duplicated and dropped to achieve exactly the requested constant frame rate. 
    �2, vfr� - Frames are passed through with their timestamp or dropped so as to prevent 2 frames from having the same timestamp. 
    �drop� - As passthrough but destroys all timestamps, making the muxer generate fresh timestamps based on frame-rate. 
    �-1, auto� - Chooses between 1 and 2 depending on muxer capabilities. This is the default method.
  */
			"ffmpeg-vsync", "0",
			"ffmpeg-f:o", "mjpeg",
			"ffmpeg-an", "",
			//"ffmpeg-muxpreload", "10",
			//"ffmpeg-muxdelay", "10",
			//"ffmpeg-loglevel", "warning",
			"drop-unused-frames", "yes",
			"process-frame-callback", "showVideoFrame",
			"process-frame-number-of-consumer-threads", "4",
			"debug", debug_java, // "yes",
			"debug-ffmpeg", debug_ffmpeg, // 'yes',
		] ); break;

	case _op.capture_audio: recreateFFmpeg( key, 'checkboxCallback', [
			'ffmpeg-f:i', 'dshow',
			'ffmpeg-audio_buffer_size', '50',
			'ffmpeg-i', 'audio=' + p1,		// audio device, e.g. "Microphone (USB Audio Device)"
			'ffmpeg-c:a', 'libmp3lame',
			'ffmpeg-async', '1',
			'ffmpeg-vn', '',
			'ffmpeg-f:o', 'flv',
			'ffmpeg-o', p2,			// rtmp url, e.g. "rtmp://10.44.43.244/rtmp/a"
			'debug', debug_java, // 'yes',
			'debug-ffmpeg', debug_ffmpeg, // 'yes',
		] ); current_device_name[key] = p1; break;

	case _op.playback_audio: recreateFFmpeg( key, 'checkboxCallback', [
			"ffmpeg-re", "no",
			"ffmpeg-analyzeduration", "1000",
			"ffmpeg-rtmp_buffer", "0",
			"ffmpeg-rtmp_live", "live",
			//"ffmpeg-f:i", "",
			"ffmpeg-i", p1,			// rtmp url, e.g. "rtmp://10.44.43.244/rtmp/a"
			//"ffmpeg-c:a", "libmp3lame",
			//"ffmpeg-f:o", "mp3",
			//"mp3-frames-per-chunk", "1",
			"ffmpeg-f:o", "wav",
			"ffmpeg-vn", "",
			//"wav-audio-line-buffer-size", "2200",
			"wav-intermediate-buffer-size", "32",
			"wav-level-change-callback", "audioLevelCallback",
			"debug", debug_java, // "yes",
			"debug-ffmpeg", debug_ffmpeg, // 'yes',
		] ); break;

	case _op.capture_screen: recreateFFmpeg( key, 'checkboxCallback', [
			//'ffmpeg-r', '25',
			'ffmpeg-f:i', 'gdigrab',
			'ffmpeg-video_size', '1024x768', // '800x600',
			'ffmpeg-show_region', '1',
			'ffmpeg-i', 'desktop',
			'ffmpeg-c:v', 'libx264',
			'ffmpeg-preset', 'ultrafast',
			'ffmpeg-tune', 'zerolatency',
			//'ffmpeg-pix_fmt', 'yuv422p', // 'yuv420p',
			'ffmpeg-g', '50',
			'ffmpeg-an', '',
			'ffmpeg-f:o', 'flv',
			'ffmpeg-o', p1,			// rtmp url, e.g. "rtmp://10.44.43.244/rtmp/s"
			'debug', debug_java, // 'yes',
			'debug-ffmpeg', debug_ffmpeg, // 'yes',
		] ); break;
	}
}

function callFFmpeg(op, p1) {
	var _ffmpeg_id, defer = $.Deferred().always(function () {
		if (_ffmpeg_id) {
			_applet.removeFFmpegById(_ffmpeg_id);
			// alert("remove: " + _ffmpeg_id);
		}
	});
	window.dataCallback = function (ffmpeg_id, starting, data) {
		if (!starting) {
			defer.resolve(/* _applet.getStderrData(ffmpeg_id) */data);
			// alert("resolve: " + ffmpeg_id);
		}
	};
	switch (op) {

	case _op.list_devices: _ffmpeg_id = _applet.createFFmpegId( true, 'dataCallback', [
			'ffmpeg-list_devices', 'true',
			'ffmpeg-f:i', ffmpegSystem(),
			'ffmpeg-i', 'dummy',
			'ffmpeg-o', '',
			'debug', debug_ffmpeg, // 'yes',
		] ); break;

	case _op.list_options: _ffmpeg_id = _applet.createFFmpegId( true, 'dataCallback', [
			'ffmpeg-list_options', 'true',
			'ffmpeg-f:i', 'dshow',
			'ffmpeg-i', p1,        // device, e.g. 'video=Logitech QuickCam Communicate STX', or 'audio=Logitech Mic (Communicate STX)'
			'ffmpeg-o', '',
			'debug', debug_ffmpeg, // 'yes',
		] ); break;
	}
	// if (_ffmpeg_id) {
	// 	_applet.play(_ffmpeg_id);
	// }
	return defer.promise();
}

var debug_ffmpeg = window.location.search && window.location.search.indexOf('debug-ffmpeg') != -1 ? 'yes' : 'no',
	debug_java = window.location.search && window.location.search.indexOf('debug-java') != -1 ? 'yes' : 'no',
	debug_js = window.location.search && window.location.search.indexOf('debug-js') != -1,
	query_string = $.map((window.location.search || "").split(/[\?&]/), function (v, i) { var a = v.split("="), r = a[0] ? { name: decodeURIComponent(a[0]) } : null; if (r && a.length > 1) r.value = decodeURIComponent(a[1]); return r; }),
	img_num = 3,
	os_name = (query_string.find(o => o.name === 'os-name') || {value:''}).value;
$.each(query_string, function (i, v) { if (v.name === "img-num") { img_num = parseInt(v.value); return false; } });

isWin = () => os_name === 'win';
isMac = () => os_name === 'mac';
ffmpegSystem = () => isWin() ? 'dshow' : isMac() ? 'avfoundation' : '';

function getUrlFromHash(i) {
	return window.location.hash.split('#')[i].replace(/[/\s\uFEFF\xA0]+$/, '');
}
function getRtmpBaseUrl() { return getUrlFromHash(1); }
function getHttpBaseUrl() { return getUrlFromHash(2); }

function getMyName() { return $('#enter-your-name-txt').val(); }

const dlm = '_';

function getMyRtmpAppName(deviceType) { return getMyName() + dlm + deviceType; }

function getStreamInfo(rtmpAppName) { var p = rtmpAppName.lastIndexOf(dlm); return { name: rtmpAppName.substring(0, p > -1 ? p : rtmpAppName.length), deviceType: p > -1 ? rtmpAppName.substring(p + 1) : "" }; }

function deviceTypeOrder(a) { return a === "audio" ? 1 : a === "video" ? 2 : a === "screen" ? 3 : -1; }

function orderToDeviceType(n) { return n == 1 ? "audio" : n == 2 ? "video" : n == 3 ? "screen" : "unknown"; }

function deviceToStreamType(a) { return a === "audio" ? "audio" : a === "video" ? "video" : a === "screen" ? "video" : "video"; }

function keyFromNames(deviceType, opName, name) { return (opName || "capture") + "-" + encodeId(name || "my") + "-" + deviceType; }

function namesFromKey(key) { var tmp = key.split('-'); return { opName: tmp[0], name: decodeId(tmp[1]), deviceType: tmp[2] }; }

function onLoadHandler() {
	// event handler for ready state
	var rtmp_base_url = getRtmpBaseUrl();
	var http_base_url = getHttpBaseUrl();
	function getRtmpUrl(rtmp_app) { return rtmp_base_url + '/rtmp/' + encodeURIComponent(rtmp_app); }
	// FFmpeg UI functions
	function getCheckeds() { var checkeds = {}; for (var key in ffmpeg_ids) checkeds[key] = $("#" + jqId(key)).is(":checked"); return checkeds; }
	function create$ffmpegUi(deviceType, checkeds, opName, name) {
		if (!checkeds) checkeds = {};
		var key = keyFromNames(deviceType, opName, name), 
			icon = '<i class="fa fa-' + (deviceType==='audio'?'microphone':deviceType==='video'?'video-camera':deviceType==='screen'?'desktop':'camera') + '"></i>';
		return $(
			'<span class="contCheckbox">' +
				'<span> </span>' +
				//'<label for="' + key + '">' + icon + '</label>' +
				//'<span> </span>' +
				//'<div class="roundCheckbox">' +
					'<input id="' + key + '" type="checkbox" onclick="checkboxClick(this)"' + (checkeds[key] ? ' checked="checked"' : '') + ' />' +
					//'<label for="' + key + '">' + '</label>' +
				//'</div>' +
				'<label for="' + key + '" class="-bs-icon-">' + icon + '</label>' +
				//'<span>&nbsp;</span>' +
			'</span>');
	}
	function lineHtml(name) {
		return "<div style='text-align:right;'><span style='float:left;text-align:left;font-weight:bold;/*min-width:50%;*/'>" +
			htmlEncode(name) +
			"</span></div>";
	}
	var cardinalPoints = [ "n", "e", "s", "w" ], arrowrefreshClasses = $.map(cardinalPoints, function (val, i) { return "ui-icon-arrowrefresh-1-" + val; }), arrowrefreshClassStr = arrowrefreshClasses.join(" ");
	// list devices
	var ldCnt = 0;
	function listDevices () {
		$("#deviceContainer select").css("visibility", "hidden");
		return callFFmpeg(_op.list_devices).then(function (res) {
			// DeviceType class
			function DeviceType(deviceType) {
				this.deviceType = deviceType;
				this.key = keyFromNames(deviceType);
				this.$ffmpegUi = create$ffmpegUi(deviceType, checkeds);
			}
			DeviceType.prototype.appendTo = function(container) { this.$ffmpegUi.appendTo(container); return this; };
			DeviceType.prototype.renew = function() {
				if (!checkeds[this.key])
					renewFFmpeg(_op["capture_" + this.deviceType], this.key, getRtmpUrl(getMyRtmpAppName(this.deviceType)));
			};
			// SystemDevice class
			deriveFrom(SystemDevice, DeviceType);
			function SystemDevice(deviceType) {
				this.baseclass.constructor.call(this, deviceType);
				this.devices = [];
				this.$dropdown = $(
					'<div class="dropdown">' +
						'<a id="'+ this.key + '-trigger" href="#" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
							'<span class="caret"></span>' +
						'</a>' +
						'<div class="dropdown-menu pull-right" aria-labelledby="'+ this.key + '-trigger">' +
							'<div class="menu-container">' +
								'<select></select>' +
							'</div>' +
						'</div>' +
					'</div>');
				var self = this;
				this.$select = this.$dropdown.find("select").change(function () { self._updateDevice(); });
				this.$div = this.$select.parent();
				this.$dropdown.insertAfter(this.$ffmpegUi.find("label"));
			}
			SystemDevice.prototype._getDevice = function(deviceName) {
				for (var i = 0; i < this.devices.length; i++)
					if (this.devices[i].name === deviceName)
						return this.devices[i];
			};
			SystemDevice.prototype.renew = function() {
				if (current_device_name[this.key] && this._getDevice(current_device_name[this.key])) {
					this.$select.val(current_device_name[this.key]);
				}
				this._updateDevice();
			};
			SystemDevice.prototype._updateDevice = function() {
				var deviceName = this.$select.val(), self = this;
				this._getOptions(deviceName).then(function (options) {
					self._updateDropdownUi(options);
					self._updateFFmpeg(deviceName, options);
					self._updateUi(deviceName);
				});
			};
			SystemDevice.prototype._updateOption = function() {
				var deviceName = this.$select.val(), self = this;
				this._getOptions(deviceName).then(function (options) {
					self._updateFFmpeg(deviceName, options);
				});
			};
			SystemDevice.prototype._getOptions = function(deviceName) {
				var _device;
				return $.when(this.deviceType === "video" && (_device = this._getDevice(deviceName)) && (_device.options || callFFmpeg(_op.list_options, this.deviceType + "=" + _device.name).then(function (res) {
					// parse DirectShow output
					var re = /\[\s*dshow\s*@\s*[a-fA-F0-9]+\s*\]\s*"?(.*?)"?\s*\r?\n/ig, match, arr = [];
					while ((match = re.exec(res)) !== null) {
						arr.push(match[1]);
					}
					re = /^\s*(pixel_format|vcodec)\s*=\s*(.*?)\s+min\s+s\s*=\s*(.*?)\s+fps\s*=\s*(.*?)\s+max\s+s\s*=\s*(.*?)\s+fps\s*=\s*(.*?)\s*$/i;
					// add DirectShow device options
					var tmp = {};
					for (var i in arr) {
						if (re.test(arr[i]) && !tmp[arr[i]]) {
							tmp[arr[i]] = arr[i]; // filter out duplicates
							if (!_device.options)
								_device.options = [];
							match = re.exec(arr[i]);
							if (res.type !== match[1] || res.name !== match[2]) {
								_device.options.push(res = { type: match[1], name: match[2], type_name: match[1] + "=" + match[2], options: [] });
							}
							res.options.push({ min_s: match[3], min_fps: parseInt(match[4]), max_s: match[5], max_fps: parseInt(match[6]),
								s: match[3], px: eval(match[3].replace("x","*")) });
						}
					}
					return _device.options
				})));
			};
			SystemDevice.prototype._findOption = function(options, value, name) {
				if (!name)
					name = "type_name";
				for (var i in options)
					if (options[i][name] === value)
						return options[i];
			};
			SystemDevice.prototype._updateDropdownUi = function(options) {
				if (options) {

					function $menuContainer(insertAfter, label) {
						return $("<div class='menu-container'></div>").insertAfter(insertAfter).append("<div class='menu-label'>" + htmlEncode(label) + ":</div>");
					}
					function create$select(self, contPropName, insertAfter, label, isMode) {
						return $("<select></select").appendTo(self[contPropName] = $menuContainer(insertAfter, label)).change( isMode ? 
							function () { current_device_mode[self.key] = $(this).val(); self._updateDevice(); } :
							function () { self._updateOption(); } );
					}

					if (!this.$select2)
						this.$select2 = create$select(this, "$div2", this.$div, "Mode", true);
					this.$select2.empty();
					for (var i in options)
						$("<option></option>").attr("value", options[i].type_name).text(/*options[i].type + ": " + options[i].name*/options[i].type_name).appendTo(this.$select2);
					if (current_device_mode[this.key] && this._findOption(options, current_device_mode[this.key]))
						this.$select2.val(current_device_mode[this.key]);

					if (!this.$select3)
						this.$select3 = create$select(this, "$div3", this.$div2, "Resolution");
					this.$select3.empty();
					var option = this._findOption(options, this.$select2.val());
					if (option) {
						var arr = option.options.slice();
						arr.sort(function (p1, p2) { return p1.px - p2.px; });
						for (var i in arr)
							$("<option></option>").attr("value", arr[i].s).text(arr[i].s).prop("selected", arr[i].s === option.options[0].s).appendTo(this.$select3);
						if (current_device_resolution[this.key] && this._findOption(option.options, current_device_resolution[this.key], "s"))
							this.$select3.val(current_device_resolution[this.key]);
					}

					if (!this.$select4)
						this.$select4 = create$select(this, "$div4", this.$div3, "Fps");
					this.$select4.empty();
					option = this._findOption(option.options, this.$select3.val(), "s");
					if (option) {
						for (var i = option.min_fps; i <= option.max_fps; i++)
							$("<option></option>").attr("value", i).text(i).prop("selected", i === (30 < option.min_fps ? option.min_fps : 30 > option.max_fps ? option.max_fps : 30)).appendTo(this.$select4);
						var _fps;
						if (current_device_fps[this.key] && (_fps = parseInt(current_device_fps[this.key])) >= option.min_fps && _fps <= option.max_fps)
							this.$select4.val(current_device_fps[this.key]);
					}
					
					this.$dropdown.on("shown.bs.dropdown", function () {
						function childrenWidth($e) { var w = 0; $e.children().each(function () { w += $(this).outerWidth(true); }); return w; }
						var $e = $(this).find(".dropdown-menu .menu-container"), w = 0;
						$e.each(function () { var _w = childrenWidth($(this)); if (w < _w) w = _w; });
						$e.each(function () { var $this = $(this); if ($this.width() < w) $this.width(w); });
					});

				} else if (this.devices.length < 2) {
					this.$dropdown.css("visibility", "hidden");
				}
			};
			SystemDevice.prototype._updateUi = function(deviceName) {
				var $checkbox = $("#" + jqId(this.key)).prop("disabled", !deviceName);
				if (!deviceName)
					$checkbox.prop("checked", false);
				var $label = $("label[for=" + jqId(this.key) + "]"),
					_device = this._getDevice(deviceName);
				$label.attr("title", _device ? _device.display : deviceName);
			};
			SystemDevice.prototype._updateFFmpeg = function(deviceName, options) {
				if (deviceName) {
					var deviceMode, deviceResolution, deviceFps;
					if (options) {
						deviceMode = this.$select2.val();
						deviceResolution = this.$select3.val();
						deviceFps = this.$select4.val();
					}
					if (current_device_name[this.key] !== deviceName || (options && (
						current_device_mode[this.key] !== deviceMode ||
						current_device_resolution[this.key] !== deviceResolution ||
						current_device_fps[this.key] !== deviceFps))) {
						if (options)
							renewFFmpeg(_op["capture_" + this.deviceType], this.key, deviceName, getRtmpUrl(getMyRtmpAppName(this.deviceType)), deviceMode, deviceResolution, deviceFps);
						else
							renewFFmpeg(_op["capture_" + this.deviceType], this.key, deviceName, getRtmpUrl(getMyRtmpAppName(this.deviceType)));
					}
				} else if (current_device_name[this.key]) {
					removeFFmpeg(this.key);
				}
			};
			
			// recreate UI
			var checkeds = getCheckeds();
			var $lineCont = $("#deviceContainer .boxHead + div").empty();
			var deviceTypes = [];
			// parse ffmpeg output
			var re = isWin() ? /\[\s*dshow\s*@\s*[a-fA-F0-9]+\s*\]\s*"?(.*?)"?\s*\r?\n/ig :
					isMac() ? /\[\s*AVFoundation.*@\s*[xXa-fA-F0-9]+\s*\]\s*"?(.*?)"?\s*\r?\n/ig :
					/\[.*@\s*[a-fA-F0-9]+\s*\]\s*"?(.*?)"?\s*\r?\n/ig,
				match,
				arr = [];
			while ((match = re.exec(res)) !== null) {
				arr.push(match[1]);
			}
			re = isWin() ? /^\s*Direct\s*Show\s*(video|audio)\s*devices.*$/i :
				isMac() ? /^\s*AVFoundation\s*(video|audio)\s*devices.*$/i :
				/^.*(video|audio)\s*devices\s*.*$/i;
			var re1 = /^\s*Could\s*not\s*enumerate\s*(video|audio)\s*devices\.?\s*$/i,
				re2 = /^\s*Alternative\s+name\s*"?(.*?\s*)"?\s*$/i;
			// add system devices
			for (var i = 0; i < arr.length; i++) {
				if (re.test(arr[i])) {
					var deviceType = re.exec(arr[i])[1].toLowerCase();
					deviceTypes.push(SystemDevice.current = new SystemDevice(deviceType));
					$("<option></option>").attr({ "value": "", "disabled": "disabled" }).text(arr[i]).appendTo(SystemDevice.current.$select);
				} else if (re1.test(arr[i])) {
					$("<option></option>").attr({ "value": "", "disabled": "disabled" }).text(arr[i]).appendTo(SystemDevice.current.$select);
				} else if (re2.test(arr[i + 1])) {
					var altName = re2.exec(arr[i + 1])[1];
					$("<option></option>").attr("value", altName).text(arr[i]).appendTo(SystemDevice.current.$select);
					SystemDevice.current.devices.push({ name: altName, display: arr[i], index: SystemDevice.current.devices.length });
					i++;
				} else {
					$("<option></option>").attr("value", arr[i]).text(arr[i]).appendTo(SystemDevice.current.$select);
					SystemDevice.current.devices.push({ name: arr[i], display: arr[i], index: SystemDevice.current.devices.length });
				}
			}
			// add screen grab
			deviceTypes.push(new DeviceType("screen"));
			// sort deviceTypes
			deviceTypes.sort(function(a, b) {
				return deviceTypeOrder(a.deviceType) - deviceTypeOrder(b.deviceType);
			});
			// try to restore current devices
			var $line = $(lineHtml(getMyName())).appendTo($lineCont);
			for (var i = 0; i < deviceTypes.length; i++) {
				deviceTypes[i].appendTo($line).renew();
			}
			// refresh refresh button
			$("#deviceContainer .boxHead .ui-icon.ui-right").removeClass(arrowrefreshClassStr).addClass(arrowrefreshClasses[(ldCnt++) % 4]);
		});
	}
	// add refresh button click handler
	$("#deviceContainer .boxHead .ui-icon.ui-right").click(function () { listDevices(); event.stopPropagation(); });
	// list streams
	var lsCnt = 0;
	function listStreams () {
		$.when(
			$.ajax({
				url: http_base_url + '/rtmp/stat',
				cache: false,
				dataType: "xml"
			}),
			$.ajax({
				url: http_base_url + '/rest/vchat/' + encodeURIComponent(getMyName()) + '/' + encodeURIComponent(window.name),
				cache: false,
				dataType: 'json'
			})
		).then(function (data, data2) {
			var $xml = $(data[0]), $streams = $xml.find("rtmp > server > application:has(> name)").filter(function () { return $(this).find("> name").text() === "rtmp"; }).find("> live > stream:has(> publishing)");
			function getStreamType($stream) {
				var $video = $stream.find("> meta > video"), $audio;
				return parseFloat($video.find("> width").text()) > 0 && parseFloat($video.find("> height").text()) > 0 ? "video" : $stream.find("> meta > audio").has("*") ? "audio" : "unknown";
			}
			var checkeds = getCheckeds();
			var $lineCont = $("#playbackContainer .boxHead + div").empty();
			// mark ffmpeg_ids for removal
			var remove_ffmpeg = {};
			for (var key in ffmpeg_ids) {
				var names = namesFromKey(key);
				if (names.opName === "play"/* && !checkeds[key]*/) {
					//removeFFmpeg(key);
					remove_ffmpeg[key] = true;
				}
			}
			var rtmpStreams = [], names = {};
			$streams.each(function (i, e) {
				var $e = $(e), rtmp_app = $e.find("name").text(), info = getStreamInfo(rtmp_app);
				rtmpStreams.push({ rtmp_app: rtmp_app, streamType: getStreamType($e), deviceType: info.deviceType, name: info.name });
				names[info.name] = true;
			});
			// add users from the REST service
			for (var i = 0; i < data2[0].length; i++) {
				var restName = data2[0][i];
				if (!names[restName]) {
					rtmpStreams.push({ rtmp_app: restName + dlm + "audio", streamType: "audio", deviceType: "audio", name: restName, unconfirmed: true });
					names[restName] = true;
				}
			}
			// sort rtmpStreams
			rtmpStreams.sort(function(a, b) {
				return strCompare(a.name, b.name) || (deviceTypeOrder(a.deviceType) - deviceTypeOrder(b.deviceType)) || strCompare(a.deviceType, b.deviceType);
			});
			// add header
			function audioLevelIndicatorHtml(name) {
				var _name_hash = name.hashCode(), _level = audio_level[_name_hash], _css;
				if (_level != null)
					_css = audioLevelCss(_level);
				function cssToString(css) { var res = ""; for (var i in css) res += i + ":" + css[i] + ";"; return res; }
				return "<br /><span style='display:inline-block;width:100%;height:2px;" + (_css ? cssToString(_css) : "") + "' id='a" + _name_hash + "'></span>";
			}
			var name = "", $line, $contCheckboxes, cnt;
			for (var i = 0; i < rtmpStreams.length; i++) {
				var rtmpStream = rtmpStreams[i];
				if (name !== rtmpStream.name) {
					if ($contCheckboxes) {
						// add audio level indicator
						$(audioLevelIndicatorHtml(name)).appendTo($contCheckboxes);
					}
					name = rtmpStream.name;
					$line = $(lineHtml(name)).appendTo($lineCont);
					$contCheckboxes = $("<span style='display:inline-block;line-height:0px;margin-top:2px;'></span>").appendTo($line);
					cnt = 0;
				}
				// add missing devices
				var deviceOrder = deviceTypeOrder(rtmpStream.deviceType);
				if (deviceOrder > 0) {
					if (deviceOrder > ++cnt) { // insert before; process in this loop
						var deviceType = orderToDeviceType(cnt);
						rtmpStreams.splice(i, 0, rtmpStream = { rtmp_app: name + dlm + deviceType, streamType: deviceToStreamType(deviceType), deviceType: deviceType, name: name, unconfirmed: true });
					} else if (cnt < 3 && (i + 1 == rtmpStreams.length || name !== rtmpStreams[i + 1].name)) { // insert after; process in the next loop
						var deviceType = orderToDeviceType(cnt + 1);
						rtmpStreams.splice(i + 1, 0, { rtmp_app: name + dlm + deviceType, streamType: deviceToStreamType(deviceType), deviceType: deviceType, name: name, unconfirmed: true });
					}
				}
				if (rtmpStream.rtmp_app) {
					var $ffmpegUi = create$ffmpegUi(rtmpStream.deviceType, checkeds, "play", name).css("margin-left", "10px").appendTo(/*$line*/$contCheckboxes);
					if (rtmpStream.unconfirmed)
						$ffmpegUi.addClass("unconfirmed");
					var key = keyFromNames(rtmpStream.deviceType, "play", name);
					if (/*!checkeds[key]*/!ffmpeg_ids[key]) {
						renewFFmpeg(_op["playback_" + rtmpStream.streamType], key, getRtmpUrl(rtmpStream.rtmp_app));
					}
					remove_ffmpeg[key] = false;
				}
			}
			// remove ffmpeg_ids
			for (var key in remove_ffmpeg) {
				if (remove_ffmpeg[key]) {
					removeFFmpeg(key);
				}
			}
			// add audio level indicator
			$(audioLevelIndicatorHtml(name)).appendTo($contCheckboxes);
			// refresh refresh button
			$("#playbackContainer .boxHead .ui-icon.ui-right").removeClass(arrowrefreshClassStr).addClass(arrowrefreshClasses[(lsCnt++) % 4]);
		}, function (error) {
			var err = error;
		});
	}
	function refreshStreams () {
		window.setTimeout(refreshStreams, 1000);
		listStreams();
	}
	// text chat
	$('#text-chat-text').keypress(function (e) {
		var code = e.keyCode || e.which;
		if (code === 13) {
			e.preventDefault();
			sendButtonClick();
		}
	}).focus();
	$('#text-chat-btn').click(sendButtonClick).button();
	function sendButtonClick() {
		var val = $trimVal('#text-chat-text');
		$('#text-chat-text').val('');
		if (val)
		{
			$.ajax({
				url: textChatUrl(),
				method: 'PUT',
				data: JSON.stringify({ name: getMyName(), text: val }),
				cache: false,
				dataType: 'json'
			}).then(function (data) {
				textChatText($textChatTxtCont, data);
			}, function (error) {
				$('#text-chat-text').val(val); // restore the value
			});
		}
	}
	var lastTextChatDataItem;
	function textChatUrl() { return http_base_url + '/rest/tchat' + (lastTextChatDataItem ? '/' + lastTextChatDataItem.msec + '/' + lastTextChatDataItem.num : ''); }
	function textChatText($cont, data) {
		//$cont.empty();
		data.sort(function (a, b) { var res = a.msec - b.msec; return res != 0 ? res : a.num - b.num; });
		var showTs = $textChatTsCheckbox[0].checked;
		for (var i in data) {
			var item = lastTextChatDataItem = data[i];
			$('<p style="overflow:auto;line-height:1.2;font-size:90%;"></p>').prependTo($cont)
				.append($('<div class="tc-ts' + (showTs ? '' : ' hidden') + '" style="font-size:80%;/*margin-bottom:-3px;margin-top:3px;*/"></div>').text(new Date(item.msec).toLocaleString()))
				.append($('<strong></strong>').text(item.name + ': '))
				.append($('<span></span>').text(item.text));
		}
	}
	var tcCnt = 0;
	function textChat () {
		$.ajax({
			url: textChatUrl(),
			cache: false,
			dataType: 'json'
		}).then(function (data) {
			textChatText($textChatTxtCont, data);
			// refresh refresh button
			//$textChatHeadIcon.attr("class", "ui-icon ui-icon-arrowrefresh-1-" + cardinalPoints[(tcCnt++) % 4] + " ui-button ui-right");
			$textChatHeadIcon.removeClass(arrowrefreshClassStr).addClass(arrowrefreshClasses[(tcCnt++) % 4]);
		}, function (error) {
			var err = error;
		});
	}
	function refreshTextChat () {
		window.setTimeout(refreshTextChat, 500);
		textChat();
	}
	var $textChatHeadIcon = $('#textchatContainer .boxHead .ui-icon').click(function () {
		//textChat();
	}), $textChatTsCheckbox = $('#text-chat-timestamp').click(function () {
		$('.tc-ts')[this.checked ? 'removeClass' : 'addClass']('hidden');
	}), $textChatTxtCont = $('#textContainer');
	// start everything
	enterButtonClick = (e) => {
		$('#sign-in-panel').find('.alert').remove();
		var val = $trimVal('#enter-your-name-txt');
		if (val)
		{
			$('#sign-in-panel').css('display', 'none');
			$.when(
				listDevices(),
				$.ajax({
					url: getHttpBaseUrl() + '/rest/vchat/' + encodeURIComponent(val) + '/' + encodeURIComponent(window.name),
					cache: false,
					dataType: 'json'
				}),
			).then(function (data) {
				$('#video-chat-panel').css('display', '');
				refreshStreams();
				refreshTextChat();
			}, function (error) {
				$('#sign-in-panel').css('display', '');
				$('<div class="alert alert-warning" role="alert" style="margin-top:10px;">' + error.responseText + '</div>').insertAfter(e);
			});
		}
	};
}

// frame consumer threads in Java with the callback function below.
// has to be configured in function renewFFmpeg(op, key, p1, p2, mode, resolution, fps) { ... case _op.playback_video:
function showVideoFrame(ffmpeg_id, frame_sn, dataUri) {
	videos[keys[ffmpeg_id]].drawUri(frame_sn, dataUri);
}

// frame consumer in javascript:
// start the loop				
//animate();

function animate() {
	requestAnimationFrame( animate );
	render();
}

function render() {
	for (var key in videos) {
		if (ffmpeg_ids[key] && (_applet.getSN || typeof(_applet.getSN) === "unknown")) {
			var sn_ = _applet.getSN(ffmpeg_ids[key]);
			if ( sn_ != sn && sn_ > 0 ) {
				sn = sn_;
				var dataURI = _applet.getDataURI(ffmpeg_ids[key]);
				// drop frames accumulated in the queue
/*
				while (_applet.getSN(ffmpeg_ids[key]) > sn) {
					debug("dropped frame # " + sn);
					sn = _applet.getSN(ffmpeg_ids[key]);
					dataURI = _applet.getDataURI(ffmpeg_ids[key]);
				}
*/ // we do it in the applet now when drop-unused-frames="yes"
				// assign image src
				videos[key].drawUri(sn, dataURI);
			}
		}
	}
}

$( document ).on( "click", ".dropdown-menu select", function(event) {
	event.stopPropagation();
});

$(function () {
	function resize() { $('.contCenter').each(function () { var $this = $(this); $this.css('margin-top', ($(document).height() - $this.height()) / 2); }); }
	$(window).resize(resize);
	resize();
});

$( document ).contextmenu({
	delegate: ".video-container",
	menu: [
		{ title: "Restore Original Size", cmd: "resize", uiIcon: "ui-icon-transfer-e-w" },
		{ title: "Bring To Front", cmd: "z-index", uiIcon: "ui-icon-newwin" },
	],
	select: function(event, ui) {
		//alert("select " + ui.cmd + " on " + ui.target);
		var $cont = ui.target.closest(".video-container");
		switch (ui.cmd) {
		case "resize":
			$cont[0].resetToImageNaturalSize();
			break;
		case "z-index":
			var thisZ = 0, maxZ = 0;
			$(".video-container").each(function () { var $this = $(this), zInd = $this.css("z-index"); zInd = isNaN(zInd) ? 0 : parseInt(zInd); if ($cont[0] === this) thisZ = zInd; else if (zInd > maxZ) maxZ = zInd; });
			if (thisZ <= maxZ) {
				$cont.css("z-index", thisZ = maxZ + 1);
				if (thisZ > 85)
					$(".video-container").each(function () { var $this = $(this), zInd = $this.css("z-index"); if (!isNaN(zInd)) $this.css("z-index", parseInt(zInd) - 1); });
			}
			break;
		}
	}
});

$( "#video-chat-panel .contRightTop .boxHead" ).on( "click", function () {
	$(this).next("div").slideToggle();
});
