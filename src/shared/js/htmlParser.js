/*
Copyright 2008-2010 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2010-2011 Lucendo Development Ltd.
Copyright 2016 Raising the Floor - International

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

(function ($, fluid) {
    "use strict";
    fluid.registerNamespace("fluid.htmlParser");
    // options:
    //    selectors: String -> String
    fluid.htmlParser.parse = function (template, options) {
        var defaults = {
            selectors: {}
        };
        var that = {
            template: template,
            options: fluid.extend({}, defaults, options),
            nodeStack: [],
            rootNode: {},
            parsedSelectors: [], // array of tree, selector, id, partialParse (last is volatile during parse)
            matchedSelectors: {},
            simpleClassSelectors: {},
            defstart: -1, // character pointers for default processing
            defend: -1,
            parser: fluid.XMLP(template)
        };
        that.nodeStack[0] = that.rootNode;
        fluid.htmlParser.beginParse(that);
        return that;
    };

    fluid.htmlParser.isSimpleClassSelector = function (tree) {
        return tree.length === 1 && tree[0].predList.length === 1 && tree[0].predList[0].clazz;
    };

    fluid.htmlParser.parseSelector = function (that) {
        fluid.each(that.options.selectors, function (selRHS, id) {
            var selectors = fluid.makeArray(selRHS);
            fluid.each(selectors, function (selector) {
                var tree = fluid.parseSelector(selector, fluid.simpleCSSMatcher);
                var clazz = fluid.htmlParser.isSimpleClassSelector(tree);
                if (clazz) {
                    fluid.pushArray(that.simpleClassSelectors, clazz, id);
                }
                else {
                    that.parsedSelectors.push({
                        tree: tree,
                        selector: selector,
                        id: id,
                        partialParse: []
                    });
                }
            });
        });
    };

    fluid.htmlParser.hasCssClass = function (clazz, totest) {
        if (!totest) {
            return false;
        }
        // algorithm from jQuery
        return (" " + totest + " ").indexOf(" " + clazz + " ") !== -1;
    };

    fluid.htmlParser.matchNode = function (term, node, headclazz) {
        if (term.predList) {
            for (var i = 0; i < term.predList.length; ++i) {
                var pred = term.predList[i];
                if (pred.id && node.attrs.id !== pred.id) {return false;}
                if (pred.clazz && !fluid.htmlParser.hasCssClass(pred.clazz, headclazz)) {return false;}
                if (pred.tagName && node.tagName !== pred.tagName) {return false;}
            }
            return true;
        }
    };

    fluid.htmlParser.beginMatchSelector = function (that, node) {
        var headclazz = node.attrs ? node.attrs["class"] : null,
            nodeStack = that.nodeStack;
        if (headclazz) {
            var split = headclazz.split(" ");
            for (var i = 0; i < split.length; ++i) {
                var simpleCut = that.simpleClassSelectors[split[i].trim()];
                if (simpleCut) {
                    return simpleCut;
                }
            }
        }
        // Note that, as for IoCSS selectors, this is a primitive implementation that does no backtracking
        fluid.each(that.parsedSelectors, function (parsedSelector) {
            var tree = parsedSelector.tree,
                partial = parsedSelector.partialParse;
            var nextterm = partial.length; // the next term for this node
            if (nextterm < tree.length) {
                var term = tree[nextterm];
                if (nextterm > 0) {
                    if (tree[nextterm - 1].child &&
                            partial[nextterm - 1] !== nodeStack[nodeStack.length - 2]) {
                        return; // it is a failure to match if not at correct nesting depth
                    }
                }
                var isMatch = fluid.htmlParser.matchNode(term, node, headclazz);
                if (isMatch) {
                    partial[partial.length] = node;
                    if (partial.length === tree.length) {
                        fluid.pushArray(that.matchedSelectors, parsedSelector.id, node);
                    }
                }
            }
        });
    };

    fluid.htmlParser.endMatchSelector = function (that, node) {
        fluid.each(that.parsedSelectors, function (parsedSelector) {
            var partial = parsedSelector.partialParse;
            if (partial.length > 0 && partial[partial.length - 1] === node) {
                partial.length--;
            }
        });
    };

    fluid.htmlParser.newNode = function (that) {
        var togo = {};
        if (that.options.debugMode) {
        // TODO: These methods are fantastically inefficient since they were hacked into the parser after the fact
            togo.line = that.parser.getLineNumber();
            togo.column = that.parser.getColumnNumber();
        }
        var parent = that.nodeStack[that.nodeStack.length - 1];
        fluid.pushArray(parent, "children", togo);
        return togo;
    };

    fluid.htmlParser.processTagStart = function (that, isempty) {
        var node = fluid.htmlParser.newNode(that);
        node.tagName = that.parser.getName();
        // NB - attribute names and values are now NOT DECODED!!
        if (!$.isEmptyObject(that.parser.m_attributes)) { // TODO: economise on this garbage in the parser
            node.attrs = that.parser.m_attributes;
        }
        // TODO: accelerate this by grabbing original template text (requires parser
        // adjustment) as well as dealing with empty tags
        // node.text = "<" + tagname + fluid.dumpAttributes(attrs) + (isempty && !ID ? "/>" : ">");
        that.nodeStack.push(node);
        fluid.htmlParser.beginMatchSelector(that, node);
        if (isempty) {
            fluid.htmlParser.endMatchSelector(that, node);
            that.nodeStack.pop();
        }
    };

    fluid.htmlParser.processTagEnd = function (that, node) {
        fluid.htmlParser.endMatchSelector(that, node);
        that.nodeStack.pop();
    };

    fluid.htmlParser.maybeEmitTextTag = function (that) {
        if (that.defstart !== -1) {
            var text = that.parser.getContent().substr(that.defstart, that.defend - that.defstart);
            var node = fluid.htmlParser.newNode(that);
            node.text = text;
            that.defstart = -1;
        }
    };

    // unsupported, non-API function
    fluid.htmlParser.beginParse = function (that) {
        var parser = that.parser;
parseloop: // eslint-disable-line indent
        while (true) {
            var iEvent = parser.next();
            switch (iEvent) {
            case fluid.XMLP._ELM_B:
                fluid.htmlParser.maybeEmitTextTag(that);
                fluid.htmlParser.processTagStart(that, false);
                break;
            case fluid.XMLP._ELM_E:
                fluid.htmlParser.maybeEmitTextTag(that);
                fluid.htmlParser.processTagEnd(that);
                break;
            case fluid.XMLP._ELM_EMP:
                fluid.htmlParser.maybeEmitTextTag(that);
                fluid.htmlParser.processTagStart(that, true);
                break;
            case fluid.XMLP._PI:
            case fluid.XMLP._DTD:
            case fluid.XMLP._TEXT:
            case fluid.XMLP._ENTITY:
            case fluid.XMLP._CDATA:
            case fluid.XMLP._COMMENT:
                if (that.defstart === -1) {
                    that.defstart = parser.m_cB;
                }
                that.defend = parser.m_cE;
                break;
            case fluid.XMLP._ERROR:
                fluid.setLogging(true);
                var message = "Error parsing template: " + parser.m_cAlt + " at line " + parser.getLineNumber();
                fluid.log(message);
                fluid.log("Just read: " + parser.m_xml.substring(parser.m_iP - 30, parser.m_iP));
                fluid.log("Still to read: " + parser.m_xml.substring(parser.m_iP, parser.m_iP + 30));
                fluid.fail(message);
                break parseloop;
            case fluid.XMLP._NONE:
                break parseloop;
            }
        }
        fluid.htmlParser.maybeEmitTextTag(that);
        var excess = that.nodeStack.length - 1;
        if (excess) {
            fluid.fail("Error parsing template - unclosed tag(s) of depth " + (excess) +
                ": " + fluid.transform(that.nodeStack.splice(1, excess), function (node) {return fluid.htmlParser.debugNode(node);}).join(", "));
        }
    };

    // unsupported, non-API function
    fluid.htmlParser.debugNode = function (node) {
        var togo = node.text;
        togo += " at ";
        togo += "lump line " + node.line + " column " + node.column;
        return togo;
    };

    // TODO: find faster encoder
    fluid.XMLEncode = function (text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
    };


    fluid.htmlParser.dumpTagOpen = function (node, t) {
        t.text += "<" + node.tagName;
        if (node.attrs) {
            t.text += fluid.htmlParser.dumpAttributes(node.attrs);
        };
        t.text += fluid.XMLP.closedTags[node.tagName] ? " />" : ">";
    };

    fluid.htmlParser.dumpTagClose = function (node, t) {
        if (!fluid.XMLP.closedTags[node.tagName]) {
            t.text += "</" + node.tagName + ">";
        }
    };

    fluid.htmlParser.dumpNode = function (node, t) {
        if (node.text) {
            t.text += node.text;
        } else {
            fluid.htmlParser.dumpTagOpen(node, t);
            fluid.each(node.children, function (child) {
                fluid.htmlParser.dumpNode(child, t);
            });
            fluid.htmlParser.dumpTagClose(node, t);
        }
    };

    fluid.htmlParser.render = function (nodes) {
        var t = {
            text: ""
        };
        fluid.each(nodes, function (node) {
            fluid.htmlParser.dumpNode(node, t);
        });
        return t.text;
    };

    // unsupported, non-API function
    fluid.htmlParser.dumpAttributes = function (attrs) {
        var togo = "";
        for (var attrname in attrs) {
            var attrvalue = attrs[attrname];
            if (attrvalue !== null && attrvalue !== undefined) {
                togo += " " + attrname + "=\"" + attrvalue + "\"";
            }
        }
        return togo;
    };

})(jQuery, fluid_2_0_0);
