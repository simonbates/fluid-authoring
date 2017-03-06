/*
Copyright 2016 Raising the Floor - International

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

(function ($, fluid) {
    "use strict";

    fluid.registerNamespace("fluid.author");

    fluid.author.toggleClass = function (styles, element, openStyle, closedStyle, state) {
        if (openStyle) {
            element.toggleClass(styles[openStyle], state);
        }
        if (closedStyle) {
            element.toggleClass(styles[closedStyle], !state);
        }
    };

    fluid.author.bindToggleClick = function (element, applier, path) {
        element.click(function () {
            var state = fluid.get(applier.holder.model, path);
            applier.change(path, !state);
        });
    };

    // Factored off from fluid.debug.browser
    fluid.defaults("fluid.author.popupPanel", {
        gradeNames: ["fluid.viewComponent"],
        model: {
            isOpen: false
        },
        styles: {
            holderOpen: "fl-debug-holder-open",
            holderClosed: "fl-debug-holder-closed"
        },
        markup: { // TODO: outer level is still in "debug" namespace using internal CSS file
            holder: "<div class=\"flc-debug-holder fl-debug-holder\"><div class=\"flc-debug-open-pane-trigger fl-debug-open-pane-trigger\"></div><div class=\"fld-author-pane\"></div></div></div>",
            pane: "" // This should be overridden with pane markup
        },
        selectors: {
            holder: ".flc-debug-holder",
            pane: ".fld-author-pane",
            openPaneTrigger: ".flc-debug-open-pane-trigger"
        },
        events: {
            onMarkupReady: null
        },
        listeners: {
            "onCreate.render": {
                priority: "first",
                funcName: "fluid.author.popupPanel.renderMarkup",
                args: ["{that}", "{that}.options.markup.holder", "{that}.options.markup.pane"]
            },
            "onCreate.toggleTabClick": {
                funcName: "fluid.author.bindToggleClick",
                args: ["{that}.dom.openPaneTrigger", "{that}.applier", "isOpen"]
            }
        },
        modelListeners: {
            toggleClass: {
                path: "isOpen",
                funcName: "fluid.author.toggleClass",
                args: ["{that}.options.styles", "{that}.dom.holder", "holderOpen", "holderClosed", "{change}.value"]
            },
            bindResizable: {
                path: "isOpen",
                priority: "after:toggleClass",
                funcName: "fluid.author.popupPanel.bindResizable",
                args: ["{that}", "{change}.value"]
            }
        }
    });

    fluid.author.popupPanel.renderMarkup = function (that, holderMarkup, paneMarkup) {
        that.container.append(holderMarkup);
        fluid.author.panePanel.renderMarkup(that, paneMarkup);
    };

    fluid.author.popupPanel.bindResizable = function (that, isOpen) {
        if (isOpen) {
            that.locate("holder").resizable({
                handles: "n"
            });
        }
    };

    // Do-nothing alternative to fluid.author.popupPanel
    fluid.defaults("fluid.author.panePanel", {
        events: {
            onMarkupReady: null
        },
        selectors: {
            pane: ""
        },
        listeners: {
            "onCreate.render": {
                priority: "first",
                funcName: "fluid.author.panePanel.renderMarkup",
                args: ["{that}", "{that}.options.markup.pane"]
            }
        }
    });

    fluid.author.panePanel.renderMarkup = function (that, paneMarkup) {
        var pane = that.locate("pane");
        pane.append(paneMarkup);
        that.events.onMarkupReady.fire();
    };

    fluid.author.frameworkGrades = fluid.frameworkGrades;

    fluid.author.ignorableGrades = ["fluid.resolveRoot", "fluid.resolveRootSingle"];

    fluid.author.filterGrades = function (gradeNames, ignorableGrades) {
        var highestFrameworkIndex = -1;
        var output = [];
        fluid.each(gradeNames, function (gradeName) { // TODO: remove fluid.indexOf
            var findex = fluid.author.frameworkGrades.indexOf(gradeName);
            if (findex > highestFrameworkIndex) {
                highestFrameworkIndex = findex;
            } else if (findex === -1 && ignorableGrades.indexOf(gradeName) === -1 && gradeName.indexOf("{") === -1) {
                output.push(gradeName);
            }
        });
        if (highestFrameworkIndex !== -1) {
            output.push(fluid.author.frameworkGrades[highestFrameworkIndex]);
        }
        return output;
    };

})(jQuery, fluid_3_0_0);
