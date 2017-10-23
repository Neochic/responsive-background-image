(function (window, document) {
    var storedElements = [];
    var resizeDebouncer = null;
    var removeDebouncer = null;
    function getStyle(el, styleProp) {
        return window.getComputedStyle(el, null).getPropertyValue(styleProp);
    }
    function findBestMatch(element, images) {
        var method = getStyle(element, 'background-size');
        /*
         * it can only handle contain or cover as background-sizing methods
         */
        if (["contain", "cover"].indexOf(method) < 0) {
            return null;
        }
        var targetSize = [
            element.offsetWidth * (window.devicePixelRatio || 1),
            element.offsetHeight * (window.devicePixelRatio || 1)
        ];
        var match = null;
        for (var _i = 0; _i < images.length; _i++) {
            var image = images[_i];
            var widthRatio = targetSize[0] / image.width;
            var heightRatio = targetSize[1] / image.height;
            var ratio = method === "contain" ? Math.min(widthRatio, heightRatio) : Math.max(widthRatio, heightRatio);
            /*
             * if there is not yet another match we use it independently of how good the match is (better than nothing)
             * we prefer to use a ratio smaller than 1 (downscaling) instead of greater than 1 (upscaling)
             * it's compared to 1.01 because of rounding errors
             * try to get to scaling ratio of 1 as near as possible
             */
            if (match === null ||
                ratio < 1.01 && (ratio > match.ratio || match.ratio >= 1.01) ||
                ratio >= 1.01 && match.ratio >= 1.01 && ratio < match.ratio) {
                match = {
                    ratio: ratio,
                    image: image
                };
            }
        }
        return match;
    }
    function cleanUpRemovedElements() {
        if (removeDebouncer) {
            window.clearTimeout(removeDebouncer);
        }
        removeDebouncer = window.setTimeout(function () {
            for (var elementIndex in storedElements) {
                var element = storedElements[elementIndex];
                /*
                 * remove if it's not in DOM anymore
                 */
                var isInDom = false;
                var checkParent = element.element.parentNode;
                while (checkParent) {
                    isInDom = isInDom || checkParent === document;
                    checkParent = checkParent.parentNode;
                }
                if (!isInDom) {
                    storedElements.splice(parseInt(elementIndex), 1);
                }
            }
        }, 100);
    }
    function init(element) {
        if (!element.hasAttribute('data-rbi')) {
            return;
        }
        var images = JSON.parse(element.getAttribute('data-rbi'));
        var match = findBestMatch(element, images);
        if (!match) {
            element.removeAttribute("data-rbi");
            return;
        }
        storedElements.push({
            element: element,
            images: images
        });
        /*
         * if the background has a transition on it we want it to animate initially
         */
        if (getStyle(element, 'transition').indexOf('background ') > -1) {
            /*
             * set background image to transparent png, because it can't animate from empty background-image
             */
            element.style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkAQMAAABKLAcXAAAAA1BMVEVMaXFNx9g6AAAAAXRSTlMAQObYZgAAABRJREFUeNpjYBgFo2AUjIJRQE8AAAV4AAHYKaK4AAAAAElFTkSuQmCC)";
            element.removeAttribute("data-rbi");
            /*
             * don't change it immediately, else animation would not be shown
             */
            window.setTimeout(function () {
                element.style.backgroundImage = "url(" + match.image.src + ")";
            }, 4);
            return;
        }
        element.style.backgroundImage = "url(" + match.image.src + ")";
        element.removeAttribute("data-rbi");
    }
    function update() {
        if (resizeDebouncer) {
            window.clearTimeout(resizeDebouncer);
        }
        resizeDebouncer = window.setTimeout(function () {
            cleanUpRemovedElements();
            for (var _i = 0; _i < storedElements.length; _i++) {
                var element = storedElements[_i];
                var match = findBestMatch(element.element, element.images);
                if (!match) {
                    continue;
                }
                element.element.style.backgroundImage = "url(" + match.image.src + ")";
            }
        }, 100);
    }
    document.addEventListener("DOMContentLoaded", function () {
        /*
         * do nothing in browsers without mutation observer support
         */
        if (!MutationObserver) {
            return;
        }
        var observer = new MutationObserver(function (mutations) {
            for (var _i = 0; _i < mutations.length; _i++) {
                var mutation = mutations[_i];
                if (mutation.type !== "childList") {
                    return;
                }
                if (mutation.addedNodes.length > 0) {
                    for (var _a = 0, _b = mutation.addedNodes; _a < _b.length; _a++) {
                        var element = _b[_a];
                        if (element.nodeType !== Node.ELEMENT_NODE) {
                            continue;
                        }
                        init(element);
                        var elements_1 = element.querySelectorAll('[data-rbi]');
                        for (var _c = 0, _d = elements_1; _c < _d.length; _c++) {
                            var subElement = _d[_c];
                            init(subElement);
                        }
                    }
                }
                if (mutation.removedNodes.length > 0) {
                    cleanUpRemovedElements();
                }
            }
        });
        var targetNode = document.body;
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
        window.addEventListener('resize', function () {
            update();
        });
        var elements = document.querySelectorAll('[data-rbi]');
        for (var _i = 0, _a = elements; _i < _a.length; _i++) {
            var element = _a[_i];
            init(element);
        }
    });
}(window, document));
