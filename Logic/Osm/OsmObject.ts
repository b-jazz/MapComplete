import * as $ from "jquery"
import {Utils} from "../../Utils";


export abstract class OsmObject {

    type: string;
    id: number;
    tags: {} = {};
    version: number;
    public changed: boolean = false;

    protected constructor(type: string, id: number) {
        this.id = id;
        this.type = type;
    }

    static DownloadObject(id, continuation: ((element: OsmObject) => void)) {
        const splitted = id.split("/");
        const type = splitted[0];
        const idN = splitted[1];
        
        const newContinuation = (element: OsmObject) => {
            
            console.log("Received: ",element);
            
            continuation(element);
        }
        
        switch (type) {
            case("node"):
                return new OsmNode(idN).Download(newContinuation);
            case("way"):
                return new OsmWay(idN).Download(newContinuation);
            case("relation"):
                return new OsmRelation(idN).Download(newContinuation);

        }
    }


    abstract SaveExtraData(element);


    /**
     * Generates the changeset-XML for tags
     * @constructor
     */
    TagsXML(): string {
        let tags = "";
        for (const key in this.tags) {
            const v = this.tags[key];
            if (v !== "") {
                tags += '        <tag k="' + Utils.EncodeXmlValue(key) + '" v="' + Utils.EncodeXmlValue(this.tags[key]) + '"/>\n'
            }
        }
        return tags;
    }


    Download(continuation: ((element: OsmObject) => void)) {
        const self = this;
        $.getJSON("https://www.openstreetmap.org/api/0.6/" + this.type + "/" + this.id,
            function (data) {
                const element = data.elements[0];
                self.tags = element.tags;
                self.version = element.version;
                self.SaveExtraData(element);
                continuation(self);
            }
        );
        return this;
    }

    public addTag(k: string, v: string): void {
        if (k in this.tags) {
            const oldV = this.tags[k];
            if (oldV == v) {
                return;
            }
            console.log("WARNING: overwriting ",oldV, " with ", v," for key ",k)
        }
        this.tags[k] = v;
        if(v === undefined || v === ""){
            delete this.tags[k];
        }
        this.changed = true;
    }

    protected VersionXML(){
        if(this.version === undefined){
            return "";
        }
        return 'version="'+this.version+'"';
    }
    abstract ChangesetXML(changesetId: string): string;



    public static DownloadAll(neededIds, knownElements: any = {}, continuation: ((knownObjects : any) => void)) {
        // local function which downloads all the objects one by one
        // this is one big loop, running one download, then rerunning the entire function
        if (neededIds.length == 0) {
            continuation(knownElements);
            return;
        }
        const neededId = neededIds.pop();

        if (neededId in knownElements) {
            OsmObject.DownloadAll(neededIds, knownElements, continuation);
            return;
        }

        console.log("Downloading ", neededId);
        OsmObject.DownloadObject(neededId,
            function (element) {
                knownElements[neededId] = element; // assign the element for later, continue downloading the next element
                OsmObject.DownloadAll(neededIds,knownElements, continuation);
            }
        );
    }
}


export class OsmNode extends OsmObject {

    lat: number;
    lon: number;

    constructor(id) {
        super("node", id);

    }

    ChangesetXML(changesetId: string): string {
        let tags = this.TagsXML();

        let change =
            '        <node id="' + this.id + '" changeset="' + changesetId + '" ' + this.VersionXML() + ' lat="' + this.lat + '" lon="' + this.lon + '">\n' +
            tags +
            '        </node>\n';

        return change;
    }

    SaveExtraData(element) {
        this.lat = element.lat;
        this.lon = element.lon;
    }
}

export class OsmWay extends OsmObject {

    nodes: number[];

    constructor(id) {
        super("way", id);

    }

    ChangesetXML(changesetId: string): string {
        let tags = this.TagsXML();
        let nds = "";
        for (const node in this.nodes) {
            nds += '      <nd ref="' + this.nodes[node] + '"/>\n';
        }

        let change =
            '    <way id="' + this.id + '" changeset="' + changesetId + '" ' + this.VersionXML() + '>\n' +
            nds +
            tags +
            '        </way>\n';

        return change;
    }

    SaveExtraData(element) {
        this.nodes = element.nodes;
    }
}

export class OsmRelation extends OsmObject {

    members;

    constructor(id) {
        super("relation", id);

    }

    ChangesetXML(changesetId: string): string {
        let members = "";
        for (const memberI in this.members) {
            const member = this.members[memberI];
            members += '      <member type="' + member.type + '" ref="' + member.ref + '" role="' + member.role + '"/>\n';
        }

        let tags = this.TagsXML();
        let change =
            '    <relation id="' + this.id + '" changeset="' + changesetId + '" ' + this.VersionXML() + '>\n' +
            members +
            tags +
            '        </relation>\n';
        return change;

    }

    SaveExtraData(element) {
        this.members = element.members;
    }
}