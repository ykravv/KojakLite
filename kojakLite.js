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


        var utils = {}; 

        initializeKojakLite();

        function initializeKojakLite() {
            "use strict";

            var KojakLite = {VERSION: "0.0.1"},
                alreadyLoadedLib = window.KojakLite || {};

            if (alreadyLoadedLib.loaded) {
                if (KojakLite.VERSION === alreadyLoadedLib.VERSION) {
                    utils.warn("Already loaded KojakLite.core  v" + KojakLite.VERSION);
                    return;
                } else {
                    utils.error("Failed to load KojakLite.core  v" + KojakLite.VERSION + ": " + "another version of KojakLite.core (v" + alreadyLoadedLib.VERSION + ") was already loaded");
                }

                return;
            }

            KojakLite.config = {
                apiKey: "api-key",
                beaconURL: "/KojakLite",
                debug: true,
                enabled: false,
                enableAjaxFilter: false,
                dropDurationTime: 1000
            };

            // Local utils
            _.extend(utils, {
                isBrowserModern: function () {
                    return !!(!window.attachEvent || window.addEventListener || window.navigator.userAgent.indexOf("MSIE 8.0") >= 0);
                },
                isKojakLiteEnabled: function () {
                    return utils.isBrowserModern() && KojakLite.config.enabled;
                },
                generateVisitorId: function () {
                    var b, c = function () {
                        for (var a = "_cpv=", b = document.cookie.split(";"), c = 0; c < b.length; c++) {
                            var d = b[c].replace(/^\s+|\s+$/g, ""), e = d.indexOf(a);
                            if (0 === e)return d.substring(5, d.length)
                        }
                        return void 0
                    }, d = function (a) {
                        var b = new Date(utils.now() + 631152e5);
                        return document.cookie = "_cpv=" + a + "; expires=" + b.toGMTString() + "; path=/", a
                    };

                    b = c();

                    if (b) {
                        utils.log("Using existing visitor ID " + b);
                    } else {
                        b = utils.randomStr(16);
                        utils.log("Generated visitor ID " + b);
                    }

                    return d(b);
                },
                now: function () {
                    if (!Date.now) {
                        return (new Date).valueOf();
                    } else {
                        return Date.now();
                    }
                },
                noop: function () {},
                log: function () {
                    var args = utils.makeArguments(arguments);

                    args.unshift("[KojakLite] ");
                    KojakLite.config.debug && window.console.log.apply(console, args);
                },
                warn: function () {
                    var args = utils.makeArguments(arguments);
                    args.unshift("[KojakLite] ");

                    KojakLite.config.debug && window.console.warn.apply(console, args);
                },
                error: function (err) {
                    window.console.error("[KojakLite] " + err);
                },
                makeArguments: function (args) {          // Make arguments as true array
                    return Array.prototype.slice.call(args);
                },
                setImmediate: function (func) {
                    var args = utils.makeArguments(arguments);
                    return window.setTimeout(function () {
                        func.apply(null, args)
                    }, 0);
                },
                randomStr: function (length) {
                    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                        alphLen = alphabet.length,
                        result = [],
                        i;

                    for (i = length; i; i--) {
                        result.push(alphabet[Math.floor(Math.random() * alphLen)])
                    }

                    return result.join('');
                },
                __super__: function () {
                    throw new Error("Cannot call utils.__super__ outside of a wrapped function")
                },
                wrap: function (func, decorator) {
                    return function () {
                        var superFunc = utils.__super__,
                            _this = this,
                            args = utils.makeArguments(arguments);

                        try {

                            if (_.isFunction(func)) {
                                utils.__super__ = function () {
                                    if (this === utils) {
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
                                utils.__super__ = utils.noop;
                            }

                            return decorator.apply(this, arguments);

                        } finally {
                            utils.__super__ = superFunc
                        }
                    }
                },
                methodChain: function (obj, target, c, func) {
                    var method = obj[target];

                    if (_.isFunction(method)) {
                        var f = "__" + target + "_without_" + c + "__", // __Router_without_instrumentation__
                            g = "__" + target + "_with_" + c + "__";    // __Router_with_instrumentation__

                        obj[f] = method;
                        obj[g] = obj[target] = func;
                    }
                    return KojakLite;
                },
                nameFor: function (thing) {
                    if (_.isString(thing)) {
                        return thing;
                    }

                    if (thing && thing.constructor) {
                        return thing.context;
                    }
                },
                createEventsString: function (events) {   // Events
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
                eventsToString: function (events) {
                    var tmpArr = [];

                    if (_.isString(events)) {
                        return utils.createEventsString(events);
                    }

                    for (var i = 0; i < events.length; i++) {
                        tmpArr.push(utils.createEventsString(events[i]));
                    }

                    return tmpArr.join("_");
                },
                sendEvent: function (events, info) {
                    if (!KojakLite.config.apiKey || !KojakLite.config.apiKey.length) {
                        utils.error("Attempted to call send without an API key set, payload dropped");
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

                        events && (urlString = urlString + "&p=" + utils.eventsToString(events));   //  events to string
                        utils.log("Sending request " + reqNumber);

                        // length warn
                        urlString.length > 2e3 && utils.log("Request " + reqNumber + ": URL is " + urlString.length + " characters long, this might cause errors in some browsers!");

                        var successCb = function () {
                                utils.log("Completed request " + reqNumber);
                            },

                            errorCb = function () {
                                utils.log("Failed request " + reqNumber + ", giving up");
                            },

                            repeatRequest = function (seconds, c, attemptsCount) {  // p  - repeat failed requests
                                return function () {
                                    utils.log("Failed request " + reqNumber + ", retrying in " + seconds + " seconds");

                                    window.setTimeout(function () {
                                        utils.log("Retrying request " + reqNumber);
                                        if (attemptsCount > 0) {
                                            utils.dispatchRequest(urlString, successCb, repeatRequest(seconds * c, c, attemptsCount - 1));
                                        } else {
                                            utils.dispatchRequest(urlString, successCb, errorCb);
                                        }
                                    }, 1e3 * seconds);
                                }
                            };


                        utils.dispatchRequest(urlString, successCb, errorCb);
                        //utils.dispatchRequest(urlString, successCb, repeatRequest(30, 2, 2)) // Retrying failed requests
                    }
                },
                dispatchRequest: function (urlString, successCb, errorCb) {
                    var req = new Image;

                    _.isFunction(successCb) && (req.onload = successCb);
                    _.isFunction(errorCb) && (req.onerror = errorCb);
                    req.src = urlString;
                }
            });

            KojakLite.enabled = utils.isKojakLiteEnabled();

            if (!KojakLite.enabled) {
                if (KojakLite.config.debug) {
                    utils.warn("[KojakLite] KojakLite is disabled. Run LojakLite.enableMeasuring() to start work");
                    window.KojakLite = KojakLite;
                }
            }
            utils.log("Initializing KojakLite.core v" + KojakLite.VERSION + "...");
            if (!KojakLite.config.apiKey || !KojakLite.config.apiKey.length) {
                utils.error("Failed to load KojakLite.core: did you forget to set your KojakLite API key?");
                window.KojakLite = KojakLite;
                return;
            }
            // OK

            KojakLite.sessionID = utils.randomStr(16);
            utils.log("Generated session ID " + KojakLite.sessionID);
            KojakLite.visitorID = KojakLite.config.visitor || utils.generateVisitorId();

            var f = 0;

            KojakLite.adapters = {core: KojakLite};
            KojakLite.loaded = true;
            window.KojakLite = KojakLite;
            utils.log("Sucсessfully loaded KojakLite.core v" + KojakLite.VERSION);
        }

        function initializeKojakLiteBackbone(sessionInfoConfig) {
            "use strict";

            var KojakLite = window.KojakLite;

            if (sessionInfoConfig) {
                KojakLite.sessionInfo = sessionInfoConfig;
            }

            var backboneAdapter = {VERSION: "0.0.1"};

            if (!KojakLite || !KojakLite.loaded) {
                KojakLite && !KojakLite.enabled && utils.error("[KojakLite] Failed to load KojakLite.backbone: KojakLite.core could not be found");
            } else if (KojakLite.adapters && KojakLite.adapters.Backbone) {
                KojakLite.adapters.Backbone.VERSION === backboneAdapter.VERSION ?
                    utils.warn("Already loaded KojakLite.backbone v" + backboneAdapter.VERSION) :
                    utils.error("Failed to load KojakLite.backbone v" + backboneAdapter.VERSION + ": " + "another version of KojakLite.backbone (v" + KojakLite.adapters.Backbone.VERSION + ") was already loaded");
            } else if (!Backbone) {
                utils.error("Failed to load KojakLite.backbone: Backbone could not be found");
            } else if (!_) {
                utils.error("Failed to load KojakLite.backbone: Underscore could not be found");
            } else {

                // OK
                utils.log("Initializing KojakLite.backbone v" + backboneAdapter.VERSION);

                var g = utils.wrap(utils.methodChain, function (object, methodName, e, decorator) {
                        var method = object[methodName];

                        if (!_.isFunction(method)) return object;
                        var h = utils.wrap(method, decorator);

                        h = _.isFunction(method.extend) ? method.extend({constructor: h}) : _.extend(h, method);
                        return utils.__super__(object, methodName, e, h);

                    });


                utils.methodChain(utils, "methodChain", "underscore", g);
                utils.methodChain(utils, "nameFor", "backbone", function (thing) {
                    var superFunc = utils.__super__();

                    if (!superFunc && thing instanceof Backbone.View) {
                        superFunc = "UnnamedView";
                        if (thing.id) {
                            superFunc = superFunc + "<#" + _.result(thing, "id") + ">";
                        } else {
                            if (thing.className) {
                                superFunc = superFunc + "<." + _.result(thing, "className") + ">";
                            }
                        }
                        thing.__name__ = superFunc;
                    }

                    return superFunc;
                });

                var Event = window.Event = function () {
                    this.initialize && this.initialize.apply(this, utils.makeArguments(arguments));
                };
                _.extend(Event.prototype, {
                    stop: function () {
                        if (this.pending) {
                            this.stopTime = window.performance.mark(this.getEndLabel());
                            this.pending = false;
                        }
                    },
                    getStartLabel: function () {
                        return "start_" + this.rand;
                    },
                    getEndLabel: function () {
                        return "end_" + this.rand;
                    },
                    getMeasureName: function () {
                        return "measure_" + this.rand;
                    }
                });
                Event.extend = Backbone.View.extend;

                var AjaxEvent = window.AjaxEvent = Event.extend({
                    initialize: function (method, url) {
                        this.method = method;
                        this.url = url;
                        this.startTime = utils.now();
                        this.pending = true;
                        this.rand = utils.randomStr(4);
                        window.performance.mark(this.getStartLabel());
                    },
                    serialize: function (a) {
                        var measureName = this.getMeasureName(),
                            smTime = a || 0,
                            duration;

                        window.performance.measure(measureName, this.getStartLabel(), this.getEndLabel());
                        duration = parseFloat(window.performance.getEntriesByName(measureName)[0].duration.toFixed(2));

                        utils.log(this.getMeasureName(), this.url,":", duration, "ms");
                        return !this.pending ? ["a", this.method, this.url, this.startTime - smTime, duration] : undefined;
                    }
                });


                var RenderEvent = window.RenderEvent = Event.extend({
                    initialize: function (viewName) {
                        this.viewName = viewName;
                        this.rand = utils.randomStr(4);
                        this.startTime = utils.now();
                        this.pending = true;
                        window.performance.mark(this.getStartLabel());
                    },
                    serialize: function (a) {
                        var measureName = this.getMeasureName(),
                            smTime = a || 0,
                            duration;

                        window.performance.measure(measureName, this.getStartLabel(), this.getEndLabel());
                        duration = parseFloat(window.performance.getEntriesByName(measureName)[0].duration.toFixed(2));

                        utils.log(this.getMeasureName(), this.viewName , ": ", duration, "ms");

                        return !this.pending ? ["r", this.viewName, this.startTime - smTime, duration] : undefined;
                    }
                });


                var ObservedElement = Event.extend({
                    initialize: function (klass, method, pattern) {
                        this.klass = klass;
                        this.method = method;
                        this.pattern = pattern;
                        this.startTime = utils.now();
                        this.rand = utils.randomStr(4);

                        window.performance.mark('observedElementStart_' + this.rand);

                        this.events = [];
                        this.finalized = false;
                        observedElements.push(this);
                    },
                    collectEvents: function () {
                        var events = [],
                            renderEvents = [],
                            ajaxEvents = [],
                            temp, i;

                        for (i = 0; i < this.events.length; i++) {
                            events.push(this.events[i].serialize(this.startTime));
                        }

                        // Collect events
                        for (i = 0; i < events.length; i++) {
                            if (events[i][0] === 'r') {
                                temp = {};
                                temp[events[i][1]] = events[i][3];

                                renderEvents.push(temp);
                            }
                            if (events[i][0] === 'a') {
                                temp = {};
                                temp[events[i][1] + '_' + events[i][2]] = events[i][4];

                                ajaxEvents.push(temp);
                            }
                        }

                        return {
                            renderEvents: renderEvents,
                            ajaxEvents: ajaxEvents
                        }
                    },
                    captureUrl: function () {
                        try {
                            this.url = Backbone.history.getFragment()
                        } catch (e) {
                            this.url = window.location.hash.length ? window.location.hash.substr(1) : window.location.pathname
                        }
                    },
                    finalize: function () {
                        if (!this.finalized) {
                            var i;

                            for (var c = 1; c <= observedElements.length; c++) {
                                if (this === observedElements[observedElements.length - c]) {
                                    observedElements.splice(observedElements.length - c, 1);
                                }
                            }

                            for (i = 0; i < this.events.length; i++) {
                                if (this.events[i].pending) {
                                    return;
                                }
                            }  // waiting all events complete

                            window.performance.mark('observedElementFinish_' + this.rand);
                            window.performance.measure(
                                'observedElement_' + this.rand,
                                'observedElementStart_' + this.rand,
                                'observedElementFinish_' + this.rand
                            );

                            this.duration = window.performance.getEntriesByName('observedElement_' + this.rand)[0].duration;
                            this.finalized = true;

                            if (this.duration < (KojakLite.config.dropDurationTime || 1)) {
                                return utils.log("Dropped: " + this.klass + "." + this.method + " (" + this.pattern + "), took " + this.duration + "ms. (dropDurationTime is " + KojakLite.config.dropDurationTime + "ms)"), void 0;
                            }

                            if (KojakLite.config.enableAjaxFilter) { // Get events only if ajax requests have been done
                                var d = false;
                                for (i = 0; i < this.events.length; i++) if (this.events[i] instanceof AjaxEvent) {
                                    d = true;
                                    break;
                                }
                                if (!d) {
                                    return utils.log("Dropped: " + this.klass + "." + this.method + " (" + this.pattern + "), took " + this.duration + "ms. (enableAjaxFilter is true)"), void 0
                                }
                            }

                            utils.log("Sending: " + this.klass + "." + this.method + " (" + this.pattern + "), took " + this.duration + "ms.");

                            this.captureUrl();
                            var events = this.collectEvents();

                            var info = {
                                startTime: this.startTime,
                                duration: this.duration,
                                url: this.url,
                                ajaxEvents: events.ajaxEvents,
                                renderEvents: events.renderEvents,
                                sessionInfo: KojakLite.sessionInfo
                            };

                            this.klass && this.klass.length > 0 ? info.klass = this.klass : utils.noop();
                            this.method && this.method.length > 0 > 0 ? info.method = this.method : utils.noop();
                            this.pattern && this.pattern.length > 0 ? info.pattern = this.pattern : utils.noop();

                            utils.log("Info:", info);

                            // Here need call some function which will save info object
                            //utils.sendEvent(events, info);   // SEND
                        }
                    }
                });


                var observedElements = [],
                    getLastElement = function () {
                        return observedElements[observedElements.length - 1];
                    };

                utils.methodChain(Backbone, "Router", "instrumentation", function () {

                    utils.methodChain(this, "route", "instrumentation", function () {

                        var args = utils.makeArguments(arguments),
                            path = String(args[0]),
                            name = args[1],
                            func = args[2];

                        if (path[0] !== "/" && path[0] !== "!") {
                            path = "/" + path;
                        }

                        if (_.isFunction(name)) {
                            func = name;
                            name = undefined;
                        } else {
                            if (!func) {
                                func = this[name];
                            }
                        }

                        func = utils.wrap(func, function () {
                            var element = getLastElement();

                            if (element) {
                                element.klass = utils.nameFor(this);
                                element.method = name;
                                element.pattern = path;
                            } else {
                                element = new ObservedElement(utils.nameFor(this), name, path); //klass, method, pattern
                            }

                            utils.setImmediate(function () {
                                element.finalize()
                            });

                            return utils.__super__();
                        });

                        return utils.__super__.call(this, element[0], name || "", func)
                    });

                    return utils.__super__();
                });

                //utils.methodChain(Backbone, "View", "instrumentation", function () {
                //    var wrapper = function (eventMethod, methodName) {
                //        return utils.wrap(eventMethod, function () {
                //            if (!getLastElement()) {
                //                var observedElement = new ObservedElement(utils.nameFor(this), methodName);
                //                utils.setImmediate(function () {
                //                    observedElement.finalize()
                //                })
                //            }
                //            return utils.__super__()
                //        });
                //    };
                //
                //    utils.methodChain(this, "initialize", "instrumentation", function () {
                //        var view;
                //
                //        if (!getLastElement()) {
                //            view = new ObservedElement(utils.nameFor(this), "initialize");
                //            utils.setImmediate(function () {
                //                view.finalize()
                //            });
                //        }
                //
                //        return utils.__super__();
                //    });
                //    utils.methodChain(this, "render", "instrumentation", function () {
                //        var view = getLastElement(),
                //            renderEvent;
                //
                //        if (view) {
                //            renderEvent = new RenderEvent(utils.nameFor(this));
                //            view.events.push(renderEvent);
                //        }
                //
                //        if (renderEvent) {
                //            renderEvent.stop();
                //        }
                //
                //        return utils.__super__();
                //    });
                //    utils.methodChain(this, "delegateEvents", "instrumentation", function () {
                //        var args = utils.makeArguments(arguments),
                //            events = _.clone(args[0] || _.result(this, "events")),
                //            eventName, event;
                //
                //        for (var key in events) {
                //            if (events.hasOwnProperty(key)) {
                //                event = events[key];
                //                if (_.isFunction(event)) {
                //                    eventName = "UnnamedAction";
                //                } else {
                //                    eventName = event;
                //                    event = this[event];
                //                }
                //                if (!event) {
                //                    continue;
                //                }
                //
                //                events[key] = wrapper(event, eventName);
                //            }
                //        }
                //
                //        return utils.__super__(events)
                //    });
                //
                //    return utils.__super__()
                //});


                utils.methodChain(Backbone, "View", "instrumentation", function () {
                    utils.methodChain(this, "initialize", "instrumentation", function () {
                        var view;

                        return getLastElement() || (view = new ObservedElement(utils.nameFor(this), "initialize"),
                            utils.setImmediate(function () {
                                view.finalize()
                            })),
                            utils.__super__()
                    });

                    utils.methodChain(this, "render", "instrumentation", function () {
                        var view = getLastElement(),
                            b;

                        view && (b = new RenderEvent(utils.nameFor(this)), view.events.push(b));     // i render events
                        var d = utils.__super__();
                        return b && b.stop(), d
                    });

                    var b = function (b, c) {
                        return utils.wrap(b, function () {
                            if (!getLastElement()) {
                                var b = new ObservedElement(utils.nameFor(this), c);
                                utils.setImmediate(function () {
                                    b.finalize()
                                })
                            }
                            return utils.__super__()
                        })
                    };

                    return utils.methodChain(this, "delegateEvents", "instrumentation", function () {
                        var d, e, g = utils.makeArguments(arguments), h = _.clone(g[0] || _.result(this, "events"));
                        for (var i in h)if (h.hasOwnProperty(i)) {
                            if (e = h[i], _.isFunction(e) ? d = "UnnamedAction" : (d = e, e = this[e]), !e)continue;
                            h[i] = b(e, d)
                        }
                        return utils.__super__(h)
                    }), utils.__super__()
                });


                utils.methodChain($, "ajax", "instrumentation", function () {
                    var lastObservedElement = getLastElement();
                    if (lastObservedElement) {
                        var ajaxSettings = arguments[1] || arguments[0],
                            type = ajaxSettings.type || "GET",
                            url = ajaxSettings.url || arguments[0];

                        if (_.isString(ajaxSettings)) {
                            ajaxSettings = {};
                        }

                        var ajaxEvent = new AjaxEvent(type, url);

                        lastObservedElement.events.push(ajaxEvent);
                        ajaxSettings.success = utils.wrap(ajaxSettings.success, function () {
                            if (getLastElement() !== lastObservedElement) {
                                observedElements.push(lastObservedElement);
                            }
                            ajaxEvent.stop();
                            return utils.__super__();
                        });
                        ajaxSettings.error = utils.wrap(ajaxSettings.error, function () {
                            if (getLastElement() !== lastObservedElement) {
                                observedElements.push(lastObservedElement);
                            }

                            ajaxEvent.stop();
                            return utils.__super__();
                        });
                        ajaxSettings.complete = utils.wrap(ajaxSettings.complete, function () {
                            utils.setImmediate(function () {
                                lastObservedElement.finalize();
                            });

                            return utils.__super__();
                        });

                        ajaxSettings.url = url;
                        return utils.__super__(ajaxSettings);
                    }
                    return utils.__super__();
                });


                Backbone.history = Backbone.history || new Backbone.History;
                KojakLite.adapters.Backbone = backboneAdapter;
                utils.log("Successfully loaded KojakLite.backbone v" + backboneAdapter.VERSION);
            }


        }

        KojakLite.enableMeasuring = function (sessionInfoConfig) {
            initializeKojakLiteBackbone(sessionInfoConfig);
        };

    }
));
