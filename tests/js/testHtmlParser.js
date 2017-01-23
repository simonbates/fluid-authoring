/*
Copyright 2017 Raising the Floor - International

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://raw.githubusercontent.com/fluid-project/chartAuthoring/master/LICENSE.txt
*/

/* global fluid, jqUnit, JSON5 */

(function ($, fluid) {

    "use strict";

    fluid.registerNamespace("fluid.tests.htmlParser");

    fluid.tests.htmlParser.fixtures = [{
        html: "../data/minimalHtml.html",
        expectedJSON: "../data/minimalHtml.json5"
    }];

    $.ajaxSetup({
        converters: {
            "text json5": JSON5.parse
        }
    });

    fluid.tests.htmlParser.trimWhitespace = function (tree) {
        var togo = fluid.censorKeys(tree, ["children"]);
        fluid.each(tree.children, function (child) {
            var trimmed = fluid.tests.htmlParser.trimWhitespace(child);
            if (trimmed) {
                fluid.pushArray(togo, "children", trimmed);
            }
        });
        if (tree.text !== undefined) {
            togo.text = tree.text.trim();
            if (togo.text === "") {
                togo = null;
            }
        }
        if (togo && togo.text === undefined && !togo.children && !togo.tagName) {
            togo = null;
        }
        return togo;
    };

    // Should really use settleStructure
    fluid.tests.htmlParser.resolveFixtures = function (structure) {
        var resourceSpecs = {};
        var pushResourceSpec = function (href, path, dataType) {
            resourceSpecs[path] = {
                href: href,
                fetchKey: path,
                dataType: dataType
            };
        };
        var resolved = fluid.copy(fluid.tests.htmlParser.fixtures);
        fluid.each(structure, function (fixture, key) {
            pushResourceSpec(fixture.html, key + ".html");
            pushResourceSpec(fixture.expectedJSON, key + ".expectedJSON", "JSON5");
        });
        var togo = fluid.promise();
        var resolveSpecs = function () {
            var fetchError;
            fluid.each(resourceSpecs, function (resourceSpec) {
                if (resourceSpec.fetchError) {
                    fetchError = resourceSpec.fetchError;
                    return;
                }
                //var resolved = resourceSpec.dataType === "JSON5" ? JSON5.parse(resourceSpec.resourceText) : resourceSpec.resourceText;
                fluid.set(resolved, resourceSpec.fetchKey, resourceSpec.resourceText);
            });
            if (fetchError) {
                togo.reject(fetchError);
            } else {
                togo.resolve(resolved);
            }
        };
        fluid.fetchResources(resourceSpecs, resolveSpecs);
        return togo;
    };

    fluid.tests.htmlParser.runFixtures = function (resolved) {
        fluid.each(resolved, function (fixture, i) {
            jqUnit.test("Expected results from parsing fixture " + i + " path " + fluid.tests.htmlParser.fixtures[i].html, function () {
                var parsed = fluid.htmlParser.parse(fixture.html);
                var trimmed = fluid.tests.htmlParser.trimWhitespace(parsed.rootNode, {});
                console.log(JSON5.stringify(trimmed, null, 2));
                jqUnit.assertDeepEq("Expected parsed results", fixture.expectedJSON, trimmed);
                var rendered = fluid.htmlParser.render(parsed.rootNode.children);
                console.log(rendered);
                jqUnit.assertEquals("Roundtripped HTML", fixture.html, rendered);
            });
        });
    };

    fluid.tests.htmlParser.resolveFixtures(fluid.tests.htmlParser.fixtures).then(fluid.tests.htmlParser.runFixtures, fluid.fail);

})(jQuery, fluid);
