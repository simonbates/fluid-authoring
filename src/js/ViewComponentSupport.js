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

    /** A variant of fluid.viewComponent that bypasses the wacky "initView" and variant signature
     * workflow, sourcing instead its "container" from an option of that name, so that this argument
     * can participate in standard ginger resolution. This enables useful results such as a component
     * which can render its own container into the DOM on startup, whilst the container remains immutable.
     */
    fluid.defaults("fluid.newViewComponent", {
        gradeNames: ["fluid.modelComponent"],
        members: {
            // 3rd argument is throwaway to force evaluation of container
            dom: "@expand:fluid.initDomBinder({that}, {that}.options.selectors, {that}.container)",
            container: "@expand:fluid.container({that}.options.container)"
        }
    });

    // "Stopgap new renderer" support

    fluid.registerNamespace("fluid.author");

    fluid.author.renderContainer = function (that, renderMarkup, parentContainer) {
        var containerMarkup = renderMarkup();
        var container = $(containerMarkup);
        if (typeof(parentContainer) === "function") {
            parentContainer = parentContainer();
        }
        parentContainer.append(container);
        return container;
    };

    fluid.defaults("fluid.author.containerRenderingView", {
        gradeNames: "fluid.newViewComponent",
        invokers: {
            renderMarkup: "fluid.identity({that}.options.markup.container)"
        },
        container: "@expand:fluid.author.renderContainer({that}, {that}.renderMarkup, {that}.options.parentContainer)",
        // The DOM element which to which this component should append its markup on startup
        parentContainer: "fluid.notImplemented" // must be overridden
    });

    fluid.defaults("fluid.author.containerSVGRenderingView", {
        gradeNames: "fluid.author.containerRenderingView",
        container: "@expand:fluid.author.renderSVGContainer({that}, {that}.renderMarkup, {that}.options.parentContainer)"
    });

    // Modelised layout support

    fluid.author.numberToCSS = function (element, value, property) {
        if (typeof(value) === "number") {
            element.css(property, value);
        }
    };

    // A component with model-bound fields left, top, width, height which map to the equivalent CSS properties
    fluid.defaults("fluid.author.domPositioning", {
        modelListeners: {
            "layout.left":   "fluid.author.numberToCSS({that}.container, {change}.value, left)",
            "layout.top":    "fluid.author.numberToCSS({that}.container, {change}.value, top)"
        }
    });

    fluid.defaults("fluid.author.domSizing", {
        modelListeners: {
            "layout.width":  "fluid.author.numberToCSS({that}.container, {change}.value, width)",
            "layout.height": "fluid.author.numberToCSS({that}.container, {change}.value, height)"
        }
    });

    fluid.defaults("fluid.author.domReadBounds", {
        invokers: {
            readBounds: "fluid.author.domReadBounds.readBounds({that})"
        }
    });

    fluid.author.domReadBounds.readBounds = function (that) {
        var width = that.container.outerWidth();
        var height = that.container.outerHeight();
        that.applier.change("layout", {
            width: width,
            height: height
        });
    };

    // SVG support

    // Sets an SVG attribute on a node created via fluid.author.renderSVGContainer
    // See http://stackoverflow.com/a/10974727
    // TODO: currently unused
    fluid.author.setSVGAttribute = function (jElement, attribute, value) {
        var element = jElement.documentElement;
        element.setAttribute(attribute, value);
    };

    fluid.author.renderSVGContainer = function (that, renderMarkup, parentContainer) {
        var containerMarkup = renderMarkup();
        // Approach taken from http://stackoverflow.com/a/36507333
        var container = $.parseXML(containerMarkup);
        var element = container.documentElement;
        parentContainer.append(element);
        return element;
    };

    fluid.author.pointsToSVG = function (points) {
        return fluid.transform(points, function (point) {
            // Add half-pixel to align rendering
            return (0.5 + point[0]) + "," + (0.5 + point[1]);
        }).join(" ");
    };


    fluid.defaults("fluid.author.svgPane", {
        gradeNames: ["fluid.newViewComponent", "fluid.author.containerRenderingView"],
        markup: {
            container: "<svg></svg>"
        }
    });

})(jQuery, fluid_2_0_0);
