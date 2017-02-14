/*
Copyright 2016 Raising the Floor - International
Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.
You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

/* eslint-env node */

"use strict";

var fluid = require("infusion");

// TODO - this is somewhat nutso but something like it should go into the framework.
// TODO: Normalise naming authoring/author

fluid.defaults("fluid.authoring.static.handler", {
    gradeNames: "kettle.request.http",
    mergePolicy: {
        staticMiddleware: "noexpand"
    },
    components: {
        staticMiddleware: "{{handler}.options.staticMiddleware}"
    },
    requestMiddleware: {
        "static": {
            middleware: "{handler}.staticMiddleware"
        }
    },
    invokers: {
        handleRequest: {
            funcName: "kettle.request.notFoundHandler"
        }
    }
});

// These definitions are necessary because of KETTLE-56
fluid.defaults("fluid.authoring.nexus.infusionStaticHandler", {
    gradeNames: "fluid.authoring.static.handler",
    staticMiddleware: "{app}.infusionStaticMiddleware"
});

fluid.defaults("fluid.authoring.nexus.selfStaticHandler", {
    gradeNames: "fluid.authoring.static.handler",
    staticMiddleware: "{app}.selfStaticMiddleware"
});

fluid.defaults("fluid.authoring.nexus.templatesHandler", {
    gradeNames: "fluid.includeRewriting.handler",
    templateRoot: "%fluid-authoring/src/server/html"
});

fluid.defaults("fluid.authoring.nexus.app", {
    gradeNames: ["kettle.app"],
    components: {
        staticMountIndexer: {
            type: "fluid.staticMountIndexer"
        },
        infusionStaticMiddleware: {
            type: "kettle.middleware.static",
            options: {
                root: "%infusion/src/"
            }
        },
        selfStaticMiddleware: {
            type: "kettle.middleware.static",
            options: {
                root: "%fluid-authoring/src/"
            }
        },
        componentTracker: {
            type: "fluid.authoring.nexus.componentTracker"
        }
    },
    events: {
        // Locally sensed events corresponding to component tree changes
        onComponentCreate: null,
        onComponentDestroy: null,
        onLocalModelChanged: null,
        // Client events transmitted over WebSockets bus
        onModelChanged: null,
        onConnect: null
    },
    listeners: {
                                                                     // request, message
        "onConnect.impl": "fluid.authoring.nexus.authorBus.onConnect({kettle.config}, {arguments}.0, {arguments}.1)",
                                                                     // request, message
        "onModelChanged.impl": "fluid.authoring.nexus.authorBus.onModelChanged({arguments}.0, {arguments}.1)"
    },
    requestHandlers: {
        // Well we sure blundered here, not putting all these other options into a grade!!
        // Or indeed, not making "requestHandlers" simply regular fucking components
        infusionStatic: {
            type: "fluid.authoring.nexus.infusionStaticHandler",
            prefix: "/infusion",
            route: "/*",
            method: "get"
        },
        selfStatic: {
            type: "fluid.authoring.nexus.selfStaticHandler",
            prefix: "/fluid-authoring",
            route: "/*",
            method: "get"
        },
        selfRewriting: {
            type: "fluid.authoring.nexus.templatesHandler",
            prefix: "/visible-nexus",
            route: "/*",
            method: "get"
        },
        authorBus: {
            type: "fluid.authoring.nexus.authorBus.handler",
            route: "/author-bus"
        }
    }
});

// cf fluid.debug.viewMapper in fluidViewDebugging.js - we use "resolveRoot" as the cleanest scheme to allow
// each grade to resolve the target of the tracking. Some scheme for improving "id-based selectors" might be helpful,
// but seems to unavoidably require some form of string pasting, and we don't really want to create a new syntax.
// Fixing FLUID-5258 is one option, but still doesn't solve the problem of shipping entire component references around.
// Probably FLUID-5556 is the best option.
fluid.defaults("fluid.authoring.nexus.componentTracker", {
    gradeNames: ["fluid.component", "fluid.resolveRoot"],
    components: {
        nexusApp: "{fluid.authoring.nexus.app}"
    },
    distributeOptions: {
        creationTracker: {
            record: "fluid.authoring.nexus.creationTracker",
            target: "{/ fluid.component}.options.gradeNames"
        },
        modelTracker: {
            record: "fluid.authoring.nexus.modelTracker",
            target: "{/ fluid.modelComponent}.options.gradeNames"
        }
    }
});

fluid.defaults("fluid.authoring.nexus.creationTracker", {
    listeners: {
        "onCreate.notifyNexus": {
            func: "{fluid.authoring.nexus.componentTracker}.nexusApp.events.onComponentCreate.fire"
        },
        "onDestroy.notifyNexus": {
            func: "{fluid.authoring.nexus.componentTracker}.nexusApp.events.onComponentDestroy.fire"
        }
    }
});

fluid.defaults("fluid.authoring.nexus.modelTracker", {
    modelListeners: {
        "": {
            namespace: "notifyNexus",
            excludeSource: "init",
            funcName: "{fluid.authoring.nexus.componentTracker}.nexusApp.events.onLocalModelChanged.fire",
            args: ["{that}", "{change}"]
        }
    }
});

fluid.defaults("fluid.authoring.nexus.authorBus.handler", {
    gradeNames: ["kettle.request.ws"],
    listeners: {
        "onReceiveMessage.impl": {
            funcName: "fluid.authoring.nexus.authorBus.receiveMessage",
            args: ["{kettle.app}", "{that}", "{arguments}.1"]
                                                 // message
        },
        // Remember, no namespaces for these three listeners as per FLUID-5948
        "{kettle.app}.events.onComponentCreate": {
            func: "{that}.maybeSendShadow",
            args: ["{arguments}.0"]
        },
        "{kettle.app}.events.onComponentDestroy": {
            func: "{that}.maybeSendShadow",
            args: ["{arguments}.0", true]
        },
        "{kettle.app}.events.onLocalModelChanged": {
            func: "{that}.localModelChanged",
            args: ["{arguments}.0", "{arguments}.1", "{arguments}.2"]
        }
    },
    invokers: {
        isIncludedComponent: "fluid.authoring.nexus.authorBus.isIncludedComponent({that}, {arguments}.0)",
        sendShadows: "fluid.authoring.nexus.authorBus.sendShadows({that})",
                                                                                  // component, isDestroy
        maybeSendShadow: "fluid.authoring.nexus.authorBus.maybeSendShadow({that}, {arguments}.0, {arguments}.1)",
                                                                                  // shadow, isDestroy
        sendShadow: "fluid.authoring.nexus.authorBus.sendShadow({kettle.config}, {that}, {arguments}.0, {arguments}.1)",
                                                                                  // component, change
        localModelChanged: "fluid.authoring.nexus.authorBus.localModelChanged({that}, {arguments}.0, {arguments}.1)"
    }
});

fluid.authoring.nexus.authorBus.shadowPaths = [
    "path",
    "that.id",
    "that.typeName",
    "that.options.gradeNames",
    "that.model"
];

fluid.authoring.nexus.authorBus.sendShadow = function (config, request, shadow, isDestroy) {
    var filterShadow = {};
    fluid.each(fluid.authoring.nexus.authorBus.shadowPaths, function (shadowPath) {
        var value = fluid.get(shadow, shadowPath);
        fluid.set(filterShadow, shadowPath, value);
    });
    request.sendTypedMessage(isDestroy ? "componentDestroy" : "componentCreate", {
        shadow: filterShadow,
        messageGeneration: request.connectMessage.messageGeneration,
        serverId: config.id
    });
};

fluid.authoring.nexus.authorBus.isIncludedComponent = function (request, component) {
    var instantiator = fluid.globalInstantiator;
    var shadow = instantiator.idToShadow[component.id];
    var parsedPath = instantiator.parseEL(shadow.path);
    return fluid.author.componentGraph.isIncludedComponent(request.filterOptions, parsedPath, component) ? shadow : null;
};

fluid.authoring.nexus.authorBus.localModelChanged = function (request, component, change) {
    var shadow = request.isIncludedComponent(component);
    var sources = change.transaction.sources;
    if (shadow && !sources[request.connectMessage.clientId]) {
        request.sendTypedMessage("modelChanged", {
            componentPath: shadow.path,
            componentId: shadow.that.id,
            messageGeneration: request.connectMessage.messageGeneration,
            change: fluid.receivedChangeToFirable(change)
        });
    }
};

fluid.authoring.nexus.authorBus.onModelChanged = function (request, message) {
    var targetComponent = fluid.componentForPath(message.componentPath);
    message.change.source = request.connectMessage.clientId;
    targetComponent.applier.fireChangeRequest(message.change);
};

fluid.authoring.nexus.authorBus.maybeSendShadow = function (request, component, isDestroy) {
    var shadow = request.filterOptions ? request.isIncludedComponent(component) : null;
    if (shadow) {
        request.sendShadow(shadow, isDestroy);
    }
};

fluid.authoring.nexus.authorBus.sendShadows = function (request) {
    var allComponents = [fluid.rootComponent].concat(fluid.queryIoCSelector(fluid.rootComponent, "fluid.component"));
    fluid.log("sendShadows considering tree of " + allComponents.length + " components with options ", request.filterOptions);
    fluid.each(allComponents, function (component) {
        request.maybeSendShadow(component);
    });
};

// connection message structure:
//     includeRoots: [],
//     excludeRoots: [],
//     ignorableGrades: []
//     messageGeneration: int
//     (type) - currently we support just one kind of connection message
// On connection, we then do "sendShadows" for all current shadows, and then start a bus of additions and deletions

fluid.authoring.nexus.authorBus.onConnect = function (config, request, message) {
    request.connectMessage = message;
    fluid.log("Got connectMessage ", request.connectMessage);
    var filterOptions = fluid.filterKeys(request.connectMessage, ["ignorableRoots", "ignorableGrades"]);
    var selfPath = fluid.pathForComponent(config);
    filterOptions.ignorableRoots[config.id] = selfPath;
    request.filterOptions = filterOptions;
    request.sendShadows();
};

fluid.authoring.nexus.authorBus.receiveMessage = function (app, request, message) {
    var eventName = "on" + fluid.capitalizeFirstLetter(message.type);
    fluid.log("Firing event " + eventName + " with payload ", message);
    app.events[eventName].fire(request, message);
};
