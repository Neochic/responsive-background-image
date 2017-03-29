(function (window, document) {
    let storedElements = [];
    let resizeDebouncer = null;
    let removeDebouncer = null;

    function getStyle(el: HTMLElement, styleProp: string) {
        return window.getComputedStyle(el, null).getPropertyValue(styleProp);
    }

    function findBestMatch(element: HTMLElement, images: Array<{width: number, height: number}>) {
        let method = getStyle(element, 'background-size');

        /*
         * it can only handle contain or cover as background-sizing methods
         */
        if (["contain", "cover"].indexOf(method) < 0) {
            return null;
        }

        let targetSize = [
            element.offsetWidth * (window.devicePixelRatio || 1),
            element.offsetHeight * (window.devicePixelRatio || 1)
        ];

        let match = null;
        for (let image of images) {
            let widthRatio = targetSize[0]/image.width;
            let heightRatio = targetSize[1]/image.height;

            let ratio = method === "contain" ? Math.min(widthRatio, heightRatio) : Math.max(widthRatio, heightRatio);

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

        removeDebouncer = window.setTimeout(function() {
            for(let elementIndex in storedElements) {
                let element = storedElements[elementIndex];

                /*
                 * remove if it's not in DOM anymore
                 */
                let isInDom = false;
                let checkParent = element.element.parentNode;

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

    function init(element: HTMLElement) {
        if (!element.hasAttribute('data-rbi')) {
            return;
        }

        let images = JSON.parse(element.getAttribute('data-rbi'));
        let match = findBestMatch(element, images);

        if(!match) {
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
            element.style.backgroundImage = `url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkAQMAAABKLAcXAAAAA1BMVEVMaXFNx9g6AAAAAXRSTlMAQObYZgAAABRJREFUeNpjYBgFo2AUjIJRQE8AAAV4AAHYKaK4AAAAAElFTkSuQmCC)`;
            element.removeAttribute("data-rbi");

            /*
             * don't change it immediately, else animation would not be shown
             */
            window.setTimeout(function () {
                element.style.backgroundImage = `url(${match.image.src})`;
            }, 4);
            return;
        }

        element.style.backgroundImage = `url(${match.image.src})`;
        element.removeAttribute("data-rbi");
    }

    function update() {
        if (resizeDebouncer) {
            window.clearTimeout(resizeDebouncer);
        }

        resizeDebouncer = window.setTimeout(function() {
            cleanUpRemovedElements();
            for(let element of storedElements) {
                let match = findBestMatch(element.element, element.images);

                if (!match) {
                    continue;
                }

                element.element.style.backgroundImage = `url(${match.image.src})`;
            }
        }, 100);
    }

    document.addEventListener("DOMContentLoaded", function () {
        /*
         * do nothing in browsers without mutation observer support
         */
        if(!MutationObserver) {
            return;
        }

        let observer = new MutationObserver(function (mutations) {
            for (let mutation of mutations) {
                if (mutation.type !== "childList") {
                    return;
                }

                if (mutation.addedNodes.length > 0) {
                    for (let element of <any>mutation.addedNodes) {
                        init(element);
                        let elements = element.querySelectorAll('[data-rbi]');
                        for (let subElement of <any>elements) {
                            init(subElement);
                        }
                    }
                }

                if (mutation.removedNodes.length > 0) {
                    cleanUpRemovedElements();
                }
            }
        });

        let targetNode = document.body;
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });

        window.addEventListener('resize', function() {
           update();
        });

        let elements = document.querySelectorAll('[data-rbi]');
        for (let element of <any>elements) {
            init(element);
        }
    });
}(window, document));
