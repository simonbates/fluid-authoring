/*
Copyright 2015, 2016 OCAD University

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

You may obtain a copy of the License at
https://raw.githubusercontent.com/GPII/nexus/master/LICENSE.txt
*/

/* eslint-env node */

"use strict";

var fluid = require("infusion"),
    path = require("path");

fluid.module.register("fluid-authoring", __dirname, require);

require("gpii-co-occurrence-engine");

var infusionBase = fluid.module.resolvePath("%infusion") + "/src/module";

fluid.loadInContextRelative = function (modulePath) {
    var absPath = fluid.module.resolvePath(modulePath);
    var rel = path.relative(infusionBase, absPath);
    fluid.loadInContext(rel);
};

fluid.loadInContextRelative("%fluid-authoring/src/shared/js/fastXmlPull.js");
fluid.loadInContextRelative("%fluid-authoring/src/shared/js/htmlParser.js");
fluid.loadInContextRelative("%fluid-authoring/src/shared/js/AuthorUtils.js");
fluid.loadInContextRelative("%fluid-authoring/src/shared/js/ComponentGraphUtilities.js");

require("./src/server/js/IncludeRewriting.js");
require("./src/server/js/VisibleNexus.js");

