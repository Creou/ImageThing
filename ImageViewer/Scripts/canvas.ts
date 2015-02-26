
module CanvasModule {
	import ImageTagViewModel = TagModule.ImageTagViewModel;
	import Guid = UUID.UUID;

	export class ServerMeta {
		ImageInfoId: number;
		Name: string;
		Width: number;
		Height: number;
	}

	class ServerImageData {
		ImageId: number;
		Data: string;
	}

	class Meta {
		id: number;
		name: string;
		width: number;
		height: number;
		gridX: number;
		gridY: number;
		canvasCoord: XyCoord;
		drawSize: Size;
		suboffset: XyCoord;
		private thumbHeight: number = 100;
		private lastZoom: number = 0;
		private lastOffset: XyCoord = new XyCoord(0, 0);
		private lastCanvasSize: Size = new Size(0, 0);
		private lastIsVisible: boolean = false;

		highRes: HTMLImageElement;

		constructor(data: ServerMeta, public index: number) {
			this.id = data.ImageInfoId;
			this.name = data.Name;
			this.width = data.Width;
			this.height = data.Height;
		}

		isVisible = (zoom: number, offset: XyCoord, canvasSize: Size) => {
			var xPos = (this.gridX * zoom) + offset.x;
			var yPos = (this.gridY * zoom) + offset.y;
			var height = Math.round(this.getHeightForZoom(zoom));
			var width = height;
			var isVisible = (xPos + width > 0 && yPos + height > 0 && xPos < canvasSize.width && yPos < canvasSize.height);
			if (isVisible) {
				this.canvasCoord = new XyCoord(xPos, yPos);
				this.drawSize = new Size(width, height);
			}
			this.lastZoom = zoom;
			this.lastOffset = offset;
			this.lastCanvasSize = canvasSize;
			this.lastIsVisible = isVisible;
			return isVisible;
		};

		private xPixForHeight = (height: number) => {
			var xFactor = this.height / height;
			return Math.round(this.width / xFactor);
		};

		private getHeightForZoom = (zoom: number): number => {
			return this.thumbHeight * zoom;
		};
	}

	class XyCoord {
		constructor(public x: number, public y: number) { }
	}

	class Size {
		constructor(public width: number, public height: number) { }
	}

	class ImageRequest {
		constructor(public meta: Meta, public requestedHeight: number, public minHeight: number) { }
	}

	class Dictionary<T> {
		members: { [key: number]: T };
		ids: Array<number> = [];
		asArray = () => {
			return $.map(this.members,(member) => { return member });
		}
		add = (member) => {

		}
	}

	class ImageRequestQueue {
		// Todo:
		// Check if there are outstanding image requests that will fullfil parts of this request
		// prior to sending this request. If some images are already requested but outstanding
		// remove them from this request.
		timer: number;
		requests: { [id: number]: ImageRequest } = {};
		requestedHeight: number;
		minHeight: number;
		public ids: Array<number> = [];
		private batchQueueLimit: number = 10;
		private timerWait: number = 300;

		constructor(private func: (image: ServerImageData) => void) { }

		addRequest = (request: ImageRequest) => {
			//if change of size then reset automatically.
			if (this.ids.length > 0 && this.requests[this.ids[0]].requestedHeight !== request.requestedHeight) {
				this.clear();
			}
			if (!this.requests[request.meta.id]) {
				this.ids.push(request.meta.id);
				this.requestedHeight = request.requestedHeight;
				this.minHeight = request.minHeight;
			}
			this.requests[request.meta.id] = request;

			if (!this.isRunning()) {
				this.doStart();
			}
		};

		private processRequests = () => {
			this.timer = undefined;
			var count: number = this.count();
			if (count > this.batchQueueLimit) {
				this.getBatchOfImages(this.ids, this.requestedHeight, this.minHeight);
			} else {
				$.each(this.requests,(id: number, request: ImageRequest) => {
					this.getSingleImage(request.meta, request.requestedHeight, request.minHeight);
				});
			}
			this.clear();
		};

		private clear = () => {
			window.clearTimeout(this.timer);
			this.requests = {};
			this.timer = undefined;
			this.ids = [];
		};

		private doStart = () => {
			this.timer = window.setTimeout(this.processRequests, this.timerWait);
		};

		isRunning = () => {
			return this.timer !== undefined;
		};

		start = () => {
			window.clearTimeout(this.timer);
			this.doStart();
		};

		count = () => {
			return this.ids.length;
		}

		private getSingleImage = (meta: Meta, requestedHeight, minHeight) => {
			var xhr = $.getJSON("/api/Images/" + meta.id + "/" + requestedHeight + "/" + minHeight);
			xhr.done((data: ServerImageData) => {
				this.func(data);
			});
			xhr.fail((jqXhr, textStatus, err) => {
				console.log(jqXhr + '\n' + textStatus + '\n' + err);
			});
		};

		private getBatchOfImages = (requests: Array<number>, requestedHeight, minHeight) => {
			var xhr = $.post("/api/Images/" + requestedHeight + "/" + minHeight, { '': requests });
			xhr.done((images: Array<ServerImageData>) => {
				$.each(images,(id: number, image: ServerImageData) => {
					this.func(image);
				});
			});
			xhr.fail((jqXhr, textStatus, err) => {
				console.log(jqXhr + '\n' + textStatus + '\n' + err);
			});
		};
	}

	class RepeatingCanvasEvent {
		private running: boolean;
		private func: () => {};
		private containerFunc = () => {
			this.func();
			if (this.running) {
				window.requestAnimationFrame(this.containerFunc);
			}
		};
		start = (func) => {
			this.running = true;
			this.func = func;
			window.requestAnimationFrame(this.containerFunc);
		};

		stop = () => {
			this.running = false;
		};
		isRunning = () => {
			return this.running;
		}
	}

	class CanvasZoomAnimate extends RepeatingCanvasEvent {
		private totalSteps: number = 8;
		private step: number;
		private stepMult: number;
		private endMult: number;

		constructor(
			private canvas: HTMLCanvasElement,
			private offsetCalc: ZoomOffsetCalc,
			private drawImages: (zoom: number, offset: XyCoord) => void,
			private onComplete: (zoom: number, offset: XyCoord) => void
			) {
			super();
		}

		zoomIn = (mult: number) => {
			this.step = 1;
			this.stepMult = Math.pow(mult, 1 / this.totalSteps);
			this.endMult = mult;
			this.start(this.zoomFunc);
		};
		private zoomFunc = () => {
			if (this.step === this.totalSteps) {
				this.stop();
				this.onComplete(this.stepMult, this.offsetCalc.calc(this.stepMult));
				return;
			}
			this.drawImages(this.stepMult, this.offsetCalc.calc(this.stepMult));

			this.step += 1;
		};
	}

	class ZoomOffsetCalc {
		constructor(private mouseCoord: XyCoord, private offset: XyCoord) {
		}
		public calc = (mult: number) => {
			this.offset.x = this.mouseCoord.x - mult * (this.mouseCoord.x - this.offset.x);
			this.offset.y = this.mouseCoord.y - mult * (this.mouseCoord.y - this.offset.y);
			return this.offset;
		};
	}

	export class CanvasController {
		private meta: Array<Meta> = [];
		canvas: HTMLCanvasElement;
		zoomSlider: KnockoutObservable<number> = ko.observable<number>(0);
		private zoom: number = 1;
		debug: KnockoutObservable<string> = ko.observable<string>("");
		private offset: XyCoord = new XyCoord(0, 0);
		private startMove: XyCoord = new XyCoord(0, 0);
		private grid: Size;
		private keysPushed: { [keyCode: number]: XyCoord; } = {};
		private requestQueue: ImageRequestQueue;
		private canvasMove: RepeatingCanvasEvent = new RepeatingCanvasEvent();
		private canvasZoom: CanvasZoomAnimate;
		//constants
		private thumbHeight: number = 100;
		private maxZoom: number = 100;
		private minZoom: number = 0.001;
		private zoomInMultiplier: number = 1.6;
		private zoomOutMultiplier: number = 1 / this.zoomInMultiplier;
		private zoomOutImageTrigger: number = 1.1;
		private keyMoveSpeed: number = 10;

		constructor(canvas: HTMLCanvasElement, public tagViewModel: ImageTagViewModel) {
			this.requestQueue = new ImageRequestQueue(this.imageDataReceived);
			$.getJSON("/api/Images/Meta",(data: Array<ServerMeta>) => {
				var mapped: Array<Meta> = new Array<Meta>();
				for (var i = 0; i < data.length; i++) {
					mapped[data[i].ImageInfoId] = new Meta(data[i], i);
				}
				this.meta = mapped;
				this.canvas = canvas;
				this.initialiseGrid();
				this.setupCanvas();
				this.drawImages();
				this.mouseDownListener = this.mouseDownListener.bind(this);
				this.canvas.addEventListener("mousedown", this.mouseDownListener);
				this.canvas.addEventListener("wheel", this.mouseWheelListener);
				this.canvas.focus();
				this.canvas.addEventListener("keydown", this.keyDownListener, false);
				this.canvas.addEventListener("keyup", this.keyUpListener, false);
			});
			this.zoomSlider.subscribe(this.zoomBySlider);
		}

		private makeImageRequest = (meta: Meta, requestedHeight, minHeight) => {
			this.requestQueue.addRequest(new ImageRequest(meta, requestedHeight, minHeight));
		};

		private imageDataReceived = (image: ServerImageData) => {
			var img = new Image();
			img.src = "data:image/jpeg;base64," + image.Data;
			this.meta[image.ImageId].highRes = img;
			this.drawImage(this.meta[image.ImageId]);
		};

		private initialiseGrid = () => {
			var totImages = this.meta.length;
			var n = Math.ceil(Math.sqrt(totImages));
			this.grid = new Size(n * this.thumbHeight, n * this.thumbHeight);
			var time = new Date().getTime();
			for (var i = 1; i < this.meta.length; i++) {
				var gridxy = this.d2Xy(n, this.meta[i].index);
				this.meta[i].gridX = gridxy.x * this.thumbHeight;
				this.meta[i].gridY = gridxy.y * this.thumbHeight;
			}
			console.log("hilbert created in " + (new Date().getTime() - time) + " milliseconds");
		};

		private d2Xy = (n: number, d: number): XyCoord => {
			var r: XyCoord = new XyCoord(0, 0);
			var t: number = d;
			var xy = new XyCoord(0, 0);
			for (var s = 1; s < n; s *= 2) {
				r.x = 1 & (t / 2);
				r.y = 1 & (t ^ r.x);
				xy = this.rot(s, xy, r);
				xy.x += s * r.x;
				xy.y += s * r.y;
				t /= 4;
			}
			return xy;
		}

		private rot = (n: number, xy: XyCoord, r: XyCoord): XyCoord => {
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
		}

		private drawBox = (meta: Meta, width: number, height: number) => {
			var ctx = this.canvas.getContext("2d");
			ctx.strokeRect(meta.gridX + 0.5, meta.gridY + 0.5, width, height);
		};

		private xPixForHeight = (meta: Meta, height: number) => {
			var xFactor = meta.height / height;
			return Math.round(meta.width / xFactor);
		};

		private setupCanvas = () => {
			var width = this.canvas.parentElement.clientWidth;
			var height = this.canvas.parentElement.clientHeight;
			this.canvas.width = width;
			this.canvas.height = height;
		};

		private drawImages = () => {
			this.constrainOffset();
			this.setupCanvas();
			for (var i = 1; i < this.meta.length; i++) {
				if (this.meta[i].isVisible(this.zoom, this.offset, new Size(this.canvas.width, this.canvas.height))) {
					this.drawImage(this.meta[i]);
				}
			}
		};

		private getHeightForZoom = (zoom: number): number => {
			return this.thumbHeight * zoom;
		};

		//private imageIsVisible = (meta: Meta): boolean => {
		//	var xPos = (meta.gridX * this.zoom) + this.offset.x;
		//	var yPos = (meta.gridY * this.zoom) + this.offset.y;
		//	var height = Math.round(this.getHeightForZoom(this.zoom));
		//	var width = this.xPixForHeight(meta, height);
		//	return (xPos + width > 0 && yPos + height > 0 && xPos < this.canvas.width && yPos < this.canvas.height)
		//};

		private drawImage = (meta: Meta, newImage?: HTMLImageElement) => {
			var image: HTMLImageElement;
			if (!meta.isVisible(this.zoom, this.offset, new Size(this.canvas.width, this.canvas.height))) {
				return;
			}
			var ctx = this.canvas.getContext("2d");
			if (!meta.highRes && !newImage) {
				this.makeImageRequest(meta, meta.drawSize.height, 1);
				ctx.fillRect(meta.canvasCoord.x, meta.canvasCoord.y, meta.drawSize.width, meta.drawSize.height);
				return;
			}
			image = meta.highRes;
			if (this.imageIsTooSmall(meta, meta.highRes)) {
				if (newImage && !this.imageIsTooSmall(meta, newImage)) {
					image = newImage;
				} else {
					this.makeImageRequest(meta, meta.drawSize.height, meta.highRes.height + 1);
				}
			}
			if (this.imageIsTooBig(meta.drawSize.height, meta.highRes)) {
				if (newImage && !this.imageIsTooBig(meta.drawSize.height, newImage)) {
					image = newImage;
				} else {
					this.makeImageRequest(meta, meta.drawSize.height, 0);
				}
			}
			ctx.drawImage(image, meta.canvasCoord.x, meta.canvasCoord.y, meta.drawSize.width, meta.drawSize.height);
		};

		private imageIsTooSmall = (meta: Meta, image: HTMLImageElement): boolean => {
			return (meta.height > image.height && image.height < meta.drawSize.height) ||
				(meta.width > image.width && image.width < meta.drawSize.width);
		};

		private imageIsTooBig = (height: number, image: HTMLImageElement): boolean => {
			return height * this.zoomOutImageTrigger < image.height;
		};

		private setStart = (evt: MouseEvent) => {
			var downCoord = this.getMouseCoord(this.canvas, evt);
			this.startMove.x = downCoord.x - this.offset.x;
			this.startMove.y = downCoord.y - this.offset.y;
		};

		private preventDefault = (evt: Event) => {
			evt.preventDefault();
		};

		private mouseDownListener = (evt: MouseEvent) => {
			evt.preventDefault();
			this.canvas.focus();
			this.setStart(evt);
			this.canvas.addEventListener("mousemove", this.mouseMoveListener);
			this.canvas.addEventListener("mouseup", this.mouseUpListener);
			this.canvas.addEventListener("mouseout", this.mouseUpListener);
			document.addEventListener("selectstart", this.preventDefault);
			document.addEventListener("contextmenu", this.preventDefault);
		};

		private mouseMoveListener = (evt: MouseEvent) => {
			var coord = this.getMouseCoord(this.canvas, evt);
			this.offset.x = coord.x - this.startMove.x;
			this.offset.y = coord.y - this.startMove.y;
			this.setStart(evt);
			this.drawImages();
		};

		private mouseUpListener = (evt: MouseEvent) => {
			this.canvas.removeEventListener("mousemove", this.mouseMoveListener);
			this.canvas.removeEventListener("mouseup", this.mouseUpListener);
			this.canvas.removeEventListener("mouseout", this.mouseUpListener);
			document.removeEventListener('selectstart', this.preventDefault);
			this.keysPushed = {};
		};

		private keyUpListener = (evt: KeyboardEvent) => {
			if (this.keysPushed[evt.keyCode]) {
				delete this.keysPushed[evt.keyCode];
			}
		};

		private keyDownListener = (evt: KeyboardEvent) => {
			var keysToListen = {
				37: new XyCoord(1, 0),
				38: new XyCoord(0, 1),
				39: new XyCoord(-1, 0),
				40: new XyCoord(0, -1)
			};
			this.writeDebug("keycode pushed = " + evt.keyCode);
			if (!keysToListen[evt.keyCode]) {
				return;
			}
			evt.preventDefault();
			this.keysPushed[evt.keyCode] = keysToListen[evt.keyCode];

			if (!this.canvasMove.isRunning()) {
				this.canvasMove.start(this.moveByKey);
			}
		};

		private moveByKey = () => {
			if ($.isEmptyObject(this.keysPushed)) {
				this.canvasMove.stop();
				return;
			}
			try {
				$.each(this.keysPushed,(coord: number) => {
					this.offset.x += this.keysPushed[coord].x * this.keyMoveSpeed;
					this.offset.y += this.keysPushed[coord].y * this.keyMoveSpeed;
				});
			} catch (err) {
			}
			this.drawImages();
		};

		private constrainOffset = () => {
			var rightMost = 0 - ((this.grid.width * this.zoom) - this.canvas.width);
			if (this.offset.x < rightMost) {
				this.offset.x = rightMost;
			}
			if (this.offset.x > 0) {
				this.offset.x = 0;
			}
			if (this.offset.y > 0) {
				this.offset.y = 0;
			}
			var bottom = 0 - ((this.grid.height * this.zoom) - this.canvas.height);
			if (this.offset.y < bottom) {
				this.offset.y = bottom;
			}
		};

		private getMouseCoord = (canvas: HTMLCanvasElement, evt: MouseEvent): XyCoord => {
			var rect = canvas.getBoundingClientRect();
			return {
				x: evt.clientX - rect.left,
				y: evt.clientY - rect.top
			};
		};

		private zoomBySlider = (sliderval: number) => {
			var centreCanvasCoord = new XyCoord(this.canvas.width / 2, this.canvas.height / 2);

			var newZoom = Math.pow(this.zoomInMultiplier, sliderval);
			var mult = newZoom / this.zoom;
			this.startZoomAnimate(mult, centreCanvasCoord);
		};

		private zoomImageFinal = (multiplier: number, offset: XyCoord) => {
			this.zoom *= multiplier;
			this.offset.x = offset.x;
			this.offset.y = offset.y;
			this.zoomSlider(Math.log(this.zoom) / Math.log(this.zoomInMultiplier));
			//this.prepareImages();
			this.drawImages();
			this.canvas.addEventListener("wheel", this.mouseWheelListener);
		};

		private zoomImageMid = (multiplier: number, offset: XyCoord) => {
			this.offset.x = offset.x;
			this.offset.y = offset.y;
			this.zoom *= multiplier;
			this.drawImages();
		};

		private mouseWheelListener = (evt: MouseWheelEvent) => {
			evt.preventDefault();
			var x = evt.wheelDelta;
			var mult = 0;
			if (x > 0 && this.zoom <= this.maxZoom) {
				mult = this.zoomInMultiplier;
				if (this.zoom * mult > this.maxZoom) {
					mult = this.maxZoom / this.zoom;
				}
			}

			if (x < 0 && this.zoom >= this.minZoom) {
				mult = this.zoomOutMultiplier;
				if (this.zoom * this.zoomOutMultiplier < this.minZoom) {
					mult = this.minZoom / this.zoom;
				}
				if (this.getHeightForZoom(this.zoom * mult) < 1) {
					mult = 1 / this.getHeightForZoom(this.zoom);
				}
			}

			if (mult && mult !== 1) {
				//this.writeDebug("zoom changed to " + this.zoom * mult + " height is " + this.getHeightForZoom(this.zoom * mult));
				this.startZoomAnimate(mult, this.getMouseCoord(this.canvas, evt));
			}
		};

		private startZoomAnimate = (mult, zoomFocusCoord) => {
			this.canvas.removeEventListener("wheel", this.mouseWheelListener);
			//this.requestQueue.clear(); //images already in request queue are now probably not the required detail level.
			this.canvasZoom = new CanvasZoomAnimate(this.canvas, new ZoomOffsetCalc(zoomFocusCoord, this.offset), this.zoomImageMid, this.zoomImageFinal);
			this.canvasZoom.zoomIn(mult);
		};

		private writeDebug = (message: string) => {
			this.debug(this.debug() + message + "\n");
			var textarea = document.getElementById("debug");
			textarea.scrollTop = textarea.scrollHeight;
		}
	}
}