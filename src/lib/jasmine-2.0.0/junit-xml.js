/* global jasmine */

(function() {

    "use strict";

    function elapsed(startTime, endTime) {
        return (endTime - startTime)/1000;
    }

    function trim(str) {
        return str.replace(/^\s+/, "" ).replace(/\s+$/, "" );
    }

    function escapeInvalidXmlChars(str) {
        return str.replace(/</g, "&lt;")
            .replace(/\>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&apos;")
            .replace(/\&/g, "&amp;");
    }

    var XML_CHAR_MAP = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;'
    };

    function escapeXml (s) {
        return s.replace(/[<>&"']/g, function (ch) {
            return XML_CHAR_MAP[ch];
        });
    }

    var formatXml = function (xml) {
        var reg = /(>)(<)(\/*)/g;
        var wsexp = / *(.*) +\n/g;
        var contexp = /(<.+>)(.+\n)/g;
        xml = xml.replace(reg, '$1\n$2$3').replace(wsexp, '$1\n').replace(contexp, '$1\n$2');
        var pad = 0;
        var formatted = '';
        var lines = xml.split('\n');
        var indent = 0;
        var lastType = 'other';
        // 4 types of tags - single, closing, opening, other (text, doctype, comment) - 4*4 = 16 transitions
        var transitions = {
            'single->single'    : 0,
            'single->closing'   : -1,
            'single->opening'   : 0,
            'single->other'     : 0,
            'closing->single'   : 0,
            'closing->closing'  : -1,
            'closing->opening'  : 0,
            'closing->other'    : 0,
            'opening->single'   : 1,
            'opening->closing'  : 0,
            'opening->opening'  : 1,
            'opening->other'    : 1,
            'other->single'     : 0,
            'other->closing'    : -1,
            'other->opening'    : 0,
            'other->other'      : 0
        };

        for (var i=0; i < lines.length; i += 1) {
            var ln = lines[i];
            var single = Boolean(ln.match(/<.+\/>/)); // is this line a single tag? ex. <br />
            var closing = Boolean(ln.match(/<\/.+>/)); // is this a closing tag? ex. </a>
            var opening = Boolean(ln.match(/<[^!].*>/)); // is this even a tag (that's not <!something>)
            var type = single ? 'single' : closing ? 'closing' : opening ? 'opening' : 'other';
            var fromTo = lastType + '->' + type;
            lastType = type;
            var padding = '';

            indent += transitions[fromTo];
            for (var j = 0; j < indent; j += 1) {
                padding += '    ';
            }

            formatted += padding + ln + '\n';
        }

        return formatted;
    };

    var JasmineJUnitReporter = function() {
        this.properties = {
            duration: 0.0,
            passed: 0,
            failed: 0,
            total: 0,
            pending: 0
        };
        this.suites = [];
        this.currentSuite = false;
    };

    JasmineJUnitReporter.prototype = {

        getOutput: function() {
            var output = '<testsuites>';
            output += this.getSuitesOutput(this.suites);
            output += '</testsuites>';
            return output;
        },

        getSpecOutput: function(spec) {
            var output = '<testcase classname="' + spec.fullName + '" name="' +
                escapeInvalidXmlChars(spec.description) + '" time="' + spec.duration + '">';
            if (spec.status === "pending") {
                output += '<skipped />';
            }
            if ((spec.status === "failed") && (spec.failedExpectations.length > 0)) {
                for (var fe = 0; fe < spec.failedExpectations.length; fe += 1) {
                    var fexp = spec.failedExpectations[fe];
                    output += '<failure message="' + trim(escapeInvalidXmlChars(fexp.message)) + '">';
                    output += escapeInvalidXmlChars(fexp.stack || fexp.message);
                    output += "</failure>";
                }
            }
            output += '</testcase>';
            return output;
        },

        getSpecsOutput: function(specs) {
            var output = "";
            if (specs.length > 0) {
                for (var spi = 0; spi < specs.length; spi += 1) {
                    output += this.getSpecOutput(specs[spi]);
                }
            }
            return output;
        },

        getSuiteOutput: function(suite) {
            var output = '<testsuite failures="' + suite.properties.failed + '" tests="' + suite.properties.tests +
                '" skips="' + suite.properties.pending + '" time="' + suite.duration + '" name="' +
                suite.fullName + '">';
            // specs first
            output += this.getSpecsOutput(suite.specs);
            // suites second
            output += this.getSuitesOutput(suite.suites);
            output += '</testsuite>';
            return output;
        },

        getSuitesOutput: function(suites) {
            var output = "";
            if (suites.length > 0) {
                for (var i = 0; i < suites.length; i += 1) {
                    output += this.getSuiteOutput(suites[i]);
                }
            }
            return output;
        },

        jasmineDone: function() {
            this.properties.duration = elapsed(this.properties.started, new Date());
            var xmlOutput = this.getOutput();
            var outEl = document.getElementById("junitxml");
            if (outEl) {
                outEl.innerHTML = xmlOutput;
            }
        },

        jasmineStarted: function() {
            this.properties.started = new Date();
        },

        specDone: function(result) {
            result.duration = elapsed(result.startTime, new Date());
            if (result.status === "passed") {
                this.properties.passed += 1;
                this.currentSuite.properties.passed += 1;
            } else if (result.status === "failed") {
                this.properties.failed += 1;
                this.currentSuite.properties.failed += 1;
            } else if (result.status === "pending") {
                this.properties.pending += 1;
                this.currentSuite.properties.pending += 1;
            }
            this.currentSuite.properties.tests += 1;

            if (this.currentSuite !== false) {
                this.currentSuite.specs.push(result);
            }
        },

        specStarted: function(result) {
            result.startTime = new Date();
        },

        suiteDone: function(result) {
            result.duration = elapsed(result.startTime, new Date());
            if (result.hasOwnProperty("parent")) {
                this.currentSuite = result.parent;
            } else {
                this.currentSuite = false;
            }
        },

        suiteStarted: function(result) {
            result.startTime = new Date();
            result.specs = [];
            result.suites = [];
            result.properties = {
                passed: 0,
                failed: 0,
                pending: 0,
                tests: 0
            };
            if (this.currentSuite !== false) {
                result.parent = this.currentSuite;
                this.currentSuite.suites.push(result);
            } else {
                this.suites.push(result);
            }
            this.currentSuite = result;
        },

        log: function(text) {
            console.log("JJUR: " + text);
        }

    };

    jasmine.JasmineJUnitReporter = JasmineJUnitReporter;
    jasmine.getEnv().addReporter(new jasmine.JasmineJUnitReporter());

})();
