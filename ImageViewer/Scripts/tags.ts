
module TagModule {
	export class PropertyItem {

	}

	export class TagValue {
		enabled: KnockoutObservable<boolean>;
		constructor(public value: string) {
			this.enabled = ko.observable(true);
		}
	}

	export class rawTagType {
		Name: string;
		PropertyItem: PropertyItem;
		Id: number;
		Values: Array<string>;
	}

	export class TagType {
		name: string;
		id: number;
		values: Array<TagValue>;
		enabled: KnockoutObservable<boolean>;
		constructor(rawTag: rawTagType) {
			this.name = rawTag.Name;
			this.id = rawTag.Id;
			this.enabled = ko.observable(true);
			this.values = rawTag.Values ? $.map(rawTag.Values,(value) => {
				return new TagValue(value);
			}) : [];
		}
	}

	export class ImageTagViewModel {
		tagTypes: KnockoutObservableArray<TagType> = ko.observableArray<TagType>([]);

		constructor() {
			$.getJSON("/api/TagTypes",(rawTypes: Array<rawTagType>) => {
				var types = $.map(rawTypes,(rawType) => {
					return new TagType(rawType);
				});
				this.tagTypes(types);
			});
		}
	}
}

 