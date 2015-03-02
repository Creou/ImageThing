# ZoomableImageBrowser #
ZoomableImageBrowser is a web based infinitely zoomable image browser. The images are laid out along a [Hilbert curve](http://en.wikipedia.org/wiki/Hilbert_curve) to ensure that images related (in time) maintain their proximity in 2D browsing space.

It currently works for small numbers of images when hosted locally however there are some issues with scaling and network trafic that need to be addressed.

This project started as an opportunity to become familiar with typescript and HTML canvas in addition to image processing techniques.

#### TODO: ####

 - Finish the rewrite for performance optimsations.

*Initial technique:*  
Most work done in the client in typescript including the generation of the Hilbert curve layout. Server is mostly "dumb" but has to rescale every image on request so is actually very processor intensive.
Client implements some techniques for reducing server load and traffic management such as requesting only images that are visible, request queueing and clearing to prevent spamming the server on zooming, image request batching for reducing the amount of requests made.
This technique works OK when hosted locally and when there are a limited number of images on screen at a time, e.g. when not zoomed out very far. It completely fails when the image is zoomed out so far that there are a large number of images visible at the same time as the server is unable to reprocess the required number of images quickly enough.

*New technique:* (started but not done yet)  
On file upload (upload not yet coded), the images are processed and details stored in a DB. Images are scaled to various pre-determined levels of zoom and then stored.
Large images are broken into smaller tiles of a set size (suggest 400x400) to prevent having to send more data than is needed.
In this technique rather than maintaining a map of "images" based on metadata from the server the client deals with a grid of "tiles" which are supplied by the server. Calls to the server are not requesting specific images but rather give a "tile" coordinate and a zoom level. The server is responsible for creating the map of actual images and translating that into the tile - zoom system. Individual tiles may be single images or even part images, or may be composed of multiple images. Individual and part tiles are pre-rendered on file upload for speed. Multiple image tiles are a problem for the reason specified below.

*Details to still determine:*  
One of the requirements is to be able to filter the images shown based on "tags", either from exif or stored in a DB by the user. This requirement means that we cannot in advance build up composite images of many images and store these. E.g. When zoomed fully out each image is only 1 x 1 pixel in size. Even if the viewport is limited to a fairly modest 800x600 this is still 480,000 images. It is not practical to build this image in real time from composite images even if they are pre-scaled to something very small. (e.g. 10x10)
Possible solution: Each image has a 1 pixel version stored in the DB (possibly a NoSql/In memory array) as RGB data and the server builds the composite using a query? I'm somewhat doubtful that with our current technology level the DB will be able to return these pixels in a timely manner. Higher levels of zoom reduce the problem somewhat but may pose their own issues. One possibility is that the server generates this background once per filter change but the client stores it and uses the background as a filler for when its waiting for images that are not yet ready.
I would like to suggest that the rewrite should use Signal-R to request and receive images. This is to a) allow for requests to be cancelled mid-request and b) move the traffic management to the server rather than the client and c) reduce latency/improve network efficiency.
