var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var CanvasModule;
(function (CanvasModule) {
    var ServerMeta = (function () {
        function ServerMeta() {
        }
        return ServerMeta;
    })();
    CanvasModule.ServerMeta = ServerMeta;
    var ServerImageData = (function () {
        function ServerImageData() {
        }
        return ServerImageData;
    })();
    var Meta = (function () {
        function Meta(data, index) {
            var _this = this;
            this.index = index;
            this.thumbHeight = 100;
            this.lastZoom = 0;
            this.lastOffset = new XyCoord(0, 0);
            this.lastCanvasSize = new Size(0, 0);
            this.lastIsVisible = false;
            this.isVisible = function (zoom, offset, canvasSize) {
                var xPos = (_this.gridX * zoom) + offset.x;
                var yPos = (_this.gridY * zoom) + offset.y;
                var height = Math.round(_this.getHeightForZoom(zoom));
                var width = height;
                var isVisible = (xPos + width > 0 && yPos + height > 0 && xPos < canvasSize.width && yPos < canvasSize.height);
                if (isVisible) {
                    _this.canvasCoord = new XyCoord(xPos, yPos);
                    _this.drawSize = new Size(width, height);
                }
                _this.lastZoom = zoom;
                _this.lastOffset = offset;
                _this.lastCanvasSize = canvasSize;
                _this.lastIsVisible = isVisible;
                return isVisible;
            };
            this.xPixForHeight = function (height) {
                var xFactor = _this.height / height;
                return Math.round(_this.width / xFactor);
            };
            this.getHeightForZoom = function (zoom) {
                return _this.thumbHeight * zoom;
            };
            this.id = data.ImageInfoId;
            this.name = data.Name;
            this.width = data.Width;
            this.height = data.Height;
        }
        return Meta;
    })();
    var XyCoord = (function () {
        function XyCoord(x, y) {
            this.x = x;
            this.y = y;
        }
        return XyCoord;
    })();
    var Size = (function () {
        function Size(width, height) {
            this.width = width;
            this.height = height;
        }
        return Size;
    })();
    var ImageRequest = (function () {
        function ImageRequest(meta, requestedHeight, minHeight) {
            this.meta = meta;
            this.requestedHeight = requestedHeight;
            this.minHeight = minHeight;
        }
        return ImageRequest;
    })();
    var Dictionary = (function () {
        function Dictionary() {
            var _this = this;
            this.ids = [];
            this.asArray = function () {
                return $.map(_this.members, function (member) {
                    return member;
                });
            };
            this.add = function (member) {
            };
        }
        return Dictionary;
    })();
    var ImageRequestQueue = (function () {
        function ImageRequestQueue(func) {
            var _this = this;
            this.func = func;
            this.requests = {};
            this.ids = [];
            this.batchQueueLimit = 10;
            this.timerWait = 300;
            this.addRequest = function (request) {
                //if change of size then reset automatically.
                if (_this.ids.length > 0 && _this.requests[_this.ids[0]].requestedHeight !== request.requestedHeight) {
                    _this.clear();
                }
                if (!_this.requests[request.meta.id]) {
                    _this.ids.push(request.meta.id);
                    _this.requestedHeight = request.requestedHeight;
                    _this.minHeight = request.minHeight;
                }
                _this.requests[request.meta.id] = request;
                if (!_this.isRunning()) {
                    _this.doStart();
                }
            };
            this.processRequests = function () {
                _this.timer = undefined;
                var count = _this.count();
                if (count > _this.batchQueueLimit) {
                    _this.getBatchOfImages(_this.ids, _this.requestedHeight, _this.minHeight);
                }
                else {
                    $.each(_this.requests, function (id, request) {
                        _this.getSingleImage(request.meta, request.requestedHeight, request.minHeight);
                    });
                }
                _this.clear();
            };
            this.clear = function () {
                window.clearTimeout(_this.timer);
                _this.requests = {};
                _this.timer = undefined;
                _this.ids = [];
            };
            this.doStart = function () {
                _this.timer = window.setTimeout(_this.processRequests, _this.timerWait);
            };
            this.isRunning = function () {
                return _this.timer !== undefined;
            };
            this.start = function () {
                window.clearTimeout(_this.timer);
                _this.doStart();
            };
            this.count = function () {
                return _this.ids.length;
            };
            this.getSingleImage = function (meta, requestedHeight, minHeight) {
                var xhr = $.getJSON("/api/Images/" + meta.id + "/" + requestedHeight + "/" + minHeight);
                xhr.done(function (data) {
                    _this.func(data);
                });
                xhr.fail(function (jqXhr, textStatus, err) {
                    console.log(jqXhr + '\n' + textStatus + '\n' + err);
                });
            };
            this.getBatchOfImages = function (requests, requestedHeight, minHeight) {
                var xhr = $.post("/api/Images/" + requestedHeight + "/" + minHeight, { '': requests });
                xhr.done(function (images) {
                    $.each(images, function (id, image) {
                        _this.func(image);
                    });
                });
                xhr.fail(function (jqXhr, textStatus, err) {
                    console.log(jqXhr + '\n' + textStatus + '\n' + err);
                });
            };
        }
        return ImageRequestQueue;
    })();
    var RepeatingCanvasEvent = (function () {
        function RepeatingCanvasEvent() {
            var _this = this;
            this.containerFunc = function () {
                _this.func();
                if (_this.running) {
                    window.requestAnimationFrame(_this.containerFunc);
                }
            };
            this.start = function (func) {
                _this.running = true;
                _this.func = func;
                window.requestAnimationFrame(_this.containerFunc);
            };
            this.stop = function () {
                _this.running = false;
            };
            this.isRunning = function () {
                return _this.running;
            };
        }
        return RepeatingCanvasEvent;
    })();
    var CanvasZoomAnimate = (function (_super) {
        __extends(CanvasZoomAnimate, _super);
        function CanvasZoomAnimate(canvas, offsetCalc, drawImages, onComplete) {
            var _this = this;
            _super.call(this);
            this.canvas = canvas;
            this.offsetCalc = offsetCalc;
            this.drawImages = drawImages;
            this.onComplete = onComplete;
            this.totalSteps = 8;
            this.zoomIn = function (mult) {
                _this.step = 1;
                _this.stepMult = Math.pow(mult, 1 / _this.totalSteps);
                _this.endMult = mult;
                _this.start(_this.zoomFunc);
            };
            this.zoomFunc = function () {
                if (_this.step === _this.totalSteps) {
                    _this.stop();
                    _this.onComplete(_this.stepMult, _this.offsetCalc.calc(_this.stepMult));
                    return;
                }
                _this.drawImages(_this.stepMult, _this.offsetCalc.calc(_this.stepMult));
                _this.step += 1;
            };
        }
        return CanvasZoomAnimate;
    })(RepeatingCanvasEvent);
    var ZoomOffsetCalc = (function () {
        function ZoomOffsetCalc(mouseCoord, offset) {
            var _this = this;
            this.mouseCoord = mouseCoord;
            this.offset = offset;
            this.calc = function (mult) {
                _this.offset.x = _this.mouseCoord.x - mult * (_this.mouseCoord.x - _this.offset.x);
                _this.offset.y = _this.mouseCoord.y - mult * (_this.mouseCoord.y - _this.offset.y);
                return _this.offset;
            };
        }
        return ZoomOffsetCalc;
    })();
    var CanvasController = (function () {
        function CanvasController(canvas, tagViewModel) {
            var _this = this;
            this.tagViewModel = tagViewModel;
            this.meta = [];
            this.zoomSlider = ko.observable(0);
            this.zoom = 1;
            this.debug = ko.observable("");
            this.offset = new XyCoord(0, 0);
            this.startMove = new XyCoord(0, 0);
            this.keysPushed = {};
            this.canvasMove = new RepeatingCanvasEvent();
            //constants
            this.thumbHeight = 100;
            this.maxZoom = 100;
            this.minZoom = 0.001;
            this.zoomInMultiplier = 1.6;
            this.zoomOutMultiplier = 1 / this.zoomInMultiplier;
            this.zoomOutImageTrigger = 1.1;
            this.keyMoveSpeed = 10;
            this.makeImageRequest = function (meta, requestedHeight, minHeight) {
                _this.requestQueue.addRequest(new ImageRequest(meta, requestedHeight, minHeight));
            };
            this.imageDataReceived = function (image) {
                var img = new Image();
                img.src = "data:image/jpeg;base64," + image.Data;
                _this.meta[image.ImageId].highRes = img;
                _this.drawImage(_this.meta[image.ImageId]);
            };
            this.initialiseGrid = function () {
                var totImages = _this.meta.length;
                var n = Math.ceil(Math.sqrt(totImages));
                _this.grid = new Size(n * _this.thumbHeight, n * _this.thumbHeight);
                var time = new Date().getTime();
                for (var i = 1; i < _this.meta.length; i++) {
                    var gridxy = _this.d2Xy(n, _this.meta[i].index);
                    _this.meta[i].gridX = gridxy.x * _this.thumbHeight;
                    _this.meta[i].gridY = gridxy.y * _this.thumbHeight;
                }
                console.log("hilbert created in " + (new Date().getTime() - time) + " milliseconds");
            };
            this.d2Xy = function (n, d) {
                var r = new XyCoord(0, 0);
                var t = d;
                var xy = new XyCoord(0, 0);
                for (var s = 1; s < n; s *= 2) {
                    r.x = 1 & (t / 2);
                    r.y = 1 & (t ^ r.x);
                    xy = _this.rot(s, xy, r);
                    xy.x += s * r.x;
                    xy.y += s * r.y;
                    t /= 4;
                }
                return xy;
            };
            this.rot = function (n, xy, r) {
                if (r.y === 0) {
                    if (r.x === 1) {
                        xy.x = n - 1 - xy.x;
                        xy.y = n - 1 - xy.y;
                    }
                    var t = xy.x;
                    xy.x = xy.y;
                    xy.y = t;
                }
                return xy;
            };
            this.drawBox = function (meta, width, height) {
                var ctx = _this.canvas.getContext("2d");
                ctx.strokeRect(meta.gridX + 0.5, meta.gridY + 0.5, width, height);
            };
            this.xPixForHeight = function (meta, height) {
                var xFactor = meta.height / height;
                return Math.round(meta.width / xFactor);
            };
            this.setupCanvas = function () {
                var width = _this.canvas.parentElement.clientWidth;
                var height = _this.canvas.parentElement.clientHeight;
                _this.canvas.width = width;
                _this.canvas.height = height;
            };
            this.drawImages = function () {
                _this.constrainOffset();
                _this.setupCanvas();
                for (var i = 1; i < _this.meta.length; i++) {
                    if (_this.meta[i].isVisible(_this.zoom, _this.offset, new Size(_this.canvas.width, _this.canvas.height))) {
                        _this.drawImage(_this.meta[i]);
                    }
                }
            };
            this.getHeightForZoom = function (zoom) {
                return _this.thumbHeight * zoom;
            };
            //private imageIsVisible = (meta: Meta): boolean => {
            //	var xPos = (meta.gridX * this.zoom) + this.offset.x;
            //	var yPos = (meta.gridY * this.zoom) + this.offset.y;
            //	var height = Math.round(this.getHeightForZoom(this.zoom));
            //	var width = this.xPixForHeight(meta, height);
            //	return (xPos + width > 0 && yPos + height > 0 && xPos < this.canvas.width && yPos < this.canvas.height)
            //};
            this.drawImage = function (meta, newImage) {
                var image;
                if (!meta.isVisible(_this.zoom, _this.offset, new Size(_this.canvas.width, _this.canvas.height))) {
                    return;
                }
                var ctx = _this.canvas.getContext("2d");
                if (!meta.highRes && !newImage) {
                    _this.makeImageRequest(meta, meta.drawSize.height, 1);
                    ctx.fillRect(meta.canvasCoord.x, meta.canvasCoord.y, meta.drawSize.width, meta.drawSize.height);
                    return;
                }
                image = meta.highRes;
                if (_this.imageIsTooSmall(meta, meta.highRes)) {
                    if (newImage && !_this.imageIsTooSmall(meta, newImage)) {
                        image = newImage;
                    }
                    else {
                        _this.makeImageRequest(meta, meta.drawSize.height, meta.highRes.height + 1);
                    }
                }
                if (_this.imageIsTooBig(meta.drawSize.height, meta.highRes)) {
                    if (newImage && !_this.imageIsTooBig(meta.drawSize.height, newImage)) {
                        image = newImage;
                    }
                    else {
                        _this.makeImageRequest(meta, meta.drawSize.height, 0);
                    }
                }
                ctx.drawImage(image, meta.canvasCoord.x, meta.canvasCoord.y, meta.drawSize.width, meta.drawSize.height);
            };
            this.imageIsTooSmall = function (meta, image) {
                return (meta.height > image.height && image.height < meta.drawSize.height) || (meta.width > image.width && image.width < meta.drawSize.width);
            };
            this.imageIsTooBig = function (height, image) {
                return height * _this.zoomOutImageTrigger < image.height;
            };
            this.setStart = function (evt) {
                var downCoord = _this.getMouseCoord(_this.canvas, evt);
                _this.startMove.x = downCoord.x - _this.offset.x;
                _this.startMove.y = downCoord.y - _this.offset.y;
            };
            this.preventDefault = function (evt) {
                evt.preventDefault();
            };
            this.mouseDownListener = function (evt) {
                evt.preventDefault();
                _this.canvas.focus();
                _this.setStart(evt);
                _this.canvas.addEventListener("mousemove", _this.mouseMoveListener);
                _this.canvas.addEventListener("mouseup", _this.mouseUpListener);
                _this.canvas.addEventListener("mouseout", _this.mouseUpListener);
                document.addEventListener("selectstart", _this.preventDefault);
                document.addEventListener("contextmenu", _this.preventDefault);
            };
            this.mouseMoveListener = function (evt) {
                var coord = _this.getMouseCoord(_this.canvas, evt);
                _this.offset.x = coord.x - _this.startMove.x;
                _this.offset.y = coord.y - _this.startMove.y;
                _this.setStart(evt);
                _this.drawImages();
            };
            this.mouseUpListener = function (evt) {
                _this.canvas.removeEventListener("mousemove", _this.mouseMoveListener);
                _this.canvas.removeEventListener("mouseup", _this.mouseUpListener);
                _this.canvas.removeEventListener("mouseout", _this.mouseUpListener);
                document.removeEventListener('selectstart', _this.preventDefault);
                _this.keysPushed = {};
            };
            this.keyUpListener = function (evt) {
                if (_this.keysPushed[evt.keyCode]) {
                    delete _this.keysPushed[evt.keyCode];
                }
            };
            this.keyDownListener = function (evt) {
                var keysToListen = {
                    37: new XyCoord(1, 0),
                    38: new XyCoord(0, 1),
                    39: new XyCoord(-1, 0),
                    40: new XyCoord(0, -1)
                };
                _this.writeDebug("keycode pushed = " + evt.keyCode);
                if (!keysToListen[evt.keyCode]) {
                    return;
                }
                evt.preventDefault();
                _this.keysPushed[evt.keyCode] = keysToListen[evt.keyCode];
                if (!_this.canvasMove.isRunning()) {
                    _this.canvasMove.start(_this.moveByKey);
                }
            };
            this.moveByKey = function () {
                if ($.isEmptyObject(_this.keysPushed)) {
                    _this.canvasMove.stop();
                    return;
                }
                try {
                    $.each(_this.keysPushed, function (coord) {
                        _this.offset.x += _this.keysPushed[coord].x * _this.keyMoveSpeed;
                        _this.offset.y += _this.keysPushed[coord].y * _this.keyMoveSpeed;
                    });
                }
                catch (err) {
                }
                _this.drawImages();
            };
            this.constrainOffset = function () {
                var rightMost = 0 - ((_this.grid.width * _this.zoom) - _this.canvas.width);
                if (_this.offset.x < rightMost) {
                    _this.offset.x = rightMost;
                }
                if (_this.offset.x > 0) {
                    _this.offset.x = 0;
                }
                if (_this.offset.y > 0) {
                    _this.offset.y = 0;
                }
                var bottom = 0 - ((_this.grid.height * _this.zoom) - _this.canvas.height);
                if (_this.offset.y < bottom) {
                    _this.offset.y = bottom;
                }
            };
            this.getMouseCoord = function (canvas, evt) {
                var rect = canvas.getBoundingClientRect();
                return {
                    x: evt.clientX - rect.left,
                    y: evt.clientY - rect.top
                };
            };
            this.zoomBySlider = function (sliderval) {
                var centreCanvasCoord = new XyCoord(_this.canvas.width / 2, _this.canvas.height / 2);
                var newZoom = Math.pow(_this.zoomInMultiplier, sliderval);
                var mult = newZoom / _this.zoom;
                _this.startZoomAnimate(mult, centreCanvasCoord);
            };
            this.zoomImageFinal = function (multiplier, offset) {
                _this.zoom *= multiplier;
                _this.offset.x = offset.x;
                _this.offset.y = offset.y;
                _this.zoomSlider(Math.log(_this.zoom) / Math.log(_this.zoomInMultiplier));
                //this.prepareImages();
                _this.drawImages();
                _this.canvas.addEventListener("wheel", _this.mouseWheelListener);
            };
            this.zoomImageMid = function (multiplier, offset) {
                _this.offset.x = offset.x;
                _this.offset.y = offset.y;
                _this.zoom *= multiplier;
                _this.drawImages();
            };
            this.mouseWheelListener = function (evt) {
                evt.preventDefault();
                var x = evt.wheelDelta;
                var mult = 0;
                if (x > 0 && _this.zoom <= _this.maxZoom) {
                    mult = _this.zoomInMultiplier;
                    if (_this.zoom * mult > _this.maxZoom) {
                        mult = _this.maxZoom / _this.zoom;
                    }
                }
                if (x < 0 && _this.zoom >= _this.minZoom) {
                    mult = _this.zoomOutMultiplier;
                    if (_this.zoom * _this.zoomOutMultiplier < _this.minZoom) {
                        mult = _this.minZoom / _this.zoom;
                    }
                    if (_this.getHeightForZoom(_this.zoom * mult) < 1) {
                        mult = 1 / _this.getHeightForZoom(_this.zoom);
                    }
                }
                if (mult && mult !== 1) {
                    //this.writeDebug("zoom changed to " + this.zoom * mult + " height is " + this.getHeightForZoom(this.zoom * mult));
                    _this.startZoomAnimate(mult, _this.getMouseCoord(_this.canvas, evt));
                }
            };
            this.startZoomAnimate = function (mult, zoomFocusCoord) {
                _this.canvas.removeEventListener("wheel", _this.mouseWheelListener);
                //this.requestQueue.clear(); //images already in request queue are now probably not the required detail level.
                _this.canvasZoom = new CanvasZoomAnimate(_this.canvas, new ZoomOffsetCalc(zoomFocusCoord, _this.offset), _this.zoomImageMid, _this.zoomImageFinal);
                _this.canvasZoom.zoomIn(mult);
            };
            this.writeDebug = function (message) {
                _this.debug(_this.debug() + message + "\n");
                var textarea = document.getElementById("debug");
                textarea.scrollTop = textarea.scrollHeight;
            };
            this.requestQueue = new ImageRequestQueue(this.imageDataReceived);
            $.getJSON("/api/Images/Meta", function (data) {
                var mapped = new Array();
                for (var i = 0; i < data.length; i++) {
                    mapped[data[i].ImageInfoId] = new Meta(data[i], i);
                }
                _this.meta = mapped;
                _this.canvas = canvas;
                _this.initialiseGrid();
                _this.setupCanvas();
                _this.drawImages();
                _this.mouseDownListener = _this.mouseDownListener.bind(_this);
                _this.canvas.addEventListener("mousedown", _this.mouseDownListener);
                _this.canvas.addEventListener("wheel", _this.mouseWheelListener);
                _this.canvas.focus();
                _this.canvas.addEventListener("keydown", _this.keyDownListener, false);
                _this.canvas.addEventListener("keyup", _this.keyUpListener, false);
            });
            this.zoomSlider.subscribe(this.zoomBySlider);
        }
        return CanvasController;
    })();
    CanvasModule.CanvasController = CanvasController;
})(CanvasModule || (CanvasModule = {}));
//# sourceMappingURL=canvas.js.map