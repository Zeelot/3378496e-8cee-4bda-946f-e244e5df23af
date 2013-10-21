/**
 * So I'm very aware that this is WAY over complicated for the size of this
 * challenge. I chose to use BackBone to show an example of modular code but
 * left out a few libraries that help manage large amounts of files in larger
 * projects (like RequireJS and Marionette) just to keep things a bit simpler.
 *
 * If I had some more time, I would have made a more complete example without so
 * much boilerplate code. On real projects, here's my preferred front-end stack:
 *
 *  - jQuery     : Everyone knows it already and it works well with frameworks
 *                 like Backbone.js.
 *
 *  - Backbone   : Love how simple this framework is and how easy it is to
 *                 understand the internals.
 *
 *  - Marionette : Removes a lot of the repetitive tasks in Backbone without
 *                 complicating things.
 *
 *  - Require    : Nice AMD module loader for managing js dependencies. Helps a
 *                 lot on large projects with many files.
 *
 *  - Hogan      : Simple Mustache (templates) renderer.
 */
(function ($, Backbone, _, Hogan) {
	"use strict";

	/**
	 * A simple object that compiles the mustache templates and gives us a simpler
	 * way to access them.
	 */
	var templates = new function () {
		var cache = {};

		$('.template').each(function (i, el) {
			var $el = $(el);
			cache[$el.data('name')] = Hogan.compile($el.html());
		});

		return {
			get: function (name) {
				return cache[name];
			}
		};
	};

	/**
	 * The PageView class knows about the entire page. The purpose is for it to
	 * render the needed subclasses and pass around the needed shared collections.
	 *
	 * Generally, sub-views don't know much about each other but have communication
	 * channels like collections in order for all of the views to be aware of when
	 * something changes.
	 */
	var PageView = Backbone.View.extend({
		el: "body",
		siteModel: null,
		domainSearchView: null,
		siteDataView: null,
		initialize: function (options) {
			this.siteModel = new SiteModel();
			this.domainSearchView = new DomainSearchView({
				el: this.$(".form-container"),
				siteModel: this.siteModel
			});
			this.siteDataView = new SiteDataView({
				el: this.$(".site-data"),
				siteModel: this.siteModel
			});
			this.relatedLinksView = new RelatedLinksView({
				el: this.$(".related-links"),
				siteModel: this.siteModel
			});
		}
	});

	/**
	 * A simple view that listens for the form to be submitted and updates the model.
	 */
	var DomainSearchView = Backbone.View.extend({
		siteModel: null,
		$input: null,
		events: {
			"submit form": "onFormSubmit"
		},
		initialize: function (options) {
			this.siteModel = options.siteModel;
			// Cache the input element so we can get the value quickly on submit.
			this.$input = this.$("input");
		},
		onFormSubmit: function (e) {
			// We don't want the default form behavior.
			e.preventDefault();

			this.siteModel.set("url", this.$input.val());
		}
	});

	var SiteDataView = Backbone.View.extend({
		siteModel: null,
		$data: null,
		initialize: function (options) {
			this.siteModel = options.siteModel;

			this.$data = this.$('.data');

			this.listenTo(this.siteModel, "change", this.onSiteChange);
			this.listenTo(this.siteModel, "update:siteData", this.onSiteDataChange);
		},
		onSiteChange: function () {
			this.$data.empty();
			this.siteModel.fetchSiteData();
			this.siteModel.fetchRelatedLinks();
		},
		onSiteDataChange: function () {
			this.render();
		},
		render: function () {
			this.siteModel.siteDataCollection.each(_.bind(this.renderSiteDataModel, this));
		},
		renderSiteDataModel: function (siteDataModel) {
			this.$data.append(templates.get("siteData/item").render(siteDataModel.toJSON()));
		}
	});

	var RelatedLinksView = Backbone.View.extend({
		siteModel: null,
		$list: null,
		initialize: function (options) {
			this.siteModel = options.siteModel;
			this.$list = this.$('.list');

			this.listenTo(this.siteModel, "update:relatedLinks", this.onRelatedLinksChange);
		},
		onRelatedLinksChange: function () {
			this.render();
		},
		render: function () {
			this.siteModel.relatedLinksCollection.each(_.bind(this.renderRelatedLinkModel, this));
		},
		renderRelatedLinkModel: function (relatedLinkModel) {
			this.$list.append(templates.get("relatedLink/item").render(relatedLinkModel.toJSON()));
		}
	});

	/**
	 * A SiteModel holds the url for the data we are fetching and contains a few
	 * functions that populate the other data.
	 */
	var SiteModel = Backbone.Model.extend({
		defaults: {
			url: null
		},
		siteDataCollection: null,
		relatedLinksCollection: null,
		siteDataApiUrl: "http://localhost:8081/simple-proxy.php",
		lastFetchedSiteDataUrl: null,
		lastFetchedRelatedSitesUrl: null,
		initialize: function () {
			this.siteDataCollection = new SiteDataCollection();
			this.relatedLinksCollection = new RelatedLinksCollection();
		},
		fetchSiteData: function () {
			if (this.lastFetchedSiteDataUrl === this.get("url")) {
				return; // No need to do it again.
			}

			this.lastFetchedSiteDataUrl = this.get("url");

			// Clear the current siteDataCollection.
			this.siteDataCollection.reset();

			$.get(this.siteDataApiUrl, {
				dat: "s",
				cli: 10,
				url: this.get("url")
			}).done(_.bind(this.onFetchedSiteData, this));
		},
		onFetchedSiteData: function (xml) {
			// Find all the elements inside <SD> elements.
			var $sd = $("SD > *", xml);

			// Turn each one into a model instance.
			$sd.each(_.bind(this.buildSiteDataModelFromElement, this));

			// Fire an event so the views can update.
			this.trigger("update:siteData", this);
		},
		buildSiteDataModelFromElement: function (i, el) {
			var $el = $(el);
			var tagName = $el.prop("tagName");
			var model = new SiteDataModel({
				name: tagName
			});
			var x;

			for (x = 0; x < el.attributes.length; x++) {
				model.get("details").push({
					name: el.attributes[x].name,
					value: el.attributes[x].value
				});
			}

			this.siteDataCollection.add(model);
		},
		fetchRelatedLinks: function () {
			if (this.lastFetchedRelatedSitesUrl === this.get("url")) {
				return; // No need to do it again.
			}

			this.lastFetchedRelatedSitesUrl = this.get("url");

			// Clear the current siteDataCollection.
			this.relatedLinksCollection.reset();

			$.get(this.siteDataApiUrl, {
				dat: "n",
				cli: 10,
				url: this.get("url")
			}).done(_.bind(this.onFetchedRelatedLinks, this));
		},
		onFetchedRelatedLinks: function (xml) {
			// Find all the elements inside <SD> elements.
			var $sd = $("RLS > *", xml);

			console.log(xml);

			// Turn each one into a model instance.
			$sd.each(_.bind(this.buildRelatedLinkModelFromElement, this));

			// Fire an event so the views can update.
			this.trigger("update:relatedLinks", this);
			console.log("fired");
		},
		buildRelatedLinkModelFromElement: function (i, el) {
			var $el = $(el);
			var model = new RelatedLinkModel({
				title: $el.attr("TITLE"),
				href: $el.attr("HREF")
			});

			this.relatedLinksCollection.add(model);
			console.log('added', model);
		},
	});

	var SiteDataModel = Backbone.Model.extend({
		defaults: {
			name: null,
			details: null
		},
		initialize: function () {
			this.set("details", []);
		}
	});

	var RelatedLinkModel = Backbone.Model.extend({
		defaults: {
			'title': null,
			'href': null
		}
	});

	var SiteDataCollection = Backbone.Collection.extend({});
	var RelatedLinksCollection = Backbone.Collection.extend({});

	$(function () {
		// Just using this since I can't easily set up a router without a web server.
		var theView = new PageView();
	});
}(window.jQuery, window.Backbone, window._, window.Hogan))
