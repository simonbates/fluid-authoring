/*
Copyright 2018 OCAD University
Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.
You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

(function ($, fluid) {
    "use strict";

    fluid.defaults("fluid.author.nexusConfigLoaderControl", {
        gradeNames: ["fluid.viewComponent"],
        components: {
            configLoader: {
                type: "gpii.nexusConfigLoader",
                options: {
                    // Use the jQuery variant of the nexusClient
                    // TODO: Use Context-awareness here rather than distributeOptions?
                    // TODO: Do we have any existing mechanism to detect browser vs node.js?
                    distributeOptions: {
                        record: "gpii.nexusClient.http.jquery",
                        target: "{that nexusClient}.options.httpGrade"
                    }
                }
            }
        },
        selectors: {
            fileInput: ".flc-nexusConfigLoaderControl-fileInput",
            loadButton: ".flc-nexusConfigLoaderControl-loadButton"
        },
        invokers: {
            loadButtonClickHandler: {
                funcName: "fluid.author.nexusConfigLoaderControl.loadButtonClickHandler",
                args: ["{that}.configLoader", "{that}.dom.fileInput"]
            }
        },
        listeners: {
            "onCreate.bindClickLoadButton": {
                "this": "{that}.dom.loadButton",
                method: "click",
                args: ["{that}.loadButtonClickHandler"]
            }
        }
    });

    fluid.author.nexusConfigLoaderControl.loadButtonClickHandler = function (configLoader, fileInput) {
        var configFiles = fileInput[0].files;
        if (configFiles.length === 1) {
            var configFile = configFiles[0];
            var reader = new FileReader();
            reader.onload = function (evt) {
                var configuration = JSON.parse(evt.target.result);
                configLoader.loadConfig(configuration);
            };
            reader.readAsText(configFile);
        }
    };

})(jQuery, fluid_3_0_0);
