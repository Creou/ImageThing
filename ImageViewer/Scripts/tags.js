var TagModule;
(function (TagModule) {
    var PropertyItem = (function () {
        function PropertyItem() {
        }
        return PropertyItem;
    })();
    TagModule.PropertyItem = PropertyItem;
    var TagValue = (function () {
        function TagValue(value) {
            this.value = value;
            this.enabled = ko.observable(true);
        }
        return TagValue;
    })();
    TagModule.TagValue = TagValue;
    var rawTagType = (function () {
        function rawTagType() {
        }
        return rawTagType;
    })();
    TagModule.rawTagType = rawTagType;
    var TagType = (function () {
        function TagType(rawTag) {
            this.name = rawTag.Name;
            this.id = rawTag.Id;
            this.enabled = ko.observable(true);
            this.values = rawTag.Values ? $.map(rawTag.Values, function (value) {
                return new TagValue(value);
            }) : [];
        }
        return TagType;
    })();
    TagModule.TagType = TagType;
    var ImageTagViewModel = (function () {
        function ImageTagViewModel() {
            var _this = this;
            this.tagTypes = ko.observableArray([]);
            $.getJSON("/api/TagTypes", function (rawTypes) {
                var types = $.map(rawTypes, function (rawType) {
                    return new TagType(rawType);
                });
                _this.tagTypes(types);
            });
        }
        return ImageTagViewModel;
    })();
    TagModule.ImageTagViewModel = ImageTagViewModel;
})(TagModule || (TagModule = {}));
//# sourceMappingURL=tags.js.map