(function() {

	const DEBUG = false;
	var logDebug;
	if (DEBUG) {
		logDebug = console.log;
	} else {
		logDebug = function () { };
	}

	// supported websites
	const sites = {
		GOOGLE:     "google",
		DDG:        "duckduckgo",
		STARTPAGE:  "startpage",
		ECOSIA:     "ecosia"
	};

	// base settings
	const g_suspendedDefault = false;
	const g_filterDefault = "";

	// handling the settings page
	var g_lastTabId = null;
	var g_optionsURL = "options/options.html";

	// will be filled at script startup, values are gotten from sites object
	var g_activeSites = {};

	browser.runtime.onMessage.addListener(handleMessage);
	getSupportedSites()
	.then(initSettings, onError);


	/*
	* getSupportedSites()
	* (this way, I won't have to add new sites at multiple locations)
	*/
	function getSupportedSites() {
		return new Promise((resolve, reject) => {
			for (let site in sites) {
				if (sites.hasOwnProperty(site)) {
					g_activeSites[sites[site]] = true;
				}
			}
			resolve("yay");
		});
	}


	/*
	* should actually just initialite storage if nothing is there yet (i.e. first start after installation)
	*/
	function initSettings() {
		browser.storage.local.get(["suspended", "sites", "filter"])
		.then(function(pref) {
			if (pref.sites && (Object.keys(pref.sites).length < Object.keys(g_activeSites).length)) {
				updateSites(pref.sites);
			} else {
				logDebug(pref.sites);
				logDebug(g_activeSites);
				logDebug("no site update needed");
			}
			let newPrefs = {
				suspended:  pref.suspended || g_suspendedDefault,
				sites:      pref.sites     || g_activeSites,
				filter:     pref.filter    || g_filterDefault
			};
			browser.storage.local.set(newPrefs);
		}, onError);
	}


	/*
	* Update supported sites list
	*/
	function updateSites(oldSites) {
		logDebug(oldSites);
		for (let site in g_activeSites) {
			logDebug(`updating ${site}`);
			if (oldSites.hasOwnProperty(site)) {
				logDebug(`got old settings for ${site}`);
			} else {
				logDebug(`${site} not found in old settings`);
				oldSites[site] = true;
			}
		}
	}


	/*
	* handleMessage()
	* Deal with an incoming message from the toolbar button
	*/
	function handleMessage(message) {
		logDebug("message received");
		if ("settings" in message) {
			openSettingsPage();
		}
	}


	/*
	* getCurrentTab()
	* Return the index ( = position) of the currently active tab
	*/
	function getCurrentTab(winInfo) {
		return new Promise((resolve, reject) => {

			for (let tabInfo of winInfo.tabs) {
				if (tabInfo.active == true) {
					resolve(tabInfo.index);
				}
			}
			reject("Failed to get current tab");
		});
	}


	/*
	* isSettingsOpen()
	* Return true if a settings page is already open in the current active window
	* else false.
	*/
	function isSettingsOpen(winInfo) {
		let views = browser.extension.getViews({type: "tab", windowId: winInfo.windowId});
		for (let win of views) {
			if (win.location.href.includes(g_optionsURL)) {
				// switch to tab instead of open
				return true;
			}
		}
		return false;
	}


	/*
	* openSettingsPage()
	* Open a new tab with the Addon's setting page.
	* If a setings page is found to be open already, it is closed.
	* TODO: see if there is a better way to do this
	*/
	function openSettingsPage() {
		let winid = browser.windows.getCurrent({populate: true});
		// close settings tab, if open
		winid.then(isSettingsOpen)
		.then(function(res) {
			if (res == true) {
				browser.tabs.remove([g_lastTabId]);
			}
		});
		// in parallel
		// open new settings tab next to current tab
		winid.then(getCurrentTab)
		.then(function(index) {
			let tabcfg = {
				active: true,
				index: index + 1,
				url:   g_optionsURL
			};
			browser.tabs.create(tabcfg)
			.then(function(tab) {
				g_lastTabId = tab.id;
			}, onError);
		}, onError);
	}

	function onError(e) {
		console.log("error: " + e);
	}
})();
