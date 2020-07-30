import {UIEventSource} from "./UI/UIEventSource";
import {UIElement} from "./UI/UIElement";
import {QueryParameters} from "./Logic/QueryParameters";
import {LocalStorageSource} from "./Logic/LocalStorageSource";
import {Layout} from "./Customizations/Layout";
import {Utils} from "./Utils";
import {LayerDefinition} from "./Customizations/LayerDefinition";
import {ElementStorage} from "./Logic/ElementStorage";
import {Changes} from "./Logic/Osm/Changes";
import {Basemap} from "./Logic/Leaflet/Basemap";
import {OsmConnection} from "./Logic/Osm/OsmConnection";

/**
 * Contains the global state: a bunch of UI-event sources
 */

export class State {

    // The singleton of the global state
    public static state: State;


    /**
     THe layout to use
     */
    public readonly layoutToUse = new UIEventSource<Layout>(undefined);

    /**
     The mapping from id -> UIEventSource<properties>
     */
    public allElements: ElementStorage;
    /**
     THe change handler
     */
    public changes: Changes;
    /**
     THe basemap with leaflet instance
     */
    public bm: Basemap;
    /**
     The user crednetials
     */
    public osmConnection: OsmConnection;

    /**
     *  The message that should be shown at the center of the screen
     */
    public readonly centerMessage = new UIEventSource<string>("");

    /**
     * The countdown: if set to e.g. ten, it'll start counting down. When reaching zero, changes will be saved. NB: this is implemented later, not in the eventSource
     */
    public readonly secondsTillChangesAreSaved = new UIEventSource<number>(0);


    /**
     This message is shown full screen on mobile devices
     */
    public readonly fullScreenMessage = new UIEventSource<UIElement>(undefined);

    /**
     The latest element that was selected - used to generate the right UI at the right place
     */
    public readonly selectedElement = new UIEventSource<{ feature: any }>(undefined);

    public readonly zoom = QueryParameters.GetQueryParameter("z", undefined)
        .syncWith(LocalStorageSource.Get("zoom"));
    public readonly lat = QueryParameters.GetQueryParameter("lat", undefined)
        .syncWith(LocalStorageSource.Get("lat"));
    public readonly lon = QueryParameters.GetQueryParameter("lon", undefined)
        .syncWith(LocalStorageSource.Get("lon"));


    public readonly featureSwitchUserbadge: UIEventSource<boolean>;
    public readonly featureSwitchSearch: UIEventSource<boolean>;
    public readonly featureSwitchLayers: UIEventSource<boolean>;
    public readonly featureSwitchAddNew: UIEventSource<boolean>;
    public readonly featureSwitchWelcomeMessage: UIEventSource<boolean>;
    public readonly featureSwitchIframe: UIEventSource<boolean>;


    /**
     * The map location: currently centered lat, lon and zoom
     */
    public readonly locationControl = new UIEventSource<{ lat: number, lon: number, zoom: number }>(undefined);

    /**
     * The location as delivered by the GPS
     */
    public currentGPSLocation: UIEventSource<{
        latlng: number,
        accuracy: number
    }> = new UIEventSource<{ latlng: number, accuracy: number }>(undefined);

    // After this many milliseconds without changes, saves are sent of to OSM
    public readonly saveTimeout = new UIEventSource<number>(30 * 1000);


    constructor(layoutToUse: Layout) {
        this.layoutToUse = new UIEventSource<Layout>(layoutToUse);
        this.locationControl = new UIEventSource<{ lat: number, lon: number, zoom: number }>({
            zoom: Utils.asFloat(this.zoom.data) ?? layoutToUse.startzoom,
            lat: Utils.asFloat(this.lat.data) ?? layoutToUse.startLat,
            lon: Utils.asFloat(this.lon.data) ?? layoutToUse.startLon
        }).addCallback((latlonz) => {
            this.zoom.setData(latlonz.zoom.toString());
            this.lat.setData(latlonz.lat.toString().substr(0, 6));
            this.lon.setData(latlonz.lon.toString().substr(0, 6));
        })


        const self = this;

        function featSw(key: string, deflt: (layout: Layout) => boolean): UIEventSource<boolean> {
            const queryParameterSource = QueryParameters.GetQueryParameter(key, undefined);
            // I'm so sorry about someone trying to decipher this
            
            // It takes the current layout, extracts the default value for this query paramter. A query parameter event source is then retreived and flattened
            return UIEventSource.flatten(
                self.layoutToUse.map((layout) =>
                    QueryParameters.GetQueryParameter(key, "" + deflt(layout)).map((str) => str === undefined ? deflt(layout) : str !== "false")), [queryParameterSource]);
        }


        this.featureSwitchUserbadge = featSw("fs-userbadge", (layoutToUse) => layoutToUse?.enableUserBadge);
        this.featureSwitchSearch = featSw("fs-search", (layoutToUse) => layoutToUse?.enableSearch);
        this.featureSwitchLayers = featSw("fs-layers", (layoutToUse) => layoutToUse?.enableLayers);
        this.featureSwitchAddNew = featSw("fs-add-new", (layoutToUse) => layoutToUse?.enableAdd);
        this.featureSwitchWelcomeMessage = featSw("fs-welcome-message", () => true);
        this.featureSwitchIframe = featSw("fs-iframe", () => false);


    }
}