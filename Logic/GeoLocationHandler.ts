import {Basemap} from "./Basemap";
import {UIEventSource} from "../UI/UIEventSource";
import {UIElement} from "../UI/UIElement";
import L from "leaflet";

export class GeoLocationHandler extends UIElement {

    currentLocation: UIEventSource<{
        latlng: number,
        accuracy: number
    }> = new UIEventSource<{ latlng: number, accuracy: number }>(undefined);

    private _isActive: UIEventSource<boolean> = new UIEventSource<boolean>(false);

    private _map: Basemap;
    private _marker: any;

    constructor(map: Basemap) {
        super(undefined);
        this._map = map;
        this.ListenTo(this.currentLocation);
        this.ListenTo(this._isActive);

        const self = this;


        function onAccuratePositionProgress(e) {
            console.log(e.accuracy);
            console.log(e.latlng);
        }

        function onAccuratePositionFound(e) {
            console.log(e.accuracy);
            console.log(e.latlng);
            self.currentLocation.setData({latlng: e.latlng, accuracy: e.accuracy});
        }

        function onAccuratePositionError(e) {
            console.log("onerror", e.message);
           
        }

        map.map.on('accuratepositionprogress', onAccuratePositionProgress);
        map.map.on('accuratepositionfound', onAccuratePositionFound);
        map.map.on('accuratepositionerror', onAccuratePositionError);


        const icon = L.icon(
            {
                iconUrl: './assets/crosshair-blue.svg',
                iconSize: [40, 40], // size of the icon
                iconAnchor: [20, 20], // point of the icon which will correspond to marker's location
            })

        this.currentLocation.addCallback((location) => {
            const newMarker = L.marker(location.latlng, {icon: icon});
            newMarker.addTo(map.map);

            if (self._marker !== undefined) {
                map.map.removeLayer(self._marker);
            }
            self._marker = newMarker;
        });

        navigator.permissions.query({ name: 'geolocation' })
            .then(function(){self.StartGeolocating()});

    }

    protected InnerRender(): string {
        if (this.currentLocation.data) {
            return "<img src='./assets/crosshair-blue.svg' alt='locate me'>";
        }
        if (this._isActive.data) {
            return "<img src='./assets/crosshair-blue-center.svg' alt='locate me'>";
        }

        return "<img src='./assets/crosshair.svg' alt='locate me'>";
    }

    
    private StartGeolocating(){
        const self = this;
        if (self.currentLocation.data !== undefined) {
            self._map.map.flyTo(self.currentLocation.data.latlng, 18);
            return;
        }

        self._isActive.setData(true);

        console.log("Searching location using GPS")
        self._map.map.findAccuratePosition({
            maxWait: 15000, // defaults to 10000
            desiredAccuracy: 30 // defaults to 20
        });
    }
    
    InnerUpdate(htmlElement: HTMLElement) {
        super.InnerUpdate(htmlElement);

        const self = this;
        htmlElement.onclick = function () {
            self.StartGeolocating();
        }
    }

}