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

var fluid = require("infusion"),
    fs = require("fs");


fluid.defaults("fluid.staticMountIndexer", {
    gradeNames: "fluid.component",
    components: {
        app: "{kettle.app}"
    },
    listeners: {
        "onCreate.indexMounts": "fluid.staticMountIndexer.indexMounts"
    }
});

fluid.staticMountIndexer.splitModulePath = function (modulePath) {
    if (modulePath.charAt(0) !== "%") {
        return null;
    }
    var slashPos = modulePath.indexOf("/");
    if (slashPos === -1) {
        slashPos = modulePath.length;
    }
    return {
        moduleName: modulePath.substring(1, slashPos),
        suffix: modulePath.substring(slashPos + 1, modulePath.length)
    };
};

fluid.staticMountIndexer.indexMounts = function (that) {
    var requestHandlers = that.app.options.requestHandlers;
    var mountTable = {};
    fluid.each(requestHandlers, function (requestHandler) {
        var options = fluid.defaults(requestHandler.type);
        if (fluid.hasGrade(options, "fluid.authoring.static.handler")) {
            var middlewareRef = options.staticMiddleware;
            var middlewareComp = fluid.expandOptions(middlewareRef, that.app);
            console.log("Got middleware reference " + middlewareRef + " in requestHandler ", requestHandler);
            var root = middlewareComp.options.root;
            var parsedRoot = fluid.staticMountIndexer.splitModulePath(root);
            console.log("Resolved root to ", parsedRoot);
            var prefix = requestHandler.prefix || "/";
            mountTable[parsedRoot.moduleName] = {
                prefix: prefix
            };
        };
    });
    that.mountTable = mountTable;
};

fluid.defaults("fluid.includeRewriting.handler", {
    gradeNames: "kettle.request.http",
    templateRoot: "fluid.mustBeOverridden",
    invokers: {
        handleRequest: {
            funcName: "fluid.includeRewriting.handleRequest",
            args: ["{request}", "{staticMountIndexer}.mountTable"]
        }
    }
});

fluid.includeRewriting.tagToHref = {
    "link": "href",
    "script": "src"
};

fluid.includeRewriting.rewriteUrl = function (node, attrName, mountTable) {
    var href = node.attrs[attrName];
    var parsed = fluid.staticMountIndexer.splitModulePath(href);
    if (parsed) {
        var mount = mountTable[parsed.moduleName];
        var suffix = parsed.suffix;
        var relative = mount.prefix + "/" + suffix;
        node.attrs[attrName] = relative;
    }
};

fluid.includeRewriting.handleRequest = function (request, mountTable) {
    var extraPath = request.req.url;
    console.log("includeRewrite looking up extra path " + extraPath + " with mountTable ", mountTable);
    var expandRoot = fluid.module.resolvePath(request.options.templateRoot + "/" + extraPath);
    var file = fs.readFileSync(expandRoot, {encoding: "utf-8"});
    var parsed = fluid.htmlParser.parse(file, {
        "selectors": {
            "link": "head link",
            "script": "head script"
        }
    });
    fluid.each(parsed.matchedSelectors, function (nodes, id) {
        var attrName = fluid.includeRewriting.tagToHref[id];
        fluid.each(nodes, function (node) {
            fluid.includeRewriting.rewriteUrl(node, attrName, mountTable);
        });
    });
    var rendered = fluid.htmlParser.render(parsed.rootNode.children);
    console.log("Template rewritten to " + rendered);
    request.events.onSuccess.fire(rendered);
};
