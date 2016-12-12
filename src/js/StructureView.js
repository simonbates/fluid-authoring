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

    // This WANTS to be a "containerRenderingView" but it can't be a very good one under this model. It needs a "parentContainer" which
    // exists at construct time but it can't - since it is rendered by the parent's construct-time renderer. Therefore we have to
    // construct these in a separate pass.
    // NEW current plan: Subcomponents such as this will render strictly later than the construct-time of the parent. Therefore we HOPE
    // that their construct-time rendering can bind to the already rendered "parentContainer" produced by "elements".
    fluid.defaults("fluid.author.structureView", {
        gradeNames: ["fluid.newViewComponent", "fluid.author.containerRenderingView"],
        mergePolicy: {
            bindingRootReference: "noexpand"
        },
        // Clients must override this with an IoC reference to a view component in the scope of which browser event binding will occur
        bindingRootReference: "fluid.mustBeOverridden",
        selectors: {
            mutableParent: ".fld-author-structureView-mutableParent"
        },
        // The distance in ems that each successive nested level will be indented - should be the width of the dropdown triangle encoded in CSS
        rowPaddingOffset: 1.1,
        markup: {
            container: "<table class=\"fld-author-structureView\" data-structureView-id=\"%componentId\"><tbody class=\"fld-author-structureView-mutableParent\">%rows</tbody></table>",
            rowMarkup: "<tr><td class=\"%rowClass\" style=\"padding-left: %padding\" data-structureView-rowSegs=\"%rowSegs\">%row</td></tr>",
            expanderClosed: "<span class=\"fl-author-expander fl-author-expander-closed\"></span>",
            expanderOpen: "<span class=\"fl-author-expander fl-author-expander-open\"></span>"
        },
        events: {
            // Cascaded recursively from parent for updates
            onRefreshView: null,
            // Fires upwards when component's bounds have changed
            invalidateLayout: null
        },
        model: {
            expansionModel: null,
            rowCount: 0
        },
        invokers: {
            renderInnerMarkup: {
                funcName: "fluid.author.structureView.renderInnerMarkup",
                args: ["{that}", "{that}.model", "{that}.options.markup", "{that}.options.rowPaddingOffset"]
            },
            updateInnerMarkup: "fluid.author.structureView.updateInnerMarkup({that})",
            renderMarkup: "fluid.author.structureView.renderMarkup({that}, {that}.options.markup, {that}.renderInnerMarkup)",
            // Cannot be event-driven since may operate during startup
            pullModel: "fluid.identity()"
        },
        listeners: {
            "onRefreshView.render": "{that}.updateInnerMarkup",
            "onCreate.bindEvents": "fluid.author.structureView.bindEvents"
        },
        modelListeners: {
            expansionModel: {
                func: "{that}.updateInnerMarkup",
                excludeSource: "init"
            },
            rowCount: "{that}.events.invalidateLayout.fire"
        }
    });

    // Ensures - i) only one execution of binding per instance of "bindingRootReference", ii) binding is scoped to the container of that component
    fluid.author.structureView.bindEvents = function (structureView) {
        var parsed = fluid.parseContextReference(structureView.options.bindingRootReference);
        var bindingRoot = fluid.resolveContext(parsed.context, structureView, true);
        // Bizarre and simple-minded scheme for constructing a "per-tree singleton"
        if (!bindingRoot.structureViewBinder) {
            var binderPath = fluid.pathForComponent(bindingRoot).concat(["structureViewBinder"]);
            fluid.construct(binderPath, {
                type: "fluid.author.structureViewBinder",
                bindingRootElement: bindingRoot.container
            });
        }
    };

    fluid.defaults("fluid.author.structureViewBinder", {
        gradeNames: "fluid.component",
        // Override with a DOM element holding the required root
        bindingRootElement: "fluid.mustBeOverridden",
        invokers: {
            findStructureView: "fluid.author.getAttribute({arguments}.0, data-structureView-id)",
            findRowSegs: "fluid.author.getAttribute({arguments}.0, data-structureView-rowSegs)",
            expanderClick: "fluid.author.structureViewBinder.expanderClick({arguments}.0, {that})"
        },
        listeners: {
            "onCreate.bindEvents": "fluid.author.structureViewBinder.bindEvents"
        }
    });

    fluid.author.getAttribute = function (element, attribute) {
        return element.getAttribute ? element.getAttribute(attribute) : null;
    };

    fluid.author.structureView.findParentAttribute = function (element, getter) {
        var parent = fluid.findAncestor(element, getter);
        return parent ? getter(parent) : parent;
    };

    fluid.author.structureView.findComponent = function (element, getter) {
        var id = fluid.author.structureView.findParentAttribute(element, getter);
        return id ? fluid.globalInstantiator.idToShadow[id].that : null;
    };

    fluid.author.structureViewBinder.expanderClick = function (event, structureViewBinder) {
        // YEAH WE HAVE DONE THIS GARBAGE AND INSTANCE-FREE (minus the parsing of path)
        var structureView = fluid.author.structureView.findComponent(event.target, structureViewBinder.findStructureView);
        var rowSegs = JSON.parse(fluid.author.structureView.findParentAttribute(event.target, structureViewBinder.findRowSegs));
        fluid.log("Received expander click for component ", structureView, " row segs ", rowSegs);
        var expansionSegs = ["expansionModel"].concat(rowSegs);
        var isExpanded = fluid.get(structureView.model, expansionSegs);
        if (isExpanded) {
            structureView.applier.change(expansionSegs, undefined, "DELETE");
        } else {
            structureView.applier.change(expansionSegs, {}, "ADD");
        }
    };

    fluid.author.structureViewBinder.bindEvents = function (structureViewBinder) {
        var bindingContainer = structureViewBinder.options.bindingRootElement;
        bindingContainer.on("click", ".fl-author-expander", structureViewBinder.expanderClick);
    };

    fluid.defaults("fluid.author.modelSyncingSICV", {
        model: {
            hostModel: "{that}.modelSource.model"
        },
        components: {
            modelSource: "fluid.mustBeOverridden"
        }
    });

    fluid.author.structureView.pullModel = function (structureView) {
        // TODO: Some miraculous way of constructing zero-cost proxies, or else initialising this member through intelligent ginger flooding
        var model = fluid.getForComponent(structureView, "pullModel")();
        if (model !== undefined) {
            var applier = fluid.getForComponent(structureView, "applier");
            applier.change("hostModel", model);
        }
    };

    fluid.author.structureView.updateInnerMarkup = function (structureView) {
        // TODO: expansion point here for more graceful incremental markup generation
        if (structureView.dom) {
            var newMarkup = structureView.renderInnerMarkup();
            structureView.locate("mutableParent").html(newMarkup);
        }
    };

    fluid.capitalizeFirstLetter = function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    fluid.author.structureView.primitiveToString = function (object) {
        return object === undefined ? "undefined" : JSON.stringify(object);
    };

    // Model is the local model, expansionModel is the full expansion model
    fluid.author.structureView.modelToRowInfo = function (model, segs, expansionModel, depth, rows) {
        var isExpanded = fluid.get(expansionModel, segs);
        var pushRow = function (rowInfo) {
            rowInfo.depth = depth;
            rowInfo.expanded = isExpanded;
            rowInfo.key = segs.length === 0 ? null : segs[segs.length - 1];
            rowInfo.rowSegs = fluid.XMLEncode(JSON.stringify(segs));
            rows.push(rowInfo);
        };
        if (fluid.isPrimitive(model)) {
            var modelRender = fluid.author.structureView.primitiveToString(model);
            pushRow({
                value: modelRender,
                rowType: "primitive"
            });
        } else {
            if (fluid.isArrayable(model)) {
                pushRow({
                    value: "Array[" + model.length + "]",
                    rowType: "typeHeader"
                });
            } else {
                pushRow({
                    value: "Object",
                    rowType: "typeHeader"
                });
            }
            if (isExpanded) {
                fluid.each(model, function (value, key) {
                    fluid.author.structureView.modelToRowInfo(value, segs.concat([key]), expansionModel, depth + 1, rows);
                });
            }
        }
    };

    fluid.author.structureView.renderInnerMarkup = function (structureView, model, markup, rowPaddingOffset) {
        var rows = [];
        fluid.author.structureView.modelToRowInfo(model.hostModel, [], model.expansionModel, 0, rows);
        var renderedRows = fluid.transform(rows, function (row) {
            var renderElements = [
                row.rowType === "typeHeader" ? (row.expanded ? markup.expanderOpen : markup.expanderClosed) : "",
                (row.key === null ? "" : row.key + ": "),
                row.value
            ];
            var terms = {
                rowClass: "fl-structureView-row-" + row.rowType,
                row: renderElements.join(""),
                rowSegs: row.rowSegs,
                padding: row.depth * rowPaddingOffset + "em"
            };
            return fluid.stringTemplate(markup.rowMarkup, terms);
        });
        structureView.applier.change("rowCount", rows.length);
        return renderedRows.join("");
    };

    fluid.author.structureView.renderMarkup = function (structureView, markup, renderInnerMarkup) {
        // TODO: This pathway executes during startup - cannot use events
        fluid.author.structureView.pullModel(structureView);
        var rows = renderInnerMarkup();
        var containerMarkup = fluid.stringTemplate(markup.container, {
            rows: rows,
            componentId: structureView.id
        });
        return containerMarkup;
    };

})(jQuery, fluid_2_0_0);
