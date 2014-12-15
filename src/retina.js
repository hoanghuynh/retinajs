(function() {
    var root = (typeof exports === 'undefined' ? window : exports);
    var isRetina = null;
    var config = {
        // An option to choose a suffix for 2x images
        retinaImageSuffix : '@2x',

        // Ensure Content-Type is an image before trying to load @2x image
        // https://github.com/imulus/retinajs/pull/45)
        check_mime_type: true,

        // Resize high-resolution images to original image's pixel dimensions
        // https://github.com/imulus/retinajs/issues/8
        force_original_dimensions: false
    };

    function addOnLoadEvent(func) {
        var oldOnLoad = root.onload;
        if (typeof root.onload != 'function') {
            root.onload = func;
        } else {
            root.onload = function() { oldOnLoad(); func(); }
        }
    }

    function NonRetina() {}

    NonRetina.init = function(context) {
        if (context === null) {
            context = root;
        }
        
        addOnLoadEvent(function() {
            var images = document.getElementsByTagName('img'), imagesLength = images.length, i, image;
            for (i = 0; i < imagesLength; i += 1) {
                image = images[i];
                if (!image.getAttribute('src') && image.getAttribute('lowsrc'))
                    image.setAttribute('src', image.getAttribute('lowsrc'));
            };
        });
    };

    function Retina() {}    

    root.Retina = Retina;

    Retina.configure = function(options) {
        if (options === null) {
            options = {};
        }

        for (var prop in options) {
            if (options.hasOwnProperty(prop)) {
                config[prop] = options[prop];
            }
        }
    };


    Retina.init = function(context) {
        if (context === null) {
            context = root;
        }

        addOnLoadEvent(function() {
            var images = document.getElementsByTagName('img'), imagesLength = images.length, retinaImages = [], i, image;
            for (i = 0; i < imagesLength; i += 1) {
                image = images[i];
                if (!!!image.getAttribute('data-no-retina')) {
                    //if (image.getAttribute('lowsrc') || image.getAttribute('src')) { //TODO
                    if (image.getAttribute('lowsrc')) {
                        retinaImages.push(new RetinaImage(image));
                    }
                }
            }
        });
    };

    Retina.isRetina = function(){
        if (isRetina == null) {
            var mediaQuery = '(-webkit-min-device-pixel-ratio: 1.5), (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3/2), (min-resolution: 1.5dppx)';

            if (root.devicePixelRatio >= 1.5) {
                isRetina = true;
            } else if (root.matchMedia && root.matchMedia(mediaQuery).matches) {
                isRetina = true;
            } else {
                isRetina = false;
            }
        }
        return isRetina;
    };


    var regexMatch = /\.\w+$/;
    function suffixReplace (match) {
        return config.retinaImageSuffix + match;
    }

    function RetinaImagePath(path, at_2x_path) {
        this.path = path || '';
        if (typeof at_2x_path !== 'undefined' && at_2x_path !== null) {
            this.at_2x_path = at_2x_path;
            this.perform_check = false;
        } else {
            if (undefined !== document.createElement) {
                var locationObject = document.createElement('a');
                locationObject.href = this.path;
                locationObject.pathname = locationObject.pathname.replace(regexMatch, suffixReplace);
                this.at_2x_path = locationObject.href;
            } else {
                var parts = this.path.split('?');
                parts[0] = parts[0].replace(regexMatch, suffixReplace);
                this.at_2x_path = parts.join('?');
            }
            this.perform_check = true;
        }
    }

    root.RetinaImagePath = RetinaImagePath;

    RetinaImagePath.confirmed_paths = [];

    RetinaImagePath.prototype.is_external = function() {
        return !!(this.path.match(/^https?\:/i) && !this.path.match('//' + document.domain));
    };

    RetinaImagePath.prototype.check_2x_variant = function(callback) {
        var http, that = this;
        if (!this.perform_check && typeof this.at_2x_path !== 'undefined' && this.at_2x_path !== null) {
            return callback(true);
        } else if (this.at_2x_path in RetinaImagePath.confirmed_paths) {
            return callback(true);
        } else if (this.is_external()) {
            return callback(false);
        } else {
            http = new XMLHttpRequest();
            http.open('HEAD', this.at_2x_path);
            http.onreadystatechange = function() {
                if (http.readyState !== 4) {
                    return; // return callback(false);
                }

                if (http.status >= 200 && http.status <= 399) {
                    if (config.check_mime_type) {
                        var type = http.getResponseHeader('Content-Type');
                        if (type === null || !type.match(/^image/i)) {
                            return callback(false);
                        }
                    }

                    RetinaImagePath.confirmed_paths.push(that.at_2x_path);
                    return callback(true);
                } else {
                    return callback(false);
                }
            };
            http.send();
        }
    };

    function RetinaImage(el) {
        this.el = el;
        this.path = new RetinaImagePath(this.el.getAttribute('lowsrc') ? this.el.getAttribute('lowsrc') : this.el.getAttribute('src'), this.el.getAttribute('data-at2x'));
        var that = this;
        this.path.check_2x_variant(function(hasVariant) {
            if (hasVariant) {
                that.swap();
            } else {
                if (!that.el.getAttribute('src') && that.el.getAttribute('lowsrc'))
                    that.el.setAttribute('src', that.el.getAttribute('lowsrc'));
            }
        });
    }

    root.RetinaImage = RetinaImage;

    RetinaImage.prototype.swap = function(path) {
        if (typeof path === 'undefined') {
            path = this.path.at_2x_path;
        }

        var that = this;
        function load() {
            if (! that.el.complete) {
                setTimeout(load, 5);
            } else {
                if (config.force_original_dimensions) {
                    if (!that.el.getAttribute('width') && !that.el.getAttribute('height')) {
                        if (that.el.offsetWidth == 0 && that.el.offsetHeight == 0) {
                            that.el.setAttribute('width', that.el.naturalWidth);
                            that.el.setAttribute('height', that.el.naturalHeight);
                        } else {
                            that.el.setAttribute('width', that.el.offsetWidth);
                            that.el.setAttribute('height', that.el.offsetHeight);
                        }
                    }
                    that.el.setAttribute('src', path);
                } else {
                    that.el.setAttribute('src', path);
                    if (!that.el.getAttribute('width') && !that.el.getAttribute('height') && that.el.getAttribute('data-no-set-dimens') == null) {
                        function applyNaturalDimens() {
                            if (!that.el.complete) {
                                setTimeout(applyNaturalDimens, 5);
                            } else {
                                that.el.setAttribute('width', that.el.naturalWidth / 2);
                                that.el.setAttribute('height', that.el.naturalHeight / 2);
                            }
                        }
                        applyNaturalDimens();
                    }
                }
            }
        }
        load();
    };

    if (Retina.isRetina()) {
        console.log("[hdpi] Display is hi-res, now use hi-res assets.");
        Retina.init(root);
    } else {
        console.log("[hdpi] Display is not hi-res, stick to low-res assets.");
        NonRetina.init(root);
    }
})();
