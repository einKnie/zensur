
zensur = function() {

	const DEBUG = false;
	var logDebug;
	if (DEBUG) {
		logDebug = console.log;
	} else {
		logDebug = function() { };
	}

	const type = {
		TXT: 'text',
		IMG: 'image'
	};

	// 'globals'
	var g_isSuspended   = false;
	var g_siteSuspended = false;
	var g_activeSites   = {};
	var g_sitename      = "";
	var g_filter        = "";

	// start script execution
	init();

	/*
	* init()
	* Initialize script
	*/
	function init() {
		logDebug("Starting content script");
		browser.storage.onChanged.addListener(onSettingChanged);
		initSettings()
		.then(initCensor);
	}


	/*
	* initSettings()
	* Apply settings from local storage.
	*/
	function initSettings() {
		// return a Promise to make the it possible
		// to wait for this function's completion (in init())
		// before doing other init stuff
		return new Promise((resolve) => {
			function applySetting(pref) {
				g_filter      = pref.filter     || g_filter;
				g_isSuspended = pref.suspended  || g_isSuspended;
				g_activeSites = pref.sites      || g_activeSites;
				checkSiteStatus(g_activeSites);

				if (g_filter == "") {
					g_isSuspended = true;
				}

				logDebug("filter: " + g_filter);
				resolve("success");
			}

			browser.storage.local.get({
				filter:     g_filter,
				suspended:  false,
				sites:      g_activeSites })
				.then(applySetting, onError);
			});
		}


		function initCensor() {

			if (g_siteSuspended || g_isSuspended) {
				logDebug("doing nothing");
				return;
			}

			var searchresults = {};
			var link = {};
			var parent = {};

			switch(g_sitename) {
				case 'google':
					searchresults[type.TXT] = 'div#rso';
					searchresults[type.IMG] = 'div.islrc';
					link[type.TXT] = 'div.yuRUbf > a';
					link[type.IMG] = 'a[href]';
					parent[type.TXT] = 'div.g';
					parent[type.IMG] = 'div.isv-r';
					break;

				case 'duckduckgo':
					searchresults[type.TXT] = 'div#links';
					searchresults[type.IMG] = 'div.zci__main';
					link[type.TXT] = 'a.result__url';
					link[type.IMG] = 'a[href]';
					parent[type.TXT] = 'div.result';
					parent[type.IMG] = 'div.title';
					break;

				case 'startpage':
					searchresults[type.TXT] = 'section.w-gl';
					searchresults[type.IMG] = 'section.w-gl';
					link[type.TXT] = 'a.w-gl__result-url';
					link[type.IMG] = 'a.w-gl__result-url';
					parent[type.TXT] = 'div.w-gl__result';
					parent[type.IMG] = 'div.w-gl__result';
					break;

				case 'ecosia':
					searchresults[type.TXT] = 'div.card-desktop';
					searchresults[type.IMG] = '';
					link[type.TXT] = 'a.result-url';
					link[type.IMG] = '';
					parent[type.TXT] = 'div.result';
					parent[type.IMG] = '';
					break;
				default: break;
			}

			logDebug("starting filter");
			if (!filter(searchresults, link, parent)) {
				logDebug("error: failed to find search results");
			}
		}


		function filter(collection, link, container) {
			var found_smth = false;

			for (let t in type) {
				if (!type.hasOwnProperty(t)) continue;

				logDebug(`checking ${type[t]} search`);
				if (document.querySelector(collection[type[t]]) == null) {
					logDebug("Result collection not found");
					continue;
				} else {
					for (let c of document.querySelectorAll(collection[type[t]])) {
						logDebug(c);
						let results = c.querySelectorAll(link[type[t]]);
						logDebug(results);

						if (results.length == 0) {
							logDebug("no search results found in container");
							continue;
						} else {
							found_smth = true;
						}

						let re = new RegExp('www\\.' + getFilter() + '.*', 'g');

						// check if offending site and remove
						for (let res of results) {
							if (res.href.match(re) != null) {
								logDebug(`found offending link: ${res.href}`);
								let entry = getAncestor(res, container[type[t]]);
								if (entry != null) {
									logDebug("hiding entry");
									entry.hidden = true;
									entry.remove();
								}
							}
						}
					}

					if (!found_smth) {
						logDebug("no search results found. retrying in a bit");
						setTimeout(initCensor, 200);
						return true;
					}

					logDebug("done");
					return true;
				}
			}
			return false;
		}


		function getAncestor(elem, selector) {
			for ( ; elem && elem !== document; elem = elem.parentNode ) {
				if ( elem.matches( selector ) ) return elem;
			}
			logDebug("did not find ancestor");
			return null;
		}


		function getFilter() {
			// contruct a filter string from filter keywords
			// like (amazon)|(zalando)|(other filter)

			var input = g_filter.split(' ');
			var filter = ""
			for (let i = 0; i < input.length; i++) {
				filter += "(" + input[i] + ")"
				if (i < (input.length - 1)) {
					filter += "|";
				}
			}
			return filter;
		}

		function isSupportedSite() {
			let url = document.URL;
			logDebug(g_activeSites);
			for (let site in g_activeSites) {
				if (g_activeSites.hasOwnProperty(site) && url.includes(site)) {
					logDebug("filtering supported");
					return true;
				}
			}
			return false;
		}


		//
		// CALLBACK HANDLER
		//


		function onError(e) {
			console.log("Error: " + e);
		}


		/*
		* onSettingChanged()
		* Event handler for settings changes event.
		*/
		function onSettingChanged() {
			logDebug("Settings have changed!");
			browser.storage.local.get(["suspended", "sites", "filter"])
			.then(function(pref) {
				logDebug(pref);
				g_isSuspended = pref.suspended || false;
				checkSiteStatus(pref.sites);

				g_filter = pref.filter || "";
				if (g_filter == "") g_isSuspended = true;

			}, onError);
		}


		/*
		* checkSiteStatus()
		* Check if current site is suspended
		*/
		function checkSiteStatus(sites) {
			if (!isSupportedSite()) {
				g_siteSuspended = true;
				return;
			}

			Object.getOwnPropertyNames(sites).forEach(function(val) {
				if (document.URL.includes(val)) {
					g_siteSuspended = !sites[val];
					g_sitename = val;
				}
			});
		}

	}();
