// options script
(function() {
	var z_description = "Customize your censoring";
	var z_version     = "v1.0";
	var z_explanation = "Set your filter keywords, separated by whitespace. All search results that lead to a blacklisted domain will be hidden."

	// add listsners.
	// need three listeners instead of one, because i don't want the button inside the form.
	// need to manually 'disable' the default action of form-submit -> reloads page, which is unnecessary.
	document.addEventListener("DOMContentLoaded", restoreOptions);
	document.getElementById("applybutton").addEventListener("click", saveOptions);
	document.querySelector("form").addEventListener('submit', function(e) {e.preventDefault();});

	getVersion();

	/*
	* Helper to store new settings
	*/
	function fetchSettings(result) {
		return new Promise((resolve,reject) => {
			var newsites = result.sites;
			try {
				Object.getOwnPropertyNames(result.sites)
				.forEach(function(val) {
					newsites[val] = document.getElementById(val).checked;
				});
			} catch(e) {
				reject("error fetching values");
			}
			resolve(newsites);
		});
	}

	/*
	* Get current addon version from manifest.json
	*/
	function getVersion() {
		var man = browser.runtime.getManifest();
		if (man.hasOwnProperty("version")) {
			z_version = `v${man.version}`;
		}
	}

	/*
	* Store options from settings page
	*/
	function saveOptions(e) {
		e.preventDefault();
		// check if any sites have been enabled/disabled
		var newSites = browser.storage.local.get("sites");
		newSites.then(fetchSettings, onError).then(function(result) {
			return new Promise((resolve, reject) => {
				var filter_result = document.getElementById("filter").value.replace(/^\s+/g, '').replace(/(\s)+/g, '$1');
				browser.storage.local.set({
					filter:   filter_result,
					sites:    result
				}).then(function(){resolve("yay");}, function(){reject("Failed to store data");});});
			}, onError).then(restoreOptions, onError);
		}

		/*
		* Apply current options to settings page
		*/
		function restoreOptions() {

			function setupSettingsPage(result) {
				var buttons = document.getElementById("sitebuttons");
				Object.getOwnPropertyNames(result.sites).forEach(function(val) {
					if (buttons.querySelector(`input[id="${val}"]`) != null) {
						// just update value in case the checkbox already exists
						buttons.querySelector(`input[id="${val}"]`).checked = result.sites[val];
					} else {
						// add a checkbox for each supported site
						var elem = document.createElement("div");
						var chkbox = document.createElement("input");
						chkbox.type = "checkbox";
						chkbox.id = val;
						chkbox.checked = result.sites[val];
						var label = document.createElement("label");
						label.htmlFor = val;
						label.appendChild(document.createTextNode(`Enable on ${val}`));
						elem.appendChild(chkbox);
						elem.appendChild(label);
						buttons.appendChild(elem);
					}
				});

				// create entry field for filter rules and pre-fill w/ current setting
				var entry_div = document.getElementById("filter_entry");
				if (entry_div.querySelector('input[id="filter"]') != null) {
					// just update
					entry_div.querySelector('input[id="filter"]').value = result.filter;
				} else {
					var entry = document.createElement("input");
					entry.type  = "text";
					entry.id    = "filter";
					entry.value = result.filter;

					var entry_label = document.createElement("label");
					entry_label.htmlFor = entry.id;
					entry_label.innerHTML = "Filter Keywords";

					var entry_tip = document.createElement("p");
					entry_tip.appendChild(document.createTextNode(z_explanation));

					entry_div.appendChild(entry);
					entry_div.appendChild(entry_label);
					entry_div.appendChild(entry_tip);
				}

				document.getElementById("apptext").textContent    = z_description;
				document.getElementById("appversion").textContent = z_version;
			}

			let getting = browser.storage.local.get(["sites", "filter"]);
			getting.then(setupSettingsPage, onError);
		}

		function onError(error) {
			console.log(`Error: ${error}`);
		}

	})();
