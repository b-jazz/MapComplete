import {UIElement} from "../UIElement";
import {ImageSearcher} from "../../Logic/ImageSearcher";
import {SlideShow} from "../SlideShow";
import {FixedUiElement} from "../Base/FixedUiElement";
import {VariableUiElement} from "../Base/VariableUIElement";
import {UIEventSource} from "../../Logic/UIEventSource";
import {
    Dependencies,
    TagDependantUIElement,
    TagDependantUIElementConstructor
} from "../../Customizations/UIElementConstructor";
import {State} from "../../State";
import Translation from "../i18n/Translation";
import {CheckBox} from "../Input/CheckBox";
import Combine from "../Base/Combine";
import {OsmConnection} from "../../Logic/Osm/OsmConnection";
import Translations from "../i18n/Translations";

export class ImageCarouselConstructor implements TagDependantUIElementConstructor {
    IsKnown(properties: any): boolean {
        return true;
    }

    IsQuestioning(properties: any): boolean {
        return false;
    }

    Priority(): number {
        return 0;
    }

    construct(dependencies: Dependencies): TagDependantUIElement {
        return new ImageCarousel(dependencies.tags);
    }

    GetContent(tags: any): Translation {
        return new Translation({"en":"Images without upload"});
    }

}

export class ImageCarousel extends TagDependantUIElement {


    private readonly searcher: ImageSearcher;

    public readonly slideshow: SlideShow;

    private readonly _uiElements: UIEventSource<UIElement[]>;

    private readonly _deleteButton: UIElement;

    constructor(tags: UIEventSource<any>, osmConnection: OsmConnection = undefined) {
        super(tags);

        const self = this;
        osmConnection = osmConnection ?? State.state?.osmConnection;
        this.searcher = new ImageSearcher(tags);

        this._uiElements = this.searcher.map((imageURLS: string[]) => {
            const uiElements: UIElement[] = [];
            for (const url of imageURLS) {
                const image = ImageSearcher.CreateImageElement(url);
                uiElements.push(image);
            }
            return uiElements;
        });

        this.slideshow = new SlideShow(
            this._uiElements,
            new FixedUiElement("")).HideOnEmpty(true);


        const showDeleteButton = this.slideshow._currentSlide.map((i: number) => {
            if (!osmConnection?.userDetails?.data?.loggedIn) {
                return false;
            }
            return self.searcher.IsDeletable(self.searcher.data[i]);
        }, [this.searcher, osmConnection?.userDetails]);

        const isDeleted: UIEventSource<boolean> = this.slideshow._currentSlide.map((i: number) => {
            return self.searcher._deletedImages.data.indexOf(self.searcher.data[i]) >= 0;
        }, [this.searcher, this.searcher._deletedImages]);

        this.slideshow._currentSlide.addCallback(() => {
            showDeleteButton.ping(); // This pings the showDeleteButton, which indicates that it has to hide it's subbuttons
        })


        const deleteCurrent = () => {
            self.searcher.Delete(self.searcher.data[self.slideshow._currentSlide.data]);
        }


        const style = ";padding:0.4em;height:2em;padding: 0.4em; font-weight:bold;";
        const backButton = Translations.t.image.dontDelete
            .SetStyle("background:black;border-radius:0.4em 0.4em 0 0" + style)

        const deleteButton = Translations.t.image.doDelete
            .SetStyle("background:#ff8c8c;border-radius:0 0 0.4em 0.4em" + style)
            .onClick(deleteCurrent);

        const deleteButtonCheckbox = new CheckBox(
            new Combine([
                backButton,
                deleteButton]
            ).SetStyle("display:flex;" +
                "flex-direction:column;" +
                "background:black;" +
                "color:white;" +
                "border-radius:0.5em;" +
                "width:max-content;" +
                "height:min-content;"),
            new VariableUiElement(
                showDeleteButton.map(showDelete => {

                        if (isDeleted.data) {
                            return Translations.t.image.isDeleted
                                .SetStyle("display:block;" +
                                    "background-color: black;color:white;padding:0.4em;border-radius:0.4em").Render()
                        }
                        if (!showDelete) {
                            return "";
                        }
                        return new FixedUiElement("<img style='width:1.5em'  src='./assets/delete.svg'>")
                            .SetStyle("display:block;" +
                                "width: 1.5em;" +
                                "height: 1.5em;" +
                                "padding: 0.5em;" +
                                "border-radius: 3em;" +
                                "background-color: black;").Render();
                    }, [this.searcher._deletedImages, isDeleted]
                )));

        this._deleteButton = deleteButtonCheckbox;
        this._deleteButton.SetStyle(
            "position:absolute;display:block;top:1em;left:5em;z-index: 7000;width:min-content;height:min-content;"
        )
        this.slideshow._currentSlide.addCallback(() => {
            deleteButtonCheckbox.isEnabled.setData(false)
        })

        this.searcher._deletedImages.addCallback(() => {
            this.slideshow._currentSlide.ping();
        })


    }

    InnerRender(): string {
        return new Combine([
            this._deleteButton,
            this.slideshow
        ]).SetStyle("position:relative").Render();
    }

    IsKnown(): boolean {
        return true;
    }

    IsQuestioning(): boolean {
        return false;
    }
    
    IsSkipped(): boolean {
        return false;
    }

    Priority(): number {
        return 0;
    }


    Activate() {
        super.Activate();
        this.searcher.Activate();
        return this;
    }

}