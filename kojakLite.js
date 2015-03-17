/* Kojak Lite. Backbone adapter for Kojak Lite v 0.0.1 */

(function (factory) {
    if (_.isFunction(window.define) && define.amd) {
        // AMD. Register as an anonymous module.
        define(['backbone', 'underscore', 'jQuery'], factory);
    } else {
        // Browser globals
        factory(Backbone, _, jQuery || Zepto);
    }
}(function(Backbone, _, $) {

        initializeKojakLite();
        //initializeKojakLiteBackbone();

        // ---
        function initializeKojakLite() {
            "use strict";

            var KojakLite = {VERSION: "0.0.1"},
                alreadyLoadedLib = window.KojakLite || {};

            //var KojakLite = b;

            if (alreadyLoadedLib.loaded) {
                if (KojakLite.VERSION === alreadyLoadedLib.VERSION) {
                    KojakLite.warn("Already loaded KojakLite.core  v" + KojakLite.VERSION);
                    return;
                } else {
                    KojakLite.error("Failed to load KojakLite.core  v" + KojakLite.VERSION + ": " + "another version of KojakLite.core (v" + alreadyLoadedLib.VERSION + ") was already loaded")
                }

                return;
            }

            KojakLite.config = {
                apiKey: "api-key",
                beaconURL: "/KojakLite",
                debug: true,
                enabled: false,
                disableAjaxFilter: true
            };


            for (var prop in alreadyLoadedLib.config) { // Copy props to a config from KojakLite config
                if (KojakLite.config.hasOwnProperty(prop)) {
                    KojakLite.config[prop] = alreadyLoadedLib.config[prop];
                }
            }

            var isBrowserModern = function () {
                return !!(!window.attachEvent || window.addEventListener || window.navigator.userAgent.indexOf("MSIE 8.0") >= 0);
            }();

            var isKojakLiteEnabled = function () {
                return isBrowserModern && KojakLite.config.enabled;
            };

            var generateVisitorId = function () {
                var b, c = function () {
                    for (var a = "_cpv=", b = document.cookie.split(";"), c = 0; c < b.length; c++) {
                        var d = b[c].replace(/^\s+|\s+$/g, ""), e = d.indexOf(a);
                        if (0 === e)return d.substring(5, d.length)
                    }
                    return void 0
                }, d = function (a) {
                    var b = new Date(Date.now() + 631152e5);
                    return document.cookie = "_cpv=" + a + "; expires=" + b.toGMTString() + "; path=/", a
                };

                b = c();

                if (b) {
                    KojakLite.log("Using existing visitor ID " + b);
                } else {
                    b = KojakLite.randomStr(16);
                    KojakLite.log("Generated visitor ID " + b);
                }

                return d(b);
            };


            KojakLite.enabled = isKojakLiteEnabled();
            if (!KojakLite.enabled) {
                if (KojakLite.config.debug) {
                    console.warn("[KojakLite] KojakLite is disabled. Run LojakLite.enableMeasuring() to start work");
                    window.KojakLite = KojakLite;
                }

                //return;     // TODO
            }


            if (!Date.now) {
                Date.now = function () {
                    return (new Date).valueOf();
                };
            }


            KojakLite.__empty__ = function () {
            };

            KojakLite.log = function (msg) {
                KojakLite.config.debug && window.console.log("[KojakLite] " + msg);
            };

            KojakLite.warn = function (wrn) {
                KojakLite.config.debug && window.console.warn("[KojakLite] " + wrn);
            };

            KojakLite.error = function (err) {
                window.console.error("[KojakLite] " + err);
            };

            KojakLite.slice = function (args) {          // Make arguments as true array
                return Array.prototype.slice.call(args);
            };

            KojakLite.setImmediate = _.isFunction(window.setImmediate) ? function () {  // Smth like defer
                return window.setImmediate.apply(window, arguments);
            } : function (func) {
                var args = KojakLite.slice(arguments);
                return window.setTimeout(function () {
                    func.apply(null, args)
                }, 0);
            };

            KojakLite.randomStr = function (length) {
                var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                    alphLen = alphabet.length,
                    result = [],
                    i;

                for (i = length; i; i--) {
                    result.push(alphabet[Math.floor(Math.random() * alphLen)])
                }

                return result.join('');
            };

            KojakLite.__super__ = function () {
                throw new Error("Cannot call KojakLite.__super__ outside of a wrapped function")
            };

            //KojakLite.wrap = function (b, c) {
            //    return function () {
            //        var d = KojakLite.__super__, e = this, args = KojakLite.slice(arguments);
            //        try {
            //            return KojakLite.__super__ = "function" == typeof b ? function () {
            //                return this === a ? 0 === arguments.length ? b.apply(e, args) : b.apply(e, arguments) : b.apply(this, arguments)
            //            } : KojakLite.__empty__, c.apply(this, arguments)
            //        } finally {
            //            a.__super__ = d
            //        }
            //    }
            //};

            KojakLite.wrap = function (func, decorator) {
                return function () {
                    var superFunc = KojakLite.__super__,
                        _this = this,
                        args = KojakLite.slice(arguments);

                    try {

                        if (_.isFunction(func)) {
                            KojakLite.__super__ = function () {
                                if (this === KojakLite) {
                                    if (arguments.length === 0) {
                                        return func.apply(_this, args);
                                    } else {
                                        return func.apply(_this, arguments);
                                    }
                                } else {
                                    return func.apply(this, arguments);
                                }
                            }
                        } else {
                            KojakLite.__super__ = KojakLite.__empty__;
                        }

                        return decorator.apply(this, arguments);

                    } finally {
                        KojakLite.__super__ = superFunc
                    }
                }
            };

            KojakLite.aliasMethodChain = function (obj, target, c, func) { // a,b,c,d       c = "instrumentation"
                var method = obj[target]; // e = method

                if (_.isFunction(method)) {
                    var f = "__" + target + "_without_" + c + "__", // __Router_without_instrumentation__
                        g = "__" + target + "_with_" + c + "__";    // __Router_with_instrumentation__

                    obj[f] = method;
                    obj[g] = obj[target] = func;
                }
                return KojakLite;
            };

            KojakLite.nameFor = function (thing) {
                if (_.isString(thing)) {
                    return thing;
                }

                if (thing && thing.constructor) {
                    return thing.context;
                }

                //return  ? a : a && a.constructor ? a.context || a.constructor.__name__ : void 0
            };

            KojakLite.log("Initializing KojakLite.core v" + KojakLite.VERSION + "...");
            if (!KojakLite.config.apiKey || !KojakLite.config.apiKey.length) { // check license
                KojakLite.error("Failed to load KojakLite.core: did you forget to set your KojakLite API key?");
                window.KojakLite = KojakLite;
                return;
            }
            // OK

            KojakLite.sessionID = KojakLite.randomStr(16);
            KojakLite.log("Generated session ID " + KojakLite.sessionID);
            KojakLite.visitorID = KojakLite.config.visitor || generateVisitorId();

            var f = 0,
                createEventsString = function (events) {   // Events
                    _.isString(events) && (events = [events]);

                    for (var b = [], c = 0; c < events.length; c++) {
                        b.push(encodeURIComponent(events[c]).replace(/[-_~%]/g, function (a) {
                            switch (a) {
                                case"-":
                                    return "~2D";
                                case"_":
                                    return "~5F";
                                case"~":
                                    return "~7E";
                                case"%":
                                    return "~"
                            }
                        }));
                    }

                    return b.join("-");
                },

                eventsToString = function (events) {
                    var tmpArr = [];

                    if (_.isString(events)) {
                        return createEventsString(events);
                    }

                    for (var i = 0; i < events.length; i++) {
                        tmpArr.push(createEventsString(events[i]));
                    }

                    return tmpArr.join("_");
                },

                isEmptyObject = function (obj) {   // TODO: remove
                    //for (var tmp in obj) {
                    //    return false;
                    //}
                    //return true;

                    return _.isEmpty(obj);
                };

            KojakLite.getEvents = eventsToString; // TODO: temporary

            KojakLite.turnOn = function () {
                KojakLite.config.enabled = true;
            };

            KojakLite.send = function (events, info) {
                if (!KojakLite.config.apiKey || !KojakLite.config.apiKey.length) {
                    KojakLite.error("Attempted to call send without an API key set, payload dropped");
                    return;
                } // We have license

                if (events && events.length > 0 || info && !_.isEmpty(info)) {
                    var json = {}, adaptersArr = [];

                    for (var adapter in KojakLite.adapters) {
                        KojakLite.adapters.hasOwnProperty(adapter) && adaptersArr.push(adapter + "-" + KojakLite.adapters[adapter].VERSION);
                    }

                    json.key = KojakLite.config.apiKey;
                    json.adapters = adaptersArr.join("_");
                    json.session = KojakLite.sessionID;
                    KojakLite.config.visitor ? json.e_visitor = encodeURIComponent(KojakLite.config.visitor) : json.visitor = encodeURIComponent(KojakLite.visitorID);


                    var j = [];

                    for (var k in json) {
                        json.hasOwnProperty(k) && j.push(k + "=" + json[k]);
                    }
                    for (k in info) {
                        info.hasOwnProperty(k) && j.push(k + "=" + encodeURIComponent(info[k]));
                    }

                    var reqNumber = f++,
                        urlString = KojakLite.config.beaconURL + "?" + j.join("&");

                    events && (urlString = urlString + "&p=" + eventsToString(events));   //  events to string
                    KojakLite.log("Sending request " + reqNumber);

                    // length warn
                    urlString.length > 2e3 && KojakLite.log("Request " + reqNumber + ": URL is " + urlString.length + " characters long, this might cause errors in some browsers!");

                    var successCb = function () {
                            KojakLite.log("Completed request " + reqNumber);
                        },

                        errorCb = function () {
                            KojakLite.log("Failed request " + reqNumber + ", giving up");
                        },

                        repeatRequest = function (seconds, c, attemptsCount) {  // p  - repeat failed requests
                            return function () {
                                KojakLite.log("Failed request " + reqNumber + ", retrying in " + seconds + " seconds");

                                window.setTimeout(function () {
                                    KojakLite.log("Retrying request " + reqNumber);
                                    if (attemptsCount > 0) {
                                        KojakLite.dispatchRequest(urlString, successCb, repeatRequest(seconds * c, c, attemptsCount - 1));
                                    } else {
                                        KojakLite.dispatchRequest(urlString, successCb, errorCb);
                                    }
                                }, 1e3 * seconds);
                            }
                        };


                    KojakLite.dispatchRequest(urlString, successCb, errorCb);
                    //KojakLite.dispatchRequest(urlString, successCb, repeatRequest(30, 2, 2)) // Retrying failed requests
                }
            };

            KojakLite.dispatchRequest = function (urlString, successCb, errorCb) {
                var req = new Image;

                _.isFunction(successCb) && (req.onload = successCb);
                _.isFunction(errorCb) && (req.onerror = errorCb);
                req.src = urlString;
            };

            KojakLite.adapters = {core: KojakLite};
            KojakLite.loaded = true;
            window.KojakLite = KojakLite;
            KojakLite.log("Sucessfully loaded KojakLite.core v" + KojakLite.VERSION);
        }

        function initializeKojakLiteBackbone() {
            "use strict";

            var KojakLite = window.KojakLite;
                //Backbone = b,
                //_ = c,
                //$ = d;

            var e = {VERSION: "0.0.1"};

            if (!KojakLite || !KojakLite.loaded) {
                KojakLite && !KojakLite.enabled && KojakLite.error("[KojakLite] Failed to load KojakLite.backbone: KojakLite.core could not be found");
            } else if (KojakLite.adapters && KojakLite.adapters.Backbone) {
                KojakLite.adapters.Backbone.VERSION === e.VERSION ?
                    KojakLite.warn("Already loaded KojakLite.backbone v" + e.VERSION) :
                    KojakLite.error("Failed to load KojakLite.backbone v" + e.VERSION + ": " + "another version of KojakLite.backbone (v" + KojakLite.adapters.Backbone.VERSION + ") was already loaded");
            } else if (!Backbone) {
                KojakLite.error("Failed to load KojakLite.backbone: Backbone could not be found");
            } else if (!_) {
                KojakLite.error("Failed to load KojakLite.backbone: Underscore could not be found");
            } else {

                // OK

                KojakLite.log("Initializing KojakLite.backbone v" + e.VERSION);
                !KojakLite.config.enableAjaxFilter && !KojakLite.config.disableAjaxFilter && (KojakLite.config.enableAjaxFilter = true);
                KojakLite.config.enableAjaxFilter = KojakLite.config.enableAjaxFilter || false;
                KojakLite.config.minDuration = KojakLite.config.minDuration || 50;

                var /*f = _.result || function (a, b) {     // f = _.result
                 if (!a) {
                 return null;
                 }
                 var d = a[b];
                 return _.isFunction(d) ? d.call(a) : d
                 },
                 */
                    g = KojakLite.wrap(KojakLite.aliasMethodChain, function (object, methodName, e, decorator) {
                        var method = object[methodName];

                        if (!_.isFunction(method)) return object;
                        var h = KojakLite.wrap(method, decorator);

                        h = _.isFunction(method.extend) ? method.extend({constructor: h}) : _.extend(h, method);
                        return KojakLite.__super__(object, methodName, e, h);

                        //return h = "function" == typeof method.extend ? method.extend({constructor: h}) : c.extend(h, method), KojakLite.__super__(object, methodName, e, h)
                    });


                KojakLite.aliasMethodChain(KojakLite, "aliasMethodChain", "underscore", g);
                KojakLite.aliasMethodChain(KojakLite, "nameFor", "backbone", function (c) {
                    var d = KojakLite.__super__();
                    return !d && c instanceof b.View && (d = "UnnamedView", c.id ? d = d + "<#" + _.result(c, "id") + ">" : c.className && (d = d + "<." + _.result(c, "className") + ">"), c.__name__ = d), d
                });


                //var Event = function () {
                //    this.initialize();
                //};
                //
                //Event.prototype = {
                //    getStartLabel: function () {
                //
                //    }
                //};
                //
                //Event.extend = Backbone.View.extend;

                //var AjaxEvent = Event.extend({
                //    initialize: function (method, url) {
                //        this.prefix = "ajax_";
                //        this.method = method;
                //        this.url = url;
                //        this.startTime = window.performance.mark(this.getStartLabel());
                //        this.pending = true;
                //    },
                //    stop: function () {
                //        if (this.pending) {
                //            this.stopTime = window.performance.mark(this.getEndLabel());
                //            this.pending = false;
                //        }
                //    },
                //    serialize: function (a) {
                //        var measureName = this.getMeasureName(),
                //            smTime = a || 0,
                //            duration;
                //
                //        window.performance.measure(measureName, this.getStartLabel(), this.getEndLabel());
                //        duration = window.performance.getEntriesByName(measureName)[0].duration;
                //
                //        console.log("measure ", this.getMeasureName(), ":", parseFloat(duration.toFixed(2)), "ms");
                //        return !this.pending ? ["a", this.method, this.url, this.startTime - smTime, duration] : undefined;
                //    }
                //});


                var AjaxEvent = function (method, url) {
                    this.method = method;
                    this.url = url;
                    this.startTime = window.performance.mark(this.getStartLabel());
                    this.pending = true;
                };

                AjaxEvent.prototype.stop = function () {   // something with ajax
                    if (this.pending) {
                        this.stopTime = window.performance.mark(this.getEndLabel());
                        this.pending = false;
                    }
                };

                AjaxEvent.prototype.serialize = function (a) {
                    var measureName = this.getMeasureName(),
                        smTime = a || 0,
                        duration;

                    window.performance.measure(measureName, this.getStartLabel(), this.getEndLabel());
                    duration = window.performance.getEntriesByName(measureName)[0].duration;

                    console.log("measure ", this.getMeasureName(), ":", parseFloat(duration.toFixed(2)), "ms");
                    return !this.pending ? ["a", this.method, this.url, this.startTime - smTime, duration] : undefined;
                };

                var RenderEvent = function (viewName) {
                    this.viewName = viewName;
                    this.rand = KojakLite.randomStr(4);
                    this.startTime = window.performance.mark(this.getStartLabel());
                    this.pending = true;
                };

                RenderEvent.prototype.stop = AjaxEvent.prototype.stop;
                RenderEvent.prototype.serialize = function (a) {               // something with render
                    var measureName = this.getMeasureName(),
                        smTime = a || 0,
                        duration;

                    window.performance.measure(measureName, this.getStartLabel(), this.getEndLabel());
                    duration = window.performance.getEntriesByName(measureName)[0].duration;

                    console.log("measure ", this.getMeasureName(), ": ", parseFloat(duration.toFixed(2)), "ms");

                    return !this.pending ? ["r", this.viewName, this.startTime - smTime, duration] : undefined;
                };

                RenderEvent.prototype.getMeasureName = function () {
                    var descr = this.viewName ? this.viewName : this.rand;
                    return "render_" + descr;
                };

                RenderEvent.prototype.getStartLabel = function () {
                    var descr = this.viewName ? this.viewName : this.rand;
                    return "renderStart_" + descr;
                };

                RenderEvent.prototype.getEndLabel = function () {
                    var descr = this.viewName ? this.viewName : this.rand;
                    return "renderEnd_" + descr;
                };

                AjaxEvent.prototype.getMeasureName = function () {
                    var descr = this.url ? this.url : this.rand;
                    return "ajax_" + descr;
                };

                AjaxEvent.prototype.getStartLabel = function () {
                    var descr = this.url ? this.url : this.rand;
                    return "ajaxStart_" + descr;
                };

                AjaxEvent.prototype.getEndLabel = function () {
                    var descr = this.url ? this.url : this.rand;
                    return "ajaxEnd_" + descr;
                };

                var j = [],       // ?????
                    getLastElement = function () {   // Return last element from j
                        return j[j.length - 1];
                    },
                    observedElement = function (klass, method, pattern) {   // l
                        this.klass = klass;
                        this.method = method;
                        this.pattern = pattern;
                        this.startTime = Date.now();
                        this.rand = KojakLite.randomStr(4);

                        window.performance.mark('observedElementStart_' + this.rand);

                        this.events = [];
                        this.finalized = false;
                        j.push(this);
                    };


                observedElement.prototype.finalize = function () {
                    if (!this.finalized) {
                        var c, temp;

                        for (c = 1; c <= j.length; c++) {           // del
                            j[j.length - c] === this && j.splice(j.length - c, 1);
                        }

                        for (c = 0; c < this.events.length; c++) {
                            if (this.events[c].pending) {
                                return;
                            }
                        }  // waiting all events complete

                        //this.stopTime = Date.now();
                        window.performance.mark('observedElementFinish_' + this.rand);
                        window.performance.measure(
                            'observedElement_' + this.rand,
                            'observedElementStart_' + this.rand,
                            'observedElementFinish_' + this.rand
                        );

                        this.duration = window.performance.getEntriesByName('observedElement_' + this.rand)[0].duration;
                        this.finalized = true;
                        //this.duration = this.stopTime - this.startTime;

                        if (this.duration < (KojakLite.config.minDuration || 1)) {
                            return KojakLite.log("Dropped: " + this.klass + "." + this.method + " (" + this.pattern + "), took " + this.duration + "ms. (minDuration is " + KojakLite.config.minDuration + "ms)"), void 0;
                        }


                        if (KojakLite.config.enableAjaxFilter) {
                            var d = false;
                            for (c = 0; c < this.events.length; c++) if (this.events[c] instanceof AjaxEvent) {
                                d = true;
                                break;
                            }
                            if (!d) {
                                return KojakLite.log("Dropped: " + this.klass + "." + this.method + " (" + this.pattern + "), took " + this.duration + "ms. (enableAjaxFilter is true)"), void 0
                            }
                        }

                        KojakLite.log("Sending: " + this.klass + "." + this.method + " (" + this.pattern + "), took " + this.duration + "ms.");

                        try {
                            this.url = Backbone.history.getFragment()
                        } catch (e) {
                            this.url = window.location.hash.length ? window.location.hash.substr(1) : window.location.pathname
                        }

                        var info = {startTime: this.startTime, duration: this.duration, url: this.url};

                        this.klass && this.klass.length > 0 ? info.klass = this.klass : KojakLite.__empty__();
                        this.method && this.method.length > 0 > 0 ? info.method = this.method : KojakLite.__empty__();
                        this.pattern && this.pattern.length > 0 ? info.pattern = this.pattern : KojakLite.__empty__();

                        var events = [],
                            totalAjaxTime = 0,
                            totalRenderTime = 0,
                            renderEvents = [],
                            ajaxEvents = [];

                        for (c = 0; c < this.events.length; c++) {
                            events.push(this.events[c].serialize(this.startTime));
                        }

                        for (c = 0; c < events.length; c++) {
                            if (events[c][0] === 'r') {
                                totalRenderTime += events[c][3];
                                temp = {};
                                temp[events[c][1]] = events[c][3];

                                renderEvents.push(temp);
                                //console.log("measure ", events[c][1], ": ", events[c][3].toFixed(2), "ms");

                            }
                            if (events[c][0] === 'a') {
                                totalAjaxTime += events[c][4];
                                temp = {};
                                temp[events[c][1] + '_' + events[c][2]] = events[c][4];

                                ajaxEvents.push(temp);
                                //console.log("measure ", events[c][2], ":", events[c][4].toFixed(2), "ms");
                            }
                        }

                        //info.totalRenderTime = parseFloat(totalRenderTime.toFixed(2));
                        //info.totalAjaxTime= parseFloat(totalAjaxTime.toFixed(2));
                        //console.log("Events:", events);
                        //console.log("Render Events:", renderEvents);
                        //console.log("Ajax Events:", ajaxEvents);

                        info.ajaxEvents = ajaxEvents;
                        info.renderEvents = renderEvents;
                        info.sessionInfo = {
                            organizationId: Gryphon.session.get('currentLocation').get('organization').get('id'),
                            locationId: Gryphon.session.get('currentLocation').get('id'),
                            userId: Gryphon.session.get('currentUser').get('id')
                        };

                        console.log("Info:", info);

                        //KojakLite.send(events, info);   // SEND
                    }

                };

                Backbone.Router && KojakLite.aliasMethodChain(Backbone, "Router", "instrumentation", function () {

                    return KojakLite.aliasMethodChain(this, "route", "instrumentation", function () {

                        var args = KojakLite.slice(arguments),  // b = args
                            obj = String(args[0]), // c = obj
                            target = args[1],  // d = target
                            func = args[2];    // e = func

                        return obj[0] !== "/" && obj[0] !== "!" && (obj = "/" + obj),

                            typeof target === "function" ?

                                (func = target, target = undefined):

                            !func && (func = this[target]),
                            func = KojakLite.wrap(func, function () {
                                    var element = getLastElement(); // k ?????? - get last observed el     | b - element

                                    return element ? (element.klass = KojakLite.nameFor(this), element.method = target, element.pattern = obj) :
                                        element = new observedElement(KojakLite.nameFor(this), target, obj),
                                        KojakLite.setImmediate(function () {
                                            element.finalize()
                                        }),
                                        KojakLite.__super__()
                                }
                            ),
                            KojakLite.__super__.call(this, element[0], target || "", func)
                    }),
                        KojakLite.__super__()
                });

                if (Backbone.View) {
                    KojakLite.aliasMethodChain(Backbone, "View", "instrumentation", function () {
                        KojakLite.aliasMethodChain(this, "initialize", "instrumentation", function () {
                            var view;
                            //
                            //if (getLastElement()) {
                            //    view = new observedElement(KojakLite.nameFor(this), "initialize");
                            //    KojakLite.setImmediate(function () {
                            //        view.finalize()
                            //    });
                            //}
                            //
                            //
                            //
                            //return KojakLite.__super__();


                            return getLastElement() || (view = new observedElement(KojakLite.nameFor(this), "initialize"),
                                KojakLite.setImmediate(function () {
                                    view.finalize()
                                })),
                                KojakLite.__super__()
                        });

                        KojakLite.aliasMethodChain(this, "render", "instrumentation", function () {
                            var view = getLastElement(),
                                b;

                            view && (b = new RenderEvent(KojakLite.nameFor(this)), view.events.push(b));     // i render events
                            var d = KojakLite.__super__();
                            return b && b.stop(), d
                        });

                        var b = function (b, c) {
                            return KojakLite.wrap(b, function () {
                                if (!getLastElement()) {
                                    var b = new observedElement(KojakLite.nameFor(this), c);
                                    KojakLite.setImmediate(function () {
                                        b.finalize()
                                    })
                                }
                                return KojakLite.__super__()
                            })
                        };

                        return KojakLite.aliasMethodChain(this, "delegateEvents", "instrumentation", function () {
                            var d, e, g = KojakLite.slice(arguments), h = _.clone(g[0] || _.result(this, "events"));
                            for (var i in h)if (h.hasOwnProperty(i)) {
                                if (e = h[i], _.isFunction(e) ? d = "UnnamedAction" : (d = e, e = this[e]), !e)continue;
                                h[i] = b(e, d)
                            }
                            return KojakLite.__super__(h)
                        }), KojakLite.__super__()
                    });
                }
                // END VIEW INSTRUMENT

                KojakLite.aliasMethodChain($, "ajax", "instrumentation", function () {
                    var b = getLastElement();
                    if (b) {
                        var c = arguments[1] || arguments[0], d = c.type || "GET", e = c.url || arguments[0];
                        typeof c == "string" && (c = {});
                        var f = new AjaxEvent(d, e);          // h - ajax eve

                        b.events.push(f);
                        c.success = KojakLite.wrap(c.success, function () {
                            if (getLastElement() !== b) {
                                j.push(b);
                            }
                            f.stop();
                            return KojakLite.__super__();
                        });
                        c.error = KojakLite.wrap(c.error, function () {
                            if (getLastElement() !== b) {
                                j.push(b);
                            }

                            f.stop();
                            return KojakLite.__super__();
                        });

                        c.complete = KojakLite.wrap(c.complete, function () {
                            KojakLite.setImmediate(function () {
                                b.finalize();
                            });

                            return KojakLite.__super__();
                        });

                        c.url = e;
                        return KojakLite.__super__(c);


                        //return b.events.push(f), c.success = KojakLite.wrap(c.success, function () {
                        //    return getLastElement() !== b && j.push(b), f.stop(), KojakLite.__super__()
                        //}), c.error = KojakLite.wrap(c.error, function () {
                        //    return getLastElement() !== b && j.push(b), f.stop(), KojakLite.__super__()
                        //}), c.complete = KojakLite.wrap(c.complete, function () {
                        //    return KojakLite.setImmediate(function () {
                        //        b.finalize()
                        //    }), KojakLite.__super__()
                        //}), c.url = e, KojakLite.__super__(c)
                    }
                    return KojakLite.__super__();
                });
                Backbone.history = Backbone.history || new Backbone.History;
                KojakLite.adapters.Backbone = e;
                KojakLite.log("Successfully loaded KojakLite.backbone v" + e.VERSION);
            }


        }


        KojakLite.enableMeasuring = function () {
            initializeKojakLiteBackbone();
        }
    }
));
