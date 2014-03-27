/**
 *  Jasmine Test Runner for PhantomJS
 *  @author Perry Mitchell <perry@perrymitchell.net>
 *  @created 2014-03-27
 */

var system = require("system");

//
// Settings
//

/**
 * Maximum timeout for the entire test-run, in seconds
 * @type {number}
 */
var maxTimeout = 120;

//
// Utilities
//

/**
 * Wait for a condition - Used for waiting for all of the test cases to finish
 * @param testCond {String|Function} The condition to test (resolve to boolean true)
 * @param callback {String|Function} The callback to fire when condition resolves
 * @param timeoutMS {integer} The timeout to wait for in milliseconds
 */
function waitFor(testCond, callback, timeoutMS) {
    var timeout = timeoutMS ? timeoutMS : 15000, // default max time is 15 seconds
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(
            function() {
                if (((new Date().getTime() - start ) < timeout) && !condition) {
                    // If not time-out and condition not yet fulfilled
                    condition = (typeof(testFx) === "string" ? eval(testCond) : testCond());
                } else {
                    if (!condition) {
                        // If condition still not fulfilled (timeout but condition is 'false')
                        console.log("'waitFor()' timeout");
                        phantom.exit(1);
                    } else {
                        // Condition fulfilled (timeout and/or condition is 'true')
                        if (typeof(callback) === "string") {
                            eval(callback);
                        } else {
                            (callback)();
                        }
                        clearInterval(interval); //< Stop this interval
                    }
                }
            },
            100 // check every 100ms
        );
}

//
// Setup
//

// Expect Jasmine test URL
if (system.args.length !== 2) {
    console.log('Usage: run-jasmine.js URL');
    phantom.exit(1);
}

// Preliminary output
console.log("--[ Begin console output ]--------------------------------------------");

var page = require('webpage').create();

// Route console.log messages to stdout
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.open(system.args[1], function(status) {
    if (status !== "success") {
        console.log("Unable to access network");
        phantom.exit();
    } else {
        waitFor(function(){
            return page.evaluate(function(){
                // If no .symbolSummary or pending is present then, we are not finished loading
                return (document.body.querySelector('div.banner .duration') !== null);
            });
        }, function() {

            var exitCode = page.evaluate(function() {
                console.log("--[ End console output ]----------------------------------------------");
                console.log('');

                // Load jasmine version info
                var banner = document.body.querySelector('div.banner > span.title').innerText;
                banner += "\n" + document.body.querySelector('div.banner > span.version').innerText;
                console.log(banner);
                console.log("");
                console.log("Test Summary - " + document.body.querySelector('div.banner > span.duration').innerText);

                // Process passed-tests
                var testSummary = document.body.querySelectorAll('ul.symbol-summary > li');
                var testSummaryOut = "";
                var passedAll = true;
                for (var i = 0; i < testSummary.length; i += 1) {
                    if (testSummary[i].classList.contains('passed')) {
                        testSummaryOut += ".";
                    } else if (testSummary[i].classList.contains('pending')) {
                        testSummaryOut += "*";
                    } else {
                        testSummaryOut += "x";
                        passedAll = false;
                    }
                }
                console.log(testSummaryOut);
                console.log("");

                //
                // Display functions
                //

                /**
                 * Output a single list element (LI)
                 * @param el {HTMLLIElement|HTMLElement} The element to output
                 * @param space {string} Incrementally longer 'gutters' for recursive suites
                 */
                function outputListElement(el, space) {
                    console.log(space + "    it: " + trimLine(el.innerText));
                }

                /**
                 * Output a list of specs
                 * @param el {HTMLUListElement} The UL element to sort through
                 * @param space {string} Gutter spaces
                 */
                function outputList(el, space) {
                    if (!space) {
                        space = "";
                    }
                    var specs = el.childNodes;
                    for(var j = 0; j < specs.length; j += 1) {
                        if ((specs[j] instanceof HTMLLIElement) && (specs[j].className.indexOf("suite-detail")) > -1) {
                            // suite
                            console.log(space + "Suite: " + trimLine(specs[j].innerText));
                        } else if ((specs[j] instanceof HTMLUListElement) &&
                            (specs[j].className.indexOf("specs") > -1)) {
                            // spec
                            outputListElement(specs[j], space);
                        } else if ((specs[j] instanceof HTMLUListElement) &&
                            (specs[j].className.indexOf("suite") > -1)) {
                            // sub-list (new suite)
                            outputList(specs[j], space + "    ");
                        }
                    }
                }

                /**
                 * Trim a line of text
                 * @param text {string} The line to trim
                 * @returns {string} The trimmed line
                 */
                function trimLine(text) {
                    return text.replace(/^\s+|\s+$/g, '');
                }

                //
                // Main output
                //

                if (passedAll) { // passed
                    // Heading
                    console.log("----------------------------------------------------------------------");
                    console.log("Tests Output: " +
                        document.body.querySelector("div.html-reporter > div.alert > span.passed").innerText);
                    console.log("----------------------------------------------------------------------");

                    // Get results
                    var specDetailsSuccess = document.body.querySelectorAll('div.results > div.summary > ul');

                    // Print all
                    for (var k = 0; k < specDetailsSuccess.length; k += 1) {
                        console.log("");
                        console.log('Test ' + (k + 1));

                        outputList(specDetailsSuccess[k]);
                    }
                    console.log("");
                } else { // failed
                    // Get failed content
                    var failedSpan = document.body.querySelector("div.html-reporter > div.alert > span.failed"),
                        failureListSpan = document.body.querySelector(
                            "div.html-reporter > div.alert > span.failure-list");
                    if (!failedSpan || !failureListSpan) {
                        console.log("Error producing tests output.");
                        return;
                    }

                    // Heading
                    console.log("----------------------------------------------------------------------");
                    console.log("Tests Output: " + failedSpan.innerText);
                    console.log("----------------------------------------------------------------------");
                    console.log(failureListSpan.innerText);

                    // Get results
                    var specDetails = document.body.querySelectorAll('div.results > div.failures > div.spec-detail');

                    // Print each fail
                    for(var j = 0; j < specDetails.length; j += 1) {
                        console.log('Failed test: ' + i);

                        // Print what the fail is
                        console.log(specDetails[j].querySelector('div.description').innerText);
                        console.log("");

                        // Print error
                        console.log("Reference Error:");
                        console.log(specDetails[j].querySelector('div.messages > div.result-message').innerText);

                        console.log("");
                        console.log("Stack-trace:");
                        console.log(specDetails[j].querySelector('div.messages > div.stack-trace').innerText);
                    }
                }

            });
            phantom.exit(exitCode);

        }, (maxTimeout * 1000));
    }
});
