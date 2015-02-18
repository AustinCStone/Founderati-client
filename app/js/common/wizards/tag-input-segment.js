var Tagger = require('common/ui-core/tagger');

var TagInputSegment = function (props) {
	var tagInputSegment = {};

	var vm = {
		tagger: Tagger({ maxCount: props.maxCount })
	};

	tagInputSegment.view = function () {
		return [
			m('div.ui.segment', [
				m('a.ui.ribbon.label', props.ribbonLabel),
				m('div.ui.hidden.divider'),
				vm.tagger.view({ selectedTags: props.tagState, placeholder: props.placeholder})
			])
		];
	};
	return tagInputSegment;
};

module.exports = TagInputSegment;
