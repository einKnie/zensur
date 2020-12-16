# Zensur

This Firefox Addon automatically removes search results that lead to undesired domains.  

Let's say you want to shop less at amazon but you keep being tempted by all the amazon links when you look for stuff online. No more! Simply set your filter to "amazon" and all search results leading to _amazon.com_, _amazon.de_, or any other _amazon_ domain will be hidden automatically.

### Roadmap
This Addon is still in early develoment stages.  
At this point, the Addon only runs on google, duckduckgo, and startpage, but wider support of search engines is planned.

## Installation

#### The Easy Way

not yet

#### Manual Install Instructions
To install as a temporary Firefox extension:

1. Clone this repo to your machine
2. In Firefox, navigate to about:debugging
3. Under _**This Firefox**_, click _**Load Temporary Add-On**_.
4. In the dialog, navigate to the cloned repo and open any file in the _zensur_ directory - e.g. _manifest.json_.

The extension is now installed and active.

## Usage

Just set your desired filter in the Addon's preferences and you're good to go.

##### Example
Set the filter to  
```amazon``` to filter all _amazon_ domains  
```amazon zalando``` to filter both _amazon_ and _zalando_ domains  
```amazon.de``` to filter only _amazon.de_ (_amazon.com_ links will stay visible)  
