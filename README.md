# fluid-authoring

This repository contains tools for perceiving, authoring and debugging applications developed using Fluid's Infusion framework.

The primary focus of these tools is the **Visible Nexus**, an augmentation of the [GPII Nexus](https://wiki.gpii.net/w/The_Nexus),
which is implemented as a [Kettle](https://github.com/fluid-project/kettle) application. The Visible Nexus is a mixin 
[grade](http://docs.fluidproject.org/infusion/development/ComponentGrades.html) which can be applied to the 
[Kettle app](https://github.com/fluid-project/kettle/blob/master/docs/RequestHandlersAndApps.md) representing any 
Nexus instance, in order to endow it with a 
self-served web interface which allows the contents of the Nexus to be queried, represented in
a visual graph form, and manipulated in some simple ways.

The current implementation is crude and inefficient, but demonstrates the essential affordances of the system. Any numbers
of clients may simultaneously connect to the same Nexus interface, and interact with the same shared substrate. Any 
updates to the component structure or the 
[models](http://docs.fluidproject.org/infusion/development/tutorial-gettingStartedWithInfusion/ModelComponents.html) 
attached to the components, whether triggered internally or by one of the clients, are immediately transmitted to the
UIs of any connected clients.

# Installation

Check out this project, having installed sufficiently recent versions of [node.js and npm](https://nodejs.org/en/) and
run

```
    npm install 
```

# Demos

There are two demos currently hosted in this project, demonstrating the two major configurations of the Visible Nexus.

## Local demo based on Floe's Chart Authoring Tool

The Floe [Chart Authoring Tool](http://handbook.floeproject.org/AuthoringOfContent.html#case-study-2-floe-chart-authoring-tool) is
a customizable chart authoring tool interface that will enable educational resource authors to create accessible, multi-modal charts.
It is a standard [Fluid Infusion](http://docs.fluidproject.org/infusion/development/index.html) client-based web application,
and as such, at any time, it gives rise to a particular component tree state reflecting its implementation state. This
component tree state can be exposed by means of the *local* configuration of the Visible Nexus. This demo can be viewed
by hosting the contents of this project over a local HTTP server and then browsing to the file

```
    demos/chartAuthoring/chartAuthoring.html
```

In addition to the standard UI of the chart authoring demo, a small cogwheel icon triggering the Visible Nexus popup is
rendered at the bottom right of the browser window. Clicking on this brings up the scrollable popup pane hosting the
Visible Nexus UI, which at any time renders the component tree state of the running application. You can experiment
with triggering UI changes in the target app, and watching any corresponding updates in a corresponding component in the
component tree, or conversely triggering changes in the component tree models directly, and observing any corresponding
updates in the app's real UI (this implementation of the chart authoring app is not particularly responsive to most of these).

## Remote demo based on bare GPII Nexus

Running

```
    node visibleNexus.js
```

from this directory will start up a bare Nexus (not hosting any application) with the Visible Nexus mixins applied. You can browse to 
[http://localhost:9081/visible-nexus/visibleNexus.html](http://localhost:9081/visible-nexus/visibleNexus.html) to
bring up the UI. In the current demo this just shows a handful of standard context grades created in every 
Infusion component tree, but also includes a "Create sample model component" button that allows the user
to experiment by creating simple model components at the root of the component tree. These each contain a simple model with
a primitive integer value at the path `modelValue` which you can update using an inline-editable text box.

# Affordances and limitations in the current system

The current system only renders the grade name list and model area of the components in the tree. These are rendered
using a simple line-based UI that allows each recursive level of the component model to be folded and unfolded. The
user can interact directly with any primitive value at a model leaf to change it textually. The user cannot currently
add new members to models or delete them. They can, however, delete entire components by clicking on the red X button
visible when hovering just beyond the top right of the component. Deleting anything other than the "sample model
components" created in the remote Nexus demo will have undesirable results in most current apps.

The demo features basic keyboard accessibility and basic ARIA labelling of the component structure and members. This
has some glitches in interaction idiom.

The current Nexus is demo-quality only, since it has virtually no effective error handling, nor any transaction
or synchronisation primitives. It is quite easy to corrupt the state of the Nexus by sending it faulty messages,
and rendering it unusable for the rest of its session.

# How to configure the Visible Nexus

Following the two demos in this project, you can configure the Visible Nexus in your own local Infusion and remote
Nexus projects.

## Configuring the local Visible Nexus

This requires the following set of includes for files in this repository:

```
        <script src="../../src/shared/js/AuthorUtils.js"></script>
        <script src="../../src/shared/js/ComponentGraphUtilities.js"></script>
        <script src="../../src/client/js/PlainAriaLabels.js"></script>
        <script src="../../src/client/js/KeyboardSupport.js"></script>
        <script src="../../src/client/js/DecoratorViewComponent.js"></script>
        <script src="../../src/client/js/FluidViewDebuggingCore.js"></script>
        <script src="../../src/client/js/ViewComponentSupport.js"></script>
        <script src="../../src/client/js/DynamicComponentIndexer.js"></script>
        <script src="../../src/client/js/StructureView.js"></script>
        <script src="../../src/client/js/ComponentGraph.js"></script>
        <script src="../../src/client/js/ComponentGraphConnectors.js"></script>
        <script src="../../src/client/js/ComponentGraphLocal.js"></script>

        <link rel="stylesheet" type="text/css" href="../../src/client/css/ComponentGraph.css" />
```

To construct the Nexus UI trigger and popup on your page, you can then add a `script` block to the base of your
page as follows:

```
    <script>
        fluid.author.componentGraphPanel.popup.local("body");
    </script>
```

## Configuring the remote Visible Nexus

This requires the mixin grade `fluid.authoring.nexus.app` to be applied to your existing Kettle app derived 
from `gpii.nexus`. A simple Kettle config achieving this is defined in [src/server/configs/fluid.visible.nexus.config](src/server/configs/fluid.visible.nexus.config)
and referenced in [visibleNexus.js](visibleNexus.js). If not using the Kettle config system, you will have
had to issue the `require("fluid-authoring")` directive yourself.
