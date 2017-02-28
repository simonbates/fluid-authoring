/*
Copyright 2017 Raising the Floor - International
Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.
You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

(function ($, fluid) {
    "use strict";

    // Taken from http://stackoverflow.com/questions/10406930/how-to-construct-a-websocket-uri-relative-to-the-page-uri
    fluid.pageRelativeWebSocketsUrl = function (path) {
        var loc = window.location, new_uri;
        if (loc.protocol === "https:") {
            new_uri = "wss:";
        } else {
            new_uri = "ws:";
        }
        new_uri += "//" + loc.host;
        new_uri += path;
        return new_uri;
    };

    fluid.defaults("fluid.author.componentGraph.remote", {
        gradeNames: ["fluid.author.componentGraph"],
        urls: {
            authorBus: "/author-bus",
            component: "/components/%path"
        },
        remoteAvatarRoot: ["remote-component-root"],
        remoteGradePrefix: "*remote-grade:",
        listeners: {
            "onCreate.connectBus": {
                funcName: "fluid.author.componentGraph.remote.connectBus",
                args: "{that}"
            },
            "onWSConnect.sendConnect": {
                func: "{that}.sendConnect"
            },
            "onComponentCreate.impl": {
                funcName: "fluid.author.componentGraph.remote.onComponentCreate",
                args: ["{that}", "{arguments}.0.shadow"]
            },
            "onComponentDestroy.impl": {
                funcName: "fluid.author.componentGraph.remote.onComponentDestroy",
                args: ["{that}", "{arguments}.0.shadow"]
            },
            "onLocalModelChanged.transmit": {
                funcName: "fluid.author.componentGraph.remote.transmitModelChanged",
                                 // component, change
                args: ["{that}", "{arguments}.0", "{arguments}.1"]
            },
            "onModelChanged.impl": {
                funcName: "fluid.author.componentGraph.remote.applyModelChanged",
                args: ["{that}", "{arguments}.0"]
            }
        },
        model: {
            messageGeneration: 0
        },
        events: {
            onWSConnect: null,
        // outgoing event fired by any model change within the "remote-component-root" tree (no doubt caused by our own UI)
            onLocalModelChanged: null,
        // Remote events transmitted over WebSockets
            onComponentCreate: null,
            onComponentDestroy: null,
            onModelChanged: null
        },
        invokers: {
            renderGradeName: "fluid.author.componentGraph.remote.renderGradeName({that}.options.remoteGradePrefix, {arguments}.0)",
            renderPath: "fluid.author.componentGraph.remote.renderPath({that}.options.remoteAvatarRoot, {arguments}.0)",
            sendConnect: "fluid.author.componentGraph.remote.sendConnect({that})",
            remotePathToLocal: "fluid.author.componentGraph.remotePathToLocal({that}.options.remoteAvatarRoot, {arguments}.0)",
            remoteGradeToLocal: "fluid.author.componentGraph.remoteGradeToLocal({that}.options.remoteGradePrefix, {arguments}.0)",
            destroyTargetComponent: "fluid.author.componentGraph.remote.destroyTargetComponent({that}, {arguments}.0)"
        },
        components: {
            modelTracker: {
                type: "fluid.author.componentGraph.modelTracker"
            }
        },
        distributeOptions: {
            localModelToNexus: {
                record: "fluid.author.componentGraph.localModelToNexus",
                target: "{/ remote-component-root fluid.modelComponent}.options.gradeNames"
            }
        }
    });

    // Identical pattern to fluid.authoring.nexus.componentTracker on the server side
    fluid.defaults("fluid.author.componentGraph.modelTracker", {
        gradeNames: ["fluid.component", "fluid.resolveRoot"],
        components: {
            componentGraph: "{fluid.author.componentGraph.remote}"
        }
    });

    fluid.defaults("fluid.author.componentGraph.localModelToNexus", {
        modelListeners: {
            "": {
                namespace: "notifyNexus",
                excludeSource: ["init", "nexus"],
                funcName: "{fluid.author.componentGraph.modelTracker}.componentGraph.events.onLocalModelChanged.fire",
                args: ["{that}", "{change}"]
            }
        }
    });

    fluid.author.componentGraph.remote.transmitModelChanged = function (componentGraph, targetComponent, change) {
        var shadow = componentGraph.idToShadow[targetComponent.id];
        var message = {
            type: "modelChanged",
            componentPath: shadow.remotePath,
            componentId: shadow.remoteId,
            change: fluid.receivedChangeToFirable(change)
        };
        delete message.change.source.ui;
        fluid.log("Sending modelChanged message ", message);
        componentGraph.authorBusSocket.send(JSON.stringify(message));
    };

    fluid.author.componentGraph.remote.applyModelChanged = function (componentGraph, message) {
        var localPath = componentGraph.remotePathToLocal(message.componentPath);
        var targetComponent = fluid.componentForPath(localPath);
        message.change.source = "nexus";
        targetComponent.applier.fireChangeRequest(message.change);
    };

    fluid.defaults("fluid.author.componentGraph.remoteWithCreator", {
        gradeNames: "fluid.decoratorViewComponent",
        members: {
            lastCreatedSample: 0
        },
        selectors: {
            createButton: ".fld-author-createButton"
        },
        markup: {
            createButton: "<button class=\"fld-author-createButton\">Create sample model component</button>"
        },
        decorators: {
            createButton: {
                type: "jQuery",
                method: "click",
                args: "{that}.createSampleModelComponent()"
            }
        },
        listeners: {
            "onCreate.renderMarkup": {
                "this": "{that}.container",
                method: "append",
                args: "{that}.options.markup.createButton",
                priority: "before:bindDecorators"
            }
        },
        invokers: {
            createSampleModelComponent: {
                funcName: "fluid.author.componentGraph.remote.createSampleModelComponent",
                args: "{that}"
            }
        }
    });

    fluid.author.componentGraph.remote.createSampleModelComponent = function (that) {
        var nextPath = "sample-model-component-" + that.lastCreatedSample;
        var postUrl = fluid.stringTemplate(that.options.urls.component, {
            path: nextPath
        });
        var body = {
            type: "fluid.modelComponent",
            model: {
                modelValue: that.lastCreatedSample
            }
        };
        ++that.lastCreatedSample;
        $.ajax({ // TODO: client-side AJAX DataSource
            type: "POST",
            url: postUrl,
            contentType: "application/json",
            data: JSON.stringify(body),
            dataType: "text",
            success: function (response) {
                fluid.log("Component created at " + nextPath + ": response ", response);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                fluid.log("FAILURE to create component at " + nextPath + ": status " + textStatus + " errorThrown " + errorThrown);
                fluid.log("Response: ", jqXHR.responseText);
            }
        });
    };

    fluid.author.componentGraph.remote.destroyTargetComponent = function (that, targetComponent) {
        var shadow = that.idToShadow[targetComponent.id];
        var remotePath = shadow.remotePath;
        var deleteUrl = fluid.stringTemplate(that.options.urls.component, {
            path: remotePath
        });
        $.ajax({
            type: "DELETE",
            url: deleteUrl,
            dataType: "text",
            success: function (response) {
                fluid.log("Component destroyed at " + remotePath + ": response ", response);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                fluid.log("FAILURE to destroy component at " + remotePath + ": status " + textStatus + " errorThrown " + errorThrown);
                fluid.log("Response: ", jqXHR.responseText);
            }
        });
    };

    fluid.author.componentGraph.remotePathToLocal = function (remoteAvatarRoot, path) {
        var instantiator = fluid.globalInstantiator;
        var parsed = instantiator.parseEL(path);
        var rebased = path === "" ? remoteAvatarRoot : remoteAvatarRoot.concat(parsed);
        return instantiator.composeSegments.apply(null, rebased);
    };

    fluid.author.componentGraph.remote.renderGradeName = function (remoteGradePrefix, gradeName) {
        return gradeName.startsWith(remoteGradePrefix) ? gradeName.substring(remoteGradePrefix.length) : gradeName;
    };

    fluid.author.componentGraph.remote.renderPath = function (remoteAvatarRoot, segs) {
        return segs.slice(remoteAvatarRoot.length);
    };

    fluid.author.componentGraph.remoteGradeToLocal = function (remoteGradePrefix, remoteGrade) {
        // Note that this ridiculous strategy will need to be fixed once FLUID-6123 is resolved
        return remoteGrade === "fluid.rootComponent" ? "fluid.component" :
            remoteGrade === "fluid.component" || remoteGrade === "fluid.modelComponent" ?
            remoteGrade : remoteGradePrefix + remoteGrade;
    };

    // Rebase shadow by converting remote path to a nested local path, and "escaping" remote gradeNames
    // Warning: this modifies the input shadow record (in fact it was just created via JSON.parse)
    fluid.author.componentGraph.remote.rebaseShadow = function (that, shadow) {
        // TODO: immutable application model, or at least make ownership of shadow clear
        shadow.remotePath = shadow.path;
        shadow.path = that.remotePathToLocal(shadow.path);
        shadow.that.options.gradeNames = fluid.transform(shadow.that.options.gradeNames, that.remoteGradeToLocal);
    };

    fluid.author.componentGraph.remote.onComponentCreate = function (that, shadow) {
        fluid.author.componentGraph.remote.rebaseShadow(that, shadow);
        var type = that.remoteGradeToLocal(shadow.that.typeName);
        var avatar = fluid.construct(shadow.path, {
            type: type,
            gradeNames: shadow.that.options.gradeNames,
            model: shadow.that.model
        });
        // This will be lost in exchange for the local avatar's id (presumably future framework will let us control this)
        shadow.remoteId = shadow.that.id;
        shadow.that = avatar;

        fluid.author.componentGraph.mapComponent(that, shadow);
    };

    fluid.author.componentGraph.remote.onComponentDestroy = function (that, shadow) {
        fluid.author.componentGraph.remote.rebaseShadow(that, shadow);
        shadow.that = fluid.componentForPath(shadow.path);

        fluid.author.componentGraph.unmapComponent(that, shadow);
        fluid.destroy(shadow.path);
    };

    fluid.author.componentGraph.remote.connectBus = function (that) {
        var fullUrl = fluid.pageRelativeWebSocketsUrl(that.options.urls.authorBus);
        that.authorBusSocket = new WebSocket(fullUrl);
        that.authorBusSocket.onopen = function () {
            that.events.onWSConnect.fire(that);
        };
        that.authorBusSocket.onmessage = function (messageEvent) {
            var message = JSON.parse(messageEvent.data);
            var eventName = "on" + fluid.capitalizeFirstLetter(message.type);
            fluid.log("Firing event " + eventName + " with payload ", message);
            that.events[eventName].fire(message.payload);
        };
    };

    fluid.author.componentGraph.remote.sendConnect = function (that) {
        var message = {
            type: "connect",
            messageGeneration: that.model.messageGeneration,
            clientId: that.id,
            ignorableGrades: that.options.ignorableGrades,
            ignorableRoots: that.options.ignorableRoots
        };
        fluid.log("Sending connect message ", message);
        that.authorBusSocket.send(JSON.stringify(message));
    };

    fluid.defaults("fluid.author.componentGraphPanel.fullFrame.remote", {
        gradeNames: "fluid.author.componentGraphPanel.fullFrame",
        distributeOptions: {
            record: ["fluid.author.componentGraph.remote", "fluid.author.componentGraph.remoteWithCreator"],
            target: "{that fluid.author.componentGraph}.options.gradeNames"
        }
    });

})(jQuery, fluid_3_0_0);
