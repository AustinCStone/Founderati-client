/**
 * Provides dashboard page
 * @jsx m
 */

var Context = require('common/context');
var DropdownMixin = require('common/dropdown-mixin');
var EndorserList = require('engagement/endorsements/endorser-list');
var EntityList = require('profile/entity-list');
var Error = require('common/error');
var HorizontalEntityListSegment = require('dashboard/horizontal-entity-list-segment');
var Invites = require('model/invites');
var InviteSegment = require('dashboard/invite-segment');
var StreamCommon = require('common/stream-common');
var User = require('model/user');
var UserEdges = require('model/user-edges');
var TrendingStartupsList = require('startups/trending/trending-startups-list');

var handlePlural = require('common/utils-general').handlePlural;

function twitterIntegration(element, isInitialized) {
	if (!isInitialized) {
		!function(d,s,id){
			var js, fjs = element, p = /^http:/.test(d.location) ? 'http' : 'https';
			if (!d.getElementById(id)) {
				js = d.createElement(s);
				js.id = id;
				js.src = p + "://platform.twitter.com/widgets.js";
				fjs.parentNode.insertBefore(js,fjs);
			}
		}(document,"script","twitter-wjs");
	}
}

var dashboard = {};

dashboard.vm = {
	init: function () {
		this.trendingStartupsList = TrendingStartupsList();
		this.inviteSegment = new InviteSegment();

		Invites.getInvites().then(function(response) {
			dashboard.vm.invites = response;
		});

		dashboard.vm.endorserList = EndorserList('me');

		Context.getCurrentUser().then(function(response) {
			dashboard.vm.basicInfo = response;
		});

		Context.getCurrentUserEdges().then(
			function(response) {
				dashboard.vm.edges = response;
				dashboard.vm.connectionsSegment = new HorizontalEntityListSegment(
					'Connections',
					'/profile',
					function() {
						return dashboard.vm.edges().connections();
					},
					User,
					{searchable: true}
				);
				dashboard.vm.pendingRequestsSegment = new HorizontalEntityListSegment(
					'Pending Requests',
					'/profile',
					function() {
						return dashboard.vm.edges().pendingConnections();
					},
					User,
					{showAll: true}
				);
			}, Error.handle);

		dashboard.stream = null;
		StreamCommon.on(Context.stream, 'Context::Edges', function (message) {}, true);
	}
};

dashboard.controller = function () {
	dashboard.vm.init();
};

dashboard.view = function () {
	var vm = dashboard.vm;

	var basicInfo = dashboard.vm.basicInfo();
	
	var numPendingRequests = [];
	var numConnections = 0;
	var suggestedConnections = [];

	if (vm.edges) {
		numPendingRequests = vm.edges().pendingConnections().length;
		numConnections = vm.edges().connections().length;
		suggestedConnections = vm.edges().suggestedConnections();
	}

	var endorserListSegment = (
		<div className="ui segment">
			<div className="ui header">Endorsements</div>
			<div className="ui divider"></div>
				{ vm.endorserList.view({}) }
		</div>
	);

	var suggestedConnectionsSegment = new EntityList('Suggested Connections', suggestedConnections, { inSegment: true });

	return (
		<div className="ui stackable padded grid">
			<div className="row">
				<div className="five wide column">
					<div className="ui stackable grid">
						<div class="row">
							<div class="sixteen wide column">
								{ vm.trendingStartupsList.view() }
								{ suggestedConnectionsSegment.view() }
							</div>
						</div>
					</div>
				</div>
				<div className="eleven wide column">
					<div className="ui stackable grid">
						<div className="row">
							<div className="sixteen wide column">
								<div className="ui segment dashboard-header">
									<div className="ui grid">
										<div className="row">
											<div className="six wide column">
												<div className="ui header">
													Howdy, {basicInfo.firstName()}!
												</div>
												Looks like you're new to the site!
												You're going to want to fill out your profile with your
												avid interests, proudest moments, and best skills.
												<div className="ui bulleted list">
													<a href="/profile/me" config={m.route} className="item">Update my profile</a>
												</div>
											</div>
											<div className="twelve wide computer tablet only column"></div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="row">
							<div className="ten wide column">
								<div className="ui segment">
									<h4 className="ui left floated header">Today</h4>
									<div className="ui statistic">
										<div className="value">{numPendingRequests}</div>
										<div className="label">
											<div className="ui list">
												<a href="#pending-requests" className="item">
													{handlePlural('Pending Request', numPendingRequests)}
												</a>
											</div>
										</div>
									</div>
									<div className="ui statistic">
										<div className="value">{numConnections}</div>
										<div className="label">
											<div className="ui list">
												<a href="#connections" className="item">
													{handlePlural('Connection', numConnections)}
												</a>
											</div>
										</div>
									</div>
									<div className="ui statistic">
										<div className="value">{vm.endorserList.getCount()}</div>
										<div className="label">
											<div className="ui list">
												<a className="item">
													{handlePlural('Endorsement', vm.endorserList.getCount() )}
												</a>
											</div>
										</div>
									</div>
								</div>
								<div className="ui segment">
									<h4 className="ui header">Browse</h4>
									<div className="ui content">
										<div className="3 fluid ui orange buttons">
											<a href="/search?query_string=Startupper" config={m.route} className="ui button">
												Startuppers
											</a>
											<a href="/search?query_string=Founder" config={m.route} className="ui button">
												Founders
											</a>
											<a href="/search?query_string=Investor" config={m.route} className="ui button">
												Investors
											</a>
										</div>
									</div>
								</div>
								<div className="ui segment">
									<h4 className="ui header">Actions</h4>
									<div className="ui content">
										<div className="ui bulleted list">
											<a className="item">Find someone</a>
											<a href="/profile/me" config={m.route} className="item">Update my profile</a>
										</div>
									</div>
								</div>
								<div id="pending-requests"></div>
								{ dashboard.vm.pendingRequestsSegment && dashboard.vm.edges().pendingConnections().length ?
									dashboard.vm.pendingRequestsSegment.view({}) : null }
								<div id="connections"></div>
								{ dashboard.vm.connectionsSegment ?
									dashboard.vm.connectionsSegment.view({}) : null }
								{ dashboard.vm.inviteSegment.view({ invites: dashboard.vm.invites.invites }) }
								{ endorserListSegment }
							</div>
							<div className="six wide tablet computer only column" config={twitterIntegration}>
								<a className="twitter-timeline" href="https://twitter.com/search?q=austin%20startup" data-widget-id="555318512722272256">Tweets about austin startup</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};


module.exports = dashboard;
