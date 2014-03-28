jasmine-phantomjs
=================

Jasmine, PhantomJS and JUnit testing utilities - for _Jasmine 2.0.0_

About
-----
The Jasmine testing framework is an incredibly simple and easy-to-use JavaScript library that makes writing and running tests a piece of cake. The library itself is well-made and works effectively in most browsers.

Being a browser-based testing toolkit, some work is required for those that require a more automated solution. Some may want to integrate with Ant and JUnit, but may be disappointed to find somewhat of a lack of software and support for doing so with Jasmine 2.*. This is where this repo comes in.

Included here are some utilities that improve the integration between these systems for use with a more automated testing workflow.

Contents
--------
 - Jasmine runner for PhantomJS (run-jasmine.js): Output your Jasmine test results to the command-line.
 - Jasmine JUnit Reporter plugin (junit-xml.js): Create JUnit-style XML output when running tests.
 - Jasmine JUnit runner for PhantomJS (run-jasmine-junit.js): Output the JUnit XML (from the previous plugin) to the command-line.

Credits
-------
These scripts were cobbled together from others like the PhantomJS Jasmine script and some personal attempts and neatening up the output.

Where applicable, I'll link the appropriate original sources here shortly.
