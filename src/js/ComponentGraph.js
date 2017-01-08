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
    fluid.setLogging(true);

    fluid.defaults("fluid.author.componentGraphPanel", {
        gradeNames: "fluid.author.popupPanel",
        markup: {
            pane: "<div class=\"fld-author-componentGraphHolder\"><div class=\"fld-author-componentGraph\"></div></div>"
        },
        selectors: {
            componentGraphHolder: ".fld-author-componentGraphHolder",
            componentGraph: ".fld-author-componentGraph"
        },
        components: {
            graph: {
                type: "fluid.author.componentGraph.local",
                container: "{componentGraphPanel}.dom.componentGraph",
                options: {
                    gradeNames: "fluid.author.componentGraphSVGArrows",
                    ignorableRoots: {
                        panel: "@expand:fluid.pathForComponent({fluid.author.componentGraphPanel})"
                    },
                    components: {
                        svgPane: {
                            type: "fluid.author.svgPaneInGraphPanel"
                        }
                    }
                },
                createOnEvent: "onMarkupReady"
            }
        }
    });

    fluid.defaults("fluid.author.svgPaneInGraphPanel", {
        gradeNames: ["fluid.author.svgPane", "fluid.author.domSizing"],
        parentContainer: "{fluid.author.componentGraphPanel}.dom.componentGraph",
        markup: {
            container: "<svg class=\"fld-author-svgPane\"></svg>"
        },
        model: {
            layout: "{fluid.author.componentGraph}.model.layout"
        }
    });

    // A mixin grade for fluid.author.componentGraph that manages interaction with SVG arrows
    fluid.defaults("fluid.author.componentGraphSVGArrows", {
        distributeOptions: {
            record: "{svgPane}.container",
            target: "{that fluid.author.svgArrow}.options.parentContainer"
        },
        dynamicComponents: {
            arrows: {
                type: "fluid.author.svgArrow",
                createOnEvent: "createArrow",
                options: "{arguments}.0"
            }
        }
    });

    fluid.author.vectorToPolar = function (start, end) {
        var dx = end[0] - start[0], dy = end[1] - start[1];
        return {
            length: Math.sqrt(dx * dx + dy * dy),
            angle: Math.atan2(dy, dx)
        };
    };

    fluid.defaults("fluid.author.svgArrow", {
        gradeNames: ["fluid.newViewComponent", "fluid.author.containerSVGRenderingView"],
        markup: {
            arrow: "<polygon xmlns=\"http://www.w3.org/2000/svg\" class=\"fld-author-arrow\" points=\"%points\" transform=\"%transform\"/>",
            transform: "translate(%startX %startY) rotate(%angle)"
        },
        model: {
            arrowGeometry: {
                length: "{that}.model.polar.length",
                width: 10,
                headWidth: 20,
                headHeight: 20,
                angle: "{that}.model.polar.angle",
                start: [100, 100],
                end: [200, 200]
            }
        },
        modelRelay: {
            "endsToPolar": {
                target: "polar",
                singleTransform: {
                    type: "fluid.transforms.free",
                    func: "fluid.author.vectorToPolar",
                    args: ["{that}.model.arrowGeometry.start", "{that}.model.arrowGeometry.end"]
                }
            },
            "geometryToTransform": {
                target: "arrowTransform",
                singleTransform: {
                    type: "fluid.transforms.stringTemplate",
                    template: "{that}.options.markup.transform",
                    terms: {
                        startX: "{that}.model.arrowGeometry.start.0",
                        startY: "{that}.model.arrowGeometry.start.1",
                        angle: 0
                    }
                }
            },
            "geometryToPoints": {
                target: "arrowPoints",
                singleTransform: {
                    type: "fluid.transforms.free",
                    func: "fluid.author.svgArrow.renderArrowPoints",
                    args: ["{that}.model.arrowGeometry.width", "{that}.model.arrowGeometry.headWidth",
                           "{that}.model.arrowGeometry.length", "{that}.model.arrowGeometry.headHeight",
                           "{that}.model.arrowGeometry.angle"]
                }
            }
        },
        invokers: {
            renderMarkup: {
                funcName: "fluid.stringTemplate",
                args: ["{that}.options.markup.arrow", {
                    points: "{that}.model.arrowPoints",
                    transform: "{that}.model.arrowTransform"
                }]
            }
        },
        modelListeners: {
            "arrowPoints": {
                excludeSource: "init", // necessary to avoid triggering double evaluation of container with faulty framework
                "this": "{that}.container",
                method: "attr",
                args: ["points", "{change}.value"]
            },
            "arrowTransform": {
                excludeSource: "init",
                "this": "{that}.container",
                method: "attr",
                args: ["transform", "{change}.value"]
            }
        }
    });

    fluid.author.svgArrow.renderArrowPoints = function (width, headWidth, length, headHeight, angle) {
        var w = width / 2,
            hw = headWidth / 2,
            hp = length - headHeight,
            c = Math.cos(angle),
            s = Math.sin(angle);
        var points = [
            [-w / s, 0],
            [w / s, 0],
            [hp * c + w * s, hp * s - w * c],
            [hp * c + hw * s, hp * s - hw * c],
            [length * c, length * s],
            [hp * c - hw * s, hp * s + hw * c],
            [hp * c - w * s, hp * s + w * c]
        ];
        return fluid.author.pointsToSVG(points);
    };

    fluid.defaults("fluid.author.componentGraph", {
        gradeNames: ["fluid.viewComponent", "fluid.author.viewContainer", "fluid.author.domSizing"],
        events: {
            createComponentView: null,
            createArrow: null,
            invalidateLayout: null
        },
        components: {
        /* Sketch generalised implementation
            componentViewMapper: {
                type: "fluid.author.componentImager",
                options: {
                    mappingTarget: "{fluid.author.componentGraph}",
                    eventName: "createComponentView",
                    imagedType: "fluid.author.componentView",
                    modelPath: "idToPath"
                }
            },
            arrowMapper: {
            }
        */
        },
        model: {
        // A map of the raw component tree - a mirror of idToPath within the instantiator
        // This is the model state which drives the visible graph layout
        // TODO: We currently ignore injected components
            idToPath: {},
            layout: {
                width: 2000,
                height: 2000
            }
        },
        ignorableRoots: {
            "resolveRootComponent": ["resolveRootComponent"]
        },
        ignorableGrades: {
            "instantiator": "fluid.instantiator",
            "resolveRootComponent": "fluid.resolveRootComponent",
            // Hack to avoid endlessly self-reacting as the InlineEdit used by the structureView abuses the tree by creating standalone fluid.tooltip instances
            "tooltip": "fluid.tooltip"
        },
        members: { // A map of raw component ids to the view peer which represents them - managed by DynamicComponentIndexer
            idToViewMember: {},
            // A map of raw component ids to a "shadow" document, holding a representation of the component at member "that"
            // These two managed by mapComponent/componentClear listener
            idToShadow: {},
            pathToId: {} // TODO move to model after checking escaping
        },
        modelListeners: {
            createComponentView: {
                path: "idToPath.*",
                funcName: "fluid.author.componentGraph.updateComponentView",
                args: ["{that}", "{change}.path", "{change}.value"]
            }/*,
            createArrow: {
                path: "idToPath.*",
                funcName: "fluid.author.componentGraph.updateArrow",
                args: ["{that}", "{change}.path", "{change}.value"]
            },
            invalidateLayout: {
                path: "idToPath",
                func: "{that}.events.invalidateLayout.fire",
                priority: "after:createComponentView"
            }*/
        },
        dynamicComponents: {
            componentViews: {
                type: "fluid.author.componentView",
                createOnEvent: "createComponentView",
                options: "{arguments}.0"
            }
        },
        listeners: {
            "invalidateLayout.scheduleLayout": "@expand:fluid.author.debounce({that}.doLayout, 1)"
        },
        invokers: {
            doLayout: "fluid.author.componentGraph.doLayout({that})",
            idToView: "fluid.author.componentGraph.idToView({that}, {arguments}.0)"
        },
        boxHeight: 80,
        boxWidth: 200,
        verticalGap: 50,
        horizontalGap: 20
    });

    // Mixin grade for componentView in the context of componentGraph so that we can bind 100% of component options
    // to a single reference
    fluid.defaults("fluid.author.componentViewInGraph", {
        parentContainer: "{fluid.author.componentGraphPanel}.dom.componentGraph",
        // Options for dynamicComponentIndexer
        dynamicIndexTargetPath: "idToViewMember",
        dynamicIndexKeyPath: "options.rawComponentId",
        dynamicIndexTarget: "{fluid.author.componentGraph}"
    });

    // A variety of componentGraph which binds to the local instantiator

    fluid.defaults("fluid.author.componentGraph.local", {
        gradeNames: ["fluid.author.componentGraph"],
        listeners: {
            "onCreate.populateComponents": "fluid.author.componentGraph.populateLocalComponents",
            "{instantiator}.events.onComponentAttach": {
                funcName: "fluid.author.componentGraph.componentAttach",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.3"] // component, path, created
            },
            "{instantiator}.events.onComponentClear": {
                funcName: "fluid.author.componentGraph.componentClear",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.3"] // component, path, created
            }
        }
    });

    /** Accepts a (concrete) path into the target component tree and parses it into a collection of useful pre-geometric info,
     * including the path, reference and shadow of its parent, and member name within it
     * @param componentGraph {componentGraph} A componentGraph component
     * @param path {String} The string form of a concrete component path in its tree
     * @return {Object} A structure of pre-geometric info:
     *    parsed,
     *    parentSegs,
     *    memberName,
     *    parentPath,
     *    parentId
     *    parentShadow
     */
    fluid.author.componentGraph.getCoordinates = function (componentGraph, path) {
        var instantiator = fluid.globalInstantiator;
        var parsed = instantiator.parseEL(path);
        var togo = {
            parsed: parsed,
            parentSegs: parsed.slice(0, parsed.length - 1),
            memberName: parsed[parsed.length - 1]
        };
        if (parsed.length > 0) {
            togo.parentPath = instantiator.composeSegments.apply(null, togo.parentSegs);
            togo.parentId = componentGraph.pathToId[togo.parentPath];
            if (togo.parentId) { // It may be missing, if we are racing against ourselves in startup
                togo.parentShadow = componentGraph.idToShadow[togo.parentId];
            }
        }
        return togo;
    };

    /** Looks up the id of a target component to the componentView component peering with it
     * @param componentGraph {componentGraph} a componentGraph component
     * @param id {String} The id of a target component
     * @return {Component} The corresponding {componentView} component
     */
    fluid.author.componentGraph.idToView = function (componentGraph, id) {
        var togo = componentGraph[componentGraph.idToViewMember[id]];
        return togo;
    };

    fluid.author.componentGraph.isIgnorableComponent = function (componentGraph, coords, that) {
        var isIgnorablePath = fluid.find_if(componentGraph.options.ignorableRoots, function (ignorableRoot) {
            return fluid.author.isPrefix(ignorableRoot, coords.parsed);
        });
        var isIgnorableGrade = fluid.find_if(componentGraph.options.ignorableGrades, function (ignorableGrade) {
            return fluid.hasGrade(that.options, ignorableGrade) || that.typeName === ignorableGrade;
        });
        return isIgnorablePath || isIgnorableGrade;
    };

    fluid.author.componentGraph.mapComponent = function (componentGraph, id, shadow) {
        var coords = fluid.author.componentGraph.getCoordinates(componentGraph, shadow.path);
        if (!fluid.author.componentGraph.isIgnorableComponent(componentGraph, coords, shadow.that)) {
            componentGraph.idToShadow[id] = shadow;
            componentGraph.pathToId[shadow.path] = id;
            if (coords.parentShadow) {
                fluid.set(coords.parentShadow, ["memberToChild", coords.memberName], shadow.that);
            }
            componentGraph.applier.change(["idToPath", id], shadow.path);
        }
    };

    fluid.author.componentGraph.populateLocalComponents = function (that) {
        var instantiator = fluid.globalInstantiator;
        var idToShadow = instantiator.idToShadow;
        fluid.each(idToShadow, function (shadow, id) {
            fluid.author.componentGraph.mapComponent(that, id, shadow);
        });
    };

    fluid.author.componentGraph.componentAttach = function (that, component, path, created) {
        if (created) {
            var shadow = fluid.globalInstantiator.idToShadow[component.id];
            fluid.author.componentGraph.mapComponent(that, component.id, shadow);
        }
    };

    fluid.author.componentGraph.componentClear = function (that, component, path, created) {
        if (created) {
            var shadow = fluid.globalInstantiator.idToShadow[component.id];
            delete that.idToShadow[component.id];
            delete that.pathToId[path];
            var coords = fluid.author.componentGraph.getCoordinates(that, shadow.path);
            if (coords.parentShadow) {
                delete coords.parentShadow.memberToChild[coords.memberName];
            }
            that.applier.change(["idToPath", component.id], null, "DELETE");
        }
    };

    // Sorts more nested views to the front
    fluid.author.depthComparator = function (reca, recb) {
        return recb.rowIndex - reca.rowIndex;
    };


    // TODO: Abuse of shadow by writing extra fields - need to shallow clone just the fields we read
    //     childrenWidth: here
    //     memberToChild: mapComponent
    // Read fields:
    //    path, that
    fluid.author.componentGraph.doLayout = function (componentGraph) {
        fluid.log("LAYOUT BEGUN");
        var records = [], rowHeights = [];
        fluid.each(componentGraph.idToViewMember, function (viewMember) {
            records.push(componentGraph[viewMember].viewRecord);
        });
        records.sort(fluid.author.depthComparator);
        var o = componentGraph.options;
        // Phase 1: Moving upwards, accumulate total child width of each tree route
        fluid.each(records, function (record) {
            var shadow = record.shadow;
            var view = componentGraph.idToView(shadow.that.id);
            view.events.onRefreshView.fire();
            view.readBounds();
            var selfWidth = view.model.layout.width;
            var childrenWidth = -o.horizontalGap;
            fluid.each(shadow.memberToChild, function (child) {
                var childShadow = componentGraph.idToShadow[child.id];
                childrenWidth += childShadow.childrenWidth + o.horizontalGap;
            });
            shadow.childrenWidth = Math.max(selfWidth, childrenWidth);
            var rowIndex = record.rowIndex;
            rowHeights[rowIndex] = Math.max(rowHeights[rowIndex] | 0, view.model.layout.height);
        });
        records.reverse();
        // Phase 2: Moving downwards, position children with respect to parents
        var rootLayout = {
        };
        fluid.each(records, function (record, index) {
            var shadow = record.shadow;
            var view = componentGraph.idToView(shadow.that.id);
            if (index === 0) {
                view.applier.change("layout", {
                    left: shadow.childrenWidth / 2 + o.horizontalGap,
                    top: o.verticalGap
                });
                rootLayout.width = shadow.childrenWidth + o.horizontalGap * 2;
            }
            // Start at the extreme position for the window containing all of our children
            var childLeft = view.model.layout.left + (view.model.layout.width - shadow.childrenWidth) / 2;
            fluid.log("Considering component " + shadow.that.id + " at path " + shadow.path + " with " + fluid.keys(shadow.memberToChild).length + " children");
            fluid.log("Own view has id " + view.id + ", left of " + view.model.layout.left + " childrenWidth is " + shadow.childrenWidth + " starting childLeft at " + childLeft);
            fluid.each(shadow.memberToChild, function (child, member) {
                fluid.log("Considering member " + member);
                var childShadow = componentGraph.idToShadow[child.id];
                var childView = componentGraph.idToView(child.id);
                if (!childView) { // It may be still in creation
                    fluid.log("SKIPPING child " + child.id + " since no view");
                    return;
                }
                var thisChildLeft = childLeft + (childShadow.childrenWidth - childView.model.layout.width) / 2;
                childView.applier.change("layout", {
                    left: thisChildLeft,
                    top: view.model.layout.top + rowHeights[record.rowIndex] + o.verticalGap
                });
                fluid.log("Assigned left of " + childLeft + " to target component id " + child.id + " view id " + childView.id);
                rootLayout.height = childView.model.layout.top + rowHeights[record.rowIndex + 1] + o.verticalGap;
                childLeft += childShadow.childrenWidth + o.horizontalGap;
            });
        });
        componentGraph.applier.change("layout", rootLayout);
        fluid.log("LAYOUT ENDED");
    };

    fluid.author.componentGraph.makeViewComponentOptions = function (componentGraph, id, path) {
        var o = componentGraph.options;
        var options = {
            gradeNames: "fluid.author.componentViewInGraph",
            rawComponentId: id,
            path: path,
            model: {
                layout: {
                    width: o.boxWidth,
                    height: o.boxHeight
                }
            }
        };
        return options;
    };

    // Mixin grade to bind arrow component into context between two ComponentView instances within a ComponentGraph
    fluid.defaults("fluid.author.arrowForComponentView", {
        components: {
            sourceView: {
                expander: {
                    func: "{componentGraph}.idToView",
                    args: "{arrowForComponentView}.options.sourceId"
                }
            },
            parentView: {
                expander: {
                    func: "{componentGraph}.idToView",
                    args: "{arrowForComponentView}.options.parentId"
                }
            }
        },
        model: {
            arrowGeometry: {
                start: "{that}.model.arrowLayout.start",
                end: "{that}.model.arrowLayout.end"
            }
        },
        modelRelay: {
            arrowLayout: {
                target: "arrowLayout",
                singleTransform: {
                    type: "fluid.transforms.free",
                    func: "fluid.author.routeArrow",
                    args: ["{componentGraph}", "{that}", "{that}.sourceView.model.layout", "{that}.parentView.model.layout"]
                }
            }
        }
    });

    fluid.author.routeArrow = function (componentGraph, arrow, sourceLayout, parentLayout) {
        var sourceLeft = fluid.get(sourceLayout, "left");
        var parentLeft = fluid.get(parentLayout, "left");
        // As well as standard framework relay timing issues, initial layout is asynchronous
        if (typeof(sourceLeft) !== "number" || typeof(parentLeft) !== "number") {
            return {};
        }
        var sourceId = arrow.sourceView.options.rawComponentId, parentId = arrow.parentView.options.rawComponentId;
        var parentShadow = componentGraph.idToShadow[parentId];
        var childComponent = componentGraph.idToShadow[sourceId].that;
        var children = fluid.values(parentShadow.memberToChild);
        var childIndex = fluid.find(children, function (child, index) {
            return child === childComponent ? index : undefined;
        });
        return {
            start: [parentLayout.left + parentLayout.width * (childIndex + 1) / (children.length + 1), parentLayout.top + parentLayout.height - 0.5],
            end: [sourceLayout.left + sourceLayout.width / 2, sourceLayout.top]
        };
    };

    fluid.author.componentGraph.makeArrowComponentOptions = function (componentGraph, sourceId, path) {
        var coords = fluid.author.componentGraph.getCoordinates(componentGraph, path);
        return {
            gradeNames: "fluid.author.arrowForComponentView",
            sourceId: sourceId,
            parentId: coords.parentId
        };
    };

    /** Invoked by the modelListener to the componentGraph's idToPath model block.
     *  Coordinates creation and destruction of a fluid.author.componentView matching these elements
     *  This general pattern is a candidate for entering the core framework "imaging components into existence"
     * - consisting of the confection of i) A dynamicComponent ii) dynamicComponentIndexer, iii) listener to a model domain coordinating creation and destruction
     * - we also want this to cope with arrays
     */
    fluid.author.componentGraph.updateComponentView = function (componentGraph, idPath, path) {
        var id = idPath[1]; // segment 0 is "idToPath"
        if (path === undefined) {
            var viewComponent = componentGraph.idToView(id);
            viewComponent.destroy();
        } else {
            fluid.invokeLater(function () {
                fluid.log("Firing createComponentView for path " + path + " id " + id);
            // Avoid creating a horrific race within the broken model relay system
                var options = fluid.author.componentGraph.makeViewComponentOptions(componentGraph, id, path);
                componentGraph.events.createComponentView.fire(options);

                var arrowOptions = fluid.author.componentGraph.makeArrowComponentOptions(componentGraph, id, path);
                if (arrowOptions.parentId) {
                    componentGraph.events.createArrow.fire(arrowOptions);
                }
                componentGraph.events.invalidateLayout.fire();
            });
        }
    };

    // TODO: Consolidate with updateComponentView
    fluid.author.componentGraph.updateArrow = function (componentGraph, idPath, path) {
        var id = idPath[1]; // segment 0 is "idToPath"
        if (path === undefined) {
            var viewComponent = componentGraph.idToView(id);
            viewComponent.destroy();
        } else {
// TODO: Moved up into componentGraph above to avoid race
        }
    };

    // The current framework allows grades to (legitimately) appear multiple times in the resolved list - but this is not helpful in the UI
    fluid.author.dedupeGrades = function (gradeNames) {
        var gradeHash = {}, outGrades = [];
        fluid.each(gradeNames, function (gradeName) {
            if (!gradeHash[gradeName]) {
                outGrades.push(gradeName);
                gradeHash[gradeName] = true;
            }
        });
        return outGrades;
    };

    fluid.author.computeViewRecord = function (componentGraph, targetId) {
        var togo = Object.create(fluid.author.computeViewRecord.prototype);
        togo.shadow = componentGraph.idToShadow[targetId];
        togo.that = togo.shadow.that;
        togo.coords = fluid.author.componentGraph.getCoordinates(componentGraph, togo.shadow.path);
        togo.rowIndex = togo.coords.parsed.length;
        return Object.freeze(togo);
    };

    fluid.defaults("fluid.author.componentView", {
        gradeNames: ["fluid.newViewComponent", "fluid.author.containerRenderingView", "fluid.indexedDynamicComponent", "fluid.author.domPositioning", "fluid.author.domReadBounds"],
        mergePolicy: {
            elements: "noexpand"
        },
        distributeOptions: {
            // This unreasonable hack is currently our best route around FLUID-5028
            source: "{that}.options.optionsHolder",
            target: "{that}.options"
        },
        elements: {
            grades: {
                title: "grades:",
                sourceFunc: "{componentView}.prepareGradeNames"
            },
            model: {
                title: "model:",
                sourceModelHolder: "{componentView}.viewRecord.that"
            }
        },
        optionsHolder: "{that}.options.rowMaterials.options",
        rowMaterials: "@expand:fluid.author.componentView.collectRowMaterials({that}, {that}.options.elements, {that}.viewRecord)",
        members: {
            // Holds the target component, etc. at a safe location where it will not confuse the current faulty framework
            viewRecord: "@expand:fluid.author.computeViewRecord({componentGraph}, {that}.options.rawComponentId)"
        },
        events: { // Currently we paint ourselves on creation and so there are no local listeners
            onRefreshView: null
        },
        markup: {
            container: "<div class=\"fld-author-componentView\" targetId=\"%targetId\" ownId=\"%ownId\">%memberName<table>%childRows</table></div>",
            memberName: "<div class=\"fld-author-member\">%member</div>",
            structureRow: "<tr class=\"%structureRowClass\"><td class=\"%structureTitleClass\">%title</td><td class=\"%structureCellClass fl-structureCell\"></td></tr>"
        },
        invokers: {
            prepareGradeNames: "fluid.author.componentView.prepareGradeNames({that}.viewRecord.that)",
            renderMarkup: "fluid.author.componentView.renderMarkup({componentGraph}, {that}, {that}.viewRecord.that, {that}.options.markup, {that}.options.rowMaterials.rowsMarkup)",
            renderMemberName: "fluid.author.componentView.renderMemberName({componentGraph}, {that}, {that}.viewRecord.that, {that}.options.markup)"
        }
    });

    // child components are dynamic so we bypass the DOM binder and return to this ancient technique
    // TODO - is this race-breaking really necessary now?
    fluid.author.makeLocateFunc = function (containerHolder, selector) {
        return function () {
            return $(selector, containerHolder.container);
        };
    };

    fluid.author.componentView.elementToRowMaterials = function (componentView, containerHolder, element, elementKey) {
        var terms = {
            title: element.title,
            structureRowClass: "fld-author-" + elementKey + "Row",
            structureCellClass: "fld-author-" + elementKey + "Cell",
            structureTitleClass: "fld-author-" + elementKey + "Title"
        };
        var markup = fluid.getForComponent(componentView, "options.markup");
        var togo = {
            rowMarkup: fluid.stringTemplate(markup.structureRow, terms),
            structureCellClass: terms.structureCellClass,
            components: {}
        };
        var component = {
            type: "fluid.author.structureInComponentView"
        };
        var options = element.sourceFunc ? {
            gradeNames: "fluid.author.pullingSICV",
            invokers: {
                pullModel: {
                    func: element.sourceFunc
                }
            }
        } : {
            components: {
                modelSource: element.sourceModelHolder
            },
            gradeNames: "fluid.author.modelSyncingSICV"
        };
        options.parentContainer = fluid.author.makeLocateFunc(containerHolder, "." + terms.structureCellClass);
        options.selectors = {
            // Pretty awful - this actually lies outside the structureView's container, but we bolt it on so we can animate it
            title: fluid.author.makeLocateFunc(containerHolder, "." + terms.structureTitleClass)
        };
        component.options = options;
        togo.components[elementKey + "Structure"] = component;
        return togo;
    };

    fluid.author.componentView.collectRowMaterials = function (componentView, elements, viewRecord) {
        var rows = [],
            options = {
                components: {}
            };
        fluid.each(elements, function (element, elementKey) {
            if (elementKey === "grades" || elementKey === "model" && fluid.hasGrade(viewRecord.that.options, "fluid.modelComponent")) {
                var materials = fluid.author.componentView.elementToRowMaterials(componentView, componentView, element, elementKey);
                rows.push(materials.rowMarkup);
                $.extend(options.components, materials.components);
            }
        });
        var togo = Object.create(fluid.author.componentView.collectRowMaterials.prototype);
        togo.rowsMarkup = rows.join("");
        togo.options = options;
        return Object.freeze(togo);
    };

    fluid.author.componentView.renderMarkup = function (componentGraph, componentView, that, markupBlock, rowsMarkup) {
        var containerModel = {
            memberName: fluid.getForComponent(componentView, "renderMemberName")(),
            childRows: rowsMarkup,
            targetId: that.id,
            ownId: componentView.id
        };
        var containerMarkup = fluid.stringTemplate(markupBlock.container, containerModel);
        return containerMarkup;
    };

    fluid.author.componentView.renderMemberName = function (componentGraph, componentView, that, markupBlock) {
        var shadow = componentGraph.idToShadow[componentView.options.rawComponentId];
        var coords = fluid.author.componentGraph.getCoordinates(componentGraph, shadow.path);
        return coords.memberName === undefined ? "" : fluid.stringTemplate(markupBlock.memberName, {member: coords.memberName});
    };

    fluid.author.componentView.prepareGradeNames = function (targetComponent) {
        var gradeNames = [targetComponent.typeName].concat(fluid.makeArray(fluid.get(targetComponent, ["options", "gradeNames"])));
        var filteredGrades = fluid.author.filterGrades(gradeNames, fluid.author.ignorableGrades);
        var finalGrades = fluid.author.dedupeGrades(filteredGrades);
        return finalGrades;
    };

    /** Some cross-mixin grades for StructureView */

    fluid.defaults("fluid.author.structureInComponentView", {
        gradeNames: "fluid.author.structureView",
        bindingRootReference: "{fluid.author.componentGraph}",
        listeners: {
            "{fluid.author.componentView}.events.onRefreshView": {
                // TODO: It's that big multiplicity problem again: https://issues.fluidproject.org/browse/FLUID-5948
                /* namespace: "refreshChildren", */
                func: "{that}.events.onRefreshView.fire",
                args: "{that}"
            }
        },
        events: {
            invalidateLayout: "{fluid.author.componentGraph}.events.invalidateLayout"
        }
    });

    fluid.defaults("fluid.author.pullingSICV", {
        listeners: {
            "{fluid.author.componentView}.events.onRefreshView": {
                priority: "before:render",
                namespace: "pullModel",
                listener: "fluid.author.structureView.pullModel",
                args: ["{that}"]
            }
        }
    });

    fluid.defaults("fluid.author.modelSyncingSICV", {
        model: {
            hostModel: "{that}.modelSource.model"
        },
        components: {
            modelSource: "fluid.mustBeOverridden"
        },
        listeners: {
            onHighlightChange: "{that}.highlightChange({that}.dom.title)"
        }
    });

})(jQuery, fluid_2_0_0);
