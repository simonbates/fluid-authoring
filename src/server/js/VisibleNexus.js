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

fluid.defaults("fluid.authoring.nexus.app", {
    gradeNames: ["kettle.app"],
    components: {
        infusionStaticMiddleware: {
            type: "kettle.middleware.static",
            options: {
                root: "%infusion/src/"
            }
        },
        selfStaticMiddleware: {
            type: "kettle.middleware.static",
            options: {
                root: "%fluid-authoring/src/client/"
            }
        }
    },
    requestHandlers: {
        // Well we sure blundered here, not putting all these other options into a grade!!
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
        }
    }
});
