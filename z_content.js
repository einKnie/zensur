
zensur = function() {

	const DEBUG = false;
	var logDebug;
	if (DEBUG) {
		logDebug = console.log;
	} else {
		logDebug = function() { };
	}

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

			filter();
		}

		function filter() {
			var searchresults = "";
			var link = "";
			var parent = "";

			switch(g_sitename) {
				case 'google':
					searchresults = 'div#rso';
					link = 'div.yuRUbf > a';
					parent = '.rc';
					break;

				case 'duckduckgo':
					searchresults = 'div#links';
					link = 'a.result__url';
					parent = 'div.result';
					break;

				case 'startpage':
					searchresults = 'section.w-gl';
					link = 'a.w-gl__result-url';
					parent = 'div.w-gl__result';
					break;
				default: break;
			}

			if (document.querySelector(searchresults) == null) {
				logDebug("No search results found");
			} else {
				var results = document.querySelector(searchresults).querySelectorAll(link);
				logDebug(results);

				if (results.length == 0) {
					logDebug("no links found. retrying in a bit");
					setTimeout(initCensor, 200);
				}
				var filter = getFilter();
				var re = new RegExp('www\\.' + filter + '.*', 'g');

				// check if offending sites and remove
				for (let res of results) {
					if (res.href.match(re) != null) {
						logDebug("found offending link");
						logDebug(res.href);
						let entry = getAncestor(res, parent);
						logDebug("hiding entry");
						if (entry != null) entry.hidden = true;
					}
				}
			}
		}


		function getAncestor(elem, selector) {
			for ( ; elem && elem !== document; elem = elem.parentNode ) {
				if ( elem.matches( selector ) ) return elem;
			}
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
