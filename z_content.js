// Content script runs on supported sites and watches video player for changes

videoDetector = function() {

	const DEBUG = true;
	var logDebug;
	if (DEBUG) {
		logDebug = console.log;
	} else {
		logDebug = function() { };
	}

	// supported websites
	const sites = {
		GOOGLE:  "google",
		DDG:     "duckduckgo",
		STARTPAGE: "startpage"
	};


	// 'globals'
	// these could well be addon-global. maybe turn them into a 'config' module?
	var g_isSuspended   = false;
	var g_siteSuspended = false;
	var g_activeSites   = {};
	var g_filter				= "";

	// start script execution
	window.addEventListener("DOMContentLoaded", loadedHdl);
	init();

	/*
	* init()
	* Initialize script
	*/
	function init() {
		logDebug("Starting content script");
		browser.storage.onChanged.addListener(onSettingChanged);
		// need to make sure that settings are applied prior to initializing player
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
				g_filter = pref.filter 					|| g_filter;
				g_isSuspended = pref.suspended  || g_isSuspended;
				g_activeSites = pref.sites      || g_activeSites;
				checkSiteStatus(g_activeSites);

				if (g_filter == "") {
					g_isSuspended = true;
				}
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
				// do nothing
				return;
			}

			if (document.querySelector('#rso') == null) {
				logDebug("No search results found");
			} else {
				var results = document.querySelector('#rso').querySelectorAll('a');
				logDebug(results);
				var filter = getFilter();
				var re = new RegExp('www\\.' + filter + '.*', 'g');

				// check if offending sites and remove
				for (let res of results) {
					if (res.href.match(re) != null) {
						logDebug("found offending link");
						logDebug(res.href);
						let entry = getAncestor(res, '.rc');
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

			// var input = ['amazon', 'zalando'];
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


		/*
		* getSite(string)
		* Return the name of the site, or 'other' if the site is not supported
		*/
		function getSite() {
			let url = document.URL;
			for (let site in sites) {
				if (sites.hasOwnProperty(site)) {
					if (url.includes(sites[site])) {
						return sites[site];
					}
				}
			}
			return "other";
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
			Object.getOwnPropertyNames(sites).forEach(function(val) {
				if (document.URL.includes(val)) {
					g_siteSuspended = !sites[val];
				}
			});
		}

		function loadedHdl() {
			logDebug("site loaded/reloaded");
		}

	}();
