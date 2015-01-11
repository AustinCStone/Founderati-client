/**
 * Provides profile page
 * @jsx m
 */

var PopupLabel = require('common/ui-core/popup-label');
var ContactCard = require('profile/contact-card');
var Editable = require('common/form-builder').inputs.editable;
var EntityList = require('profile/entity-list');
var Error = require('common/error');
var InfoSegment = require('profile/info-segment');
var User = require('model/user');
var UserDetails = require('model/user-details');
var UserEdges = require('model/user-edges');
var ImageModel = require('model/image');
var StreamCommon = require('common/stream-common');
var Context = require('common/context');
var ModalMixin = require('common/modal-mixin');
var ConnectWith = require('profile/connect-with');

var profile = {};

profile.vm = {
	init: function () {
		this.userid =
		userid = m.route.param('userid');

		this.basicInfo = null;
		this.contactCard = null;
		this.infoSegments = [];
		this.editing = m.prop(false);

		profile.stream = null;

		function handleLoadUser(response) {
			profile.vm.basicInfo = response;
			profile.vm.contactCard = new ContactCard(profile.vm.basicInfo, userid == 'me');
			profile.vm.connectWithModal = new ModalMixin(new ConnectWith(profile.vm.basicInfo));
			profile.stream = Bacon.mergeAll(profile.vm.contactCard.vm.profilePicture.stream, profile.vm.connectWithModal.vm.body.stream);
			StreamCommon.on(profile.stream,
				'EditableImage::ReplaceImageURL',
				function (message) {
					var basicInfo = profile.vm.basicInfo;
					if (basicInfo().picture()) {
						ImageModel.deleteImage(basicInfo().picture());
					}
					basicInfo().picture(message.parameters.imageID);
					User.updatePicture(userid, basicInfo().picture());
				}
			);
		}

		// we might already have the data
		if (userid === 'me') {
			Context.getCurrentUser().then(handleLoadUser); // Use Auth's singleton prop
		} else {
			User.getByID(userid).then(function(userObject) {
				handleLoadUser(m.prop(userObject)); // Make a new prop
			}, Error.handle);
		}

		this.details = [];
		UserDetails.getByID(userid).then(
			function(response) {
				profile.vm.details = response;
				profile.vm.infoSegments = profile.vm.details.map(function(entry) {
					return new InfoSegment(entry, profile.vm.userid == 'me', userid);
				});

			}, Error.handle);

		this.edges = null;
		UserEdges.getByID(userid).then(
			function(response) {
				profile.vm.edges = response;
			}, Error.handle);
	}
};

// Serves as both request and confirmation
profile.connectMe = function(isConfirmation) {
	return function() {
		UserEdges.connectMe(m.route.param('userid')).then(
			function () {
				if (isConfirmation) {
					profile.vm.basicInfo().connectionType('c'); // Connected
					// TODO: push to this user's connections in local model
				} else {
					profile.vm.basicInfo().connectionType('s'); // Sent
				}
			},
			function () {
				console.log('failed to connect');
			}
		);
	};
};

profile.deleteConnection = function() {
	UserEdges.deleteConnection(m.route.param('userid')).then(
		function () {
			profile.vm.basicInfo().connectionType(''); // Not connected/NA
		},
		function () {
			console.log('failed to delete');
		}
	);
};

profile.connectDialog = function(otherUserID) {
	profile.vm.connectWithModal.vm.open();
	StreamCommon.on(profile.stream, 'ConnectWithModal::Connect', profile.connectMe());

	//listen to input from the modal. An input of 'ConnectWithModal::NoConnect' means the user clicked the the button on
	//the modal to close the window without connecting.
	//StreamCommon.on(profile.stream, 'ConnectWithModal::NoConnect', function() {});
};

profile.saveDetail = function() {
	User.putByID(
		profile.vm.userid,
		{ description: profile.vm.basicInfo().description() }
	)
	.then(function() {
		profile.vm.editing(false);
	});
};

profile.controller = function () {
	profile.vm.init();
};

profile.view = function () {
	var vm = profile.vm;
	var basicInfo = profile.vm.basicInfo();

	var segments = vm.infoSegments.map(function(infoSegment) {
		return infoSegment.view({});
	});

	var associations = null;

	var university_insignia = (basicInfo.university() === 'University of Texas') ? 
		<img src="/img/bevo_icon.jpg" id="bevo_icon" />
		: null;

	var connectionButtons = null;

	// Connected
	if (basicInfo.connectionType() == 'c') {
		connectionButtons =	(
			<div className="ui buttons right floated">
				<div className="ui icon positive button"
					data-variation="inverted"
					data-content="Connected"
					data-position="bottom center"
					config={PopupLabel}>
					<i className="share alternate icon"></i>
				</div>

				<a className="ui button blue"
					href={'mailto:' + basicInfo.email()}>
					<i className="mail icon"></i>Mail
				</a>
			</div>
		);

	// Sent
	} else if (basicInfo.connectionType() == 's') {
		connectionButtons =	(
			<div className="ui positive disabled button right floated">
				<i className="share alternate icon"></i>
				Request Sent
			</div>
		);
	// pending approval
	} else if (basicInfo.connectionType() == 'pa') {
		connectionButtons =	(
			<div className="ui buttons right floated">
				<div className="ui negative icon button" onclick={profile.deleteConnection}
					data-variation="inverted"
					data-content="Dismiss request"
					data-position="bottom center"
					config={PopupLabel}>
					<i className="remove icon"></i>
				</div>
				<div className="ui positive button" onclick={profile.connectMe(true)}
					data-variation="inverted"
					data-content="Approve request"
					data-position="bottom center"
					config={PopupLabel}>
					<i className="checkmark icon"></i>
					Add
				</div>
			</div>
		);
	// not connected/other
	} else {
		connectionButtons =	(
			<div className="ui positive button right floated" onclick={profile.connectDialog}>
				{vm.connectWithModal.view()}
				<i className="share alternate icon"></i>
				Connect
			</div>
		);
	}


	var university_info = null;
	if (basicInfo.university()) {
		university_info = (
			<div>
				{university_insignia}
				<h5 className="university-title header"><i>
					{basicInfo.university()} class of &#39;
					{basicInfo.graduationYear() % 1000}
					<br/>
					{basicInfo.major()}
				</i></h5>
			</div>
		);
	}

	var description = profile.vm.editing() ?
		<div className="description"
			data-type="textarea"
			config={Editable(basicInfo.description, {
				placeholder: 'Add a description of yourself',
				showbuttons: false,
				rows: 3,
				onblur: 'submit'
		})}>
			{basicInfo.description()}
		</div> :
		<div className="description">
			{basicInfo.description()}
		</div>;

	var connections = new EntityList(
		'Connections',
		'/profile',
		 profile.vm.edges.connections(),
		 User
	);

	var editButton = null;
	if (profile.vm.userid == 'me') {
		if (profile.vm.editing()) {
			editButton = (
				<div>
					<div className="mini ui buttons">
						<div className="ui blue button" onclick={profile.saveDetail}>
							Save
						</div>
						<div className="ui red button"
							onclick={function() {profile.vm.editing(false)} }>
							Discard
						</div>
					</div>
					<div className="ui hidden divider"></div>
				</div>

			);
		} else {
			editButton = (
				<div>
					<div className="mini ui blue button"
						onclick={function() {profile.vm.editing(true)} }>
						Edit
					</div>
					<div className="ui hidden divider"></div>
				</div>
			);
		}
	}

	return (
		<div className="ui padded stackable grid">
			<div className="row">
				<div className="four wide column">
					{vm.contactCard.view({})}
				</div>
				<div className="eight wide column">
					<h1 className="ui header">
						{User.getName(basicInfo)}
						{connectionButtons}
					</h1>
					{editButton}

					{university_info}
					{description}
					{segments}
				</div>
				<div className="four wide column">
					{connections.view({})}
				</div>
			</div>
		</div>
	);
};

module.exports = profile;
